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

    // Profile data fetched from /api/users/[id]
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

                // Your API may return user directly
                // or inside data.user.
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

    /*
     * Prefer the user returned by /api/users/[id].
     * Fall back to currentUser so the sidebar still works
     * while the API request is loading.
     */

    const sidebarUser =
        profileUser || currentUser || {};

    // ============================================================
    // CURRENT USER DISPLAY NAME
    // ============================================================

    const displayName =
        sidebarUser?.displayName ||
        sidebarUser?.username ||
        "User";

    const userInitial =
        displayName.charAt(0).toUpperCase() || "?";

    // ============================================================
    // RESET AVATAR ERROR WHEN USER AVATAR CHANGES
    // ============================================================

    useEffect(() => {
        setAvatarError(false);
    }, [sidebarUser?.avatar]);

    // ============================================================
    // FETCH PENDING FRIEND REQUESTS
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
                            Accept:
                                "application/json",
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
    // REFRESH REQUEST COUNT
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
    // OPEN FRIENDS PAGE
    // ============================================================

    const handleOpenFriends = () => {
        router.push("/friends");
    };

    // ============================================================
    // OPEN OWN PROFILE
    // ============================================================

    const handleOpenProfile = () => {
        router.push("/profile");
    };

    // ============================================================
    // OPEN STATUS
    // ============================================================

    const handleOpenStatus = () => {
        router.push("/status");
    };

    // ============================================================
    // OPEN SETTINGS
    // ============================================================

    const handleOpenSettings = () => {
        router.push("/settings");
    };

    // ============================================================
    // OPEN LOGOUT MODAL
    // ============================================================

    const handleOpenLogoutModal = () => {
        if (loggingOut) {
            return;
        }

        setShowLogoutModal(true);
    };

    // ============================================================
    // CLOSE LOGOUT MODAL
    // ============================================================

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
                        Accept:
                            "application/json",
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
    // OPEN NEW CHAT
    // ============================================================

    const handleOpenNewChat = () => {
        setShowNewChat(true);
    };

    // ============================================================
    // CLOSE NEW CHAT
    // ============================================================

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
                    HEADER
                ==================================================== */}

                <div
                    className="
                        flex
                        h-[64px]
                        shrink-0
                        items-center
                        justify-between
                        border-b
                        border-border
                        bg-surface
                        px-4
                    "
                >
                    {/* USER INFO */}

                    <button
                        type="button"
                        onClick={
                            handleOpenProfile
                        }
                        className="
                            flex
                            min-w-0
                            items-center
                            gap-3
                            rounded-lg
                            text-left
                            transition
                            hover:opacity-90
                        "
                        title="Open your profile"
                        aria-label="Open your profile"
                    >
                        {/* AVATAR */}

                        <div
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-full
                                border
                                border-border
                                bg-gradient-to-br
                                from-blue-500
                                via-indigo-500
                                to-purple-600
                                font-bold
                                text-white
                                shadow-sm
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
                                        text-base
                                        font-bold
                                        leading-none
                                    "
                                >
                                    {userInitial}
                                </span>
                            )}
                        </div>

                        {/* USER DISPLAY NAME + PRESENCE */}

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

                            <div
                                className="
                                    mt-0.5
                                    flex
                                    items-center
                                    gap-1.5
                                    text-xs
                                "
                            >
                                <span
                                    className="
                                        h-1.5
                                        w-1.5
                                        rounded-full
                                    "
                                    style={{
                                        background:
                                            sidebarUser?.isOnline
                                                ? "#22c55e"
                                                : "#64748b",
                                    }}
                                />

                                <span
                                    className={
                                        sidebarUser?.isOnline
                                            ? "text-green-500"
                                            : "text-muted"
                                    }
                                >
                                    {sidebarUser?.isOnline
                                        ? "Online"
                                        : "Offline"}
                                </span>
                            </div>
                        </div>
                    </button>

                    {/* HEADER ACTIONS */}

                    <div
                        className="
                            flex
                            items-center
                            gap-1
                            text-muted
                        "
                    >
                        {/* FRIEND REQUESTS */}

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
                                rounded-full
                                transition
                                hover:bg-hover
                            "
                            title="Friends & friend requests"
                            aria-label="Friends and friend requests"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
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
                                        -right-0.5
                                        -top-0.5
                                        flex
                                        h-[18px]
                                        min-w-[18px]
                                        items-center
                                        justify-center
                                        rounded-full
                                        bg-red-500
                                        px-1
                                        text-[10px]
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
                                rounded-full
                                text-2xl
                                font-light
                                text-foreground
                                transition
                                hover:bg-hover
                            "
                            title="New chat"
                            aria-label="New chat"
                        >
                            +
                        </button>
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
                        p-2
                    "
                >
                    <div
                        className="
                            flex
                            items-center
                            rounded-lg
                            bg-surface
                            px-3
                        "
                    >
                        <span
                            className="
                                mr-2
                                text-muted
                            "
                            aria-hidden="true"
                        >
                            🔍
                        </span>

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search or start new chat"
                            className="
                                h-10
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
                                    text-muted
                                    transition
                                    hover:text-foreground
                                "
                                aria-label="Clear search"
                            >
                                ×
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
                        px-2
                        py-2
                    "
                >
                    <button
                        type="button"
                        onClick={
                            handleOpenStatus
                        }
                        className="
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            px-2
                            py-2
                            text-left
                            transition
                            hover:bg-hover
                        "
                        title="Open Status"
                        aria-label="Open Status"
                    >
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

                            {/* PLUS */}

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
                                    text-[11px]
                                    font-bold
                                    leading-none
                                    text-white
                                "
                            >
                                +
                            </span>
                        </div>

                        {/* STATUS TEXT */}

                        <div className="min-w-0 flex-1">
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
                                    text-xs
                                    text-muted
                                "
                            >
                                Add a status
                            </p>
                        </div>

                        {/* STATUS ARROW */}

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
                            "
                            aria-hidden="true"
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
                    Added below conversations
                    and above sidebar footer
                ==================================================== */}

                <div
                    className="
                        shrink-0
                        border-t
                        border-border
                        bg-background
                        px-2
                        py-2
                    "
                >
                    <button
                        type="button"
                        onClick={
                            handleOpenStatus
                        }
                        className="
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            px-3
                            py-2.5
                            text-left
                            text-foreground
                            transition
                            hover:bg-hover
                        "
                        title="View Status"
                        aria-label="View Status"
                    >
                        {/* VIEW STATUS ICON */}

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

                        {/* VIEW STATUS TEXT */}

                        <span className="text-sm font-medium">
                            View Status
                        </span>
                    </button>
                </div>

                {/* ====================================================
                    SIDEBAR FOOTER
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
                    {/* PROFILE */}

                    <button
                        type="button"
                        onClick={
                            handleOpenProfile
                        }
                        className="
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            px-3
                            py-2.5
                            text-left
                            text-foreground
                            transition
                            hover:bg-hover
                        "
                        title="My Profile"
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
                                bg-background
                                text-muted
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
                                    d="M20 21a8 8 0 0 0-16 0"
                                />

                                <circle
                                    cx="12"
                                    cy="7"
                                    r="4"
                                />
                            </svg>
                        </span>

                        <span className="text-sm font-medium">
                            My Profile
                        </span>
                    </button>

                    {/* SETTINGS */}

                    <button
                        type="button"
                        onClick={
                            handleOpenSettings
                        }
                        className="
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            px-3
                            py-2.5
                            text-left
                            text-foreground
                            transition
                            hover:bg-hover
                        "
                        title="Settings"
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
                                bg-background
                                text-muted
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
                                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                                />

                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.46 15a1.7 1.7 0 0 0-1.56-1.03H6.7v-2.4h.2A1.7 1.7 0 0 0 8.46 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.03h.2v2.4h-.2A1.7 1.7 0 0 0 19.4 15Z"
                                />
                            </svg>
                        </span>

                        <span className="text-sm font-medium">
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
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            px-3
                            py-2.5
                            text-left
                            text-foreground
                            transition
                            hover:bg-hover
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                        title="Logout"
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
                                bg-background
                                text-muted
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
                        </span>

                        <span className="text-sm font-medium">
                            Logout
                        </span>
                    </button>
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
                LOGOUT CONFIRMATION MODAL
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
                        backdrop-blur-sm
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
                            rounded-2xl
                            border
                            border-border
                            bg-surface
                            shadow-2xl
                        "
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-title"
                    >
                        <div className="px-6 pb-5 pt-6">
                            <div
                                className="
                                    mx-auto
                                    mb-4
                                    flex
                                    h-12
                                    w-12
                                    items-center
                                    justify-center
                                    rounded-full
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
                                    className="h-6 w-6"
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