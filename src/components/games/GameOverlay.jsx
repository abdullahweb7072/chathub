"use client";

import TicTacToe from "./TicTacToe";
import ConnectFour from "./ConnectFour";
import RockPaperScissors from "./RockPaperScissors";

// ============================================================
// GAME OVERLAY
// ============================================================

export default function GameOverlay({
    game,
    currentUser,
    onClose,
}) {
    // ========================================================
    // NO ACTIVE GAME
    // ========================================================

    if (!game) {
        return null;
    }

    // ========================================================
    // RENDER GAME
    // ========================================================

    const renderGame = () => {
        switch (game.type) {
            // ==================================================
            // TIC TAC TOE
            // ==================================================

            case "TIC_TAC_TOE":
                return (
                    <TicTacToe
                        game={game}
                        currentUser={currentUser}
                        onClose={onClose}
                    />
                );

            // ==================================================
            // CONNECT FOUR
            // ==================================================

            case "CONNECT_FOUR":
                return (
                    <ConnectFour
                        game={game}
                        currentUser={currentUser}
                        onClose={onClose}
                    />
                );

            // ==================================================
            // ROCK PAPER SCISSORS
            // ==================================================

            case "ROCK_PAPER_SCISSORS":
                return (
                    <RockPaperScissors
                        game={game}
                        currentUser={currentUser}
                        onClose={onClose}
                    />
                );

            // ==================================================
            // UNKNOWN GAME
            // ==================================================

            default:
                return (
                    <div className="p-6 text-center">
                        <div className="text-lg font-semibold text-white">
                            Unsupported Game
                        </div>

                        <p className="mt-2 text-sm text-gray-400">
                            This game type is not supported.
                        </p>

                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-5 rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
                        >
                            Close
                        </button>
                    </div>
                );
        }
    };

    // ========================================================
    // OVERLAY
    // ========================================================

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                // Close only when clicking the backdrop.
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose?.();
                }
            }}
        >
            {/* ==================================================
                GAME CONTAINER
            ================================================== */}

            <div
                className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#111318] shadow-2xl"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                {renderGame()}
            </div>
        </div>
    );
}