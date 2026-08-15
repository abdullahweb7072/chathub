"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import MessageActions from "./MessageActions";

// ============================================================
// MESSAGE COLORS
// These are intentionally hardcoded so message text does NOT
// change when the application theme changes.
// ============================================================

const MESSAGE_TEXT_COLORS = {
    own: "#FFFFFF",
    other: "#111827",
    deleted: "#6B7280",
    senderName: "#374151",
    meta: "#6B7280",
};

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
    // MESSAGE TEXT COLOR
    // ========================================================

    const messageTextColor =
        isDeleted
            ? MESSAGE_TEXT_COLORS.deleted
            : isOwn
            ? MESSAGE_TEXT_COLORS.own
            : MESSAGE_TEXT_COLORS.other;

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
                        "
                        style={{
                            color:
                                MESSAGE_TEXT_COLORS.senderName,
                        }}
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
                                `
                                : `
                                    rounded-[14px]
                                    rounded-bl
                                    border
                                    border-border
                                    bg-surface
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
                        className="
                            whitespace-pre-wrap
                            break-words
                            text-[15px]
                            leading-[1.5]
                        "
                        style={{
                            color:
                                messageTextColor,
                        }}
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
                        "
                    >
                        {message?.editedAt &&
                            !isDeleted && (
                                <span
                                    className="
                                        text-[10px]
                                    "
                                    style={{
                                        color:
                                            MESSAGE_TEXT_COLORS.meta,
                                    }}
                                >
                                    Edited
                                </span>
                            )}

                        <span
                            className="
                                text-[10px]
                            "
                            style={{
                                color:
                                    MESSAGE_TEXT_COLORS.meta,
                            }}
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
                                            shadow-sm
                                            transition-colors
                                            duration-200
                                            hover:bg-hover
                                        "
                                        style={{
                                            color:
                                                MESSAGE_TEXT_COLORS.other,
                                        }}
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

    const value =
        new Date(date);

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