"use client";

import { useEffect, useMemo, useState } from "react";
import { socket } from "@/lib/socket";

export default function TicTacToe({ game, currentUser, onClose }) {
    const [currentGame, setCurrentGame] = useState(game);
    const [error, setError] = useState("");
    const [leaving, setLeaving] = useState(false);
    const [joining, setJoining] = useState(false);

    // Normalize IDs to strings for robust comparison
    const userId = currentUser?.id != null ? String(currentUser.id) : null;

    // ========================================================
    // KEEP GAME STATE IN SYNC WITH PROP
    // ========================================================
    useEffect(() => {
        if (!game) return;

        setCurrentGame((previous) => ({
            ...game,
            // Retain explicit isReceiver flag passed down from lobby unless explicitly cleared
            isReceiver: game.isReceiver ?? previous?.isReceiver ?? false,
        }));
    }, [game]);

    // ========================================================
    // SAFE PARSING GAME STATE
    // ========================================================
    const state = useMemo(() => {
        if (!currentGame?.state) return {};
        if (typeof currentGame.state === "string") {
            try {
                return JSON.parse(currentGame.state);
            } catch (err) {
                console.error("Failed to parse game state:", err);
                return {};
            }
        }
        return currentGame.state;
    }, [currentGame?.state]);

    const players = state?.players || currentGame?.players || {};
    const board = Array.isArray(state?.board) ? state.board : Array(9).fill(null);
    const turn = state?.turn || null;
    const winner = state?.winner || null;
    const draw = Boolean(state?.draw);

    const gameStatus = (currentGame?.status || "").toUpperCase();

    // Normalized player IDs
    const playerXId = players.X != null ? String(players.X) : null;
    const playerOId = players.O != null ? String(players.O) : null;
    const createdById = currentGame?.createdBy != null ? String(currentGame.createdBy) : null;

    // ========================================================
    // MY SYMBOL & RECEIVER DETERMINATION
    // ========================================================
    const mySymbol = useMemo(() => {
        if (!userId) return null;
        if (playerXId === userId) return "X";
        if (playerOId === userId) return "O";
        return null;
    }, [playerXId, playerOId, userId]);

    // Receiver view triggers if explicit prop is set OR if user is not creator and player O hasn't joined yet
    const isReceiver = useMemo(() => {
        // If already assigned a symbol, board is active
        if (mySymbol !== null) return false;

        // Explicit isReceiver flag takes priority
        if (currentGame?.isReceiver) return true;

        // Fallback check: Not creator & Player O hasn't joined
        const isCreator = createdById === userId;
        const playerOHasNotJoined = playerOId === null;

        return !isCreator && playerOHasNotJoined;
    }, [mySymbol, currentGame?.isReceiver, createdById, userId, playerOId]);

    const opponentJoined = playerXId !== null && playerOId !== null;

    const isMyTurn =
        mySymbol !== null &&
        turn === mySymbol &&
        !winner &&
        !draw &&
        opponentJoined &&
        gameStatus === "PLAYING";

    // ========================================================
    // SOCKET EVENTS
    // ========================================================
    useEffect(() => {
        const gameId = currentGame?.id ? String(currentGame.id) : null;
        if (!gameId) return;

        const handleGameUpdated = (updatedGame) => {
            if (String(updatedGame?.id) !== gameId) return;

            setCurrentGame((previous) => ({
                ...updatedGame,
                // Only dismiss receiver view if current user now has a symbol
                isReceiver: previous.isReceiver && !updatedGame?.players?.O ? true : false,
            }));
            setError("");
        };

        const handleGameError = (err) => {
            if (err?.gameId && String(err.gameId) !== gameId) return;
            setError(err?.message || "An error occurred during the move.");
        };

        socket.on("game_updated", handleGameUpdated);
        socket.on("game_joined", handleGameUpdated);
        socket.on("game_error", handleGameError);

        return () => {
            socket.off("game_updated", handleGameUpdated);
            socket.off("game_joined", handleGameUpdated);
            socket.off("game_error", handleGameError);
        };
    }, [currentGame?.id]);

    // ========================================================
    // JOIN GAME
    // ========================================================
    const joinGame = () => {
        if (!currentGame?.id || joining) return;

        setJoining(true);
        setError("");

        socket.emit(
            "join_game",
            { gameId: currentGame.id },
            (response) => {
                if (!response?.success) {
                    setError(response?.message || "Failed to join game.");
                    setJoining(false);
                    return;
                }

                const updatedGame = response.game || currentGame;
                const parsedState =
                    typeof updatedGame.state === "string"
                        ? JSON.parse(updatedGame.state)
                        : updatedGame.state || {};

                setCurrentGame({
                    ...updatedGame,
                    isReceiver: false,
                    state: {
                        ...parsedState,
                        players: {
                            ...parsedState.players,
                            O: currentUser?.id,
                        },
                    },
                });

                setJoining(false);
            }
        );
    };

    // ========================================================
    // MAKE MOVE
    // ========================================================
    const makeMove = (index) => {
        if (!isMyTurn || board[index] !== null || !currentGame?.id) return;

        setError("");

        socket.emit(
            "game_move",
            {
                gameId: currentGame.id,
                index,
            },
            (response) => {
                if (response && !response.success) {
                    setError(response.message || "Invalid move.");
                }
            }
        );
    };

    // ========================================================
    // LEAVE / DECLINE GAME
    // ========================================================
    const leaveGame = async () => {
        const targetId = currentGame?.id;
        if (!targetId || leaving) return;

        try {
            setLeaving(true);
            setError("");

            const response = await fetch(`/api/games/${targetId}/leave`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameId: targetId }),
                credentials: "include",
            });

            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "Failed to leave game.");
            }

            onClose?.();
        } catch (err) {
            console.error("❌ LEAVE GAME ERROR:", err);
            setError(err?.message || "Failed to leave game.");
        } finally {
            setLeaving(false);
        }
    };

    // ========================================================
    // INVITATION SCREEN (RECEIVER VIEW)
    // ========================================================
    if (isReceiver) {
        return (
            <div className="flex max-h-[90vh] flex-col p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-2xl">
                    🎮
                </div>
                <h3 className="text-xl font-semibold text-white">Game Invitation</h3>
                <p className="mt-2 text-sm text-gray-400">
                    You have been invited to play Tic-Tac-Toe.
                </p>

                {error && <div className="mt-4 text-sm text-red-400">{error}</div>}

                <div className="mt-6 flex flex-col gap-3">
                    <button
                        onClick={joinGame}
                        disabled={joining}
                        className="rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
                    >
                        {joining ? "Joining..." : "Accept & Join Game"}
                    </button>
                    <button
                        onClick={leaveGame}
                        disabled={leaving}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                        {leaving ? "Declining..." : "Decline & Cancel"}
                    </button>
                </div>
            </div>
        );
    }

    // ========================================================
    // MAIN GAME BOARD UI
    // ========================================================
    return (
        <div className="flex max-h-[90vh] flex-col p-5">
            {/* PLAYERS CARD */}
            <div className="mb-4 grid grid-cols-2 gap-3">
                <div
                    className={`rounded-xl border p-3 ${
                        turn === "X" && gameStatus === "PLAYING"
                            ? "border-blue-500/50 bg-blue-500/10"
                            : "border-white/10"
                    }`}
                >
                    <div className="text-xs text-gray-400">Player X</div>
                    <div className="font-semibold text-white">
                        {playerXId && playerXId === userId
                            ? "You"
                            : playerXId
                            ? "Opponent"
                            : "Waiting..."}
                    </div>
                </div>

                <div
                    className={`rounded-xl border p-3 ${
                        turn === "O" && gameStatus === "PLAYING"
                            ? "border-blue-500/50 bg-blue-500/10"
                            : "border-white/10"
                    }`}
                >
                    <div className="text-xs text-gray-400">Player O</div>
                    <div className="font-semibold text-white">
                        {playerOId && playerOId === userId
                            ? "You"
                            : playerOId
                            ? "Opponent"
                            : "Waiting..."}
                    </div>
                </div>
            </div>

            {/* STATUS BANNER */}
            <div className="mb-4 text-center text-sm font-medium">
                {winner ? (
                    <span className="text-base font-bold text-emerald-400">
                        {winner === mySymbol ? "🎉 You Won!" : "❌ Opponent Won!"}
                    </span>
                ) : draw ? (
                    <span className="text-base font-bold text-yellow-400">🤝 It's a Draw!</span>
                ) : gameStatus !== "PLAYING" || !opponentJoined ? (
                    <span className="text-gray-400">⏳ Waiting for opponent to join...</span>
                ) : isMyTurn ? (
                    <span className="animate-pulse text-emerald-400">🟢 Your Turn ({mySymbol})</span>
                ) : (
                    <span className="text-gray-400">⏳ Opponent's Turn</span>
                )}
            </div>

            {/* GAME BOARD GRID */}
            <div className="mx-auto grid w-full max-w-[360px] grid-cols-3 gap-2">
                {board.map((cell, idx) => {
                    const isClickable = isMyTurn && cell === null;

                    return (
                        <button
                            key={idx}
                            disabled={!isClickable}
                            onClick={() => makeMove(idx)}
                            className={`aspect-square rounded-xl border border-white/10 text-4xl font-bold transition-all ${
                                cell === "X"
                                    ? "text-blue-400"
                                    : cell === "O"
                                    ? "text-rose-400"
                                    : "text-white"
                            } ${
                                isClickable
                                    ? "cursor-pointer hover:bg-white/10 active:scale-95"
                                    : "cursor-not-allowed opacity-80"
                            }`}
                        >
                            {cell}
                        </button>
                    );
                })}
            </div>

            {error && <div className="mt-4 text-center text-sm text-red-400">{error}</div>}

            {/* LEAVE BUTTON */}
            <div className="mt-6 flex justify-center">
                <button
                    onClick={leaveGame}
                    disabled={leaving}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                    {leaving ? "Leaving..." : "Leave Game"}
                </button>
            </div>
        </div>
    );
}