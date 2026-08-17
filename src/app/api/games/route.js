import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// ============================================================
// GAME TYPES
// ============================================================

const VALID_GAME_TYPES = [
    "TIC_TAC_TOE",
    "CONNECT_FOUR",
    "ROCK_PAPER_SCISSORS",
];

// ============================================================
// INITIAL GAME STATE
// ============================================================

function createInitialGameState(type, creatorId) {
    switch (type) {
        // ========================================================
        // TIC TAC TOE
        // ========================================================

        case "TIC_TAC_TOE":
            return {
                players: {
                    X: creatorId,
                    O: null,
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
                    RED: creatorId,
                    YELLOW: null,
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
                    player1: creatorId,
                    player2: null,
                },

                choices: {
                    [creatorId]: null,
                },

                winner: null,

                roundFinished: false,
            };

        default:
            throw new Error("Unsupported game type");
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
        } catch (authError) {
            console.error(
                "❌ GAME AUTHENTICATION FAILED:",
                authError?.message
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

        // ========================================================
        // SAFETY CHECK
        // ========================================================

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
                    message: "Invalid request body.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // GET GAME DATA
        // ========================================================

        const conversationId = Number(
            body?.conversationId
        );

        const type = String(
            body?.type || ""
        ).toUpperCase();

        // ========================================================
        // VALIDATE CONVERSATION ID
        // ========================================================

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
        // VALIDATE GAME TYPE
        // ========================================================

        if (
            !VALID_GAME_TYPES.includes(type)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid game type.",
                    validTypes: VALID_GAME_TYPES,
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

        // ========================================================
        // CONVERSATION NOT FOUND
        // ========================================================

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
        // FIND OTHER PLAYERS
        // ========================================================

        const otherMembers =
            conversation.members.filter(
                (member) =>
                    Number(member.userId) !==
                    Number(user.id)
            );

        // ========================================================
        // REQUIRE ANOTHER PLAYER
        // ========================================================

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

        // ========================================================
        // CREATE INITIAL STATE
        // ========================================================

        const initialState =
            createInitialGameState(
                type,
                Number(user.id)
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

                    createdBy:
                        Number(user.id),

                    state: initialState,
                },
            });

        // ========================================================
        // SUCCESS RESPONSE
        // ========================================================

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
        // ========================================================
        // UNEXPECTED ERROR
        // ========================================================

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