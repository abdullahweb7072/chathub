"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { useRouter } from "next/navigation";

import ConversationList from "./ConversationList";
import NewChatModal from "./NewChatModal";

export default function ChatSideBar({
    conversations = [],
    activeConversation,
    currentUser,
    currentUserId,
    onSelectConversation,
}) {
    const router = useRouter();

    // ============================================================
    // STATE
    // ============================================================

    const [search, setSearch] = useState("");
    const [friendRequestCount, setFriendRequestCount] = useState(0);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [profileUser, setProfileUser] = useState(null);

    const resolvedCurrentUserId =
        currentUserId ?? currentUser?.id;

    // ============================================================
    // FETCH CURRENT USER PROFILE
    // ============================================================

    const fetchCurrentUserProfile = useCallback(async () => {
        if (!resolvedCurrentUserId) {
            return;
        }

        try {
            const response = await fetch(
                `/api/users/${resolvedCurrentUserId}`,
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                    headers: {
                        Accept: "application/json",
                    },
                }
            );

            if (!response.ok) {
                console.error(
                    "❌ PROFILE FETCH FAILED:",
                    response.status
                );
                return;
            }

            const data = await response.json();

            if (!data?.success) {
                console.error(
                    "❌ PROFILE API ERROR:",
                    data?.message
                );
                return;
            }

            const user =
                data?.user ||
                data?.data ||
                null;

            if (user) {
                setProfileUser(user);
            }
        } catch (error) {
            console.error(
                "❌ CURRENT USER PROFILE ERROR:",
                error
            );
        }
    }, [resolvedCurrentUserId]);

    useEffect(() => {
        fetchCurrentUserProfile();
    }, [fetchCurrentUserProfile]);

    // ============================================================
    // CURRENT USER
    // ============================================================

    const sidebarUser =
        profileUser ||
        currentUser ||
        {};

    const displayName =
        sidebarUser?.displayName?.trim() ||
        sidebarUser?.username?.trim() ||
        "User";

    const username =
        sidebarUser?.username?.trim() ||
        "";

    const userInitial =
        displayName.charAt(0).toUpperCase() ||
        "?";

    // ============================================================
    // RESET AVATAR ERROR
    // ============================================================

    useEffect(() => {
        setAvatarError(false);
    }, [sidebarUser?.avatar]);

    // ============================================================
    // FETCH FRIEND REQUESTS
    // ============================================================

    const fetchFriendRequestCount =
        useCallback(async () => {
            try {
                const response = await fetch(
                    "/api/friends/request/recieved",
                    {
                        method: "GET",
                        credentials: "include",
                        cache: "no-store",
                        headers: {
                            Accept: "application/json",
                        },
                    }
                );

                if (!response.ok) {
                    return;
                }

                const data =
                    await response.json();

                if (!data?.success) {
                    return;
                }

                const requests =
                    Array.isArray(data.data)
                        ? data.data
                        : [];

                setFriendRequestCount(
                    requests.length
                );
            } catch (error) {
                console.error(
                    "❌ FRIEND REQUEST COUNT ERROR:",
                    error
                );
            }
        }, []);

    useEffect(() => {
        fetchFriendRequestCount();
    }, [fetchFriendRequestCount]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchFriendRequestCount();
        }, 30000);

        return () => {
            clearInterval(interval);
        };
    }, [fetchFriendRequestCount]);

    // ============================================================
    // GET OTHER USER
    // ============================================================

    const getOtherUser = useCallback(
        (conversation) => {
            if (
                !Array.isArray(
                    conversation?.members
                )
            ) {
                return null;
            }

            const otherMember =
                conversation.members.find(
                    (member) => {
                        const memberUserId =
                            member?.user?.id ??
                            member?.userId;

                        return (
                            Number(memberUserId) !==
                            Number(
                                resolvedCurrentUserId
                            )
                        );
                    }
                );

            if (!otherMember) {
                return null;
            }

            return (
                otherMember.user ||
                otherMember
            );
        },
        [resolvedCurrentUserId]
    );

    // ============================================================
    // SEARCH FILTER
    // ============================================================

    const filteredConversations =
        useMemo(() => {
            const value =
                search
                    .trim()
                    .toLowerCase();

            if (!value) {
                return conversations;
            }

            return conversations.filter(
                (conversation) => {
                    const otherUser =
                        getOtherUser(
                            conversation
                        );

                    const displayName =
                        otherUser?.displayName ||
                        "";

                    const username =
                        otherUser?.username ||
                        "";

                    const email =
                        otherUser?.email ||
                        "";

                    const latestMessage =
                        conversation?.latestMessage;

                    const messageContent =
                        latestMessage?.content ||
                        "";

                    const conversationName =
                        conversation?.name ||
                        "";

                    return (
                        displayName
                            .toLowerCase()
                            .includes(value) ||
                        username
                            .toLowerCase()
                            .includes(value) ||
                        email
                            .toLowerCase()
                            .includes(value) ||
                        conversationName
                            .toLowerCase()
                            .includes(value) ||
                        messageContent
                            .toLowerCase()
                            .includes(value)
                    );
                }
            );
        }, [
            conversations,
            search,
            getOtherUser,
        ]);

    // ============================================================
    // NAVIGATION
    // ============================================================

    const handleOpenFriends = () => {
        router.push("/friends");
    };

    const handleOpenProfile = () => {
        router.push("/profile");
    };

    const handleOpenStatus = () => {
        router.push("/status");
    };

    const handleOpenSettings = () => {
        router.push("/settings");
    };

    // ============================================================
    // LOGOUT
    // ============================================================

    const handleOpenLogoutModal = () => {
        if (loggingOut) {
            return;
        }

        setShowLogoutModal(true);
    };

    const handleCloseLogoutModal = () => {
        if (loggingOut) {
            return;
        }

        setShowLogoutModal(false);
    };

    const handleLogout = async () => {
        if (loggingOut) {
            return;
        }

        try {
            setLoggingOut(true);

            const response = await fetch(
                "/api/auth/logout",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        Accept: "application/json",
                    },
                    cache: "no-store",
                }
            );

            const data =
                await response
                    .json()
                    .catch(() => null);

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                        "Logout failed."
                );
            }

            setShowLogoutModal(false);

            router.replace("/login");
            router.refresh();
        } catch (error) {
            console.error(
                "❌ LOGOUT ERROR:",
                error
            );

            setLoggingOut(false);
            setShowLogoutModal(true);
        }
    };

    // ============================================================
    // NEW CHAT
    // ============================================================

    const handleOpenNewChat = () => {
        setShowNewChat(true);
    };

    const handleCloseNewChat = () => {
        setShowNewChat(false);
    };

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <>
            <aside
                className={`
                    flex
                    h-full
                    w-full
                    flex-col
                    overflow-hidden
                    border-r
                    border-border
                    bg-background
                    text-foreground
                    transition-colors
                    duration-200
                    md:w-[360px]
                    lg:w-[400px]
                    ${
                        activeConversation
                            ? "hidden md:flex"
                            : "flex"
                    }
                `}
            >
                {/* ====================================================
                    TOP HEADER
                ==================================================== */}

                <div
                    className="
                        relative
                        shrink-0
                        overflow-hidden
                        border-b
                        border-border
                        bg-surface
                    "
                >
                    {/* subtle decorative glow */}

                    <div
                        className="
                            pointer-events-none
                            absolute
                            -right-12
                            -top-16
                            h-32
                            w-32
                            rounded-full
                            bg-blue-500/10
                            blur-3xl
                        "
                    />

                    <div
                        className="
                            pointer-events-none
                            absolute
                            -left-16
                            top-8
                            h-24
                            w-24
                            rounded-full
                            bg-purple-500/10
                            blur-3xl
                        "
                    />

                    <div
                        className="
                            relative
                            flex
                            items-center
                            justify-between
                            px-4
                            pb-4
                            pt-5
                        "
                    >
                        {/* USER */}

                        <button
                            type="button"
                            onClick={
                                handleOpenProfile
                            }
                            className="
                                group
                                flex
                                min-w-0
                                items-center
                                gap-3
                                rounded-2xl
                                pr-3
                                text-left
                                transition
                                active:scale-[0.98]
                            "
                            title="Open your profile"
                            aria-label="Open your profile"
                        >
                            {/* AVATAR */}

                            <div
                                className="
                                    relative
                                    h-11
                                    w-11
                                    shrink-0
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
                                        text-white
                                        shadow-lg
                                        shadow-blue-500/10
                                        ring-2
                                        ring-white/10
                                    "
                                >
                                    {sidebarUser?.avatar &&
                                    !avatarError ? (
                                        <img
                                            src={
                                                sidebarUser.avatar
                                            }
                                            alt={
                                                displayName
                                            }
                                            onError={() =>
                                                setAvatarError(
                                                    true
                                                )
                                            }
                                            className="
                                                h-full
                                                w-full
                                                object-cover
                                            "
                                        />
                                    ) : (
                                        <span
                                            className="
                                                select-none
                                                text-sm
                                                font-bold
                                            "
                                        >
                                            {
                                                userInitial
                                            }
                                        </span>
                                    )}
                                </div>

                                {/* online dot */}

                                <span
                                    className="
                                        absolute
                                        bottom-0
                                        right-0
                                        h-3
                                        w-3
                                        rounded-full
                                        border-2
                                        border-surface
                                        bg-emerald-500
                                    "
                                />
                            </div>

                            {/* NAME */}

                            <div className="min-w-0">
                                <p
                                    className="
                                        truncate
                                        text-sm
                                        font-semibold
                                        text-foreground
                                    "
                                >
                                    {displayName}
                                </p>

                                <p
                                    className="
                                        mt-0.5
                                        truncate
                                        text-[11px]
                                        text-muted
                                    "
                                >
                                    {username
                                        ? `@${username}`
                                        : "Your profile"}
                                </p>
                            </div>
                        </button>

                        {/* ACTIONS */}

                        <div
                            className="
                                flex
                                items-center
                                gap-1
                            "
                        >
                            {/* FRIENDS */}

                            <button
                                type="button"
                                onClick={
                                    handleOpenFriends
                                }
                                className="
                                    relative
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
                                title="Friends"
                                aria-label="Friends"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    className="h-[21px] w-[21px]"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                                    />

                                    <circle
                                        cx="9"
                                        cy="7"
                                        r="4"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M22 21v-2a4 4 0 0 0-3-3.87"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16 3.13a4 4 0 0 1 0 7.75"
                                    />
                                </svg>

                                {friendRequestCount >
                                    0 && (
                                    <span
                                        className="
                                            absolute
                                            right-0
                                            top-0
                                            flex
                                            min-h-[17px]
                                            min-w-[17px]
                                            items-center
                                            justify-center
                                            rounded-full
                                            bg-red-500
                                            px-1
                                            text-[9px]
                                            font-bold
                                            leading-none
                                            text-white
                                            ring-2
                                            ring-surface
                                        "
                                    >
                                        {friendRequestCount >
                                        99
                                            ? "99+"
                                            : friendRequestCount}
                                    </span>
                                )}
                            </button>

                            {/* NEW CHAT */}

                            <button
                                type="button"
                                onClick={
                                    handleOpenNewChat
                                }
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-foreground
                                    text-background
                                    shadow-sm
                                    transition
                                    hover:scale-105
                                    hover:opacity-90
                                    active:scale-95
                                "
                                title="New chat"
                                aria-label="New chat"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-5 w-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 5v14M5 12h14"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ====================================================
                    SEARCH
                ==================================================== */}

                <div
                    className="
                        shrink-0
                        px-3
                        py-3
                        bg-background
                    "
                >
                    <div
                        className="
                            group
                            flex
                            h-11
                            items-center
                            gap-2.5
                            rounded-xl
                            border
                            border-border
                            bg-surface
                            px-3
                            transition
                            focus-within:border-blue-500/40
                            focus-within:ring-2
                            focus-within:ring-blue-500/10
                        "
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="
                                h-[18px]
                                w-[18px]
                                shrink-0
                                text-muted
                            "
                        >
                            <circle
                                cx="11"
                                cy="11"
                                r="7"
                            />

                            <path
                                strokeLinecap="round"
                                d="m20 20-4-4"
                            />
                        </svg>

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search conversations..."
                            className="
                                h-full
                                min-w-0
                                flex-1
                                bg-transparent
                                text-sm
                                text-foreground
                                outline-none
                                placeholder:text-muted
                            "
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() =>
                                    setSearch("")
                                }
                                className="
                                    flex
                                    h-6
                                    w-6
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-hover
                                    text-muted
                                    transition
                                    hover:text-foreground
                                "
                                aria-label="Clear search"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-3.5 w-3.5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        d="M6 6l12 12M18 6 6 18"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* ====================================================
                    STATUS CARD
                ==================================================== */}

                <div
                    className="
                        shrink-0
                        px-3
                        pb-3
                    "
                >
                    <button
                        type="button"
                        onClick={
                            handleOpenStatus
                        }
                        className="
                            group
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-2xl
                            border
                            border-border
                            bg-surface
                            p-3
                            text-left
                            transition
                            hover:border-blue-500/20
                            hover:bg-hover
                            active:scale-[0.99]
                        "
                    >
                        {/* STATUS AVATAR */}

                        <div
                            className="
                                relative
                                h-11
                                w-11
                                shrink-0
                                rounded-full
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
                                    border-2
                                    border-dashed
                                    border-blue-500
                                    bg-background
                                "
                            >
                                {sidebarUser?.avatar &&
                                !avatarError ? (
                                    <img
                                        src={
                                            sidebarUser.avatar
                                        }
                                        alt={
                                            displayName
                                        }
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
                                            text-foreground
                                        "
                                    >
                                        {
                                            userInitial
                                        }
                                    </span>
                                )}
                            </div>

                            <span
                                className="
                                    absolute
                                    bottom-0
                                    right-0
                                    flex
                                    h-[17px]
                                    w-[17px]
                                    items-center
                                    justify-center
                                    rounded-full
                                    border-2
                                    border-surface
                                    bg-blue-500
                                    text-[11px]
                                    font-bold
                                    text-white
                                "
                            >
                                +
                            </span>
                        </div>

                        <div className="min-w-0 flex-1">
                            <div
                                className="
                                    flex
                                    items-center
                                    justify-between
                                    gap-2
                                "
                            >
                                <p
                                    className="
                                        truncate
                                        text-sm
                                        font-semibold
                                        text-foreground
                                    "
                                >
                                    My Status
                                </p>

                                <span
                                    className="
                                        text-[10px]
                                        font-medium
                                        text-blue-500
                                        opacity-0
                                        transition
                                        group-hover:opacity-100
                                    "
                                >
                                    View
                                </span>
                            </div>

                            <p
                                className="
                                    mt-0.5
                                    truncate
                                    text-xs
                                    text-muted
                                "
                            >
                                Share an update with friends
                            </p>
                        </div>

                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="
                                h-4
                                w-4
                                shrink-0
                                text-muted
                                transition
                                group-hover:translate-x-0.5
                            "
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m9 18 6-6-6-6"
                            />
                        </svg>
                    </button>
                </div>

                {/* ====================================================
                    CONVERSATIONS HEADER
                ==================================================== */}

                <div
                    className="
                        flex
                        shrink-0
                        items-center
                        justify-between
                        px-4
                        pb-2
                    "
                >
                    <div className="flex items-center gap-2">
                        <h2
                            className="
                                text-xs
                                font-bold
                                uppercase
                                tracking-[0.12em]
                                text-muted
                            "
                        >
                            Messages
                        </h2>

                        {conversations.length > 0 && (
                            <span
                                className="
                                    rounded-full
                                    bg-surface
                                    px-2
                                    py-0.5
                                    text-[10px]
                                    font-semibold
                                    text-muted
                                "
                            >
                                {conversations.length}
                            </span>
                        )}
                    </div>

                    {search && (
                        <span
                            className="
                                text-[10px]
                                text-muted
                            "
                        >
                            {filteredConversations.length}{" "}
                            result
                            {filteredConversations.length ===
                            1
                                ? ""
                                : "s"}
                        </span>
                    )}
                </div>

                {/* ====================================================
                    CONVERSATIONS
                ==================================================== */}

                <div
                    className="
                        min-h-0
                        flex-1
                        overflow-hidden
                    "
                >
                    <ConversationList
                        conversations={
                            filteredConversations
                        }
                        activeConversation={
                            activeConversation
                        }
                        onSelectConversation={
                            onSelectConversation
                        }
                        currentUserId={
                            resolvedCurrentUserId
                        }
                    />
                </div>

                {/* ====================================================
                    BOTTOM QUICK ACTIONS
                ==================================================== */}

                <div
                    className="
                        shrink-0
                        border-t
                        border-border
                        bg-surface
                        p-2
                    "
                >
                    <div
                        className="
                            grid
                            grid-cols-3
                            gap-1
                        "
                    >
                        {/* PROFILE */}

                        <button
                            type="button"
                            onClick={
                                handleOpenProfile
                            }
                            className="
                                group
                                flex
                                flex-col
                                items-center
                                justify-center
                                gap-1
                                rounded-xl
                                py-2
                                text-muted
                                transition
                                hover:bg-hover
                                hover:text-foreground
                            "
                            title="My Profile"
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
                                    d="M20 21a8 8 0 0 0-16 0"
                                />

                                <circle
                                    cx="12"
                                    cy="7"
                                    r="4"
                                />
                            </svg>

                            <span className="text-[10px] font-medium">
                                Profile
                            </span>
                        </button>

                        {/* SETTINGS */}

                        <button
                            type="button"
                            onClick={
                                handleOpenSettings
                            }
                            className="
                                group
                                flex
                                flex-col
                                items-center
                                justify-center
                                gap-1
                                rounded-xl
                                py-2
                                text-muted
                                transition
                                hover:bg-hover
                                hover:text-foreground
                            "
                            title="Settings"
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
                                    group-hover:rotate-45
                                "
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="3"
                                />

                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06A1.7 1.7 0 0 0 16.2 18a1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2A1.7 1.7 0 0 0 11.74 18a1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.14 15a1.7 1.7 0 0 0-1.56-1.03H6.4v-2.4h.18A1.7 1.7 0 0 0 8.14 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56V4h2.4v.2A1.7 1.7 0 0 0 14.03 5.76a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 17.94 9a1.7 1.7 0 0 0 1.56 1.03h.2v2.4h-.2A1.7 1.7 0 0 0 17.94 15Z"
                                />
                            </svg>

                            <span className="text-[10px] font-medium">
                                Settings
                            </span>
                        </button>

                        {/* LOGOUT */}

                        <button
                            type="button"
                            onClick={
                                handleOpenLogoutModal
                            }
                            disabled={
                                loggingOut
                            }
                            className="
                                group
                                flex
                                flex-col
                                items-center
                                justify-center
                                gap-1
                                rounded-xl
                                py-2
                                text-muted
                                transition
                                hover:bg-red-500/10
                                hover:text-red-500
                                disabled:opacity-50
                            "
                            title="Logout"
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
                                    group-hover:translate-x-0.5
                                "
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
                                />

                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M10 17l5-5-5-5"
                                />

                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 12H3"
                                />
                            </svg>

                            <span className="text-[10px] font-medium">
                                Logout
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ========================================================
                NEW CHAT MODAL
            ======================================================== */}

            <NewChatModal
                open={showNewChat}
                onClose={
                    handleCloseNewChat
                }
            />

            {/* ========================================================
                LOGOUT MODAL
            ======================================================== */}

            {showLogoutModal && (
                <div
                    className="
                        fixed
                        inset-0
                        z-[100]
                        flex
                        items-center
                        justify-center
                        bg-black/60
                        px-4
                        backdrop-blur-md
                    "
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                                event.currentTarget &&
                            !loggingOut
                        ) {
                            handleCloseLogoutModal();
                        }
                    }}
                >
                    <div
                        className="
                            w-full
                            max-w-sm
                            overflow-hidden
                            rounded-3xl
                            border
                            border-border
                            bg-surface
                            shadow-2xl
                        "
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-title"
                    >
                        <div className="px-6 pb-6 pt-7">
                            <div
                                className="
                                    mx-auto
                                    mb-5
                                    flex
                                    h-14
                                    w-14
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-red-500/10
                                    text-red-500
                                "
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-7 w-7"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M10 17l5-5-5-5"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 12H3"
                                    />
                                </svg>
                            </div>

                            <h2
                                id="logout-title"
                                className="
                                    text-center
                                    text-lg
                                    font-bold
                                    text-foreground
                                "
                            >
                                Logout from ChatHub?
                            </h2>

                            <p
                                className="
                                    mt-2
                                    text-center
                                    text-sm
                                    leading-6
                                    text-muted
                                "
                            >
                                Are you sure you want
                                to logout from your
                                account?
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                gap-3
                                border-t
                                border-border
                                bg-background
                                px-6
                                py-4
                            "
                        >
                            <button
                                type="button"
                                onClick={
                                    handleCloseLogoutModal
                                }
                                disabled={
                                    loggingOut
                                }
                                className="
                                    h-11
                                    flex-1
                                    rounded-xl
                                    border
                                    border-border
                                    bg-surface
                                    px-4
                                    text-sm
                                    font-medium
                                    text-foreground
                                    transition
                                    hover:bg-hover
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={
                                    handleLogout
                                }
                                disabled={
                                    loggingOut
                                }
                                className="
                                    h-11
                                    flex-1
                                    rounded-xl
                                    bg-red-600
                                    px-4
                                    text-sm
                                    font-semibold
                                    text-white
                                    transition
                                    hover:bg-red-700
                                    active:scale-[0.98]
                                    disabled:cursor-not-allowed
                                    disabled:opacity-60
                                "
                            >
                                {loggingOut ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span
                                            className="
                                                h-4
                                                w-4
                                                animate-spin
                                                rounded-full
                                                border-2
                                                border-white/30
                                                border-t-white
                                            "
                                        />

                                        Logging out...
                                    </span>
                                ) : (
                                    "Logout"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}