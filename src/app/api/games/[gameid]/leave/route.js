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
        // GAME ID EXTRACTION (ROBUST FALLBACK)
        // ========================================================

        const resolvedParams = await params;
        
        let rawGameId = resolvedParams?.gameId || resolvedParams?.id;

        // Fallback: Check request body if route params missed it
        if (!rawGameId) {
            try {
                const body = await request.json();
                rawGameId = body?.gameId || body?.id;
            } catch (e) {
                // Ignore json parsing error if body is empty
            }
        }

        const id = Number(rawGameId);

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
        // GAME ALREADY FINISHED / CANCELLED
        // ========================================================

        if (game.status === "FINISHED") {
            return NextResponse.json(
                {
                    success: false,
                    message: "This game has already finished.",
                },
                {
                    status: 400,
                }
            );
        }

        if (game.status === "CANCELLED") {
            return NextResponse.json(
                {
                    success: false,
                    message: "This game has already been cancelled.",
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
                        conversationId: game.conversationId,
                    },
                },
            });

        if (!membership) {
            return NextResponse.json(
                {
                    success: false,
                    message: "You are not a member of this conversation.",
                },
                {
                    status: 403,
                }
            );
        }

        // ========================================================
        // SAFE PARSE GAME STATE
        // ========================================================

        let state = {};
        if (typeof game.state === "string") {
            try {
                state = JSON.parse(game.state);
            } catch (e) {
                state = {};
            }
        } else if (game.state && typeof game.state === "object") {
            state = game.state;
        }

        const players = state?.players || {};

        const isPlayer =
            Number(players.X) === userId ||
            Number(players.O) === userId ||
            Number(players.RED) === userId ||
            Number(players.YELLOW) === userId ||
            Number(players.player1) === userId ||
            Number(players.player2) === userId ||
            Number(game.createdBy) === userId;

        if (!isPlayer) {
            return NextResponse.json(
                {
                    success: false,
                    message: "You are not a player in this game.",
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

        const updatedGame = await prisma.game.update({
            where: {
                id: game.id,
            },
            data: {
                status: "CANCELLED",
                state: updatedState,
            },
        });

        // Ensure state is cleanly formatted for socket events
        const payloadGame = {
            ...updatedGame,
            state:
                typeof updatedGame.state === "string"
                    ? JSON.parse(updatedGame.state)
                    : updatedGame.state,
        };

        // ========================================================
        // REAL-TIME GAME EVENTS
        // ========================================================

        if (globalThis.io) {
            const conversationRoom = `conversation:${game.conversationId}`;

            globalThis.io
                .to(conversationRoom)
                .emit("game_cancelled", payloadGame);

            globalThis.io
                .to(conversationRoom)
                .emit("game_updated", payloadGame);

            console.log(
                `🎮 GAME CANCELLED EVENT EMITTED: game=${game.id} conversation=${game.conversationId}`
            );
        } else {
            console.warn(
                "⚠️ Socket.IO instance not available. Game was cancelled in database, but real-time event was not emitted."
            );
        }

        // ========================================================
        // LOG & RESPONSE
        // ========================================================

        console.log("🎮 GAME CANCELLED:", {
            gameId: updatedGame.id,
            type: updatedGame.type,
            conversationId: updatedGame.conversationId,
            cancelledBy: userId,
            status: updatedGame.status,
        });

        return NextResponse.json(
            {
                success: true,
                message: "You left the game.",
                game: payloadGame,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error("❌ LEAVE GAME ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to leave game.",
            },
            {
                status: 500,
            }
        );
    }
}