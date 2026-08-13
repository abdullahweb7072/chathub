
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request) {
    try {
        // ========================================================
        // AUTHENTICATION
        // ========================================================

        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "You must be logged in.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // GET USERNAME
        // ========================================================

        const { searchParams } =
            new URL(request.url);

        const username =
            searchParams
                .get("username")
                ?.trim();

        if (!username) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Username is required.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // VALIDATION
        // ========================================================

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
            !specialCharacterRegex.test(username)
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
        // CHECK DATABASE
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

        // ========================================================
        // ALLOW CURRENT USER'S USERNAME
        // ========================================================

        if (
            existingUser &&
            existingUser.id !== session.user.id
        ) {
            return NextResponse.json({
                success: true,
                available: false,
            });
        }

        return NextResponse.json({
            success: true,
            available: true,
        });
    } catch (error) {
        console.error(
            "❌ CHECK USERNAME ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Unable to check username.",
            },
            {
                status: 500,
            }
        );
    }
}

