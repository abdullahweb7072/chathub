"use client";

import Image from "next/image";

import {
    useEffect,
    useState,
} from "react";

import { useRouter } from "next/navigation";

import ChatThemePicker from "../ChatThemePicker";

// ============================================================
// CHAT HEADER
// ============================================================

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

    // ============================================================
    // CHAT THEME
    // ============================================================

    selectedTheme = "default",
    onSelectTheme,
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
    // THEME STATE
    // ============================================================

    const [
        showThemePicker,
        setShowThemePicker,
    ] = useState(false);

    // ============================================================
    // NO CONVERSATION
    // ============================================================

    if (!conversation) {
        return (
            <header
                className="
                    flex
                    h-[76px]
                    shrink-0
                    items-center
                    border-b
                    border-border
                    bg-surface
                    px-5
                "
            >
                <div
                    className="
                        flex
                        items-center
                        gap-3
                    "
                >
                    <div
                        className="
                            h-10
                            w-10
                            animate-pulse
                            rounded-xl
                            bg-hover
                        "
                    />

                    <div>
                        <div
                            className="
                                h-3
                                w-32
                                animate-pulse
                                rounded-full
                                bg-hover
                            "
                        />

                        <div
                            className="
                                mt-2
                                h-2
                                w-20
                                animate-pulse
                                rounded-full
                                bg-hover
                            "
                        />
                    </div>
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
    // FIND OTHER USER
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
    // FETCH USER
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
    // RESOLVED USER
    // ============================================================

    const fallbackUser =
        otherMember?.user || null;

    const resolvedUser =
        otherUser || fallbackUser;

    // ============================================================
    // USER INFO
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
    // AUDIO CALL
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
    // VIDEO CALL
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
    // THEME
    // ============================================================

    const handleThemeButtonClick = () => {
        setShowThemePicker(
            (previous) => !previous
        );
    };

    const handleSelectTheme = (
        themeId
    ) => {
        if (
            typeof onSelectTheme !==
            "function"
        ) {
            return;
        }

        onSelectTheme(themeId);

        setShowThemePicker(false);
    };

    // ============================================================
    // LAST SEEN
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
            className="
                relative
                flex
                h-[76px]
                shrink-0
                items-center
                justify-between
                overflow-visible
                border-b
                border-border
                bg-surface
                px-3
                md:px-5
            "
        >
            {/* ==================================================
                DECORATIVE BACKGROUND
            ================================================== */}

            <div
                className="
                    pointer-events-none
                    absolute
                    -right-12
                    -top-20
                    h-36
                    w-36
                    rounded-full
                    bg-blue-500/10
                    blur-3xl
                "
            />

            {/* ==================================================
                LEFT SIDE
            ================================================== */}

            <div
                className="
                    relative
                    flex
                    min-w-0
                    items-center
                    gap-2
                    md:gap-3
                "
            >
                {/* MOBILE BACK */}

                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back to conversations"
                    className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        text-muted
                        transition
                        hover:bg-hover
                        hover:text-foreground
                        active:scale-95
                        md:hidden
                    "
                >
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
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
                        group
                        relative
                        h-11
                        w-11
                        shrink-0
                        overflow-visible
                        rounded-full
                        disabled:cursor-default
                    "
                >
                    <div
                        className="
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            overflow-hidden
                            rounded-full
                            bg-gradient-to-br
                            from-blue-500
                            via-indigo-500
                            to-purple-600
                            shadow-md
                            ring-2
                            ring-background
                            transition
                            group-hover:scale-105
                        "
                    >
                        {avatar ? (
                            <Image
                                src={avatar}
                                alt={
                                    displayName
                                }
                                width={44}
                                height={44}
                                className="
                                    h-full
                                    w-full
                                    object-cover
                                "
                            />
                        ) : (
                            <span
                                className="
                                    text-sm
                                    font-bold
                                    text-white
                                "
                            >
                                {displayName
                                    .charAt(
                                        0
                                    )
                                    .toUpperCase()}
                            </span>
                        )}
                    </div>

                    {/* ONLINE INDICATOR */}

                    <span
                        className={`
                            absolute
                            bottom-0
                            right-0
                            h-3
                            w-3
                            rounded-full
                            border-2
                            border-surface
                            ${
                                isOnline
                                    ? "bg-emerald-500"
                                    : "bg-muted/50"
                            }
                        `}
                    />
                </button>

                {/* ==================================================
                    USER INFO
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
                        flex
                        min-w-0
                        flex-col
                        text-left
                        focus:outline-none
                    "
                >
                    <div
                        className="
                            flex
                            min-w-0
                            items-center
                            gap-2
                        "
                    >
                        <span
                            className="
                                max-w-[180px]
                                truncate
                                text-[15px]
                                font-semibold
                                text-foreground
                                md:max-w-[280px]
                                md:text-base
                            "
                        >
                            {loadingUser
                                ? "Loading..."
                                : displayName}
                        </span>

                        {isOnline && (
                            <span
                                className="
                                    hidden
                                    rounded-full
                                    bg-emerald-500/10
                                    px-1.5
                                    py-0.5
                                    text-[9px]
                                    font-semibold
                                    uppercase
                                    tracking-wide
                                    text-emerald-500
                                    sm:inline-flex
                                "
                            >
                                Online
                            </span>
                        )}
                    </div>

                    <span
                        className="
                            mt-0.5
                            max-w-[200px]
                            truncate
                            text-[11px]
                            text-muted
                            md:max-w-[300px]
                            md:text-xs
                        "
                    >
                        {isOnline
                            ? "Active now"
                            : formatLastSeen()}
                    </span>
                </button>
            </div>

            {/* ==================================================
                RIGHT ACTIONS
            ================================================== */}

            <div
                className="
                    relative
                    flex
                    shrink-0
                    items-center
                    gap-0.5
                    md:gap-1
                "
            >
                {/* ==================================================
                    THEME
                ================================================== */}

                <button
                    type="button"
                    onClick={
                        handleThemeButtonClick
                    }
                    className="
                        group
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        text-muted
                        transition
                        hover:bg-hover
                        hover:text-foreground
                        active:scale-95
                    "
                    title="Chat Theme"
                    aria-label="Chat Theme"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="
                            h-[20px]
                            w-[20px]
                            transition
                            group-hover:rotate-12
                        "
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.5-3.3 2 2 0 0 1 1.5-3.3H18a3 3 0 0 0 3-3c0-4.64-4.03-8.4-9-8.4Z"
                        />

                        <circle
                            cx="7.5"
                            cy="10"
                            r="1"
                            fill="currentColor"
                            stroke="none"
                        />

                        <circle
                            cx="10"
                            cy="6.8"
                            r="1"
                            fill="currentColor"
                            stroke="none"
                        />

                        <circle
                            cx="14"
                            cy="6.8"
                            r="1"
                            fill="currentColor"
                            stroke="none"
                        />
                    </svg>
                </button>

                {/* THEME PICKER */}

                {showThemePicker && (
                    <ChatThemePicker
                        selectedTheme={
                            selectedTheme
                        }
                        onSelectTheme={
                            handleSelectTheme
                        }
                        onClose={() =>
                            setShowThemePicker(
                                false
                            )
                        }
                    />
                )}

                {/* ==================================================
                    AUDIO CALL
                ================================================== */}

                <button
                    type="button"
                    onClick={
                        handleStartAudioCall
                    }
                    className="
                        group
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        text-muted
                        transition
                        hover:bg-emerald-500/10
                        hover:text-emerald-500
                        active:scale-95
                    "
                    title="Start Audio Call"
                    aria-label="Start Audio Call"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="
                            h-[19px]
                            w-[19px]
                            transition
                            group-hover:scale-105
                        "
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"
                        />
                    </svg>
                </button>

                {/* ==================================================
                    VIDEO CALL
                ================================================== */}

                <button
                    type="button"
                    onClick={
                        handleStartVideoCall
                    }
                    className="
                        group
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        text-muted
                        transition
                        hover:bg-blue-500/10
                        hover:text-blue-500
                        active:scale-95
                    "
                    title="Start Video Call"
                    aria-label="Start Video Call"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="
                            h-[19px]
                            w-[19px]
                            transition
                            group-hover:scale-105
                        "
                    >
                        <rect
                            x="3"
                            y="6"
                            width="13"
                            height="12"
                            rx="2"
                        />

                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m16 10 5-3v10l-5-3"
                        />
                    </svg>
                </button>
            </div>
        </header>
    );
}