import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// ============================================================
// GET /api/games/[gameId]
// GET SINGLE GAME
// ============================================================

export async function GET(request, { params }) {
    try {
        // ========================================================
        // AUTHENTICATION
        // ========================================================

        let user;

        try {
            user = await verifyAuth(request);
        } catch (error) {
            console.error(
                "❌ GET GAME AUTHENTICATION FAILED:",
                error?.message
            );

            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized.",
                },
                {
                    status: 401,
                }
            );
        }

        if (!user?.id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // GAME ID
        // ========================================================

        const { gameId } = await params;

        const id = Number(gameId);

        if (!Number.isInteger(id) || id <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid gameId.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // FIND GAME
        // ========================================================

        const game = await prisma.game.findUnique({
            where: {
                id,
            },

            include: {
                conversation: {
                    include: {
                        members: {
                            select: {
                                userId: true,
                                joinedAt: true,
                            },
                        },
                    },
                },

                creator: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                    },
                },
            },
        });

        // ========================================================
        // GAME NOT FOUND
        // ========================================================

        if (!game) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Game not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // CHECK CONVERSATION MEMBERSHIP
        // ========================================================

        const isMember =
            game.conversation.members.some(
                (member) =>
                    Number(member.userId) ===
                    Number(user.id)
            );

        if (!isMember) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "You are not a member of this conversation.",
                },
                {
                    status: 403,
                }
            );
        }

        // ========================================================
        // RESPONSE
        // ========================================================

        return NextResponse.json(
            {
                success: true,
                game,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "❌ GET SINGLE GAME ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch game.",
            },
            {
                status: 500,
            }
        );
    }
}