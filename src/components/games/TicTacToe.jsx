"use client";

import { useEffect, useMemo, useState } from "react";
import { socket } from "@/lib/socket";

export default function TicTacToe({ game, currentUser, onClose }) {
    const [currentGame, setCurrentGame] = useState(game);
    const [error, setError] = useState("");
    const [leaving, setLeaving] = useState(false);
    const [joining, setJoining] = useState(false);

    const userId = currentUser?.id != null ? String(currentUser.id) : null;

    // ========================================================
    // KEEP GAME STATE IN SYNC WITH PROP
    // ========================================================
    useEffect(() => {
        if (!game) return;

        setCurrentGame((previous) => ({
            ...game,
            isCreator: game.isCreator ?? previous?.isCreator ?? false,
            // Force isReceiver to false if the user has joined or has a symbol assigned
            isReceiver:
                previous?.isReceiver === false
                    ? false
                    : (game.isReceiver ?? previous?.isReceiver ?? false),
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

    // ========================================================
    // MY SYMBOL
    // ========================================================
    const mySymbol = useMemo(() => {
        if (!userId) return null;

        const playerXStr = players.X != null ? String(players.X) : null;
        const playerOStr = players.O != null ? String(players.O) : null;

        if (playerXStr === userId) return "X";
        if (playerOStr === userId) return "O";

        return null;
    }, [players.X, players.O, userId]);

    // Force receiver mode off if mySymbol is resolved or players.O exists
    const isReceiver =
        Boolean(currentGame?.isReceiver) && !mySymbol && !players.O;

    const opponentJoined = players.X != null && players.O != null;

    const isMyTurn =
        mySymbol !== null &&
        turn === mySymbol &&
        !winner &&
        !draw &&
        opponentJoined &&
        currentGame?.status === "PLAYING";

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
    // SOCKET EVENTS
    // ========================================================
    useEffect(() => {
        const gameId = currentGame?.id ? String(currentGame.id) : null;
        if (!gameId) return;

        const handleGameUpdated = (updatedGame) => {
            if (String(updatedGame?.id) !== gameId) return;

            setCurrentGame((previous) => ({
                ...updatedGame,
                isReceiver: false,
            }));
            setError("");
        };

        socket.on("game_updated", handleGameUpdated);
        socket.on("game_joined", handleGameUpdated);

        return () => {
            socket.off("game_updated", handleGameUpdated);
            socket.off("game_joined", handleGameUpdated);
        };
    }, [currentGame?.id]);

    // ========================================================
    // LEAVE GAME
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
    // INVITATION SCREEN
    // ========================================================
    if (isReceiver) {
        return (
            <div className="flex max-h-[90vh] flex-col p-6 text-center">
                <h3 className="text-xl font-semibold text-white">Game Invitation</h3>
                <p className="mt-2 text-sm text-gray-400">You have been invited to play Tic-Tac-Toe.</p>
                {error && <div className="mt-4 text-sm text-red-400">{error}</div>}
                <div className="mt-6 flex flex-col gap-3">
                    <button
                        onClick={joinGame}
                        disabled={joining}
                        className="rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white hover:bg-blue-400"
                    >
                        {joining ? "Joining..." : "🎮 Join Game"}
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-white/10 py-3 text-sm text-gray-300"
                    >
                        Decline
                    </button>
                </div>
            </div>
        );
    }

    // ========================================================
    // MAIN GAME UI
    // ========================================================
    return (
        <div className="flex max-h-[90vh] flex-col p-5">
            <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 p-3">
                    <div className="text-xs text-gray-400">Player X</div>
                    <div className="font-semibold text-white">
                        {players.X && String(players.X) === userId
                            ? "You"
                            : players.X
                            ? "Opponent"
                            : "Waiting..."}
                    </div>
                </div>
                <div className="rounded-xl border border-white/10 p-3">
                    <div className="text-xs text-gray-400">Player O</div>
                    <div className="font-semibold text-white">
                        {players.O && String(players.O) === userId
                            ? "You"
                            : players.O
                            ? "Opponent"
                            : "Waiting..."}
                    </div>
                </div>
            </div>

            <div className="mx-auto grid w-full max-w-[360px] grid-cols-3 gap-2">
                {board.map((cell, idx) => (
                    <button
                        key={idx}
                        disabled={!isMyTurn || cell !== null}
                        onClick={() =>
                            socket.emit("game_move", {
                                gameId: currentGame.id,
                                index: idx,
                            })
                        }
                        className="aspect-square rounded-xl border border-white/10 text-4xl font-bold text-white"
                    >
                        {cell}
                    </button>
                ))}
            </div>

            {error && <div className="mt-4 text-center text-sm text-red-400">{error}</div>}

            <div className="mt-6 flex justify-center">
                <button
                    onClick={leaveGame}
                    disabled={leaving}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
                >
                    {leaving ? "Leaving..." : "Leave Game"}
                </button>
            </div>
        </div>
    );
}