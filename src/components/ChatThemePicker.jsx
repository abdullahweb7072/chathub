"use client";

import { useEffect, useRef } from "react";

// ============================================================
// CHAT THEMES
// ============================================================

export const CHAT_THEMES = [
    {
        id: "default",
        name: "Default",
        image: null,
    },
    {
        id: "nature",
        name: "Nature",
        image: "/chat-themes/nature1.jpg",
    },
    {
        id: "spiderman",
        name: "Spiderman",
        image: "/chat-themes/spiderman3.jpg",
    },
    {
        id: "superman",
        name: "Superman",
        image: "/chat-themes/superman1.avif",
    },
    {
        id: "car",
        name: "Car",
        image: "/chat-themes/car1.avif",
    },
    {
        id: "ocean",
        name: "Ocean",
        image: "/chat-themes/ocean1.jpg",
    },
    {
        id: "sunset",
        name: "Sunset",
        image: "/chat-themes/sunset1.jpg",
    },
    {
        id: "dark",
        name: "Dark",
        image: "/chat-themes/dark.jpg",
    },
];

// ============================================================
// THEME PICKER
// ============================================================

export default function ChatThemePicker({
    selectedTheme,
    onSelectTheme,
    onClose,
}) {
    const pickerRef = useRef(null);

    // ========================================================
    // CLOSE ON OUTSIDE CLICK
    // ========================================================

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target)
            ) {
                onClose?.();
            }
        };

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, [onClose]);

    return (
        <div
            ref={pickerRef}
            className="
                absolute
                right-0
                top-12
                z-[200]
                w-[300px]
                max-w-[calc(100vw-24px)]
                overflow-hidden
                rounded-2xl
                border
                border-border
                bg-surface
                p-3
                shadow-2xl
            "
        >
            {/* ==================================================
                HEADER
            ================================================== */}

            <div
                className="
                    mb-3
                    flex
                    items-center
                    justify-between
                    border-b
                    border-border
                    pb-3
                "
            >
                <div>
                    <h3
                        className="
                            text-sm
                            font-semibold
                            text-foreground
                        "
                    >
                        Chat Theme
                    </h3>

                    <p
                        className="
                            mt-0.5
                            text-xs
                            text-muted
                        "
                    >
                        Choose a background for this chat
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-full
                        text-secondary
                        transition
                        hover:bg-hover
                        hover:text-foreground
                    "
                    aria-label="Close theme picker"
                >
                    ✕
                </button>
            </div>

            {/* ==================================================
                THEMES
            ================================================== */}

            <div
                className="
                    grid
                    grid-cols-3
                    gap-3
                "
            >
                {CHAT_THEMES.map((theme) => {
                    const isSelected =
                        selectedTheme === theme.id;

                    return (
                        <button
                            key={theme.id}
                            type="button"
                            onClick={() =>
                                onSelectTheme?.(
                                    theme.id
                                )
                            }
                            className="
                                group
                                relative
                                overflow-hidden
                                rounded-xl
                                border
                                border-border
                                text-left
                                transition
                                hover:scale-[1.03]
                                active:scale-[0.98]
                            "
                        >
                            {/* ==================================================
                                PREVIEW
                            ================================================== */}

                            <div
                                className="
                                    relative
                                    aspect-[4/3]
                                    w-full
                                    overflow-hidden
                                "
                                style={{
                                    backgroundColor:
                                        theme.image
                                            ? undefined
                                            : "var(--background)",
                                    backgroundImage:
                                        theme.image
                                            ? `url("${theme.image}")`
                                            : undefined,
                                    backgroundSize:
                                        "cover",
                                    backgroundPosition:
                                        "center",
                                }}
                            >
                                {/* DEFAULT PREVIEW */}

                                {!theme.image && (
                                    <div
                                        className="
                                            absolute
                                            inset-0
                                            flex
                                            items-center
                                            justify-center
                                            bg-background
                                        "
                                    >
                                        <span
                                            className="
                                                text-2xl
                                            "
                                        >
                                            💬
                                        </span>
                                    </div>
                                )}

                                {/* SELECTION */}

                                {isSelected && (
                                    <div
                                        className="
                                            absolute
                                            inset-0
                                            flex
                                            items-center
                                            justify-center
                                            bg-black/30
                                        "
                                    >
                                        <div
                                            className="
                                                flex
                                                h-8
                                                w-8
                                                items-center
                                                justify-center
                                                rounded-full
                                                bg-primary
                                                text-sm
                                                font-bold
                                                text-white
                                                shadow-lg
                                            "
                                        >
                                            ✓
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ==================================================
                                NAME
                            ================================================== */}

                            <div
                                className="
                                    bg-surface
                                    px-2
                                    py-1.5
                                "
                            >
                                <p
                                    className="
                                        truncate
                                        text-[11px]
                                        font-medium
                                        text-foreground
                                    "
                                >
                                    {theme.name}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}