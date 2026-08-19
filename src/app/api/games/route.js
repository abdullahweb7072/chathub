import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// ============================================================
// VALID GAME TYPES
// ============================================================

const VALID_GAME_TYPES = [
    "TIC_TAC_TOE",
    "CONNECT_FOUR",
    "ROCK_PAPER_SCISSORS",
];

// ============================================================
// CREATE INITIAL GAME STATE
// ============================================================

function createInitialGameState(type, creatorId, targetId = null) {
    const hostId = Number(creatorId);
    const guestId = targetId ? Number(targetId) : null;

    switch (type) {
        // ========================================================
        // TIC TAC TOE
        // ========================================================

        case "TIC_TAC_TOE":
            return {
                players: {
                    X: hostId,
                    O: guestId,
                },

                board: [
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                ],

                turn: "X",

                winner: null,

                draw: false,
            };

        // ========================================================
        // CONNECT FOUR
        // ========================================================

        case "CONNECT_FOUR":
            return {
                players: {
                    RED: hostId,
                    YELLOW: guestId,
                },

                board: Array.from(
                    { length: 6 },
                    () => Array(7).fill(null)
                ),

                turn: "RED",

                winner: null,

                draw: false,
            };

        // ========================================================
        // ROCK PAPER SCISSORS
        // ========================================================

        case "ROCK_PAPER_SCISSORS":
            return {
                players: {
                    player1: hostId,
                    player2: guestId,
                },

                choices: {
                    [String(hostId)]: null,
                    ...(guestId ? { [String(guestId)]: null } : {}),
                },

                winner: null,

                roundFinished: false,
            };

        // ========================================================
        // INVALID
        // ========================================================

        default:
            throw new Error(
                "Unsupported game type"
            );
    }
}

// ============================================================
// POST /api/games
// CREATE GAME
// ============================================================

export async function POST(request) {
    try {
        // ========================================================
        // AUTHENTICATION
        // ========================================================

        let user;

        try {
            user = await verifyAuth(request);
        } catch (error) {
            console.error(
                "❌ GAME AUTHENTICATION FAILED:",
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
        // REQUEST BODY
        // ========================================================

        let body;

        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid JSON body.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // CONVERSATION ID
        // ========================================================

        const conversationId = Number(
            body?.conversationId
        );

        if (
            !Number.isInteger(conversationId) ||
            conversationId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "A valid conversationId is required.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // GAME TYPE
        // ========================================================

        const type = String(
            body?.type || ""
        ).toUpperCase();

        if (
            !VALID_GAME_TYPES.includes(type)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid game type.",

                    validTypes:
                        VALID_GAME_TYPES,
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // FIND CONVERSATION
        // ========================================================

        const conversation =
            await prisma.conversation.findUnique({
                where: {
                    id: conversationId,
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
                    message:
                        "Conversation not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // CHECK MEMBERSHIP
        // ========================================================

        const isMember =
            conversation.members.some(
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
        // REQUIRE ANOTHER PLAYER & AUTO-TARGET DM OPPONENT
        // ========================================================

        const otherMembers =
            conversation.members.filter(
                (member) =>
                    Number(member.userId) !==
                    Number(user.id)
            );

        if (otherMembers.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "A game requires another player.",
                },
                {
                    status: 400,
                }
            );
        }

        // Target recipient automatically if in a 1-on-1 direct message
        let targetOpponentId = null;
        if (otherMembers.length === 1) {
            targetOpponentId = Number(otherMembers[0].userId);
        }

        // ========================================================
        // CREATE INITIAL STATE
        // ========================================================

        const initialState =
            createInitialGameState(
                type,
                user.id,
                targetOpponentId
            );

        // ========================================================
        // CREATE GAME
        // ========================================================

        const game =
            await prisma.game.create({
                data: {
                    type,

                    status: "WAITING",

                    conversationId,

                    createdBy: Number(
                        user.id
                    ),

                    state: initialState,
                },
            });

        // ========================================================
        // REAL-TIME GAME EVENT
        // ========================================================

        if (globalThis.io) {
            globalThis.io
                .to(
                    `conversation:${conversationId}`
                )
                .emit(
                    "game_created",
                    game
                );

            console.log(
                `🎮 game_created emitted to conversation:${conversationId}`
            );
        } else {
            console.warn(
                "⚠️ Socket.IO instance unavailable while creating game."
            );
        }

        // ========================================================
        // RESPONSE
        // ========================================================

        console.log(
            "🎮 GAME CREATED:",
            {
                gameId: game.id,
                type: game.type,
                conversationId:
                    game.conversationId,
                createdBy:
                    game.createdBy,
            }
        );

        return NextResponse.json(
            {
                success: true,

                message:
                    "Game created successfully.",

                game,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error(
            "❌ CREATE GAME ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to create game.",
            },
            {
                status: 500,
            }
        );
    }
}

// ============================================================
// GET /api/games?conversationId=2
// GET WAITING/ACTIVE GAMES FOR CONVERSATION
// ============================================================

export async function GET(request) {
    try {
        // ========================================================
        // AUTHENTICATION
        // ========================================================

        let user;

        try {
            user = await verifyAuth(request);
        } catch (error) {
            console.error(
                "❌ GAME AUTHENTICATION FAILED:",
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
        // GET CONVERSATION ID
        // ========================================================

        const { searchParams } =
            new URL(request.url);

        const conversationId = Number(
            searchParams.get(
                "conversationId"
            )
        );

        if (
            !Number.isInteger(
                conversationId
            ) ||
            conversationId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "A valid conversationId is required.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // CHECK MEMBERSHIP
        // ========================================================

        const membership =
            await prisma.conversationMember.findUnique(
                {
                    where: {
                        userId_conversationId: {
                            userId: Number(
                                user.id
                            ),

                            conversationId,
                        },
                    },
                }
            );

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
        // GET GAMES
        // ========================================================

        const games =
            await prisma.game.findMany({
                where: {
                    conversationId,

                    status: {
                        in: [
                            "WAITING",
                            "PLAYING",
                        ],
                    },
                },

                orderBy: {
                    createdAt: "desc",
                },
            });

        // Ensure states are cleanly parsed JSON objects
        const formattedGames = games.map((game) => ({
            ...game,
            state:
                typeof game.state === "string"
                    ? JSON.parse(game.state || "{}")
                    : game.state,
        }));

        // ========================================================
        // RESPONSE
        // ========================================================

        return NextResponse.json(
            {
                success: true,
                games: formattedGames,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "❌ GET GAMES ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to fetch games.",
            },
            {
                status: 500,
            }
        );
    }
}