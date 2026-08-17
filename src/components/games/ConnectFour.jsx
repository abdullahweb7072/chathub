"use client";

import { useEffect, useMemo, useState } from "react";

import { socket } from "@/lib/socket";

// ============================================================
// CONNECT FOUR
// ============================================================

export default function ConnectFour({
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
        : Array.from(
              { length: 6 },
              () => Array(7).fill(null)
          );

    const turn = state?.turn || null;

    const winner = state?.winner || null;

    const draw = Boolean(state?.draw);

    // ========================================================
    // MY COLOR
    // ========================================================

    const myColor = useMemo(() => {
        if (Number(players.RED) === userId) {
            return "RED";
        }

        if (
            Number(players.YELLOW) ===
            userId
        ) {
            return "YELLOW";
        }

        return null;
    }, [
        players.RED,
        players.YELLOW,
        userId,
    ]);

    // ========================================================
    // OPPONENT JOINED
    // ========================================================

    const opponentJoined =
        players.RED != null &&
        players.YELLOW != null;

    // ========================================================
    // MY TURN
    // ========================================================

    const isMyTurn =
        myColor !== null &&
        turn === myColor &&
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

        const rows = 6;
        const columns = 7;

        const directions = [
            [0, 1],  // horizontal
            [1, 0],  // vertical
            [1, 1],  // diagonal
            [1, -1], // diagonal
        ];

        const cells = [];

        for (let row = 0; row < rows; row++) {
            for (
                let column = 0;
                column < columns;
                column++
            ) {
                if (
                    board[row]?.[column] !==
                    winner
                ) {
                    continue;
                }

                for (const [
                    rowDirection,
                    columnDirection,
                ] of directions) {
                    const line = [
                        [row, column],
                    ];

                    let r =
                        row +
                        rowDirection;

                    let c =
                        column +
                        columnDirection;

                    while (
                        r >= 0 &&
                        r < rows &&
                        c >= 0 &&
                        c < columns &&
                        board[r]?.[c] ===
                            winner
                    ) {
                        line.push([r, c]);

                        r +=
                            rowDirection;

                        c +=
                            columnDirection;
                    }

                    if (line.length >= 4) {
                        return line;
                    }
                }
            }
        }

        return cells;
    }, [board, winner]);

    // ========================================================
    // CHECK WINNING CELL
    // ========================================================

    const isWinningCell = (
        row,
        column
    ) => {
        return winningCells.some(
            ([winningRow, winningColumn]) =>
                winningRow === row &&
                winningColumn === column
        );
    };

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

            setCurrentGame(updatedGame);
            setError("");
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

    const makeMove = (column) => {
        if (!isMyTurn) {
            return;
        }

        // ----------------------------------------------------
        // CHECK WHETHER COLUMN IS FULL
        // ----------------------------------------------------

        if (
            board[0]?.[column] !== null
        ) {
            return;
        }

        setError("");

        socket.emit(
            "game_move",
            {
                gameId:
                    currentGame.id,

                column,
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

            const response =
                await fetch(
                    `/api/games/${currentGame.id}/leave`,
                    {
                        method: "POST",
                        credentials:
                            "include",
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

            setCurrentGame(
                data.game
            );

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
            if (
                winner === myColor
            ) {
                return {
                    title:
                        "You Win! 🎉",
                    description:
                        `You won as ${myColor}.`,
                };
            }

            if (winner) {
                return {
                    title:
                        "You Lose",
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
        }

        if (winner) {
            if (
                winner === myColor
            ) {
                return {
                    title:
                        "You Win! 🎉",
                    description:
                        `You won as ${myColor}.`,
                };
            }

            return {
                title:
                    "You Lose",
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
                title:
                    "Waiting for Opponent",
                description:
                    "Another player needs to join.",
            };
        }

        if (isMyTurn) {
            return {
                title:
                    "Your Turn",
                description:
                    `You are playing as ${myColor}.`,
            };
        }

        return {
            title:
                "Opponent's Turn",
            description:
                `You are playing as ${myColor}.`,
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
                        Connect Four
                    </h2>

                    <p className="text-xs text-gray-400">
                        Get four in a row
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
                    {/* RED */}

                    <div
                        className={`rounded-xl border p-3 ${
                            myColor ===
                            "RED"
                                ? "border-red-400/40 bg-red-400/10"
                                : "border-white/10 bg-white/[0.03]"
                        }`}
                    >
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="h-3 w-3 rounded-full bg-red-500" />

                            Player Red
                        </div>

                        <div className="mt-1 font-semibold text-white">
                            {Number(
                                players.RED
                            ) === userId
                                ? "You"
                                : players.RED
                                ? "Opponent"
                                : "Waiting..."}
                        </div>
                    </div>

                    {/* YELLOW */}

                    <div
                        className={`rounded-xl border p-3 ${
                            myColor ===
                            "YELLOW"
                                ? "border-yellow-400/40 bg-yellow-400/10"
                                : "border-white/10 bg-white/[0.03]"
                        }`}
                    >
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="h-3 w-3 rounded-full bg-yellow-400" />

                            Player Yellow
                        </div>

                        <div className="mt-1 font-semibold text-white">
                            {Number(
                                players.YELLOW
                            ) === userId
                                ? "You"
                                : players.YELLOW
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
                {/* COLUMN CONTROLS */}
                {/* ================================================== */}

                <div className="mx-auto mb-2 grid w-full max-w-[420px] grid-cols-7 gap-1.5">
                    {Array.from(
                        { length: 7 },
                        (_, column) => {
                            const columnFull =
                                board[0]?.[
                                    column
                                ] !== null;

                            return (
                                <button
                                    key={
                                        column
                                    }
                                    type="button"
                                    disabled={
                                        !isMyTurn ||
                                        columnFull
                                    }
                                    onClick={() =>
                                        makeMove(
                                            column
                                        )
                                    }
                                    aria-label={`Drop piece in column ${
                                        column +
                                        1
                                    }`}
                                    className={`flex h-7 items-center justify-center rounded-md text-sm font-bold transition ${
                                        isMyTurn &&
                                        !columnFull
                                            ? "cursor-pointer bg-white/10 text-white hover:bg-white/20"
                                            : "cursor-not-allowed bg-white/[0.03] text-gray-600"
                                    }`}
                                >
                                    ↓
                                </button>
                            );
                        }
                    )}
                </div>

                {/* ================================================== */}
                {/* BOARD */}
                {/* ================================================== */}

                <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-white/10 bg-blue-500/10 p-2">
                    <div className="grid grid-cols-7 gap-1.5">
                        {board.map(
                            (
                                row,
                                rowIndex
                            ) =>
                                Array.isArray(
                                    row
                                )
                                    ? row.map(
                                          (
                                              cell,
                                              columnIndex
                                          ) => {
                                              const winning =
                                                  isWinningCell(
                                                      rowIndex,
                                                      columnIndex
                                                  );

                                              return (
                                                  <button
                                                      key={`${rowIndex}-${columnIndex}`}
                                                      type="button"
                                                      disabled={
                                                          true
                                                      }
                                                      aria-label={`Row ${
                                                          rowIndex +
                                                          1
                                                      }, column ${
                                                          columnIndex +
                                                          1
                                                      }`}
                                                      className={`aspect-square rounded-full border transition ${
                                                          winning
                                                              ? "border-green-300 bg-green-400 shadow-[0_0_16px_rgba(74,222,128,0.55)]"
                                                              : cell ===
                                                                "RED"
                                                              ? "border-red-400/50 bg-red-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)]"
                                                              : cell ===
                                                                "YELLOW"
                                                              ? "border-yellow-300/50 bg-yellow-400 shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)]"
                                                              : "border-white/10 bg-black/20"
                                                      }`}
                                                  />
                                              );
                                          }
                                      )
                                    : null
                        )}
                    </div>
                </div>

                {/* ================================================== */}
                {/* MOBILE COLUMN CONTROLS */}
                {/* ================================================== */}

                <div className="mx-auto mt-3 grid w-full max-w-[420px] grid-cols-7 gap-1.5">
                    {Array.from(
                        { length: 7 },
                        (_, column) => {
                            const columnFull =
                                board[0]?.[
                                    column
                                ] !== null;

                            return (
                                <button
                                    key={
                                        column
                                    }
                                    type="button"
                                    disabled={
                                        !isMyTurn ||
                                        columnFull
                                    }
                                    onClick={() =>
                                        makeMove(
                                            column
                                        )
                                    }
                                    className={`rounded-lg px-1 py-2 text-xs font-medium transition ${
                                        isMyTurn &&
                                        !columnFull
                                            ? "bg-white/10 text-white hover:bg-white/20"
                                            : "bg-white/[0.03] text-gray-600"
                                    }`}
                                >
                                    {column +
                                        1}
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
                        onClick={
                            leaveGame
                        }
                        disabled={
                            leaving
                        }
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