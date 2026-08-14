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

    // ============================================================
    // CALL CALLBACKS
    // ============================================================

    onStartAudioCall,
    onStartVideoCall,
}) {
    const router = useRouter();

    // ============================================================
    // USER STATE
    // ============================================================

    const [otherUser, setOtherUser] =
        useState(null);

    const [loadingUser, setLoadingUser] =
        useState(false);

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
                    borderBottom:
                        "1px solid var(--border)",
                    background:
                        "var(--surface)",
                    color:
                        "var(--text-primary)",
                }}
            >
                <div
                    style={{
                        fontSize: "16px",
                        color:
                            "var(--text-muted)",
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

    const currentUserId =
        Number(currentUser?.id);

    // ============================================================
    // FIND OTHER USER ID
    // ============================================================

    const members =
        Array.isArray(
            conversation.members
        )
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
                !Number.isInteger(
                    otherUserId
                ) ||
                otherUserId <= 0
            ) {
                setOtherUser(null);
                return;
            }

            try {
                setLoadingUser(true);

                const response =
                    await fetch(
                        `/api/users/${otherUserId}`,
                        {
                            method: "GET",
                            credentials:
                                "include",
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

                    setOtherUser(
                        otherMember?.user ||
                            null
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingUser(
                        false
                    );
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
        resolvedUser?.avatar || null;

    const userId = Number(
        resolvedUser?.id ??
            otherUserId
    );

    // ============================================================
    // ONLINE STATUS
    // ============================================================

    const isOnline =
        onlineUsers.some(
            (id) =>
                Number(id) ===
                Number(userId)
        ) ||
        Boolean(
            resolvedUser?.isOnline
        );

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
            !Number.isInteger(
                userId
            ) ||
            userId <= 0
        ) {
            return;
        }

        if (
            userId ===
            currentUserId
        ) {
            router.push("/profile");
            return;
        }

        router.push(
            `/profile/${userId}`
        );
    };

    // ============================================================
    // START AUDIO CALL
    // ============================================================

    const handleStartAudioCall = () => {
        if (
            !Number.isInteger(
                userId
            ) ||
            userId <= 0
        ) {
            console.error(
                "❌ Cannot start audio call: invalid user ID"
            );

            return;
        }

        if (
            typeof onStartAudioCall !==
            "function"
        ) {
            console.error(
                "❌ onStartAudioCall callback is not available"
            );

            return;
        }

        console.log(
            "📞 Starting audio call with:",
            userId
        );

        onStartAudioCall(userId);
    };

    // ============================================================
    // START VIDEO CALL
    // ============================================================

    const handleStartVideoCall = () => {
        if (
            !Number.isInteger(
                userId
            ) ||
            userId <= 0
        ) {
            console.error(
                "❌ Cannot start video call: invalid user ID"
            );

            return;
        }

        if (
            typeof onStartVideoCall !==
            "function"
        ) {
            console.error(
                "❌ onStartVideoCall callback is not available"
            );

            return;
        }

        console.log(
            "🎥 Starting video call with:",
            userId
        );

        onStartVideoCall(userId);
    };

    // ============================================================
    // LAST SEEN FORMAT
    // ============================================================

    const formatLastSeen = () => {
        if (!lastSeen) {
            return "Last seen recently";
        }

        const date =
            new Date(lastSeen);

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
                dateStyle:
                    "medium",
                timeStyle:
                    "short",
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
                justifyContent:
                    "space-between",
                borderBottom:
                    "1px solid var(--border)",
                background:
                    "var(--surface)",
            }}
        >
            {/* ==================================================
                LEFT SIDE
            ================================================== */}

            <div
                style={{
                    display: "flex",
                    alignItems:
                        "center",
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
                        bg-surface-tertiary
                        transition
                        hover:opacity-90
                    "
                >
                    {avatar ? (
                        <Image
                            src={avatar}
                            alt={displayName}
                            width={44}
                            height={44}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="text-base font-semibold text-text-primary">
                            {displayName.charAt(0).toUpperCase()}
                        </span>
                    )}
                </button>

                {/* ==================================================
                    USER INFO
                ================================================== */}

                <button
                    type="button"
                    onClick={handleOpenProfile}
                    disabled={
                        !Number.isInteger(userId) || userId <= 0
                    }
                    className="flex min-w-0 flex-col text-left focus:outline-none"
                >
                    <span className="truncate text-base font-medium text-text-primary">
                        {displayName}
                    </span>
                    <span className="truncate text-xs text-text-secondary">
                        {isOnline ? "Online" : formatLastSeen()}
                    </span>
                </button>
            </div>

            {/* ==================================================
                RIGHT SIDE / ACTION BUTTONS
            ================================================== */}

            <div className="flex items-center gap-1">
                {/* AUDIO CALL */}
                <button
                    type="button"
                    onClick={handleStartAudioCall}
                    className="
                        flex h-10 w-10 items-center justify-center
                        rounded-full text-text-secondary transition
                        hover:bg-surface-tertiary hover:text-text-primary
                    "
                    title="Start Audio Call"
                >
                    📞
                </button>

                {/* VIDEO CALL */}
                <button
                    type="button"
                    onClick={handleStartVideoCall}
                    className="
                        flex h-10 w-10 items-center justify-center
                        rounded-full text-text-secondary transition
                        hover:bg-surface-tertiary hover:text-text-primary
                    "
                    title="Start Video Call"
                >
                    📹
                </button>
            </div>
        </header>
    );
}