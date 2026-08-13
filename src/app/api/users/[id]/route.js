
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        const userId = Number(id);

        if (!Number.isInteger(userId) || userId <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid user ID.",
                },
                {
                    status: 400,
                }
            );
        }

        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },

            select: {
                id: true,

                // =====================================================
                // NAME
                // =====================================================

                displayName: true,
                username: true,

                // =====================================================
                // PROFILE
                // =====================================================

                avatar: true,
                bio: true,
                role: true,

                // =====================================================
                // PRESENCE
                // =====================================================

                isOnline: true,
                lastSeen: true,

                // =====================================================
                // ACCOUNT
                // =====================================================

                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User not found.",
                },
                {
                    status: 404,
                }
            );
        }

        return NextResponse.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error(
            "❌ GET PUBLIC PROFILE ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error: "Failed to load user profile.",
            },
            {
                status: 500,
            }
        );
    }
}

