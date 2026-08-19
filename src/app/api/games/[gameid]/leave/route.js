import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// ============================================================
// POST /api/games/[gameid]/leave
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
        // GAME ID (Extracted using 'gameid' to match [gameid] folder)
        // ========================================================

        const { gameid, gameId } = await params;

        // Fallback supports both [gameid] and [gameId] dynamic folder conventions
        const rawId = gameid ?? gameId;
        const id = Number(rawId);

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
                    message: "This game has already finished.",
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
        const currentUserIdStr = String(userId);

        // Collect all potential player IDs from state + game creator
        const registeredPlayerIds = [
            players.X,
            players.O,
            players.RED,
            players.YELLOW,
            players.player1,
            players.player2,
            game.createdBy,
        ]
            .filter(Boolean)
            .map(String);

        const isPlayer = registeredPlayerIds.includes(currentUserIdStr);

        // Allow user to leave if they are an assigned player OR if game is in WAITING state
        if (!isPlayer && game.status !== "WAITING") {
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
        // LOG
        // ========================================================

        console.log("🎮 GAME CANCELLED:", {
            gameId: updatedGame.id,
            type: updatedGame.type,
            conversationId: updatedGame.conversationId,
            cancelledBy: userId,
            status: updatedGame.status,
        });

        // ========================================================
        // RESPONSE
        // ========================================================

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