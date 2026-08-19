"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

// ============================================================
// GAME TYPES
// ============================================================

const GAMES = [
    {
        type: "TIC_TAC_TOE",
        title: "Tic-Tac-Toe",
        description: "Classic 3 × 3 strategy game.",
        icon: "❌⭕",
    },
    {
        type: "CONNECT_FOUR",
        title: "Connect Four",
        description: "Connect four pieces in a row.",
        icon: "🔴🟡",
    },
    {
        type: "ROCK_PAPER_SCISSORS",
        title: "Rock Paper Scissors",
        description: "Choose your move and beat your opponent.",
        icon: "✊📄✂️",
    },
];

// Helper to normalize JSON string states into object formats
const parseGameState = (game) => {
    if (!game) return game;
    let parsedState = game.state;

    if (typeof game.state === "string") {
        try {
            parsedState = JSON.parse(game.state);
        } catch (e) {
            parsedState = {};
        }
    }

    return {
        ...game,
        state: parsedState || {},
    };
};

// ============================================================
// GAME LOBBY
// ============================================================

export default function GameLobby({
    conversation,
    currentUser,
    onGameCreated,
    onGameJoined,
    onClose,
}) {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(null);
    const [error, setError] = useState("");

    // ========================================================
    // LOAD GAMES
    // ========================================================

    useEffect(() => {
        if (!conversation?.id) return;

        let cancelled = false;

        async function loadGames() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `/api/games?conversationId=${conversation.id}`,
                    {
                        credentials: "include",
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data?.message || "Failed to load games."
                    );
                }

                if (!cancelled) {
                    const parsedGames = (data.games || []).map(parseGameState);
                    setGames(parsedGames);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("❌ LOAD GAMES ERROR:", error);
                    setError(error?.message || "Failed to load games.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadGames();

        return () => {
            cancelled = true;
        };
    }, [conversation?.id]);

    // ========================================================
    // SOCKET LISTENERS
    // ========================================================

    useEffect(() => {
        if (!socket) return;

        const handleGameCreated = (rawGame) => {
            const game = parseGameState(rawGame);
            if (Number(game?.conversationId) !== Number(conversation?.id)) return;

            setGames((current) => {
                const exists = current.some(
                    (item) => Number(item.id) === Number(game.id)
                );
                return exists ? current : [game, ...current];
            });
        };

        const handleGameJoined = (rawGame) => {
            const game = parseGameState(rawGame);
            if (Number(game?.conversationId) !== Number(conversation?.id)) return;

            setGames((current) =>
                current.map((item) =>
                    Number(item.id) === Number(game.id) ? game : item
                )
            );
        };

        const handleGameUpdated = (rawGame) => {
            const game = parseGameState(rawGame);
            if (Number(game?.conversationId) !== Number(conversation?.id)) return;

            setGames((current) =>
                current.map((item) =>
                    Number(item.id) === Number(game.id) ? game : item
                )
            );
        };

        const handleGameFinished = (game) => {
            setGames((current) =>
                current.filter((item) => Number(item.id) !== Number(game?.id))
            );
        };

        const handleGameCancelled = (game) => {
            setGames((current) =>
                current.filter((item) => Number(item.id) !== Number(game?.id))
            );
        };

        socket.on("game_created", handleGameCreated);
        socket.on("game_joined", handleGameJoined);
        socket.on("game_updated", handleGameUpdated);
        socket.on("game_finished", handleGameFinished);
        socket.on("game_cancelled", handleGameCancelled);

        return () => {
            socket.off("game_created", handleGameCreated);
            socket.off("game_joined", handleGameJoined);
            socket.off("game_updated", handleGameUpdated);
            socket.off("game_finished", handleGameFinished);
            socket.off("game_cancelled", handleGameCancelled);
        };
    }, [conversation?.id]);

    // ========================================================
    // CREATE GAME
    // ========================================================

    const createGame = async (type) => {
        if (!conversation?.id) return;

        try {
            setCreating(type);
            setError("");

            const response = await fetch("/api/games", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: conversation.id,
                    type,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data?.message || "Failed to create game.");
            }

            const game = parseGameState(data.game);

            setGames((current) => {
                const exists = current.some(
                    (item) => Number(item.id) === Number(game.id)
                );
                return exists ? current : [game, ...current];
            });

            onGameCreated?.({
                ...game,
                isCreator: true,
                isReceiver: false,
            });
        } catch (error) {
            console.error("❌ CREATE GAME ERROR:", error);
            setError(error?.message || "Failed to create game.");
        } finally {
            setCreating(null);
        }
    };

    // ========================================================
    // OPEN INVITATION (PROMPT RECEIVER)
    // ========================================================

    const openInvitation = (game) => {
        onGameJoined?.({
            ...game,
            isCreator: false,
            isReceiver: true, // Forces receiver prompt screen
        });
    };

    // ========================================================
    // GAME LABEL
    // ========================================================

    const getGameInfo = (type) => GAMES.find((game) => game.type === type);

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="flex min-h-[500px] flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">Games</h2>
                    <p className="text-sm text-gray-400">
                        Play with people in this conversation
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="rounded-lg px-3 py-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                >
                    ✕
                </button>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto p-5">
                {/* CREATE */}
                <div>
                    <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400">
                        Start a game
                    </h3>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {GAMES.map((game) => (
                            <button
                                key={game.type}
                                disabled={creating === game.type}
                                onClick={() => createGame(game.type)}
                                className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <div className="mb-3 text-2xl">{game.icon}</div>
                                <div className="font-medium text-white">{game.title}</div>
                                <div className="mt-1 text-xs leading-5 text-gray-400">
                                    {game.description}
                                </div>
                                {creating === game.type && (
                                    <div className="mt-3 text-xs text-gray-400">Creating...</div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ERROR */}
                {error && (
                    <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {/* ACTIVE GAMES */}
                <div className="mt-8">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400">
                            Available games
                        </h3>

                        {!loading && (
                            <span className="text-xs text-gray-500">
                                {games.length} {games.length === 1 ? "game" : "games"}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-gray-400">
                            Loading games...
                        </div>
                    ) : games.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                            <div className="text-3xl">🎮</div>
                            <p className="mt-3 text-sm text-gray-400">No games available.</p>
                            <p className="mt-1 text-xs text-gray-500">
                                Start one above and wait for another player.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {games.map((game) => {
                                const info = getGameInfo(game.type);
                                const isCreator =
                                    Number(game.createdBy) === Number(currentUser?.id);
                                const isPlaying = game.status === "PLAYING";

                                return (
                                    <div
                                        key={game.id}
                                        className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
                                                {info?.icon}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="font-medium text-white">
                                                    {info?.title}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500">
                                                    {isPlaying
                                                        ? "Game in progress"
                                                        : isCreator
                                                        ? "Waiting for opponent"
                                                        : "Waiting for a player"}
                                                </div>
                                            </div>
                                        </div>

                                        {!isCreator && game.status === "WAITING" && (
                                            <button
                                                onClick={() => openInvitation(game)}
                                                className="shrink-0 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
                                            >
                                                View Invite
                                            </button>
                                        )}

                                        {isCreator && game.status === "WAITING" && (
                                            <span className="shrink-0 rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                                                Waiting
                                            </span>
                                        )}

                                        {isPlaying && (
                                            <button
                                                onClick={() =>
                                                    onGameJoined?.({
                                                        ...game,
                                                        isReceiver: false,
                                                    })
                                                }
                                                className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200"
                                            >
                                                Open
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}