import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

// ============================================================
// COOKIE PARSER
// ============================================================

function parseCookies(cookieHeader) {
    const cookies = {};

    if (!cookieHeader) {
        return cookies;
    }

    cookieHeader
        .split(";")
        .forEach((cookie) => {
            const [name, ...valueParts] =
                cookie.trim().split("=");

            if (!name) return;

            const value =
                valueParts.join("=");

            try {
                cookies[name] =
                    decodeURIComponent(value);
            } catch {
                cookies[name] = value;
            }
        });

    return cookies;
}

// ============================================================
// POST
// ============================================================

export async function POST(request) {
    try {
        // ============================================================
        // GET TOKEN
        // ============================================================

        const cookieHeader =
            request.headers.get("cookie");

        const cookies =
            parseCookies(cookieHeader);

        const token =
            cookies.Token;

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "You must be logged in.",
                },
                {
                    status: 401,
                }
            );
        }

        // ============================================================
        // JWT SECRET
        // ============================================================

        if (!process.env.JWT_SECRET) {
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

        // ============================================================
        // VERIFY TOKEN
        // ============================================================

        let decoded;

        try {
            decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invalid or expired token.",
                },
                {
                    status: 401,
                }
            );
        }

        const userId =
            Number(decoded.id);

        if (
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invalid user.",
                },
                {
                    status: 401,
                }
            );
        }

        // ============================================================
        // REQUEST BODY
        // ============================================================

        const body =
            await request.json();

        const username =
            body?.username?.trim();

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

        // ============================================================
        // USERNAME VALIDATION
        // ============================================================

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

        // ============================================================
        // FIND CURRENT USER
        // ============================================================

        const dbUser =
            await prisma.user.findUnique({
                where: {
                    id: userId,
                },
            });

        if (!dbUser) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "User not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ============================================================
        // ONLY TEMPORARY GOOGLE USERS
        // ============================================================

        if (
            !dbUser.username?.startsWith(
                "__google_"
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Username has already been configured.",
                },
                {
                    status: 400,
                }
            );
        }

        // ============================================================
        // CHECK USERNAME
        // ============================================================

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
            existingUser.id !== dbUser.id
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

        // ============================================================
        // UPDATE USERNAME
        // ============================================================

        const updatedUser =
            await prisma.user.update({
                where: {
                    id: dbUser.id,
                },

                data: {
                    username,
                },

                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true,
                    role: true,
                },
            });

        // ============================================================
        // CREATE NEW CHAT HUB JWT
        //
        // IMPORTANT:
        // The old token contained __google_xxx.
        //
        // Replace it with the real username.
        // ============================================================

        const newToken =
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

                    needsUsername:
                        false,
                },

                process.env.JWT_SECRET,

                {
                    expiresIn: "1d",
                }
            );

        // ============================================================
        // RESPONSE
        // ============================================================

        const response =
            NextResponse.json(
                {
                    success: true,

                    message:
                        "Username saved successfully.",

                    user: {
                        id:
                            updatedUser.id,

                        username:
                            updatedUser.username,

                        email:
                            updatedUser.email,

                        avatar:
                            updatedUser.avatar,

                        needsUsername:
                            false,
                    },
                },

                {
                    status: 200,
                }
            );

        // ============================================================
        // REPLACE TOKEN
        // ============================================================

        response.cookies.set(
            "Token",
            newToken,
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
            `✅ Google username completed: ${updatedUser.email} → ${updatedUser.username}`
        );

        return response;
    } catch (error) {
        console.error(
            "❌ GOOGLE PROFILE ERROR:",
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
                    "Unable to save username. Please try again.",
            },
            {
                status: 500,
            }
        );
    }
}