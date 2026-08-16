"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { useRouter } from "next/navigation";

import ConversationItem from "./ConversationItem";

export default function ConversationList({
    conversations = [],
    activeConversation,
    onSelectConversation,
    currentUserId,

    // ============================================================
    // ONLINE USERS
    // Comes from ChatLayout Socket.IO presence state
    // ============================================================

    onlineUsers = [],
}) {
    const router = useRouter();

    // ============================================================
    // USER PROFILE CACHE
    // ============================================================

    const [userProfiles, setUserProfiles] =
        useState({});

    // ============================================================
    // GET OTHER USER
    // ============================================================

    const getOtherUser = (conversation) => {
        if (
            !conversation?.members ||
            !Array.isArray(conversation.members)
        ) {
            return null;
        }

        const otherMember =
            conversation.members.find((member) => {
                const memberUserId =
                    member?.user?.id ??
                    member?.userId;

                // IMPORTANT:
                // Never consider the current user here.
                return (
                    Number(memberUserId) !==
                    Number(currentUserId)
                );
            });

        if (!otherMember) {
            return null;
        }

        // Prisma ConversationMember
        if (otherMember.user) {
            return otherMember.user;
        }

        // Fallback
        return otherMember;
    };

    // ============================================================
    // GET OTHER USER ID
    // ============================================================

    const getOtherUserId = (conversation) => {
        const otherUser =
            getOtherUser(conversation);

        if (!otherUser) {
            return null;
        }

        const userId =
            otherUser?.id ??
            otherUser?.userId;

        const numericUserId =
            Number(userId);

        if (
            !Number.isInteger(
                numericUserId
            ) ||
            numericUserId <= 0
        ) {
            return null;
        }

        return numericUserId;
    };

    // ============================================================
    // GET UNIQUE USER IDS
    // ============================================================

    const userIds = useMemo(() => {
        const ids = new Set();

        conversations.forEach(
            (conversation) => {
                const userId =
                    getOtherUserId(
                        conversation
                    );

                if (userId) {
                    ids.add(userId);
                }
            }
        );

        return Array.from(ids);
    }, [
        conversations,
        currentUserId,
    ]);

    // ============================================================
    // FETCH USER PROFILES
    // ============================================================

    useEffect(() => {
        if (userIds.length === 0) {
            return;
        }

        let cancelled = false;

        const fetchUsers = async () => {
            const usersToFetch =
                userIds.filter(
                    (userId) =>
                        !userProfiles[userId]
                );

            if (
                usersToFetch.length === 0
            ) {
                return;
            }

            try {
                const results =
                    await Promise.all(
                        usersToFetch.map(
                            async (userId) => {
                                try {
                                    const response =
                                        await fetch(
                                            `/api/users/${userId}`,
                                            {
                                                method:
                                                    "GET",

                                                credentials:
                                                    "include",

                                                cache:
                                                    "no-store",

                                                headers: {
                                                    Accept:
                                                        "application/json",
                                                },
                                            }
                                        );

                                    if (
                                        !response.ok
                                    ) {
                                        console.error(
                                            `❌ Failed to fetch user ${userId}`
                                        );

                                        return null;
                                    }

                                    const result =
                                        await response
                                            .json()
                                            .catch(
                                                () =>
                                                    null
                                            );

                                    if (
                                        !result
                                    ) {
                                        return null;
                                    }

                                    const user =
                                        result?.data?.user ??
                                        result?.data ??
                                        result?.user ??
                                        result;

                                    if (
                                        !user ||
                                        typeof user !==
                                            "object"
                                    ) {
                                        return null;
                                    }

                                    return {
                                        id: userId,
                                        user,
                                    };
                                } catch (
                                    error
                                ) {
                                    console.error(
                                        `❌ USER FETCH ERROR (${userId}):`,
                                        error
                                    );

                                    return null;
                                }
                            }
                        )
                    );

                if (cancelled) {
                    return;
                }

                setUserProfiles(
                    (previous) => {
                        const updated = {
                            ...previous,
                        };

                        results.forEach(
                            (result) => {
                                if (
                                    result?.id &&
                                    result?.user
                                ) {
                                    updated[
                                        result.id
                                    ] =
                                        result.user;
                                }
                            }
                        );

                        return updated;
                    }
                );
            } catch (error) {
                console.error(
                    "❌ FETCH USER PROFILES ERROR:",
                    error
                );
            }
        };

        fetchUsers();

        return () => {
            cancelled = true;
        };
    }, [
        userIds,
        userProfiles,
    ]);

    // ============================================================
    // GET RESOLVED USER
    // ============================================================

    const getResolvedUser = (
        conversation
    ) => {
        const conversationUser =
            getOtherUser(
                conversation
            );

        if (!conversationUser) {
            return null;
        }

        const userId =
            conversationUser?.id ??
            conversationUser?.userId;

        const numericUserId =
            Number(userId);

        const apiUser =
            userProfiles[
                numericUserId
            ];

        /*
         * API profile is merged over the conversation
         * user so that fresh profile information such
         * as avatar and isOnline can be used.
         */
        return {
            ...conversationUser,
            ...(apiUser || {}),
        };
    };

    // ============================================================
    // CHECK IF USER IS ONLINE
    // ============================================================
    //
    // IMPORTANT:
    //
    // This function receives ONLY the OTHER USER'S ID.
    //
    // Therefore the current user's own online status can
    // never be displayed in ConversationItem.
    //
    // Socket.IO presence has priority because it represents
    // the current real-time connection state.
    //
    // Database/API is only used as a fallback.
    // ============================================================

    const isUserOnline = (
        userId,
        fallbackOnline = false
    ) => {
        const numericUserId =
            Number(userId);

        // Invalid user ID = offline
        if (
            !Number.isInteger(
                numericUserId
            ) ||
            numericUserId <= 0
        ) {
            return false;
        }

        // --------------------------------------------------------
        // SOCKET.IO SET
        // --------------------------------------------------------

        if (
            onlineUsers instanceof Set
        ) {
            return onlineUsers.has(
                numericUserId
            );
        }

        // --------------------------------------------------------
        // SOCKET.IO ARRAY
        // --------------------------------------------------------

        if (
            Array.isArray(
                onlineUsers
            )
        ) {
            return onlineUsers.some(
                (id) =>
                    Number(id) ===
                    numericUserId
            );
        }

        // --------------------------------------------------------
        // SOCKET.IO OBJECT
        // --------------------------------------------------------

        if (
            onlineUsers &&
            typeof onlineUsers ===
                "object"
        ) {
            const onlineValue =
                onlineUsers[
                    numericUserId
                ] ??
                onlineUsers[
                    String(
                        numericUserId
                    )
                ];

            if (
                typeof onlineValue ===
                "boolean"
            ) {
                return onlineValue;
            }

            if (
                onlineValue !==
                undefined
            ) {
                return Boolean(
                    onlineValue
                );
            }
        }

        // --------------------------------------------------------
        // DATABASE / API FALLBACK
        // --------------------------------------------------------

        return Boolean(
            fallbackOnline
        );
    };

    // ============================================================
    // PROFILE CLICK
    // ============================================================

    const handleOpenUserProfile = (
        event,
        userId
    ) => {
        event.stopPropagation();

        const numericUserId =
            Number(userId);

        if (
            !Number.isInteger(
                numericUserId
            ) ||
            numericUserId <= 0
        ) {
            return;
        }

        router.push(
            `/profile/${numericUserId}`
        );
    };

    // ============================================================
    // CONVERSATION NAME
    // ============================================================

    const getConversationName = (
        conversation
    ) => {
        if (
            conversation?.name &&
            conversation.type !==
                "DIRECT"
        ) {
            return conversation.name;
        }

        const otherUser =
            getResolvedUser(
                conversation
            );

        return getDisplayName(
            otherUser
        );
    };

    // ============================================================
    // AVATAR
    // ============================================================

    const getAvatar = (
        conversation
    ) => {
        if (conversation?.avatar) {
            return conversation.avatar;
        }

        const otherUser =
            getResolvedUser(
                conversation
            );

        return (
            otherUser?.avatar ||
            null
        );
    };

    // ============================================================
    // LAST MESSAGE
    // ============================================================

    const getLastMessage = (
        conversation
    ) => {
        const message =
            conversation?.latestMessage;

        if (!message) {
            return "No messages yet";
        }

        if (message.deletedAt) {
            return "Message deleted";
        }

        if (
            message.type ===
            "IMAGE"
        ) {
            return "📷 Photo";
        }

        if (
            message.type ===
            "VIDEO"
        ) {
            return "🎥 Video";
        }

        if (
            message.type ===
            "AUDIO"
        ) {
            return "🎵 Audio";
        }

        if (
            message.type ===
            "FILE"
        ) {
            return "📎 File";
        }

        if (
            message.type ===
            "DOCUMENT"
        ) {
            return "📄 Document";
        }

        if (
            message.type ===
            "TEXT"
        ) {
            return (
                message.content ||
                "Message"
            );
        }

        if (
            message.attachmentName
        ) {
            return `📎 ${message.attachmentName}`;
        }

        return (
            message.content ||
            "Message"
        );
    };

    // ============================================================
    // FORMAT TIME
    // ============================================================

    const formatTime = (date) => {
        if (!date) {
            return "";
        }

        const messageDate =
            new Date(date);

        if (
            Number.isNaN(
                messageDate.getTime()
            )
        ) {
            return "";
        }

        const now = new Date();

        // --------------------------------------------------------
        // TODAY
        // --------------------------------------------------------

        if (
            messageDate.toDateString() ===
            now.toDateString()
        ) {
            return messageDate.toLocaleTimeString(
                [],
                {
                    hour: "numeric",
                    minute: "2-digit",
                }
            );
        }

        // --------------------------------------------------------
        // YESTERDAY
        // --------------------------------------------------------

        const yesterday =
            new Date(now);

        yesterday.setDate(
            yesterday.getDate() - 1
        );

        if (
            messageDate.toDateString() ===
            yesterday.toDateString()
        ) {
            return "Yesterday";
        }

        // --------------------------------------------------------
        // OLDER
        // --------------------------------------------------------

        return messageDate.toLocaleDateString(
            [],
            {
                day: "2-digit",
                month: "short",
            }
        );
    };

    // ============================================================
    // EMPTY STATE
    // ============================================================

    if (
        conversations.length ===
        0
    ) {
        return (
            <div
                className="
                    flex
                    flex-1
                    items-center
                    justify-center
                    bg-background
                    text-foreground
                    transition-colors
                    duration-200
                "
            >
                <div
                    className="
                        flex
                        flex-col
                        items-center
                        px-6
                        text-center
                    "
                >
                    <div
                        className="
                            flex
                            h-16
                            w-16
                            items-center
                            justify-center
                            rounded-full
                            bg-surface
                            text-3xl
                        "
                    >
                        💬
                    </div>

                    <h3
                        className="
                            mt-3
                            text-sm
                            font-semibold
                            text-foreground
                        "
                    >
                        No conversations yet
                    </h3>

                    <p
                        className="
                            mt-1
                            max-w-[220px]
                            text-xs
                            text-muted
                        "
                    >
                        Start a conversation
                        to see it here.
                    </p>
                </div>
            </div>
        );
    }

    // ============================================================
    // CONVERSATION LIST
    // ============================================================

    return (
        <div
            className="
                min-h-0
                flex-1
                overflow-y-auto
                bg-background
                transition-colors
                duration-200
            "
        >
            {conversations.map(
                (conversation) => {
                    // =================================================
                    // OTHER USER
                    // =================================================

                    const otherUser =
                        getResolvedUser(
                            conversation
                        );

                    // =================================================
                    // OTHER USER ID
                    // =================================================

                    const otherUserId =
                        otherUser?.id ??
                        otherUser?.userId;

                    // =================================================
                    // CONVERSATION DATA
                    // =================================================

                    const name =
                        getConversationName(
                            conversation
                        );

                    const avatar =
                        getAvatar(
                            conversation
                        );

                    const latestMessage =
                        conversation?.latestMessage;

                    const unreadCount =
                        Number(
                            conversation?.unreadCount ||
                                0
                        );

                    const isActive =
                        Number(
                            activeConversation?.id
                        ) ===
                        Number(
                            conversation?.id
                        );

                    const lastMessage =
                        getLastMessage(
                            conversation
                        );

                    // =================================================
                    // ONLINE STATUS
                    // =================================================
                    //
                    // IMPORTANT:
                    //
                    // `otherUserId` is obtained from
                    // getOtherUser(), which explicitly excludes
                    // currentUserId.
                    //
                    // So this online value belongs ONLY to
                    // the friend shown in this conversation.
                    // =================================================

                    const online =
                        isUserOnline(
                            otherUserId,
                            otherUser?.isOnline
                        );

                    return (
                        <ConversationItem
                            key={
                                conversation.id
                            }
                            conversation={{
                                ...conversation,
                                members:
                                    conversation.members,
                            }}
                            active={
                                isActive
                            }
                            onClick={() =>
                                onSelectConversation?.(
                                    conversation
                                )
                            }
                            currentUserId={
                                currentUserId
                            }
                            user={
                                otherUser
                            }
                            userId={
                                otherUserId
                            }
                            name={
                                name
                            }
                            avatar={
                                avatar
                            }
                            online={
                                online
                            }
                            latestMessage={
                                latestMessage
                            }
                            unreadCount={
                                unreadCount
                            }
                            lastMessage={
                                lastMessage
                            }
                            formatTime={
                                formatTime
                            }
                            onOpenProfile={
                                handleOpenUserProfile
                            }
                        />
                    );
                }
            )}
        </div>
    );
}

// ================================================================
// DISPLAY NAME
// ================================================================

function getDisplayName(user) {
    return (
        user?.displayName
            ?.trim() ||
        user?.username
            ?.trim() ||
        user?.email
            ?.trim() ||
        "User"
    );
}