import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// ============================================================
// POST /api/games/[gameId]/join
// JOIN GAME
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
                "❌ GAME JOIN AUTHENTICATION FAILED:",
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
        // CHECK GAME STATUS
        // ========================================================

        if (game.status !== "WAITING") {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "This game is no longer waiting for a player.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // CREATOR CANNOT JOIN THEIR OWN GAME
        // ========================================================

        if (Number(game.createdBy) === userId) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "You cannot join your own game.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // CHECK CONVERSATION
        // ========================================================

        const conversation =
            await prisma.conversation.findUnique({
                where: {
                    id: game.conversationId,
                },

                include: {
                    members: {
                        select: {
                            userId: true,
                        },
                    },
                },
            });

        if (!conversation) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Conversation not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // CHECK USER IS CONVERSATION MEMBER
        // ========================================================

        const isMember =
            conversation.members.some(
                (member) =>
                    Number(member.userId) === userId
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
        // CURRENT GAME STATE
        // ========================================================

        const currentState =
            game.state &&
            typeof game.state === "object"
                ? game.state
                : {};

        let updatedState = {
            ...currentState,
        };

        // ========================================================
        // TIC TAC TOE
        // ========================================================

        if (game.type === "TIC_TAC_TOE") {
            updatedState = {
                ...currentState,

                players: {
                    ...(currentState.players || {}),
                    O: userId,
                },
            };
        }

        // ========================================================
        // CONNECT FOUR
        // ========================================================

        else if (game.type === "CONNECT_FOUR") {
            updatedState = {
                ...currentState,

                players: {
                    ...(currentState.players || {}),
                    YELLOW: userId,
                },
            };
        }

        // ========================================================
        // ROCK PAPER SCISSORS
        // ========================================================

        else if (
            game.type === "ROCK_PAPER_SCISSORS"
        ) {
            updatedState = {
                ...currentState,

                players: {
                    ...(currentState.players || {}),
                    player2: userId,
                },

                choices: {
                    ...(currentState.choices || {}),
                    [String(userId)]: null,
                },
            };
        }

        // ========================================================
        // UNSUPPORTED GAME
        // ========================================================

        else {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Unsupported game type.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // UPDATE DATABASE
        // ========================================================

        const updatedGame =
            await prisma.game.update({
                where: {
                    id: game.id,
                },

                data: {
                    status: "PLAYING",

                    state: updatedState,
                },
            });

        // ========================================================
        // REAL-TIME GAME EVENTS
        // ========================================================
        //
        // Notify everyone inside the conversation.
        //
        // server.js should already have sockets joined to:
        //
        // conversation:${conversationId}
        //
        // Therefore both players receive the update
        // immediately without polling /api/games.
        // ========================================================

        if (globalThis.io) {
            const conversationRoom =
                `conversation:${game.conversationId}`;

            // ----------------------------------------------------
            // GAME JOINED
            // ----------------------------------------------------

            globalThis.io
                .to(conversationRoom)
                .emit(
                    "game_joined",
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
                `🎮 GAME JOINED EVENT EMITTED: game=${game.id} conversation=${game.conversationId}`
            );
        } else {
            console.warn(
                "⚠️ Socket.IO instance not available. Game was updated in database, but real-time event was not emitted."
            );
        }

        // ========================================================
        // LOG
        // ========================================================

        console.log(
            "🎮 GAME JOINED:",
            {
                gameId: updatedGame.id,

                type: updatedGame.type,

                conversationId:
                    updatedGame.conversationId,

                createdBy:
                    updatedGame.createdBy,

                joinedBy: userId,

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
                    "Game joined successfully.",

                game: updatedGame,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "❌ JOIN GAME ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to join game.",
            },
            {
                status: 500,
            }
        );
    }
}