"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { socket } from "@/lib/socket";

// ============================================================
// ROCK PAPER SCISSORS
// ============================================================

const CHOICES = [
    {
        value: "rock",
        label: "Rock",
        emoji: "✊",
    },
    {
        value: "paper",
        label: "Paper",
        emoji: "✋",
    },
    {
        value: "scissors",
        label: "Scissors",
        emoji: "✌️",
    },
];

// ============================================================
// COMPONENT
// ============================================================

export default function RockPaperScissors({
    game,
    currentUser,
    onClose,
}) {
    const [currentGame, setCurrentGame] =
        useState(game);

    const [error, setError] = useState("");

    const [leaving, setLeaving] =
        useState(false);

    const [submitting, setSubmitting] =
        useState(false);

    // ========================================================
    // USER
    // ========================================================

    const userId = Number(
        currentUser?.id
    );

    // ========================================================
    // GAME STATE
    // ========================================================

    const state =
        currentGame?.state || {};

    const players =
        state?.players || {};

    const choices =
        state?.choices || {};

    const winner =
        state?.winner || null;

    const roundFinished =
        Boolean(state?.roundFinished);

    // ========================================================
    // MY PLAYER
    // ========================================================

    const myPlayer = useMemo(() => {
        if (
            Number(players.player1) ===
            userId
        ) {
            return "player1";
        }

        if (
            Number(players.player2) ===
            userId
        ) {
            return "player2";
        }

        return null;
    }, [
        players.player1,
        players.player2,
        userId,
    ]);

    // ========================================================
    // OPPONENT
    // ========================================================

    const opponentJoined =
        players.player1 != null &&
        players.player2 != null;

    // ========================================================
    // MY CHOICE
    // ========================================================

    const myChoice =
        choices?.[String(userId)] ??
        null;

    // ========================================================
    // OPPONENT ID
    // ========================================================

    const opponentId =
        myPlayer === "player1"
            ? players.player2
            : myPlayer === "player2"
            ? players.player1
            : null;

    // ========================================================
    // OPPONENT CHOICE
    // ========================================================

    const opponentChoice =
        opponentId != null
            ? choices?.[
                  String(opponentId)
              ] ?? null
            : null;

    // ========================================================
    // HAS SUBMITTED
    // ========================================================

    const hasSubmitted =
        myChoice !== null;

    // ========================================================
    // CAN MAKE CHOICE
    // ========================================================

    const canChoose =
        myPlayer !== null &&
        opponentJoined &&
        !roundFinished &&
        !winner &&
        !hasSubmitted &&
        !submitting;

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
                gameId:
                    currentGame.id,
            },
            (response) => {
                if (
                    !response?.success
                ) {
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
                    gameId:
                        currentGame.id,
                }
            );
        };
    }, [currentGame?.id]);

    // ========================================================
    // SOCKET GAME UPDATED
    // ========================================================

    useEffect(() => {
        const handleGameUpdated =
            (updatedGame) => {
                if (
                    Number(
                        updatedGame?.id
                    ) !==
                    Number(
                        currentGame?.id
                    )
                ) {
                    return;
                }

                setCurrentGame(
                    updatedGame
                );

                setSubmitting(false);
                setError("");
            };

        const handleGameFinished =
            (finishedGame) => {
                if (
                    Number(
                        finishedGame?.id
                    ) !==
                    Number(
                        currentGame?.id
                    )
                ) {
                    return;
                }

                setCurrentGame(
                    finishedGame
                );

                setSubmitting(false);
            };

        const handleGameCancelled =
            (cancelledGame) => {
                if (
                    Number(
                        cancelledGame?.id
                    ) !==
                    Number(
                        currentGame?.id
                    )
                ) {
                    return;
                }

                setCurrentGame(
                    cancelledGame
                );

                setSubmitting(false);

                setError(
                    "This game has been cancelled."
                );
            };

        socket.on(
            "game_updated",
            handleGameUpdated
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

    const makeMove = (choice) => {
        if (!canChoose) {
            return;
        }

        if (
            !CHOICES.some(
                (item) =>
                    item.value ===
                    choice
            )
        ) {
            return;
        }

        setError("");
        setSubmitting(true);

        socket.emit(
            "game_move",
            {
                gameId:
                    currentGame.id,

                choice,
            },
            (response) => {
                if (
                    !response?.success
                ) {
                    setSubmitting(false);

                    setError(
                        response?.message ||
                            "Choice could not be submitted."
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
    // CHOICE DISPLAY
    // ========================================================

    const getChoice = (choice) => {
        return CHOICES.find(
            (item) =>
                item.value ===
                choice
        );
    };

    // ========================================================
    // WINNER STATUS
    // ========================================================

    const getResult = () => {
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

        if (!opponentJoined) {
            return {
                title:
                    "Waiting for Opponent",
                description:
                    "Another player needs to join.",
            };
        }

        if (
            winner ===
            "DRAW"
        ) {
            return {
                title: "Draw 🤝",
                description:
                    "Both players selected the same choice.",
            };
        }

        if (
            winner ===
            "PLAYER1"
        ) {
            if (
                myPlayer ===
                "player1"
            ) {
                return {
                    title:
                        "You Win! 🎉",
                    description:
                        "You won the round.",
                };
            }

            return {
                title:
                    "You Lose",
                description:
                    "Your opponent won the round.",
            };
        }

        if (
            winner ===
            "PLAYER2"
        ) {
            if (
                myPlayer ===
                "player2"
            ) {
                return {
                    title:
                        "You Win! 🎉",
                    description:
                        "You won the round.",
                };
            }

            return {
                title:
                    "You Lose",
                description:
                    "Your opponent won the round.",
            };
        }

        if (
            hasSubmitted &&
            !opponentChoice
        ) {
            return {
                title:
                    "Waiting for Opponent",
                description:
                    "Your choice has been submitted.",
            };
        }

        if (canChoose) {
            return {
                title:
                    "Make Your Choice",
                description:
                    "Choose rock, paper, or scissors.",
            };
        }

        return {
            title: "Round in Progress",
            description:
                "Waiting for the other player.",
        };
    };

    const result =
        getResult();

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
                        Rock Paper Scissors
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
            {/* GAME CONTENT */}
            {/* ================================================== */}

            <div className="overflow-y-auto p-5">
                {/* ================================================== */}
                {/* PLAYERS */}
                {/* ================================================== */}

                <div className="mb-5 grid grid-cols-2 gap-3">
                    {/* PLAYER 1 */}

                    <div
                        className={`rounded-xl border p-4 ${
                            myPlayer ===
                            "player1"
                                ? "border-blue-400/40 bg-blue-400/10"
                                : "border-white/10 bg-white/[0.03]"
                        }`}
                    >
                        <div className="text-xs text-gray-400">
                            Player 1
                        </div>

                        <div className="mt-1 font-semibold text-white">
                            {Number(
                                players.player1
                            ) === userId
                                ? "You"
                                : players.player1
                                ? "Opponent"
                                : "Waiting..."}
                        </div>

                        {myPlayer ===
                            "player1" && (
                            <div className="mt-1 text-xs text-blue-300">
                                You
                            </div>
                        )}
                    </div>

                    {/* PLAYER 2 */}

                    <div
                        className={`rounded-xl border p-4 ${
                            myPlayer ===
                            "player2"
                                ? "border-purple-400/40 bg-purple-400/10"
                                : "border-white/10 bg-white/[0.03]"
                        }`}
                    >
                        <div className="text-xs text-gray-400">
                            Player 2
                        </div>

                        <div className="mt-1 font-semibold text-white">
                            {Number(
                                players.player2
                            ) === userId
                                ? "You"
                                : players.player2
                                ? "Opponent"
                                : "Waiting..."}
                        </div>

                        {myPlayer ===
                            "player2" && (
                            <div className="mt-1 text-xs text-purple-300">
                                You
                            </div>
                        )}
                    </div>
                </div>

                {/* ================================================== */}
                {/* STATUS */}
                {/* ================================================== */}

                <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <div className="font-semibold text-white">
                        {result.title}
                    </div>

                    <div className="mt-1 text-sm text-gray-400">
                        {
                            result.description
                        }
                    </div>
                </div>

                {/* ================================================== */}
                {/* CHOICES */}
                {/* ================================================== */}

                <div className="grid grid-cols-3 gap-3">
                    {CHOICES.map(
                        (item) => {
                            const selected =
                                myChoice ===
                                item.value;

                            return (
                                <button
                                    key={
                                        item.value
                                    }
                                    type="button"
                                    disabled={
                                        !canChoose
                                    }
                                    onClick={() =>
                                        makeMove(
                                            item.value
                                        )
                                    }
                                    className={`flex aspect-square flex-col items-center justify-center rounded-2xl border transition ${
                                        selected
                                            ? "border-blue-400/50 bg-blue-400/15"
                                            : "border-white/10 bg-white/[0.04]"
                                    } ${
                                        canChoose
                                            ? "cursor-pointer hover:bg-white/[0.10] hover:border-white/20"
                                            : "cursor-not-allowed opacity-70"
                                    }`}
                                >
                                    <span className="text-4xl">
                                        {
                                            item.emoji
                                        }
                                    </span>

                                    <span className="mt-2 text-sm font-medium text-white">
                                        {
                                            item.label
                                        }
                                    </span>

                                    {selected && (
                                        <span className="mt-1 text-xs text-blue-300">
                                            Selected
                                        </span>
                                    )}
                                </button>
                            );
                        }
                    )}
                </div>

                {/* ================================================== */}
                {/* ROUND RESULT */}
                {/* ================================================== */}

                {(roundFinished ||
                    winner) && (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        {/* MY CHOICE */}

                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                            <div className="text-xs text-gray-400">
                                Your Choice
                            </div>

                            <div className="mt-2 text-3xl">
                                {myChoice
                                    ? getChoice(
                                          myChoice
                                      )?.emoji
                                    : "❔"}
                            </div>

                            <div className="mt-1 text-sm font-medium text-white">
                                {myChoice
                                    ? getChoice(
                                          myChoice
                                      )?.label
                                    : "Not selected"}
                            </div>
                        </div>

                        {/* OPPONENT CHOICE */}

                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                            <div className="text-xs text-gray-400">
                                Opponent's Choice
                            </div>

                            <div className="mt-2 text-3xl">
                                {opponentChoice
                                    ? getChoice(
                                          opponentChoice
                                      )?.emoji
                                    : "❔"}
                            </div>

                            <div className="mt-1 text-sm font-medium text-white">
                                {opponentChoice
                                    ? getChoice(
                                          opponentChoice
                                      )?.label
                                    : "Waiting..."}
                            </div>
                        </div>
                    </div>
                )}

                {/* ================================================== */}
                {/* WAITING MESSAGE */}
                {/* ================================================== */}

                {hasSubmitted &&
                    !opponentChoice &&
                    !roundFinished &&
                    !winner && (
                        <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-center text-sm text-blue-200">
                            Your choice has been
                            submitted. Waiting
                            for your opponent...
                        </div>
                    )}

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