"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    MoreVertical,
    Heart,
    Copy,
    Pencil,
    Trash2,
    ChevronLeft,
} from "lucide-react";

// ============================================================
// REACTIONS
// ============================================================

const REACTIONS = [
    "❤️",
    "👍",
    "😂",
    "😮",
    "😢",
    "😡",
];

// ============================================================
// MESSAGE ACTIONS
// ============================================================

export default function MessageActions({
    message,
    isOwn,
    onEditMessage,
    onDeleteMessage,
    onToggleReaction,
}) {
    const [isOpen, setIsOpen] = useState(false);

    const [showReactions, setShowReactions] =
        useState(false);

    const [showDeleteOptions, setShowDeleteOptions] =
        useState(false);

    const menuRef = useRef(null);

    // ========================================================
    // CLOSE WHEN CLICKING OUTSIDE
    // ========================================================

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setIsOpen(false);
                setShowReactions(false);
                setShowDeleteOptions(false);
            }
        };

        document.addEventListener(
            "pointerdown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                handleOutsideClick
            );
        };
    }, []);

    // ========================================================
    // COPY
    // ========================================================

    const handleCopy = async () => {
        if (!message?.content) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                message.content
            );

            setIsOpen(false);
            setShowReactions(false);
            setShowDeleteOptions(false);
        } catch (error) {
            console.error(
                "❌ COPY MESSAGE ERROR:",
                error
            );
        }
    };

    // ========================================================
    // REACTION
    // ========================================================

    const handleReaction = (emoji) => {
        if (!message?.id) {
            console.error(
                "❌ REACTION: Invalid message ID",
                message
            );

            return;
        }

        onToggleReaction?.(
            message,
            emoji
        );

        setIsOpen(false);
        setShowReactions(false);
        setShowDeleteOptions(false);
    };

    // ========================================================
    // EDIT
    // ========================================================

    const handleEdit = () => {
        onEditMessage?.(message);

        setIsOpen(false);
        setShowReactions(false);
        setShowDeleteOptions(false);
    };

    // ========================================================
    // OPEN DELETE OPTIONS
    // ========================================================

    const handleDeleteClick = () => {
        setShowDeleteOptions(true);
        setShowReactions(false);
    };

    // ========================================================
    // DELETE FOR ME
    // ========================================================

    const handleDeleteForMe = () => {
        if (!message?.id) {
            return;
        }

        onDeleteMessage?.(
            message,
            "FOR_ME"
        );

        setIsOpen(false);
        setShowReactions(false);
        setShowDeleteOptions(false);
    };

    // ========================================================
    // DELETE FOR EVERYONE
    // ========================================================

    const handleDeleteForEveryone = () => {
        if (!message?.id) {
            return;
        }

        onDeleteMessage?.(
            message,
            "FOR_EVERYONE"
        );

        setIsOpen(false);
        setShowReactions(false);
        setShowDeleteOptions(false);
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div
            ref={menuRef}
            className="
                absolute
                right-2
                top-2
                z-[100]
            "
        >
            {/* ==================================================
                THREE DOT BUTTON
            ================================================== */}

            <button
                type="button"
                aria-label="Message options"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={(event) => {
                    event.stopPropagation();

                    setIsOpen(
                        (previous) =>
                            !previous
                    );

                    setShowReactions(false);
                    setShowDeleteOptions(false);
                }}
                className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    bg-surface/90
                    text-muted
                    shadow-sm
                    backdrop-blur-sm
                    transition-all
                    duration-150
                    hover:bg-hover
                    hover:text-foreground
                    active:scale-95
                "
            >
                <MoreVertical
                    size={18}
                    strokeWidth={2}
                />
            </button>

            {/* ==================================================
                MAIN MENU
            ================================================== */}

            {isOpen && (
                <div
                    role="menu"
                    onPointerDown={(event) =>
                        event.stopPropagation()
                    }
                    className={`
                        absolute
                        top-[38px]
                        z-[101]
                        min-w-[180px]
                        max-w-[calc(100vw-24px)]
                        overflow-hidden
                        rounded-xl
                        border
                        border-border
                        bg-surface
                        p-1
                        shadow-2xl

                        ${
                            isOwn
                                ? "right-0"
                                : "left-0"
                        }
                    `}
                >
                    {/* ==================================================
                        DELETE OPTIONS
                    ================================================== */}

                    {showDeleteOptions ? (
                        <div className="p-1">

                            {/* ==================================================
                                BACK
                            ================================================== */}

                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteOptions(
                                        false
                                    );
                                }}
                                className="
                                    mb-1
                                    flex
                                    w-full
                                    items-center
                                    gap-2
                                    rounded-lg
                                    px-3
                                    py-2
                                    text-left
                                    text-xs
                                    text-muted
                                    transition
                                    hover:bg-hover
                                    hover:text-foreground
                                "
                            >
                                <ChevronLeft
                                    size={15}
                                />

                                <span>
                                    Back
                                </span>
                            </button>

                            {/* ==================================================
                                DELETE FOR ME
                            ================================================== */}

                            <button
                                type="button"
                                role="menuitem"
                                onClick={
                                    handleDeleteForMe
                                }
                                className="
                                    flex
                                    w-full
                                    items-center
                                    gap-3
                                    rounded-lg
                                    px-3
                                    py-2.5
                                    text-left
                                    text-sm
                                    text-foreground
                                    transition-colors
                                    hover:bg-hover
                                "
                            >
                                <Trash2
                                    size={16}
                                    strokeWidth={2}
                                />

                                <span>
                                    Delete for me
                                </span>
                            </button>

                            {/* ==================================================
                                DELETE FOR EVERYONE
                                ONLY OWN MESSAGE
                            ================================================== */}

                            {isOwn && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={
                                        handleDeleteForEveryone
                                    }
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        rounded-lg
                                        px-3
                                        py-2.5
                                        text-left
                                        text-sm
                                        text-red-500
                                        transition-colors
                                        hover:bg-red-500/10
                                    "
                                >
                                    <Trash2
                                        size={16}
                                        strokeWidth={2}
                                    />

                                    <span>
                                        Delete for everyone
                                    </span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* ==================================================
                                REACT
                            ================================================== */}

                            {!showReactions ? (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() =>
                                        setShowReactions(
                                            true
                                        )
                                    }
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        rounded-lg
                                        px-3
                                        py-2.5
                                        text-left
                                        text-sm
                                        text-foreground
                                        transition-colors
                                        hover:bg-hover
                                    "
                                >
                                    <Heart
                                        size={16}
                                        strokeWidth={2}
                                    />

                                    <span>
                                        React
                                    </span>
                                </button>
                            ) : (
                                <div className="p-2">
                                    <div
                                        className="
                                            mb-2
                                            px-1
                                            text-xs
                                            font-medium
                                            text-muted
                                        "
                                    >
                                        Choose reaction
                                    </div>

                                    <div
                                        className="
                                            flex
                                            items-center
                                            gap-1
                                        "
                                    >
                                        {REACTIONS.map(
                                            (emoji) => (
                                                <button
                                                    key={
                                                        emoji
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        handleReaction(
                                                            emoji
                                                        )
                                                    }
                                                    className="
                                                        flex
                                                        h-9
                                                        w-9
                                                        shrink-0
                                                        items-center
                                                        justify-center
                                                        rounded-full
                                                        text-lg
                                                        transition
                                                        hover:scale-125
                                                        hover:bg-hover
                                                        active:scale-95
                                                    "
                                                    aria-label={`React ${emoji}`}
                                                >
                                                    {
                                                        emoji
                                                    }
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ==================================================
                                COPY
                            ================================================== */}

                            <button
                                type="button"
                                role="menuitem"
                                onClick={handleCopy}
                                disabled={
                                    !message?.content
                                }
                                className="
                                    flex
                                    w-full
                                    items-center
                                    gap-3
                                    rounded-lg
                                    px-3
                                    py-2.5
                                    text-left
                                    text-sm
                                    text-foreground
                                    transition-colors
                                    hover:bg-hover
                                    disabled:cursor-not-allowed
                                    disabled:opacity-40
                                "
                            >
                                <Copy
                                    size={16}
                                    strokeWidth={2}
                                />

                                <span>
                                    Copy
                                </span>
                            </button>

                            {/* ==================================================
                                EDIT
                            ================================================== */}

                            {isOwn && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={
                                        handleEdit
                                    }
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        rounded-lg
                                        px-3
                                        py-2.5
                                        text-left
                                        text-sm
                                        text-foreground
                                        transition-colors
                                        hover:bg-hover
                                    "
                                >
                                    <Pencil
                                        size={16}
                                        strokeWidth={2}
                                    />

                                    <span>
                                        Edit
                                    </span>
                                </button>
                            )}

                            {/* ==================================================
                                DELETE
                            ================================================== */}

                            <button
                                type="button"
                                role="menuitem"
                                onClick={
                                    handleDeleteClick
                                }
                                className="
                                    flex
                                    w-full
                                    items-center
                                    gap-3
                                    rounded-lg
                                    px-3
                                    py-2.5
                                    text-left
                                    text-sm
                                    text-red-500
                                    transition-colors
                                    hover:bg-red-500/10
                                "
                            >
                                <Trash2
                                    size={16}
                                    strokeWidth={2}
                                />

                                <span>
                                    Delete
                                </span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}