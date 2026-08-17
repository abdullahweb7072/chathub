import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// ============================================================
// POST /api/games/[gameId]/leave
// LEAVE / CANCEL GAME
// ============================================================

export async function POST(request, { params }) {
    try {
        // ========================================================
        // AUTHENTICATION
        // ========================================================

        let user;

        try {
            user = await verifyAuth(request);
        } catch (error) {
            console.error(
                "❌ GAME LEAVE AUTHENTICATION FAILED:",
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

        const userId = Number(user.id);

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
        });

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
        // GAME ALREADY FINISHED
        // ========================================================

        if (game.status === "FINISHED") {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "This game has already finished.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // GAME ALREADY CANCELLED
        // ========================================================

        if (game.status === "CANCELLED") {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "This game has already been cancelled.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // CHECK CONVERSATION MEMBERSHIP
        // ========================================================

        const membership =
            await prisma.conversationMember.findUnique({
                where: {
                    userId_conversationId: {
                        userId,
                        conversationId:
                            game.conversationId,
                    },
                },
            });

        if (!membership) {
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
        // CHECK PLAYER
        // ========================================================

        const state =
            game.state &&
            typeof game.state === "object"
                ? game.state
                : {};

        const players = state?.players || {};

        const isPlayer =
            Number(players.X) === userId ||
            Number(players.O) === userId ||
            Number(players.RED) === userId ||
            Number(players.YELLOW) === userId ||
            Number(players.player1) === userId ||
            Number(players.player2) === userId;

        if (!isPlayer) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "You are not a player in this game.",
                },
                {
                    status: 403,
                }
            );
        }

        // ========================================================
        // CANCEL GAME
        // ========================================================

        const updatedState = {
            ...state,

            endedBy: userId,

            endReason: "PLAYER_LEFT",
        };

        // ========================================================
        // UPDATE DATABASE
        // ========================================================

        const updatedGame =
            await prisma.game.update({
                where: {
                    id: game.id,
                },

                data: {
                    status: "CANCELLED",

                    state: updatedState,
                },
            });

        // ========================================================
        // REAL-TIME GAME EVENTS
        // ========================================================
        //
        // Notify everyone inside the conversation.
        //
        // server.js already places users inside:
        //
        // conversation:${conversationId}
        //
        // This allows the other player to immediately
        // close the game UI / show "Game cancelled".
        // ========================================================

        if (globalThis.io) {
            const conversationRoom =
                `conversation:${game.conversationId}`;

            // ----------------------------------------------------
            // GAME CANCELLED
            // ----------------------------------------------------

            globalThis.io
                .to(conversationRoom)
                .emit(
                    "game_cancelled",
                    updatedGame
                );

            // ----------------------------------------------------
            // GAME UPDATED
            // ----------------------------------------------------

            globalThis.io
                .to(conversationRoom)
                .emit(
                    "game_updated",
                    updatedGame
                );

            console.log(
                `🎮 GAME CANCELLED EVENT EMITTED: game=${game.id} conversation=${game.conversationId}`
            );
        } else {
            console.warn(
                "⚠️ Socket.IO instance not available. Game was cancelled in database, but real-time event was not emitted."
            );
        }

        // ========================================================
        // LOG
        // ========================================================

        console.log(
            "🎮 GAME CANCELLED:",
            {
                gameId: updatedGame.id,

                type: updatedGame.type,

                conversationId:
                    updatedGame.conversationId,

                cancelledBy: userId,

                status:
                    updatedGame.status,
            }
        );

        // ========================================================
        // RESPONSE
        // ========================================================

        return NextResponse.json(
            {
                success: true,

                message:
                    "You left the game.",

                game: updatedGame,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "❌ LEAVE GAME ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to leave game.",
            },
            {
                status: 500,
            }
        );
    }
}