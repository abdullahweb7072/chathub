import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        // ========================================================
        // AUTH.JS SESSION
        // ========================================================

        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Google authentication session not found.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // REQUEST BODY
        // ========================================================

        const body =
            await request.json();

        const username =
            body?.username?.trim();

        // ========================================================
        // VALIDATE USERNAME
        // ========================================================

        if (!username) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Username is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (username.length < 7) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Username must contain at least 7 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        if (username.length > 30) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Username cannot exceed 30 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        const specialCharacterRegex =
            /[^a-zA-Z0-9\s]/;

        if (
            !specialCharacterRegex.test(
                username
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Username must contain at least one special character.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // FIND USER
        // ========================================================

        const email =
            session.user.email
                .trim()
                .toLowerCase();

        const user =
            await prisma.user.findUnique({
                where: {
                    email,
                },
            });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "ChatHub user account not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // MAKE SURE THIS IS AN INCOMPLETE GOOGLE ACCOUNT
        // ========================================================

        if (
            !user.username ||
            !user.username.startsWith(
                "__google_"
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Your username has already been completed.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // CHECK USERNAME AVAILABILITY
        // ========================================================

        const existingUser =
            await prisma.user.findUnique({
                where: {
                    username,
                },

                select: {
                    id: true,
                },
            });

        if (
            existingUser &&
            existingUser.id !== user.id
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "This username is already taken.",
                },
                {
                    status: 409,
                }
            );
        }

        // ========================================================
        // UPDATE USER
        // ========================================================

        const updatedUser =
            await prisma.user.update({
                where: {
                    id: user.id,
                },

                data: {
                    username,
                },

                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    avatar: true,
                },
            });

        // ========================================================
        // JWT SECRET
        // ========================================================

        if (!process.env.JWT_SECRET) {
            console.error(
                "❌ JWT_SECRET is missing."
            );

            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Server configuration error.",
                },
                {
                    status: 500,
                }
            );
        }

        // ========================================================
        // CREATE CHATHUB JWT
        // ========================================================

        const token =
            jwt.sign(
                {
                    id:
                        updatedUser.id,

                    username:
                        updatedUser.username,

                    email:
                        updatedUser.email,

                    role:
                        updatedUser.role,

                    avatar:
                        updatedUser.avatar ||
                        null,

                    needsUsername:
                        false,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1d",
                }
            );

        // ========================================================
        // RESPONSE
        // ========================================================

        const response =
            NextResponse.json(
                {
                    success: true,

                    message:
                        "Username completed successfully.",

                    user: {
                        id:
                            updatedUser.id,

                        username:
                            updatedUser.username,

                        email:
                            updatedUser.email,

                        avatar:
                            updatedUser.avatar,
                    },
                },
                {
                    status: 200,
                }
            );

        // ========================================================
        // SET CHATHUB TOKEN
        // ========================================================

        response.cookies.set(
            "Token",
            token,
            {
                httpOnly: true,

                secure:
                    process.env.NODE_ENV ===
                    "production",

                sameSite: "lax",

                maxAge:
                    60 * 60 * 24,

                path: "/",
            }
        );

        console.log(
            `✅ Google signup completed for user ${updatedUser.id}`
        );

        console.log(
            `✅ ChatHub Token refreshed for user ${updatedUser.id}`
        );

        return response;
    } catch (error) {
        console.error(
            "❌ COMPLETE SIGNUP ERROR:",
            error
        );

        if (
            error?.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "This username is already taken.",
                },
                {
                    status: 409,
                }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message:
                    "Unable to complete signup.",
            },
            {
                status: 500,
            }
        );
    }
}