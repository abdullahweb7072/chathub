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
    const [joining, setJoining] = useState(false);

    const userId = Number(currentUser?.id);

    // ========================================================
    // KEEP GAME STATE IN SYNC WITH PROP
    // ========================================================

    useEffect(() => {
        if (!game) {
            return;
        }

        setCurrentGame((previous) => {
            // Prevent incoming prop updates from flipping isReceiver back to true if already joined locally
            const alreadyJoined = previous?.isReceiver === false;

            return {
                ...game,

                // Preserve role information if it already exists.
                isCreator:
                    game.isCreator ??
                    previous?.isCreator ??
                    false,

                isReceiver: alreadyJoined
                    ? false
                    : (game.isReceiver ??
                      previous?.isReceiver ??
                      false),
            };
        });
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
        if (!currentUser?.id) {
            return null;
        }

        // Safely parse IDs as strings to prevent String vs Number mismatches
        const currentIdStr = String(currentUser.id);
        const playerXStr = players.X != null ? String(players.X) : null;
        const playerOStr = players.O != null ? String(players.O) : null;

        if (playerXStr === currentIdStr) {
            return "X";
        }

        if (playerOStr === currentIdStr) {
            return "O";
        }

        return null;
    }, [players.X, players.O, currentUser?.id]);

    // ========================================================
    // ROLE
    // ========================================================

    const isCreator = Boolean(
        currentGame?.isCreator
    );

    // If mySymbol exists (meaning user is officially registered in players list), force isReceiver to false.
    const isReceiver =
        Boolean(currentGame?.isReceiver) && !mySymbol;

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
    // JOIN GAME
    //
    // IMPORTANT:
    // Receiver does NOT automatically join anymore.
    // The receiver must explicitly click JOIN GAME.
    // ========================================================

    const joinGame = () => {
        if (
            !currentGame?.id ||
            joining
        ) {
            return;
        }

        setJoining(true);
        setError("");

        socket.emit(
            "join_game",
            {
                gameId: currentGame.id,
            },
            (response) => {
                if (!response?.success) {
                    console.error(
                        "❌ JOIN GAME FAILED:",
                        response?.message
                    );

                    setError(
                        response?.message ||
                            "Failed to join game."
                    );

                    setJoining(false);

                    return;
                }

                console.log(
                    "🎮 GAME JOINED SUCCESSFULLY:",
                    response
                );

                /*
                 * If the server returns the updated game,
                 * use it immediately.
                 */
                if (response?.game) {
                    setCurrentGame((previous) => ({
                        ...response.game,

                        isCreator:
                            previous?.isCreator ??
                            false,

                        isReceiver: false,
                    }));
                } else {
                    /*
                     * The server may instead emit
                     * game_joined / game_updated.
                     * Those socket listeners below will
                     * update the state.
                     */
                    setCurrentGame((previous) => ({
                        ...previous,
                        isReceiver: false,
                    }));
                }

                setJoining(false);
            }
        );
    };

    // ========================================================
    // SOCKET EVENTS
    // ========================================================

    useEffect(() => {
        const gameId = Number(
            currentGame?.id
        );

        if (!gameId) {
            return;
        }

        // ----------------------------------------------------
        // GAME UPDATED
        // ----------------------------------------------------

        const handleGameUpdated = (
            updatedGame
        ) => {
            if (
                Number(updatedGame?.id) !==
                gameId
            ) {
                return;
            }

            setCurrentGame((previous) => ({
                ...updatedGame,

                isCreator:
                    previous?.isCreator ??
                    false,

                isReceiver:
                    previous?.isReceiver === false
                        ? false
                        : (previous?.isReceiver ?? false),
            }));

            setError("");
            setJoining(false);
        };

        // ----------------------------------------------------
        // GAME JOINED
        // ----------------------------------------------------

        const handleGameJoined = (
            joinedGame
        ) => {
            if (
                Number(joinedGame?.id) !==
                gameId
            ) {
                return;
            }

            console.log(
                "🎮 GAME JOINED:",
                joinedGame
            );

            setCurrentGame((previous) => ({
                ...joinedGame,

                isCreator:
                    previous?.isCreator ??
                    false,

                // Once this event arrives, this
                // user has joined the game.
                isReceiver: false,
            }));

            setError("");
            setJoining(false);
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

            setCurrentGame((previous) => ({
                ...finishedGame,

                isCreator:
                    previous?.isCreator ??
                    false,

                isReceiver:
                    previous?.isReceiver ??
                    false,
            }));
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

            setCurrentGame((previous) => ({
                ...cancelledGame,

                isCreator:
                    previous?.isCreator ??
                    false,

                isReceiver:
                    previous?.isReceiver ??
                    false,
            }));

            setError(
                "This game has been cancelled."
            );

            setJoining(false);
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

            if (data?.game) {
                setCurrentGame((previous) => ({
                    ...data.game,

                    isCreator:
                        previous?.isCreator ??
                        false,

                    isReceiver:
                        previous?.isReceiver ??
                        false,
                }));
            }

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
    // RECEIVER INVITATION
    //
    // IMPORTANT:
    // This is rendered BEFORE the actual game board.
    // Receiver must explicitly click JOIN GAME.
    // ========================================================

    if (
        isReceiver &&
        !mySymbol
    ) {
        return (
            <div className="flex max-h-[90vh] flex-col">
                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Tic-Tac-Toe
                        </h2>

                        <p className="text-xs text-gray-400">
                            Game Invitation
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

                {/* ==================================================
                    INVITATION
                ================================================== */}

                <div className="overflow-y-auto p-6">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl">
                            🎮
                        </div>

                        <h3 className="mt-5 text-xl font-semibold text-white">
                            Game Invitation
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            You have been invited
                            to play Tic-Tac-Toe.
                        </p>

                        {currentGame?.createdBy && (
                            <p className="mt-2 text-xs text-gray-500">
                                Player ID:{" "}
                                {currentGame.createdBy}
                            </p>
                        )}

                        {error && (
                            <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        <div className="mt-6 flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={joinGame}
                                disabled={joining}
                                className="w-full rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {joining
                                    ? "Joining..."
                                    : "🎮 Join Game"}
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                disabled={joining}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================
    // NORMAL GAME UI
    // ========================================================

    return (
        <div className="flex max-h-[90vh] flex-col">
            {/* ==================================================
                HEADER
            ================================================== */}

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

            {/* ==================================================
                GAME
            ================================================== */}

            <div className="overflow-y-auto p-5">
                {/* ==================================================
                    PLAYERS
                ================================================== */}

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

                {/* ==================================================
                    STATUS
                ================================================== */}

                <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <div className="font-semibold text-white">
                        {status.title}
                    </div>

                    <div className="mt-1 text-sm text-gray-400">
                        {status.description}
                    </div>
                </div>

                {/* ==================================================
                    BOARD
                ================================================== */}

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
                                        )
                                    }
                                    className={`aspect-square rounded-xl border text-4xl font-bold transition ${
                                        isWinningCell
                                            ? "border-green-400 bg-green-400/20 shadow-[0_0_20px_rgba(74,222,128,0.15)]"
                                            : "border-white/10 bg-white/[0.04]"
                                    } ${
                                        cell ===
                                        null
                                            ? isMyTurn
                                                ? "cursor-pointer hover:border-white/20 hover:bg-white/[0.10]"
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

                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (
                    <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
                        {error}
                    </div>
                )}

                {/* ==================================================
                    ACTIONS
                ================================================== */}

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