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

    const [friendRequestCount, setFriendRequestCount] =
        useState(0);

    const [showNewChat, setShowNewChat] =
        useState(false);

    const [showLogoutModal, setShowLogoutModal] =
        useState(false);

    const [loggingOut, setLoggingOut] =
        useState(false);

    const [avatarError, setAvatarError] =
        useState(false);

    const [profileUser, setProfileUser] =
        useState(null);

    const resolvedCurrentUserId =
        currentUserId ?? currentUser?.id;

    // ============================================================
    // FETCH CURRENT USER PROFILE
    // ============================================================

    const fetchCurrentUserProfile = useCallback(
        async () => {
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
        },
        [resolvedCurrentUserId]
    );

    // ============================================================
    // LOAD PROFILE
    // ============================================================

    useEffect(() => {
        fetchCurrentUserProfile();
    }, [fetchCurrentUserProfile]);

    // ============================================================
    // CURRENT USER DISPLAY DATA
    // ============================================================

    const sidebarUser =
        profileUser || currentUser || {};

    const displayName =
        sidebarUser?.displayName ||
        sidebarUser?.username ||
        "User";

    const username =
        sidebarUser?.username
            ? `@${sidebarUser.username}`
            : "";

    const userInitial =
        displayName.charAt(0).toUpperCase() || "?";

    // ============================================================
    // RESET AVATAR ERROR
    // ============================================================

    useEffect(() => {
        setAvatarError(false);
    }, [sidebarUser?.avatar]);

    // ============================================================
    // FETCH FRIEND REQUEST COUNT
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

    // ============================================================
    // INITIAL FRIEND REQUEST COUNT
    // ============================================================

    useEffect(() => {
        fetchFriendRequestCount();
    }, [fetchFriendRequestCount]);

    // ============================================================
    // REFRESH FRIEND REQUEST COUNT
    // ============================================================

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
                !conversation?.members ||
                !Array.isArray(
                    conversation.members
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
    // LOGOUT MODAL
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

    // ============================================================
    // LOGOUT
    // ============================================================

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
                    HEADER
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
                    {/* SUBTLE HEADER GLOW */}

                    <div
                        className="
                            pointer-events-none
                            absolute
                            -right-16
                            -top-20
                            h-40
                            w-40
                            rounded-full
                            bg-indigo-500/10
                            blur-3xl
                        "
                    />

                    <div
                        className="
                            relative
                            flex
                            h-[76px]
                            items-center
                            justify-between
                            px-4
                        "
                    >
                        {/* USER PROFILE */}

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
                                transition-all
                                duration-200
                                hover:bg-hover
                            "
                            title="Open your profile"
                            aria-label="Open your profile"
                        >
                            {/* AVATAR */}

                            <div
                                className="
                                    relative
                                    flex
                                    h-11
                                    w-11
                                    shrink-0
                                    items-center
                                    justify-center
                                    overflow-hidden
                                    rounded-full
                                    bg-gradient-to-br
                                    from-blue-500
                                    via-indigo-500
                                    to-purple-600
                                    p-[2px]
                                    shadow-lg
                                    shadow-indigo-500/10
                                "
                            >
                                <div
                                    className="
                                        flex
                                        h-full
                                        w-full
                                        items-center
                                        justify-center
                                        overflow-hidden
                                        rounded-full
                                        bg-surface
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
                                                text-sm
                                                font-bold
                                                text-foreground
                                            "
                                        >
                                            {userInitial}
                                        </span>
                                    )}
                                </div>

                                {/* ONLINE INDICATOR */}

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
                                        bg-green-500
                                    "
                                />
                            </div>

                            {/* USER DETAILS */}

                            <div className="min-w-0">
                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                    "
                                >
                                    <p
                                        className="
                                            max-w-[150px]
                                            truncate
                                            text-sm
                                            font-semibold
                                            text-foreground
                                        "
                                    >
                                        {displayName}
                                    </p>

                                    <span
                                        className="
                                            rounded-full
                                            bg-green-500/10
                                            px-1.5
                                            py-0.5
                                            text-[9px]
                                            font-semibold
                                            uppercase
                                            tracking-wide
                                            text-green-500
                                        "
                                    >
                                        Online
                                    </span>
                                </div>

                                <p
                                    className="
                                        mt-0.5
                                        max-w-[170px]
                                        truncate
                                        text-[11px]
                                        text-muted
                                    "
                                >
                                    {username ||
                                        "Your ChatHub account"}
                                </p>
                            </div>
                        </button>

                        {/* HEADER ACTIONS */}

                        <div
                            className="
                                flex
                                shrink-0
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
                                    transition-all
                                    duration-200
                                    hover:bg-hover
                                    hover:text-foreground
                                    active:scale-95
                                "
                                title="Friends & requests"
                                aria-label="Friends and friend requests"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-[20px] w-[20px]"
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
                                            h-[17px]
                                            min-w-[17px]
                                            items-center
                                            justify-center
                                            rounded-full
                                            bg-red-500
                                            px-1
                                            text-[9px]
                                            font-bold
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
                                    transition-all
                                    duration-200
                                    hover:scale-105
                                    hover:shadow-lg
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
                        border-b
                        border-border
                        bg-background
                        px-3
                        py-3
                    "
                >
                    <div
                        className="
                            group
                            flex
                            h-11
                            items-center
                            rounded-xl
                            border
                            border-transparent
                            bg-surface
                            px-3
                            transition-all
                            duration-200
                            focus-within:border-indigo-500/30
                            focus-within:bg-surface
                            focus-within:ring-2
                            focus-within:ring-indigo-500/10
                        "
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="
                                mr-2.5
                                h-[18px]
                                w-[18px]
                                shrink-0
                                text-muted
                                transition-colors
                                group-focus-within:text-indigo-500
                            "
                            aria-hidden="true"
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
                                    text-muted
                                    transition
                                    hover:bg-hover
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
                                        strokeLinejoin="round"
                                        d="M6 6l12 12M18 6 6 18"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* ====================================================
                    STATUS
                ==================================================== */}

                <div
                    className="
                        shrink-0
                        border-b
                        border-border
                        bg-background
                        px-3
                        py-3
                    "
                >
                    <button
                        type="button"
                        onClick={
                            handleOpenStatus
                        }
                        className="
                            group
                            relative
                            flex
                            w-full
                            items-center
                            gap-3
                            overflow-hidden
                            rounded-2xl
                            border
                            border-border
                            bg-surface
                            px-3
                            py-3
                            text-left
                            transition-all
                            duration-200
                            hover:border-indigo-500/20
                            hover:bg-hover
                            hover:shadow-sm
                        "
                        title="Open Status"
                        aria-label="Open Status"
                    >
                        {/* CARD GLOW */}

                        <div
                            className="
                                pointer-events-none
                                absolute
                                -right-8
                                -top-8
                                h-20
                                w-20
                                rounded-full
                                bg-green-500/10
                                blur-2xl
                            "
                        />

                        {/* STATUS AVATAR */}

                        <div
                            className="
                                relative
                                flex
                                h-11
                                w-11
                                shrink-0
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-full
                                border-2
                                border-dashed
                                border-green-500
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
                                    {userInitial}
                                </span>
                            )}

                            <span
                                className="
                                    absolute
                                    bottom-0
                                    right-0
                                    flex
                                    h-4
                                    w-4
                                    items-center
                                    justify-center
                                    rounded-full
                                    border-2
                                    border-background
                                    bg-green-500
                                    text-[10px]
                                    font-bold
                                    text-white
                                "
                            >
                                +
                            </span>
                        </div>

                        {/* STATUS TEXT */}

                        <div className="relative min-w-0 flex-1">
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

                            <p
                                className="
                                    mt-0.5
                                    truncate
                                    text-[11px]
                                    text-muted
                                "
                            >
                                Share an update with
                                your friends
                            </p>
                        </div>

                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="
                                relative
                                h-4
                                w-4
                                shrink-0
                                text-muted
                                transition-transform
                                duration-200
                                group-hover:translate-x-0.5
                                group-hover:text-foreground
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
                        pt-3
                    "
                >
                    <p
                        className="
                            text-[11px]
                            font-semibold
                            uppercase
                            tracking-[0.12em]
                            text-muted
                        "
                    >
                        Messages
                    </p>

                    {filteredConversations.length >
                        0 && (
                        <span
                            className="
                                rounded-full
                                bg-surface
                                px-2
                                py-0.5
                                text-[10px]
                                font-medium
                                text-muted
                            "
                        >
                            {
                                filteredConversations.length
                            }
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
                    VIEW STATUS
                ==================================================== */}

                <div
                    className="
                        shrink-0
                        border-t
                        border-border
                        bg-background
                        px-3
                        py-2
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
                            rounded-xl
                            px-3
                            py-2
                            text-left
                            text-foreground
                            transition-all
                            duration-200
                            hover:bg-hover
                        "
                        title="View Status"
                        aria-label="View Status"
                    >
                        <span
                            className="
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-surface
                                text-muted
                                transition-colors
                                group-hover:text-foreground
                            "
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                                />

                                <circle
                                    cx="12"
                                    cy="12"
                                    r="2.5"
                                />
                            </svg>
                        </span>

                        <span className="text-sm font-medium">
                            View Status
                        </span>

                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="
                                ml-auto
                                h-4
                                w-4
                                text-muted
                                transition-transform
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
                    FOOTER
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
                                transition-all
                                duration-200
                                hover:bg-hover
                                hover:text-foreground
                            "
                            title="My Profile"
                        >
                            <span
                                className="
                                    flex
                                    h-8
                                    w-8
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-background
                                    transition-transform
                                    group-hover:scale-105
                                "
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-[18px] w-[18px]"
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
                            </span>

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
                                transition-all
                                duration-200
                                hover:bg-hover
                                hover:text-foreground
                            "
                            title="Settings"
                        >
                            <span
                                className="
                                    flex
                                    h-8
                                    w-8
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-background
                                    transition-transform
                                    duration-200
                                    group-hover:rotate-12
                                "
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-[18px] w-[18px]"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="3"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-1.77 1.77-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-2.5v-.23a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-1.77-1.77.06-.06A1.65 1.65 0 0 0 8.4 15a1.65 1.65 0 0 0-1.51-1H6.7v-2.5h.19a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06 1.77-1.77.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V5.5h2.5v.23a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 1.77 1.77-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1h.19V14h-.19a1.65 1.65 0 0 0-1.51 1Z"
                                    />
                                </svg>
                            </span>

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
                            disabled={loggingOut}
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
                                transition-all
                                duration-200
                                hover:bg-red-500/10
                                hover:text-red-500
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                            title="Logout"
                        >
                            <span
                                className="
                                    flex
                                    h-8
                                    w-8
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-background
                                    transition-transform
                                    group-hover:translate-x-0.5
                                "
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-[18px] w-[18px]"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m10 17 5-5-5-5"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 12H3"
                                    />
                                </svg>
                            </span>

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
                        {/* MODAL CONTENT */}

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
                                        d="m10 17 5-5-5-5"
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
                                    font-semibold
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

                        {/* MODAL ACTIONS */}

                        <div
                            className="
                                flex
                                gap-3
                                border-t
                                border-border
                                bg-background
                                px-5
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
                                    shadow-sm
                                    transition
                                    hover:bg-red-700
                                    hover:shadow-lg
                                    disabled:cursor-not-allowed
                                    disabled:opacity-60
                                "
                            >
                                {loggingOut ? (
                                    <span
                                        className="
                                            flex
                                            items-center
                                            justify-center
                                            gap-2
                                        "
                                    >
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