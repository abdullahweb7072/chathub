"use client";

import { useEffect, useMemo, useState } from "react";

import { socket } from "@/lib/socket";

// ============================================================
// TIC TAC TOE
// ============================================================

export default function TicTacToe({
    game,
    currentUser,
    onClose,
}) {
    const [currentGame, setCurrentGame] = useState(game);
    const [error, setError] = useState("");
    const [leaving, setLeaving] = useState(false);

    const userId = Number(currentUser?.id);

    // ========================================================
    // KEEP GAME STATE IN SYNC WITH PROP
    // ========================================================

    useEffect(() => {
        if (game) {
            setCurrentGame(game);
        }
    }, [game]);

    // ========================================================
    // GAME STATE
    // ========================================================

    const state = currentGame?.state || {};

    const players = state?.players || {};

    const board = Array.isArray(state?.board)
        ? state.board
        : Array(9).fill(null);

    const turn = state?.turn || null;

    const winner = state?.winner || null;

    const draw = Boolean(state?.draw);

    // ========================================================
    // MY SYMBOL
    // ========================================================

    const mySymbol = useMemo(() => {
        if (Number(players.X) === userId) {
            return "X";
        }

        if (Number(players.O) === userId) {
            return "O";
        }

        return null;
    }, [players.X, players.O, userId]);

    // ========================================================
    // OPPONENT JOINED
    // ========================================================

    const opponentJoined =
        players.X != null &&
        players.O != null;

    // ========================================================
    // MY TURN
    // ========================================================

    const isMyTurn =
        mySymbol !== null &&
        turn === mySymbol &&
        !winner &&
        !draw &&
        opponentJoined &&
        currentGame?.status === "PLAYING";

    // ========================================================
    // WINNING CELLS
    // ========================================================

    const winningCells = useMemo(() => {
        if (!winner) {
            return [];
        }

        const winningLines = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],

            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],

            [0, 4, 8],
            [2, 4, 6],
        ];

        for (const line of winningLines) {
            const [a, b, c] = line;

            if (
                board[a] === winner &&
                board[b] === winner &&
                board[c] === winner
            ) {
                return line;
            }
        }

        return [];
    }, [board, winner]);

    // ========================================================
    // JOIN GAME ROOM
    // ========================================================

    useEffect(() => {
        if (!currentGame?.id) {
            return;
        }

        socket.emit(
            "join_game",
            {
                gameId: currentGame.id,
            },
            (response) => {
                if (!response?.success) {
                    console.error(
                        "❌ JOIN GAME ROOM FAILED:",
                        response?.message
                    );

                    setError(
                        response?.message ||
                            "Failed to join game."
                    );
                }
            }
        );

        return () => {
            socket.emit(
                "leave_game",
                {
                    gameId: currentGame.id,
                }
            );
        };
    }, [currentGame?.id]);

    // ========================================================
    // SOCKET EVENTS
    // ========================================================

    useEffect(() => {
        const gameId = Number(currentGame?.id);

        if (!gameId) {
            return;
        }

        // ----------------------------------------------------
        // GAME UPDATED
        // ----------------------------------------------------

        const handleGameUpdated = (updatedGame) => {
            if (
                Number(updatedGame?.id) !==
                gameId
            ) {
                return;
            }

            setCurrentGame(updatedGame);
            setError("");
        };

        // ----------------------------------------------------
        // GAME JOINED
        // ----------------------------------------------------

        const handleGameJoined = (joinedGame) => {
            if (
                Number(joinedGame?.id) !==
                gameId
            ) {
                return;
            }

            setCurrentGame(joinedGame);
            setError("");
        };

        // ----------------------------------------------------
        // GAME FINISHED
        // ----------------------------------------------------

        const handleGameFinished = (
            finishedGame
        ) => {
            if (
                Number(finishedGame?.id) !==
                gameId
            ) {
                return;
            }

            setCurrentGame(finishedGame);
        };

        // ----------------------------------------------------
        // GAME CANCELLED
        // ----------------------------------------------------

        const handleGameCancelled = (
            cancelledGame
        ) => {
            if (
                Number(cancelledGame?.id) !==
                gameId
            ) {
                return;
            }

            setCurrentGame(cancelledGame);

            setError(
                "This game has been cancelled."
            );
        };

        socket.on(
            "game_updated",
            handleGameUpdated
        );

        socket.on(
            "game_joined",
            handleGameJoined
        );

        socket.on(
            "game_finished",
            handleGameFinished
        );

        socket.on(
            "game_cancelled",
            handleGameCancelled
        );

        return () => {
            socket.off(
                "game_updated",
                handleGameUpdated
            );

            socket.off(
                "game_joined",
                handleGameJoined
            );

            socket.off(
                "game_finished",
                handleGameFinished
            );

            socket.off(
                "game_cancelled",
                handleGameCancelled
            );
        };
    }, [currentGame?.id]);

    // ========================================================
    // MAKE MOVE
    // ========================================================

    const makeMove = (index) => {
        if (!isMyTurn) {
            return;
        }

        if (board[index] !== null) {
            return;
        }

        setError("");

        socket.emit(
            "game_move",
            {
                gameId: currentGame.id,
                index,
            },
            (response) => {
                if (!response?.success) {
                    setError(
                        response?.message ||
                            "Move could not be made."
                    );
                }
            }
        );
    };

    // ========================================================
    // LEAVE GAME
    // ========================================================

    const leaveGame = async () => {
        if (
            !currentGame?.id ||
            leaving
        ) {
            return;
        }

        try {
            setLeaving(true);
            setError("");

            const response = await fetch(
                `/api/games/${currentGame.id}/leave`,
                {
                    method: "POST",
                    credentials: "include",
                }
            );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                        "Failed to leave game."
                );
            }

            setCurrentGame(data.game);

            onClose?.();
        } catch (error) {
            console.error(
                "❌ LEAVE GAME ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Failed to leave game."
            );
        } finally {
            setLeaving(false);
        }
    };

    // ========================================================
    // STATUS
    // ========================================================

    const getStatus = () => {
        if (
            currentGame?.status ===
            "CANCELLED"
        ) {
            return {
                title: "Game Cancelled",
                description:
                    "This game is no longer active.",
            };
        }

        if (
            currentGame?.status ===
            "FINISHED"
        ) {
            if (winner === mySymbol) {
                return {
                    title: "You Win! 🎉",
                    description:
                        `You won as ${mySymbol}.`,
                };
            }

            if (winner) {
                return {
                    title: "You Lose",
                    description:
                        `Player ${winner} won the game.`,
                };
            }

            if (draw) {
                return {
                    title: "Draw",
                    description:
                        "The game ended in a draw.",
                };
            }
        }

        if (winner) {
            if (winner === mySymbol) {
                return {
                    title: "You Win! 🎉",
                    description:
                        `You won as ${mySymbol}.`,
                };
            }

            return {
                title: "You Lose",
                description:
                    `Player ${winner} won the game.`,
            };
        }

        if (draw) {
            return {
                title: "Draw",
                description:
                    "The board is full.",
            };
        }

        if (!opponentJoined) {
            return {
                title: "Waiting for Opponent",
                description:
                    "Another player needs to join.",
            };
        }

        if (isMyTurn) {
            return {
                title: "Your Turn",
                description:
                    `You are playing as ${mySymbol}.`,
            };
        }

        return {
            title: "Opponent's Turn",
            description:
                `You are playing as ${mySymbol}.`,
        };
    };

    const status = getStatus();

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="flex max-h-[90vh] flex-col">
            {/* ================================================== */}
            {/* HEADER */}
            {/* ================================================== */}

            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        Tic-Tac-Toe
                    </h2>

                    <p className="text-xs text-gray-400">
                        Best of one
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-3 py-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                >
                    ✕
                </button>
            </div>

            {/* ================================================== */}
            {/* GAME */}
            {/* ================================================== */}

            <div className="overflow-y-auto p-5">
                {/* ================================================== */}
                {/* PLAYERS */}
                {/* ================================================== */}

                <div className="mb-5 grid grid-cols-2 gap-3">
                    {/* PLAYER X */}

                    <div
                        className={`rounded-xl border p-3 ${
                            mySymbol === "X"
                                ? "border-blue-400/40 bg-blue-400/10"
                                : "border-white/10 bg-white/[0.03]"
                        }`}
                    >
                        <div className="text-xs text-gray-400">
                            Player X
                        </div>

                        <div className="mt-1 font-semibold text-white">
                            {Number(
                                players.X
                            ) === userId
                                ? "You"
                                : players.X
                                ? "Opponent"
                                : "Waiting..."}
                        </div>
                    </div>

                    {/* PLAYER O */}

                    <div
                        className={`rounded-xl border p-3 ${
                            mySymbol === "O"
                                ? "border-purple-400/40 bg-purple-400/10"
                                : "border-white/10 bg-white/[0.03]"
                        }`}
                    >
                        <div className="text-xs text-gray-400">
                            Player O
                        </div>

                        <div className="mt-1 font-semibold text-white">
                            {Number(
                                players.O
                            ) === userId
                                ? "You"
                                : players.O
                                ? "Opponent"
                                : "Waiting..."}
                        </div>
                    </div>
                </div>

                {/* ================================================== */}
                {/* STATUS */}
                {/* ================================================== */}

                <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <div className="font-semibold text-white">
                        {status.title}
                    </div>

                    <div className="mt-1 text-sm text-gray-400">
                        {status.description}
                    </div>
                </div>

                {/* ================================================== */}
                {/* BOARD */}
                {/* ================================================== */}

                <div className="mx-auto grid w-full max-w-[360px] grid-cols-3 gap-2">
                    {board.map(
                        (cell, index) => {
                            const isWinningCell =
                                winningCells.includes(
                                    index
                                );

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    disabled={
                                        !isMyTurn ||
                                        cell !==
                                            null
                                    }
                                    onClick={() =>
                                        makeMove(
                                            index
                                        )}
                                    className={`aspect-square rounded-xl border text-4xl font-bold transition ${
                                        isWinningCell
                                            ? "border-green-400 bg-green-400/20 shadow-[0_0_20px_rgba(74,222,128,0.15)]"
                                            : "border-white/10 bg-white/[0.04]"
                                    } ${
                                        cell ===
                                        null
                                            ? isMyTurn
                                                ? "cursor-pointer hover:bg-white/[0.10] hover:border-white/20"
                                                : "cursor-not-allowed"
                                            : ""
                                    }`}
                                >
                                    {cell ===
                                        "X" && (
                                        <span className="text-blue-400">
                                            X
                                        </span>
                                    )}

                                    {cell ===
                                        "O" && (
                                        <span className="text-purple-400">
                                            O
                                        </span>
                                    )}
                                </button>
                            );
                        }
                    )}
                </div>

                {/* ================================================== */}
                {/* ERROR */}
                {/* ================================================== */}

                {error && (
                    <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
                        {error}
                    </div>
                )}

                {/* ================================================== */}
                {/* ACTIONS */}
                {/* ================================================== */}

                <div className="mt-6 flex justify-center">
                    <button
                        type="button"
                        onClick={leaveGame}
                        disabled={leaving}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                        {leaving
                            ? "Leaving..."
                            : "Leave Game"}
                    </button>
                </div>
            </div>
        </div>
    );
}