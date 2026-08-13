import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // ============================================================
        // CHECK AUTH.JS SESSION
        // ============================================================

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

        // ============================================================
        // CLEAN EMAIL
        // ============================================================

        const cleanEmail =
            session.user.email
                .trim()
                .toLowerCase();

        // ============================================================
        // FIND CHAT HUB USER
        // ============================================================

        const user =
            await prisma.user.findUnique({
                where: {
                    email: cleanEmail,
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

        // ============================================================
        // CHECK TEMPORARY GOOGLE USERNAME
        // ============================================================

        const needsUsername =
            typeof user.username === "string" &&
            user.username.startsWith(
                "__google_"
            );

        // ============================================================
        // JWT SECRET
        // ============================================================

        if (!process.env.JWT_SECRET) {
            console.error(
                "❌ JWT_SECRET is not configured."
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

        // ============================================================
        // CREATE CHATHUB JWT
        // ============================================================

        const token =
            jwt.sign(
                {
                    id: user.id,

                    username:
                        user.username,

                    email:
                        user.email,

                    role:
                        user.role,

                    needsUsername,
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
                        needsUsername
                            ? "Google authentication successful. Username required."
                            : "ChatHub authentication successful.",

                    user: {
                        id:
                            user.id,

                        username:
                            user.username,

                        email:
                            user.email,

                        avatar:
                            user.avatar,

                        needsUsername,
                    },
                },

                {
                    status: 200,
                }
            );

        // ============================================================
        // SET CHATHUB TOKEN
        // ============================================================

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
            "✅ ChatHub Token created from Auth.js session."
        );

        console.log(
            "User ID:",
            user.id
        );

        console.log(
            "Username:",
            user.username
        );

        console.log(
            "Needs username:",
            needsUsername
        );

        return response;
    } catch (error) {
        console.error(
            "❌ GOOGLE TOKEN ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Unable to complete Google authentication.",
            },
            {
                status: 500,
            }
        );
    }
}