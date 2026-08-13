import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // ========================================================
        // GET AUTH.JS SESSION
        // ========================================================

        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.redirect(
                new URL(
                    "/login?error=GoogleAuthenticationFailed",
                    process.env.NEXTAUTH_URL ||
                        "http://localhost:3000"
                )
            );
        }

        // ========================================================
        // CLEAN EMAIL
        // ========================================================

        const email =
            session.user.email
                .trim()
                .toLowerCase();

        // ========================================================
        // FIND CHATHUB USER
        // ========================================================

        const user =
            await prisma.user.findUnique({
                where: {
                    email,
                },
            });

        if (!user) {
            return NextResponse.redirect(
                new URL(
                    "/login?error=UserNotFound",
                    process.env.NEXTAUTH_URL ||
                        "http://localhost:3000"
                )
            );
        }

        // ========================================================
        // CHECK TEMPORARY GOOGLE USERNAME
        // ========================================================

        const needsUsername =
            typeof user.username ===
                "string" &&
            user.username.startsWith(
                "__google_"
            );

        // ========================================================
        // NEW GOOGLE USER
        // ========================================================

        if (needsUsername) {
            return NextResponse.redirect(
                new URL(
                    "/complete-signup",
                    process.env.NEXTAUTH_URL ||
                        "http://localhost:3000"
                )
            );
        }

        // ========================================================
        // JWT SECRET
        // ========================================================

        if (!process.env.JWT_SECRET) {
            console.error(
                "❌ JWT_SECRET is missing."
            );

            return NextResponse.redirect(
                new URL(
                    "/login?error=ServerConfigurationError",
                    process.env.NEXTAUTH_URL ||
                        "http://localhost:3000"
                )
            );
        }

        // ========================================================
        // CREATE CHATHUB JWT
        // ========================================================

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

                    avatar:
                        user.avatar ||
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
        // REDIRECT TO CHAT
        // ========================================================

        const response =
            NextResponse.redirect(
                new URL(
                    "/chat",
                    process.env.NEXTAUTH_URL ||
                        "http://localhost:3000"
                )
            );

        // ========================================================
        // CREATE CHATHUB TOKEN
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
            `✅ ChatHub Token created for Google user ${user.id}`
        );

        return response;
    } catch (error) {
        console.error(
            "❌ GOOGLE COMPLETE ERROR:",
            error
        );

        return NextResponse.redirect(
            new URL(
                "/login?error=GoogleAuthenticationFailed",
                process.env.NEXTAUTH_URL ||
                    "http://localhost:3000"
            )
        );
    }
}