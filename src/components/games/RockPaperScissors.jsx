"use client";

import { useEffect, useMemo, useState } from "react";
import { socket } from "@/lib/socket";

// ============================================================
// CONFIGURATION
// ============================================================

const CHOICES = [
    { value: "rock", label: "Rock", emoji: "✊" },
    { value: "paper", label: "Paper", emoji: "✋" },
    { value: "scissors", label: "Scissors", emoji: "✌️" },
];

// ============================================================
// COMPONENT
// ============================================================

export default function RockPaperScissors({ game, currentUser, onClose }) {
    const [currentGame, setCurrentGame] = useState(game);
    const [error, setError] = useState("");
    const [leaving, setLeaving] = useState(false);
    const [joining, setJoining] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Normalize IDs to strings for robust comparison
    const userId = currentUser?.id != null ? String(currentUser.id) : null;

    // ========================================================
    // KEEP GAME STATE IN SYNC WITH PROP
    // ========================================================
    useEffect(() => {
        if (!game) return;

        setCurrentGame((previous) => ({
            ...game,
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
    const choices = state?.choices || {};
    const winner = state?.winner || null;
    const roundFinished = Boolean(state?.roundFinished);
    const gameStatus = (currentGame?.status || "").toUpperCase();

    // Normalized player IDs
    const player1Id = players.player1 != null ? String(players.player1) : null;
    const player2Id = players.player2 != null ? String(players.player2) : null;
    const createdById = currentGame?.createdBy != null ? String(currentGame.createdBy) : null;

    // ========================================================
    // MY PLAYER IDENTIFICATION & RECEIVER DETERMINATION
    // ========================================================
    const myPlayer = useMemo(() => {
        if (!userId) return null;
        if (player1Id === userId) return "player1";
        if (player2Id === userId) return "player2";
        return null;
    }, [player1Id, player2Id, userId]);

    const isReceiver = useMemo(() => {
        if (myPlayer !== null) return false;
        if (currentGame?.isReceiver) return true;

        const isCreator = createdById === userId;
        const player2HasNotJoined = player2Id === null;

        return !isCreator && player2HasNotJoined;
    }, [myPlayer, currentGame?.isReceiver, createdById, userId, player2Id]);

    const opponentJoined = player1Id !== null && player2Id !== null;

    // Choices mapping
    const myChoice = userId ? choices[userId] ?? null : null;

    const opponentId =
        myPlayer === "player1" ? player2Id : myPlayer === "player2" ? player1Id : null;

    const opponentChoice = opponentId ? choices[opponentId] ?? null : null;

    const hasSubmitted = myChoice !== null;

    const canChoose =
        myPlayer !== null &&
        opponentJoined &&
        !roundFinished &&
        !winner &&
        !hasSubmitted &&
        !submitting &&
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
                isReceiver: previous.isReceiver && !updatedGame?.players?.player2 ? true : false,
            }));
            setSubmitting(false);
            setError("");
        };

        const handleGameFinished = (finishedGame) => {
            if (String(finishedGame?.id) !== gameId) return;
            setCurrentGame(finishedGame);
            setSubmitting(false);
        };

        const handleGameCancelled = (cancelledGame) => {
            if (String(cancelledGame?.id) !== gameId) return;
            setCurrentGame(cancelledGame);
            setSubmitting(false);
            setError("This game has been cancelled.");
        };

        const handleGameError = (err) => {
            if (err?.gameId && String(err.gameId) !== gameId) return;
            setError(err?.message || "An error occurred.");
            setSubmitting(false);
        };

        socket.on("game_updated", handleGameUpdated);
        socket.on("game_joined", handleGameUpdated);
        socket.on("game_finished", handleGameFinished);
        socket.on("game_cancelled", handleGameCancelled);
        socket.on("game_error", handleGameError);

        return () => {
            socket.off("game_updated", handleGameUpdated);
            socket.off("game_joined", handleGameUpdated);
            socket.off("game_finished", handleGameFinished);
            socket.off("game_cancelled", handleGameCancelled);
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

        socket.emit("join_game", { gameId: currentGame.id }, (response) => {
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
                        player2: currentUser?.id,
                    },
                },
            });

            setJoining(false);
        });
    };

    // ========================================================
    // MAKE MOVE
    // ========================================================
    const makeMove = (choice) => {
        if (!canChoose) return;

        if (!CHOICES.some((item) => item.value === choice)) return;

        setError("");
        setSubmitting(true);

        socket.emit(
            "game_move",
            {
                gameId: currentGame.id,
                choice,
            },
            (response) => {
                if (response && !response.success) {
                    setSubmitting(false);
                    setError(response.message || "Choice could not be submitted.");
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
    // HELPERS
    // ========================================================
    const getChoice = (val) => CHOICES.find((item) => item.value === val);

    const getResult = () => {
        if (gameStatus === "CANCELLED") {
            return {
                title: "Game Cancelled",
                description: "This game is no longer active.",
            };
        }

        if (!opponentJoined) {
            return {
                title: "Waiting for Opponent",
                description: "Another player needs to join.",
            };
        }

        const upperWinner = String(winner || "").toUpperCase();

        if (upperWinner === "DRAW") {
            return {
                title: "Draw 🤝",
                description: "Both players selected the same choice.",
            };
        }

        if (upperWinner === "PLAYER1") {
            return myPlayer === "player1"
                ? { title: "You Win! 🎉", description: "You won the round." }
                : { title: "You Lose ❌", description: "Your opponent won the round." };
        }

        if (upperWinner === "PLAYER2") {
            return myPlayer === "player2"
                ? { title: "You Win! 🎉", description: "You won the round." }
                : { title: "You Lose ❌", description: "Your opponent won the round." };
        }

        // Winner check by userId if string match
        if (winner && userId) {
            if (String(winner) === userId) {
                return { title: "You Win! 🎉", description: "You won the round." };
            }
            return { title: "You Lose ❌", description: "Your opponent won the round." };
        }

        if (hasSubmitted && !opponentChoice) {
            return {
                title: "Choice Submitted",
                description: "Waiting for your opponent to choose...",
            };
        }

        if (canChoose) {
            return {
                title: "Make Your Choice",
                description: "Choose rock, paper, or scissors.",
            };
        }

        return {
            title: "Round in Progress",
            description: "Waiting for player action.",
        };
    };

    const result = getResult();

    // ========================================================
    // INVITATION SCREEN (RECEIVER VIEW)
    // ========================================================
    if (isReceiver) {
        return (
            <div className="flex max-h-[90vh] flex-col p-6 text-center">
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3 py-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10 text-2xl">
                    ✂️
                </div>
                <h3 className="text-xl font-semibold text-white">Game Invitation</h3>
                <p className="mt-2 text-sm text-gray-400">
                    You have been invited to play Rock Paper Scissors.
                </p>

                {error && <div className="mt-4 text-sm text-red-400">{error}</div>}

                <div className="mt-6 flex flex-col gap-3">
                    <button
                        onClick={joinGame}
                        disabled={joining}
                        className="rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
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
    // MAIN GAME UI
    // ========================================================
    return (
        <div className="flex max-h-[90vh] flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">Rock Paper Scissors</h2>
                    <p className="text-xs text-gray-400">Best of one</p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-3 py-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                >
                    ✕
                </button>
            </div>

            {/* GAME CONTENT */}
            <div className="overflow-y-auto p-5">
                {/* PLAYERS CARD */}
                <div className="mb-5 grid grid-cols-2 gap-3">
                    {/* PLAYER 1 */}
                    <div
                        className={`rounded-xl border p-4 ${
                            myPlayer === "player1"
                                ? "border-blue-400/40 bg-blue-400/10"
                                : "border-white/10 bg-white/[0.03]"
                        }`}
                    >
                        <div className="text-xs text-gray-400">Player 1</div>
                        <div className="mt-1 font-semibold text-white">
                            {player1Id && player1Id === userId
                                ? "You"
                                : player1Id
                                ? "Opponent"
                                : "Waiting..."}
                        </div>
                    </div>

                    {/* PLAYER 2 */}
                    <div
                        className={`rounded-xl border p-4 ${
                            myPlayer === "player2"
                                ? "border-purple-400/40 bg-purple-400/10"
                                : "border-white/10 bg-white/[0.03]"
                        }`}
                    >
                        <div className="text-xs text-gray-400">Player 2</div>
                        <div className="mt-1 font-semibold text-white">
                            {player2Id && player2Id === userId
                                ? "You"
                                : player2Id
                                ? "Opponent"
                                : "Waiting..."}
                        </div>
                    </div>
                </div>

                {/* STATUS BAR */}
                <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <div className="font-semibold text-white text-base">{result.title}</div>
                    <div className="mt-1 text-sm text-gray-400">{result.description}</div>
                </div>

                {/* CHOICES BUTTONS */}
                <div className="grid grid-cols-3 gap-3">
                    {CHOICES.map((item) => {
                        const selected = myChoice === item.value;

                        return (
                            <button
                                key={item.value}
                                type="button"
                                disabled={!canChoose}
                                onClick={() => makeMove(item.value)}
                                className={`flex aspect-square flex-col items-center justify-center rounded-2xl border transition ${
                                    selected
                                        ? "border-blue-400/50 bg-blue-400/15"
                                        : "border-white/10 bg-white/[0.04]"
                                } ${
                                    canChoose
                                        ? "cursor-pointer hover:border-white/20 hover:bg-white/[0.10] active:scale-95"
                                        : "cursor-not-allowed opacity-70"
                                }`}
                            >
                                <span className="text-4xl">{item.emoji}</span>
                                <span className="mt-2 text-sm font-medium text-white">
                                    {item.label}
                                </span>
                                {selected && (
                                    <span className="mt-1 text-xs text-blue-300">Selected</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* REVEAL ROUND RESULT */}
                {(roundFinished || winner) && (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        {/* MY CHOICE */}
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                            <div className="text-xs text-gray-400">Your Choice</div>
                            <div className="mt-2 text-3xl">
                                {myChoice ? getChoice(myChoice)?.emoji : "❔"}
                            </div>
                            <div className="mt-1 text-sm font-medium text-white">
                                {myChoice ? getChoice(myChoice)?.label : "Not selected"}
                            </div>
                        </div>

                        {/* OPPONENT CHOICE */}
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                            <div className="text-xs text-gray-400">Opponent's Choice</div>
                            <div className="mt-2 text-3xl">
                                {opponentChoice ? getChoice(opponentChoice)?.emoji : "❔"}
                            </div>
                            <div className="mt-1 text-sm font-medium text-white">
                                {opponentChoice
                                    ? getChoice(opponentChoice)?.label
                                    : "Waiting..."}
                            </div>
                        </div>
                    </div>
                )}

                {/* ERROR MESSAGE */}
                {error && (
                    <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
                        {error}
                    </div>
                )}

                {/* ACTIONS */}
                <div className="mt-6 flex justify-center">
                    <button
                        type="button"
                        onClick={leaveGame}
                        disabled={leaving}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                        {leaving ? "Leaving..." : "Leave Game"}
                    </button>
                </div>
            </div>
        </div>
    );
}