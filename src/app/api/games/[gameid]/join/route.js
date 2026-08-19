import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function POST(request, { params }) {
    try {
        let user;

        try {
            user = await verifyAuth(request);
        } catch (error) {
            return NextResponse.json(
                { success: false, message: "Unauthorized." },
                { status: 401 }
            );
        }

        if (!user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized." },
                { status: 401 }
            );
        }

        const userId = Number(user.id);

        const { gameId } = await params;
        const id = Number(gameId);

        if (!Number.isInteger(id) || id <= 0) {
            return NextResponse.json(
                { success: false, message: "Invalid gameId." },
                { status: 400 }
            );
        }

        const game = await prisma.game.findUnique({
            where: { id },
        });

        if (!game) {
            return NextResponse.json(
                { success: false, message: "Game not found." },
                { status: 404 }
            );
        }

        if (game.status !== "WAITING") {
            return NextResponse.json(
                {
                    success: false,
                    message: "This game is no longer waiting for a player.",
                },
                { status: 400 }
            );
        }

        if (Number(game.createdBy) === userId) {
            return NextResponse.json(
                { success: false, message: "You cannot join your own game." },
                { status: 400 }
            );
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id: game.conversationId },
            include: {
                members: { select: { userId: true } },
            },
        });

        if (!conversation) {
            return NextResponse.json(
                { success: false, message: "Conversation not found." },
                { status: 404 }
            );
        }

        const isMember = conversation.members.some(
            (member) => Number(member.userId) === userId
        );

        if (!isMember) {
            return NextResponse.json(
                { success: false, message: "You are not a member of this conversation." },
                { status: 403 }
            );
        }

        // ========================================================
        // SAFE PARSE CURRENT GAME STATE
        // ========================================================
        let currentState = {};
        if (typeof game.state === "string") {
            try {
                currentState = JSON.parse(game.state);
            } catch (e) {
                currentState = {};
            }
        } else if (game.state && typeof game.state === "object") {
            currentState = game.state;
        }

        let updatedState = { ...currentState };

        if (game.type === "TIC_TAC_TOE") {
            updatedState = {
                ...currentState,
                players: {
                    ...(currentState.players || {}),
                    O: userId,
                },
            };
        } else if (game.type === "CONNECT_FOUR") {
            updatedState = {
                ...currentState,
                players: {
                    ...(currentState.players || {}),
                    YELLOW: userId,
                },
            };
        } else if (game.type === "ROCK_PAPER_SCISSORS") {
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
        } else {
            return NextResponse.json(
                { success: false, message: "Unsupported game type." },
                { status: 400 }
            );
        }

        // ========================================================
        // UPDATE DATABASE
        // ========================================================
        const updatedGame = await prisma.game.update({
            where: { id: game.id },
            data: {
                status: "PLAYING",
                state: updatedState,
            },
        });

        // Ensure state is an object before socket emission
        const payloadGame = {
            ...updatedGame,
            state:
                typeof updatedGame.state === "string"
                    ? JSON.parse(updatedGame.state)
                    : updatedGame.state,
        };

        if (globalThis.io) {
            const conversationRoom = `conversation:${game.conversationId}`;

            globalThis.io.to(conversationRoom).emit("game_joined", payloadGame);
            globalThis.io.to(conversationRoom).emit("game_updated", payloadGame);
        }

        return NextResponse.json(
            {
                success: true,
                message: "Game joined successfully.",
                game: payloadGame,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("❌ JOIN GAME ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Failed to join game." },
            { status: 500 }
        );
    }
}