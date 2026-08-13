"use client";

import Image from "next/image";
import {
useEffect,
useState,
} from "react";
import { useRouter } from "next/navigation";

export default function ChatHeader({
conversation,
currentUser,
onlineUsers = [],
onBack,
}) {
const router = useRouter();

// ============================================================
// USER STATE
// ============================================================

const [otherUser, setOtherUser] = useState(null);
const [loadingUser, setLoadingUser] = useState(false);

// ============================================================
// NO CONVERSATION
// ============================================================

if (!conversation) {
    return (
        <header
            style={{
                height: "76px",
                flexShrink: 0,
                padding: "0 22px",
                display: "flex",
                alignItems: "center",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
            }}
        >
            <div
                style={{
                    fontSize: "16px",
                    color: "var(--text-muted)",
                }}
            >
                Select a conversation
            </div>
        </header>
    );
}

// ============================================================
// CURRENT USER ID
// ============================================================

const currentUserId = Number(currentUser?.id);

// ============================================================
// FIND OTHER USER ID
// ============================================================

const members = Array.isArray(conversation.members)
    ? conversation.members
    : [];

const otherMember =
    members.find((member) => {
        const memberUserId =
            member?.userId ??
            member?.user?.id;

        return (
            Number(memberUserId) !==
            currentUserId
        );
    }) || null;

const otherUserId = Number(
    otherMember?.userId ??
    otherMember?.user?.id
);

// ============================================================
// FETCH USER FROM /api/users/[id]
// ============================================================

useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
        if (
            !Number.isInteger(otherUserId) ||
            otherUserId <= 0
        ) {
            setOtherUser(null);
            return;
        }

        try {
            setLoadingUser(true);

            const response = await fetch(
                `/api/users/${otherUserId}`,
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
                throw new Error(
                    `Failed to fetch user: ${response.status}`
                );
            }

            const data =
                await response.json();

            if (cancelled) {
                return;
            }

            /*
             * Supports common API response shapes:
             *
             * {
             *   success: true,
             *   data: {...}
             * }
             *
             * or
             *
             * {
             *   success: true,
             *   user: {...}
             * }
             *
             * or direct user object.
             */

            const fetchedUser =
                data?.data ||
                data?.user ||
                data;

            if (
                fetchedUser &&
                typeof fetchedUser ===
                    "object"
            ) {
                setOtherUser(
                    fetchedUser
                );
            } else {
                setOtherUser(null);
            }
        } catch (error) {
            if (!cancelled) {
                console.error(
                    "❌ CHAT HEADER USER FETCH ERROR:",
                    error
                );

                /*
                 * Keep the conversation's
                 * existing user data as a
                 * fallback if the API fails.
                 */
                setOtherUser(
                    otherMember?.user ||
                        null
                );
            }
        } finally {
            if (!cancelled) {
                setLoadingUser(false);
            }
        }
    };

    fetchUser();

    return () => {
        cancelled = true;
    };
}, [
    otherUserId,
    conversation?.id,
    otherMember?.user,
]);

// ============================================================
// FALLBACK USER
// ============================================================

/*
 * If the API is still loading or fails,
 * use the user already included in the
 * conversation.
 */

const fallbackUser =
    otherMember?.user || null;

const resolvedUser =
    otherUser || fallbackUser;

// ============================================================
// USER INFORMATION
// ============================================================

const displayName =
    resolvedUser?.displayName?.trim() ||
    resolvedUser?.username?.trim() ||
    resolvedUser?.email?.trim() ||
    "Conversation";

const username =
    resolvedUser?.username?.trim() ||
    "";

const avatar =
    resolvedUser?.avatar ||
    null;

const userId = Number(
    resolvedUser?.id ??
    otherUserId
);

// ============================================================
// ONLINE STATUS
// ============================================================

/*
 * Socket.IO onlineUsers takes priority.
 *
 * API isOnline is used as the fallback.
 */

const isOnline =
    onlineUsers.some(
        (id) =>
            Number(id) ===
            Number(userId)
    ) ||
    Boolean(resolvedUser?.isOnline);

// ============================================================
// LAST SEEN
// ============================================================

const lastSeen =
    resolvedUser?.lastSeen ||
    null;

// ============================================================
// OPEN PROFILE
// ============================================================

const handleOpenProfile = () => {
    if (
        !Number.isInteger(userId) ||
        userId <= 0
    ) {
        return;
    }

    // Own profile
    if (
        userId === currentUserId
    ) {
        router.push("/profile");
        return;
    }

    // Other user's profile
    router.push(
        `/profile/${userId}`
    );
};

// ============================================================
// LAST SEEN FORMAT
// ============================================================

const formatLastSeen = () => {
    if (!lastSeen) {
        return "Last seen recently";
    }

    const date = new Date(lastSeen);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Last seen recently";
    }

    return `Last seen ${date.toLocaleString(
        [],
        {
            dateStyle: "medium",
            timeStyle: "short",
        }
    )}`;
};

// ============================================================
// RENDER
// ============================================================

return (
    <header
        style={{
            height: "76px",
            flexShrink: 0,
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom:
                "1px solid var(--border)",
            background: "var(--surface)",
        }}
    >
        {/* ==================================================
            LEFT SIDE
        ================================================== */}

        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minWidth: 0,
            }}
        >
            {/* ==================================================
                MOBILE BACK BUTTON
            ================================================== */}

            <button
                type="button"
                onClick={onBack}
                aria-label="Back to conversations"
                className="
                    flex h-10 w-10 shrink-0
                    items-center justify-center
                    rounded-full
                    text-text-secondary
                    transition
                    hover:bg-surface-tertiary
                    active:scale-95
                    md:hidden
                "
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>

            {/* ==================================================
                AVATAR
            ================================================== */}

            <button
                type="button"
                onClick={
                    handleOpenProfile
                }
                disabled={
                    !Number.isInteger(
                        userId
                    ) ||
                    userId <= 0
                }
                aria-label={`Open ${displayName}'s profile`}
                title={`View ${displayName}'s profile`}
                className="
                    flex h-11 w-11 shrink-0
                    items-center justify-center
                    overflow-hidden
                    rounded-full
                    bg-[#2563eb]
                    text-[17px]
                    font-semibold
                    text-white
                    transition
                    hover:opacity-90
                    active:scale-95
                    disabled:cursor-default
                "
            >
                {avatar ? (
                    <Image
                        src={avatar}
                        alt={`${displayName} avatar`}
                        width={44}
                        height={44}
                        className="
                            h-full
                            w-full
                            object-cover
                        "
                    />
                ) : (
                    displayName
                        ?.charAt(0)
                        ?.toUpperCase() ||
                    "?"
                )}
            </button>

            {/* ==================================================
                USER NAME + STATUS
            ================================================== */}

            <button
                type="button"
                onClick={
                    handleOpenProfile
                }
                disabled={
                    !Number.isInteger(
                        userId
                    ) ||
                    userId <= 0
                }
                className="
                    min-w-0
                    text-left
                    disabled:cursor-default
                "
                title={`View ${displayName}'s profile`}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "220px",
                    }}
                >
                    {loadingUser &&
                    !resolvedUser
                        ? "Loading..."
                        : displayName}
                </h2>

                <span
                    style={{
                        fontSize: "13px",
                        color: isOnline
                            ? "#10b981"
                            : "var(--text-muted)",
                    }}
                >
                    {isOnline
                        ? "Online"
                        : formatLastSeen()}
                </span>
            </button>
        </div>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div
            style={{
                display: "flex",
                gap: "4px",
                flexShrink: 0,
            }}
        >
            {/* CALL */}

            <button
                type="button"
                aria-label={`Call ${displayName}`}
                className="
                    flex h-10 w-10
                    items-center justify-center
                    rounded-full
                    text-text-secondary
                    transition
                    hover:bg-surface-tertiary
                    active:scale-95
                "
            >
                📞
            </button>

            {/* MORE */}

            <button
                type="button"
                aria-label="More options"
                className="
                    flex h-10 w-10
                    items-center justify-center
                    rounded-full
                    text-xl
                    text-text-secondary
                    transition
                    hover:bg-surface-tertiary
                    active:scale-95
                "
            >
                ⋮
            </button>
        </div>
    </header>
);


}
