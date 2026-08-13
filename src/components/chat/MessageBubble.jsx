"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import MessageActions from "./MessageActions";

// ============================================================
// MESSAGE BUBBLE
// ============================================================

export default function MessageBubble({
    message,
    currentUserId,
    onEditMessage,
    onDeleteMessage,
    onToggleReaction,
}) {
    const isOwn =
        Number(message?.senderId) ===
        Number(currentUserId);

    const isDeleted =
        Boolean(message?.deletedAt);

    // ========================================================
    // SENDER PROFILE
    // ========================================================

    const [senderProfile, setSenderProfile] =
        useState(null);

    // ========================================================
    // RESOLVE SENDER ID
    // ========================================================

    const senderId =
        message?.senderId ??
        message?.sender?.id ??
        null;

    // ========================================================
    // FETCH SENDER PROFILE
    // ========================================================

    const fetchSenderProfile =
        useCallback(async () => {
            if (!senderId) {
                return;
            }

            try {
                const response = await fetch(
                    `/api/users/${senderId}`,
                    {
                        method: "GET",
                        credentials: "include",
                        cache: "no-store",
                        headers: {
                            Accept:
                                "application/json",
                        },
                    }
                );

                if (!response.ok) {
                    console.error(
                        "❌ SENDER PROFILE FETCH FAILED:",
                        response.status
                    );

                    return;
                }

                const data =
                    await response.json();

                if (!data?.success) {
                    console.error(
                        "❌ SENDER PROFILE API ERROR:",
                        data?.message
                    );

                    return;
                }

                const user =
                    data?.user ||
                    data?.data ||
                    null;

                if (user) {
                    setSenderProfile(user);
                }
            } catch (error) {
                console.error(
                    "❌ SENDER PROFILE ERROR:",
                    error
                );
            }
        }, [senderId]);

    // ========================================================
    // LOAD SENDER PROFILE
    // ========================================================

    useEffect(() => {
        fetchSenderProfile();
    }, [fetchSenderProfile]);

    // ========================================================
    // PREFERRED DISPLAY NAME
    // ========================================================

    const senderDisplayName =
        senderProfile?.displayName?.trim() ||
        message?.sender?.displayName?.trim() ||
        senderProfile?.username?.trim() ||
        message?.sender?.username?.trim() ||
        senderProfile?.email?.trim() ||
        message?.sender?.email?.trim() ||
        "Unknown User";

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div
            className={`
                flex
                w-full
                ${
                    isOwn
                        ? "justify-end"
                        : "justify-start"
                }
            `}
        >
            <div
                className="
                    min-w-[100px]
                    max-w-[70%]
                "
            >
                {/* ==================================================
                    SENDER NAME
                ================================================== */}

                {!isOwn && (
                    <div
                        className="
                            mb-1
                            ml-1
                            text-xs
                            font-medium
                            text-muted
                        "
                    >
                        {senderDisplayName}
                    </div>
                )}

                {/* ==================================================
                    MESSAGE
                ================================================== */}

                <div
                    className={`
                        relative
                        px-[13px]
                        py-[10px]
                        shadow-sm

                        ${
                            isDeleted
                                ? ""
                                : "pt-[32px]"
                        }

                        ${
                            isOwn
                                ? `
                                    rounded-[14px]
                                    rounded-br
                                    bg-primary
                                    text-primary-foreground
                                `
                                : `
                                    rounded-[14px]
                                    rounded-bl
                                    border
                                    border-border
                                    bg-surface
                                    text-foreground
                                `
                        }
                    `}
                >
                    {/* ==================================================
                        MESSAGE ACTIONS
                    ================================================== */}

                    {!isDeleted && (
                        <MessageActions
                            message={message}
                            isOwn={isOwn}
                            onEditMessage={
                                onEditMessage
                            }
                            onDeleteMessage={
                                onDeleteMessage
                            }
                            onToggleReaction={
                                onToggleReaction
                            }
                        />
                    )}

                    {/* ==================================================
                        MESSAGE CONTENT
                    ================================================== */}

                    <div
                        className={`
                            whitespace-pre-wrap
                            break-words
                            text-[15px]
                            leading-[1.5]

                            ${
                                isDeleted
                                    ? "italic text-muted"
                                    : "text-inherit"
                            }
                        `}
                    >
                        {isDeleted
                            ? "This message was deleted"
                            : message?.content}
                    </div>

                    {/* ==================================================
                        TIME / EDITED
                    ================================================== */}

                    <div
                        className="
                            mt-1
                            flex
                            items-center
                            justify-end
                            gap-[5px]
                            text-muted
                        "
                    >
                        {message?.editedAt &&
                            !isDeleted && (
                                <span
                                    className="
                                        text-[10px]
                                        opacity-65
                                    "
                                >
                                    Edited
                                </span>
                            )}

                        <span
                            className="
                                text-[10px]
                                opacity-60
                            "
                        >
                            {formatTime(
                                message?.createdAt
                            )}
                        </span>
                    </div>
                </div>

                {/* ==================================================
                    REACTIONS
                ================================================== */}

                {!isDeleted &&
                    message?.reactions?.length >
                        0 && (
                        <div
                            className={`
                                relative
                                mt-[-7px]
                                flex
                                w-fit
                                gap-1

                                ${
                                    isOwn
                                        ? "ml-auto"
                                        : "ml-2"
                                }
                            `}
                        >
                            {message.reactions.map(
                                (reaction) => (
                                    <button
                                        key={
                                            reaction.id
                                        }
                                        type="button"
                                        onClick={() =>
                                            onToggleReaction?.(
                                                message,
                                                reaction.emoji
                                            )
                                        }
                                        className="
                                            rounded-xl
                                            border
                                            border-border
                                            bg-surface
                                            px-[7px]
                                            py-[3px]
                                            text-xs
                                            text-foreground
                                            shadow-sm
                                            transition-colors
                                            duration-200
                                            hover:bg-hover
                                        "
                                    >
                                        {
                                            reaction.emoji
                                        }
                                    </button>
                                )
                            )}
                        </div>
                    )}
            </div>
        </div>
    );
}

// ============================================================
// MESSAGE TIME
// ============================================================

function formatTime(date) {
    if (!date) {
        return "";
    }

    const value = new Date(date);

    if (
        Number.isNaN(
            value.getTime()
        )
    ) {
        return "";
    }

    return value.toLocaleTimeString(
        [],
        {
            hour: "numeric",
            minute: "2-digit",
        }
    );
}