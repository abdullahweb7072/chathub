"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { socket } from "@/lib/socket";

import ChatSideBar from "./ChatSideBar";
import ChatWindow from "./ChatWindow";

// ============================================================
// HELPERS
// ============================================================

function updateConversationPreview(
    conversations,
    message,
    currentUserId,
    activeConversationId = null
) {
    const conversationId = Number(
        message?.conversationId
    );

    if (!Number.isFinite(conversationId)) {
        return conversations;
    }

    const isOwnMessage =
        Number(message?.senderId) ===
        Number(currentUserId);

    const isActive =
        Number(activeConversationId) ===
        conversationId;

    const existing = conversations.find(
        (conversation) =>
            Number(conversation.id) ===
            conversationId
    );

    if (!existing) {
        return conversations;
    }

    const updated = conversations.map(
        (conversation) => {
            if (
                Number(conversation.id) !==
                conversationId
            ) {
                return conversation;
            }

            const currentUnread = Number(
                conversation.unreadCount || 0
            );

            return {
                ...conversation,

                latestMessage: message,

                updatedAt:
                    message.createdAt ||
                    new Date().toISOString(),

                unreadCount:
                    isOwnMessage || isActive
                        ? currentUnread
                        : currentUnread + 1,
            };
        }
    );

    return [...updated].sort(
        (a, b) =>
            new Date(b.updatedAt || 0) -
            new Date(a.updatedAt || 0)
    );
}

// ============================================================
// UPDATE USER INSIDE CONVERSATIONS
// ============================================================

function updateConversationMembers(
    conversations,
    userId,
    updates
) {
    const id = Number(userId);

    return conversations.map(
        (conversation) => ({
            ...conversation,

            members: (
                conversation.members || []
            ).map((member) => {
                if (
                    Number(member.userId) !==
                    id
                ) {
                    return member;
                }

                return {
                    ...member,

                    user: {
                        ...(member.user || {}),
                        ...updates,
                    },
                };
            }),
        })
    );
}

// ============================================================
// UPDATE ACTIVE CONVERSATION MEMBER
// ============================================================

function updateActiveConversationMember(
    conversation,
    userId,
    updates
) {
    if (!conversation) {
        return conversation;
    }

    const id = Number(userId);

    return {
        ...conversation,

        members: (
            conversation.members || []
        ).map((member) => {
            if (
                Number(member.userId) !==
                id
            ) {
                return member;
            }

            return {
                ...member,

                user: {
                    ...(member.user || {}),
                    ...updates,
                },
            };
        }),
    };
}

// ============================================================
// CHAT LAYOUT
// ============================================================

export default function ChatLayout({
    initialConversations = [],
    currentUser,
    initialConversationId = null,
}) {
    // ========================================================
    // STATE
    // ========================================================

    const [
        conversations,
        setConversations,
    ] = useState(
        initialConversations || []
    );

    const [
        activeConversation,
        setActiveConversation,
    ] = useState(null);

    const [
        messages,
        setMessages,
    ] = useState([]);

    const [
        onlineUsers,
        setOnlineUsers,
    ] = useState([]);

    const [
        typingUsers,
        setTypingUsers,
    ] = useState([]);

    const [
        loadingMessages,
        setLoadingMessages,
    ] = useState(false);

    const [
        socketConnected,
        setSocketConnected,
    ] = useState(socket.connected);

    // ========================================================
    // DELETE CONFIRMATION STATE
    // ========================================================

    const [
        deleteConfirmation,
        setDeleteConfirmation,
    ] = useState(null);

    // ========================================================
    // MOBILE VIEW STATE
    // ========================================================

    const [
        mobileChatOpen,
        setMobileChatOpen,
    ] = useState(false);

    // ========================================================
    // REFS
    // ========================================================

    const typingTimeoutRef =
        useRef(null);

    const initialConversationOpenedRef =
        useRef(false);

    const activeConversationRef =
        useRef(null);

    const currentUserId =
        Number(currentUser?.id);

    // ========================================================
    // KEEP ACTIVE CONVERSATION REF
    // ========================================================

    useEffect(() => {
        activeConversationRef.current =
            activeConversation;
    }, [activeConversation]);

    // ========================================================
    // SOCKET CONNECTION
    // ========================================================

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        const onConnect = () => {
            console.log(
                "🟢 Chat socket connected:",
                socket.id
            );

            setSocketConnected(true);
        };

        const onDisconnect = (
            reason
        ) => {
            console.log(
                "🔴 Chat socket disconnected:",
                reason
            );

            setSocketConnected(false);
        };

        const onConnectError = (
            error
        ) => {
            console.error(
                "❌ Chat socket error:",
                error?.message
            );

            setSocketConnected(false);
        };

        const onPresenceState = (
            data
        ) => {
            const users = (
                data?.users || []
            )
                .map(Number)
                .filter(
                    Number.isFinite
                );

            setOnlineUsers(users);

            setConversations(
                (previous) =>
                    previous.map(
                        (conversation) => ({
                            ...conversation,

                            members: (
                                conversation.members ||
                                []
                            ).map(
                                (member) => {
                                    const memberId =
                                        Number(
                                            member?.userId ??
                                                member
                                                    ?.user
                                                    ?.id
                                        );

                                    if (
                                        !Number.isFinite(
                                            memberId
                                        )
                                    ) {
                                        return member;
                                    }

                                    const isOnline =
                                        users.includes(
                                            memberId
                                        );

                                    return {
                                        ...member,

                                        user: {
                                            ...(member.user ||
                                                {}),
                                            isOnline,
                                        },
                                    };
                                }
                            ),
                        })
                    )
            );
        };

        const onUserOnline = ({
            userId,
        }) => {
            const id = Number(
                userId
            );

            if (!Number.isFinite(id)) {
                return;
            }

            setOnlineUsers(
                (previous) => {
                    if (
                        previous.includes(
                            id
                        )
                    ) {
                        return previous;
                    }

                    return [
                        ...previous,
                        id,
                    ];
                }
            );

            setConversations(
                (previous) =>
                    updateConversationMembers(
                        previous,
                        id,
                        {
                            isOnline: true,
                        }
                    )
            );

            setActiveConversation(
                (previous) =>
                    updateActiveConversationMember(
                        previous,
                        id,
                        {
                            isOnline: true,
                        }
                    )
            );
        };

        const onUserOffline = ({
            userId,
        }) => {
            const id = Number(
                userId
            );

            if (!Number.isFinite(id)) {
                return;
            }

            setOnlineUsers(
                (previous) =>
                    previous.filter(
                        (existingId) =>
                            Number(
                                existingId
                            ) !== id
                    )
            );

            setConversations(
                (previous) =>
                    updateConversationMembers(
                        previous,
                        id,
                        {
                            isOnline: false,
                        }
                    )
            );

            setActiveConversation(
                (previous) =>
                    updateActiveConversationMember(
                        previous,
                        id,
                        {
                            isOnline: false,
                        }
                    )
            );
        };

        socket.on(
            "connect",
            onConnect
        );

        socket.on(
            "disconnect",
            onDisconnect
        );

        socket.on(
            "connect_error",
            onConnectError
        );

        socket.on(
            "presence_state",
            onPresenceState
        );

        socket.on(
            "user_online",
            onUserOnline
        );

        socket.on(
            "user_offline",
            onUserOffline
        );

        return () => {
            socket.off(
                "connect",
                onConnect
            );

            socket.off(
                "disconnect",
                onDisconnect
            );

            socket.off(
                "connect_error",
                onConnectError
            );

            socket.off(
                "presence_state",
                onPresenceState
            );

            socket.off(
                "user_online",
                onUserOnline
            );

            socket.off(
                "user_offline",
                onUserOffline
            );
        };
    }, []);

    // ============================================================
    // NEW CONVERSATION CREATED
    // ============================================================

    useEffect(() => {
        const onConversationCreated =
            (data) => {
                const conversation =
                    data?.conversation;

                if (!conversation?.id) {
                    return;
                }

                const conversationId =
                    Number(
                        conversation.id
                    );

                setConversations(
                    (previous) => {
                        const exists =
                            previous.some(
                                (item) =>
                                    Number(
                                        item.id
                                    ) ===
                                    conversationId
                            );

                        if (exists) {
                            return previous;
                        }

                        return [
                            conversation,
                            ...previous,
                        ];
                    }
                );

                if (socket.connected) {
                    socket.emit(
                        "join_conversation",
                        {
                            conversationId,
                        }
                    );
                }
            };

        socket.on(
            "conversation_created",
            onConversationCreated
        );

        return () => {
            socket.off(
                "conversation_created",
                onConversationCreated
            );
        };
    }, []);

    // ============================================================
    // DELIVERY
    // ============================================================

    const deliverMessage =
        useCallback(
            (messageId) => {
                if (
                    !socket.connected ||
                    !messageId
                ) {
                    return;
                }

                socket.emit(
                    "message_delivered",
                    {
                        messageId,
                    }
                );
            },
            []
        );

    // ============================================================
    // CHECK DELIVERY RECEIPT
    // ============================================================
    //
    // IMPORTANT:
    //
    // Do NOT check receipt.userId against currentUserId here.
    //
    // For an incoming message, the receipt belongs to the
    // current user.
    //
    // We only need to know whether this message already has
    // a delivered receipt.
    //
    // ============================================================

    const hasDeliveredReceipt =
        useCallback(
            (message) => {
                const receipts =
                    message?.receipts || [];

                return receipts.some(
                    (receipt) =>
                        Boolean(
                            receipt?.deliveredAt
                        )
                );
            },
            []
        );

    // ============================================================
    // LOAD MESSAGES
    // ============================================================

    const loadMessages =
        useCallback(
            async (
                conversationId
            ) => {
                if (!conversationId) {
                    return;
                }

                try {
                    setLoadingMessages(
                        true
                    );

                    const response =
                        await fetch(
                            `/api/conversations/${conversationId}/messages`,
                            {
                                method: "GET",
                                credentials:
                                    "include",
                                cache: "no-store",
                            }
                        );

                    const rawText =
                        await response.text();

                    let data = null;

                    try {
                        data =
                            rawText
                                ? JSON.parse(
                                      rawText
                                  )
                                : null;
                    } catch {
                        console.error(
                            "❌ LOAD MESSAGES returned invalid JSON:",
                            rawText
                        );

                        return;
                    }

                    if (
                        !response.ok ||
                        !data?.success
                    ) {
                        console.error(
                            "❌ LOAD MESSAGES:",
                            data?.message ||
                                `HTTP ${response.status}`
                        );

                        return;
                    }

                    const loadedMessages =
                        Array.isArray(
                            data.messages
                        )
                            ? data.messages
                            : [];

                    setMessages(
                        loadedMessages
                    );

                    for (
                        const message of
                            loadedMessages
                    ) {
                        if (
                            Number(
                                message.senderId
                            ) !==
                                currentUserId &&
                            !hasDeliveredReceipt(
                                message
                            )
                        ) {
                            deliverMessage(
                                message.id
                            );
                        }
                    }
                } catch (error) {
                    console.error(
                        "❌ LOAD MESSAGES ERROR:",
                        error
                    );
                } finally {
                    setLoadingMessages(
                        false
                    );
                }
            },
            [
                currentUserId,
                deliverMessage,
                hasDeliveredReceipt,
            ]
        );

    // ============================================================
    // MARK CONVERSATION READ
    // ============================================================

    const markConversationRead =
        useCallback(
            (conversationId) => {
                if (
                    !conversationId ||
                    !socket.connected
                ) {
                    return;
                }

                socket.emit(
                    "mark_messages_read",
                    {
                        conversationId,
                    }
                );

                setConversations(
                    (previous) =>
                        previous.map(
                            (conversation) =>
                                Number(
                                    conversation.id
                                ) ===
                                Number(
                                    conversationId
                                )
                                    ? {
                                          ...conversation,

                                          unreadCount:
                                              0,

                                          lastReadAt:
                                              new Date().toISOString(),
                                      }
                                    : conversation
                        )
                );
            },
            []
        );

    // ============================================================
    // SELECT CONVERSATION
    // ============================================================

    const selectConversation =
        useCallback(
            async (
                conversation
            ) => {
                if (!conversation?.id) {
                    return;
                }

                const conversationId =
                    Number(
                        conversation.id
                    );

                setMobileChatOpen(
                    true
                );

                if (
                    typingTimeoutRef.current
                ) {
                    clearTimeout(
                        typingTimeoutRef.current
                    );

                    typingTimeoutRef.current =
                        null;
                }

                const previousConversation =
                    activeConversationRef.current;

                if (
                    previousConversation &&
                    Number(
                        previousConversation.id
                    ) !==
                        conversationId &&
                    socket.connected
                ) {
                    socket.emit(
                        "typing_stop",
                        {
                            conversationId:
                                previousConversation.id,
                        }
                    );
                }

                activeConversationRef.current =
                    conversation;

                setActiveConversation(
                    conversation
                );

                setTypingUsers([]);

                setMessages([]);

                if (socket.connected) {
                    socket.emit(
                        "join_conversation",
                        {
                            conversationId,
                        }
                    );
                }

                await loadMessages(
                    conversationId
                );

                markConversationRead(
                    conversationId
                );

                setConversations(
                    (previous) =>
                        previous.map(
                            (item) =>
                                Number(
                                    item.id
                                ) ===
                                conversationId
                                    ? {
                                          ...item,
                                          unreadCount:
                                              0,
                                      }
                                    : item
                        )
                );
            },
            [
                loadMessages,
                markConversationRead,
            ]
        );

    // ============================================================
    // BACK TO CONVERSATIONS
    // ============================================================

    const handleBackToConversations =
        useCallback(() => {
            if (
                typingTimeoutRef.current
            ) {
                clearTimeout(
                    typingTimeoutRef.current
                );

                typingTimeoutRef.current =
                    null;
            }

            const active =
                activeConversationRef.current;

            if (
                socket.connected &&
                active?.id
            ) {
                socket.emit(
                    "typing_stop",
                    {
                        conversationId:
                            active.id,
                    }
                );
            }

            activeConversationRef.current =
                null;

            setActiveConversation(
                null
            );

            setMessages([]);

            setTypingUsers([]);

            setLoadingMessages(
                false
            );

            setMobileChatOpen(
                false
            );
        }, []);

    // ============================================================
    // OPEN INITIAL CONVERSATION
    // ============================================================

    useEffect(() => {
        if (
            initialConversationOpenedRef.current
        ) {
            return;
        }

        if (!initialConversationId) {
            return;
        }

        const conversationId =
            Number(
                initialConversationId
            );

        if (
            !Number.isInteger(
                conversationId
            )
        ) {
            return;
        }

        const conversation =
            conversations.find(
                (item) =>
                    Number(item.id) ===
                    conversationId
            );

        if (!conversation) {
            return;
        }

        initialConversationOpenedRef.current =
            true;

        selectConversation(
            conversation
        );
    }, [
        initialConversationId,
        conversations,
        selectConversation,
    ]);

    // ============================================================
    // SOCKET MESSAGE EVENTS
    // ============================================================

    useEffect(() => {
        const onNewMessage = (
            message
        ) => {
            if (!message?.id) {
                return;
            }

            const conversationId =
                Number(
                    message.conversationId
                );

            const active =
                activeConversationRef.current;

            const isActiveConversation =
                active &&
                Number(active.id) ===
                    conversationId;

            setConversations(
                (previous) =>
                    updateConversationPreview(
                        previous,
                        message,
                        currentUserId,
                        isActiveConversation
                            ? conversationId
                            : null
                    )
            );

            if (
                isActiveConversation
            ) {
                setMessages(
                    (previous) => {
                        const exists =
                            previous.some(
                                (item) =>
                                    Number(
                                        item.id
                                    ) ===
                                    Number(
                                        message.id
                                    )
                            );

                        if (exists) {
                            return previous;
                        }

                        return [
                            ...previous,
                            message,
                        ];
                    }
                );

                if (
                    Number(
                        message.senderId
                    ) !==
                    currentUserId
                ) {
                    deliverMessage(
                        message.id
                    );

                    markConversationRead(
                        conversationId
                    );
                }
            }
        };

        // ========================================================
        // RECEIPT UPDATED
        // ========================================================

        const onReceiptUpdated = (
            receipt
        ) => {
            if (
                !receipt?.messageId
            ) {
                return;
            }

            setMessages(
                (previous) =>
                    previous.map(
                        (message) => {
                            if (
                                Number(
                                    message.id
                                ) !==
                                Number(
                                    receipt.messageId
                                )
                            ) {
                                return message;
                            }

                            const receipts =
                                message.receipts ||
                                [];

                            const existingIndex =
                                receipts.findIndex(
                                    (item) =>
                                        Number(
                                            item.userId
                                        ) ===
                                        Number(
                                            receipt.userId
                                        )
                                );

                            // ====================================
                            // NEW RECEIPT
                            // ====================================

                            if (
                                existingIndex ===
                                -1
                            ) {
                                return {
                                    ...message,

                                    receipts: [
                                        ...receipts,

                                        {
                                            userId:
                                                receipt.userId,

                                            deliveredAt:
                                                receipt.deliveredAt ||
                                                null,

                                            readAt:
                                                receipt.readAt ||
                                                null,
                                        },
                                    ],
                                };
                            }

                            // ====================================
                            // UPDATE EXISTING RECEIPT
                            // ====================================

                            return {
                                ...message,

                                receipts:
                                    receipts.map(
                                        (
                                            item,
                                            index
                                        ) => {
                                            if (
                                                index !==
                                                existingIndex
                                            ) {
                                                return item;
                                            }

                                            return {
                                                ...item,

                                                userId:
                                                    item.userId,

                                                /*
                                                 * Keep the old
                                                 * deliveredAt if
                                                 * this event doesn't
                                                 * contain it.
                                                 */
                                                deliveredAt:
                                                    receipt.deliveredAt ??
                                                    item.deliveredAt ??
                                                    null,

                                                /*
                                                 * Keep the old
                                                 * readAt if this
                                                 * event doesn't
                                                 * contain it.
                                                 */
                                                readAt:
                                                    receipt.readAt ??
                                                    item.readAt ??
                                                    null,
                                            };
                                        }
                                    ),
                            };
                        }
                    )
            );
        };

        const onMessageUpdated = (
            updatedMessage
        ) => {
            if (
                !updatedMessage?.id
            ) {
                return;
            }

            setMessages(
                (previous) =>
                    previous.map(
                        (message) =>
                            Number(
                                message.id
                            ) ===
                            Number(
                                updatedMessage.id
                            )
                                ? {
                                      ...message,
                                      ...updatedMessage,
                                  }
                                : message
                    )
            );

            const active =
                activeConversationRef.current;

            setConversations(
                (previous) =>
                    updateConversationPreview(
                        previous,
                        updatedMessage,
                        currentUserId,
                        active?.id
                    )
            );
        };

        const onMessageDeleted = (
            deletedMessage
        ) => {
            if (
                !deletedMessage?.id
            ) {
                return;
            }

            setMessages(
                (previous) =>
                    previous.map(
                        (message) =>
                            Number(
                                message.id
                            ) ===
                            Number(
                                deletedMessage.id
                            )
                                ? {
                                      ...message,

                                      deletedAt:
                                          deletedMessage.deletedAt,

                                      content:
                                          "This message was deleted",
                                  }
                                : message
                    )
            );

            const active =
                activeConversationRef.current;

            setConversations(
                (previous) =>
                    updateConversationPreview(
                        previous,
                        {
                            ...deletedMessage,

                            content:
                                "This message was deleted",
                        },
                        currentUserId,
                        active?.id
                    )
            );
        };

        const onReactionAdded = (
            reaction
        ) => {
            if (
                !reaction?.messageId
            ) {
                return;
            }

            setMessages(
                (previous) =>
                    previous.map(
                        (message) => {
                            if (
                                Number(
                                    message.id
                                ) !==
                                Number(
                                    reaction.messageId
                                )
                            ) {
                                return message;
                            }

                            const reactions =
                                message.reactions ||
                                [];

                            const exists =
                                reactions.some(
                                    (item) =>
                                        Number(
                                            item.id
                                        ) ===
                                        Number(
                                            reaction.id
                                        )
                                );

                            if (
                                exists
                            ) {
                                return message;
                            }

                            return {
                                ...message,

                                reactions: [
                                    ...reactions,
                                    reaction,
                                ],
                            };
                        }
                    )
            );
        };

        const onReactionRemoved = (
            reaction
        ) => {
            if (
                !reaction?.messageId
            ) {
                return;
            }

            setMessages(
                (previous) =>
                    previous.map(
                        (message) =>
                            Number(
                                message.id
                            ) ===
                            Number(
                                reaction.messageId
                            )
                                ? {
                                      ...message,

                                      reactions: (
                                          message.reactions ||
                                          []
                                      ).filter(
                                          (item) =>
                                              Number(
                                                  item.id
                                              ) !==
                                              Number(
                                                  reaction.id
                                              )
                                      ),
                                  }
                                : message
                    )
            );
        };

        const onUserTyping = ({
            userId,
            username,
            conversationId,
        }) => {
            const id = Number(
                userId
            );

            if (
                !Number.isFinite(id) ||
                id === currentUserId
            ) {
                return;
            }

            const active =
                activeConversationRef.current;

            if (
                !active ||
                Number(active.id) !==
                    Number(
                        conversationId
                    )
            ) {
                return;
            }

            setTypingUsers(
                (previous) => {
                    const exists =
                        previous.some(
                            (user) =>
                                Number(
                                    user.userId
                                ) === id
                        );

                    if (exists) {
                        return previous;
                    }

                    return [
                        ...previous,
                        {
                            userId: id,

                            username:
                                username ||
                                `User ${id}`,
                        },
                    ];
                }
            );
        };

        const onUserStoppedTyping = ({
            userId,
            conversationId,
        }) => {
            const id = Number(
                userId
            );

            const active =
                activeConversationRef.current;

            if (
                !active ||
                Number(active.id) !==
                    Number(
                        conversationId
                    )
            ) {
                return;
            }

            setTypingUsers(
                (previous) =>
                    previous.filter(
                        (user) =>
                            Number(
                                user.userId
                            ) !== id
                    )
            );
        };

        socket.on(
            "new_message",
            onNewMessage
        );

        socket.on(
            "message_receipt_updated",
            onReceiptUpdated
        );

        socket.on(
            "message_updated",
            onMessageUpdated
        );

        socket.on(
            "message_deleted",
            onMessageDeleted
        );

        socket.on(
            "message_reaction_added",
            onReactionAdded
        );

        socket.on(
            "message_reaction_removed",
            onReactionRemoved
        );

        socket.on(
            "user_typing",
            onUserTyping
        );

        socket.on(
            "user_stopped_typing",
            onUserStoppedTyping
        );

        return () => {
            socket.off(
                "new_message",
                onNewMessage
            );

            socket.off(
                "message_receipt_updated",
                onReceiptUpdated
            );

            socket.off(
                "message_updated",
                onMessageUpdated
            );

            socket.off(
                "message_deleted",
                onMessageDeleted
            );

            socket.off(
                "message_reaction_added",
                onReactionAdded
            );

            socket.off(
                "message_reaction_removed",
                onReactionRemoved
            );

            socket.off(
                "user_typing",
                onUserTyping
            );

            socket.off(
                "user_stopped_typing",
                onUserStoppedTyping
            );
        };
    }, [
        currentUserId,
        deliverMessage,
        markConversationRead,
    ]);

    // ============================================================
    // SEND MESSAGE
    // ============================================================

    const sendMessage = async (
        messageData
    ) => {
        if (!messageData) {
            return;
        }

        const active =
            activeConversationRef.current;

        if (!active) {
            return;
        }

        if (!socket.connected) {
            return;
        }

        const {
            content = "",
            type = "TEXT",
            file = null,
        } = messageData;

        const trimmedContent =
            typeof content === "string"
                ? content.trim()
                : "";

        if (
            !trimmedContent &&
            !file
        ) {
            return;
        }

        stopTyping();

        // ========================================================
        // FILE UPLOAD
        // ========================================================

        if (file) {
            try {
                const formData =
                    new FormData();

                formData.append(
                    "file",
                    file
                );

                const uploadResponse =
                    await fetch(
                        "/api/upload",
                        {
                            method: "POST",
                            credentials:
                                "include",
                            body: formData,
                        }
                    );

                const rawText =
                    await uploadResponse.text();

                let uploadData =
                    null;

                try {
                    uploadData =
                        rawText
                            ? JSON.parse(
                                  rawText
                              )
                            : null;
                } catch {
                    console.error(
                        "❌ Upload returned invalid JSON:",
                        rawText
                    );

                    return;
                }

                if (
                    !uploadResponse.ok ||
                    !uploadData?.success
                ) {
                    console.error(
                        "❌ UPLOAD ERROR:",
                        uploadData
                    );

                    return;
                }

                const attachmentUrl =
                    uploadData?.url ||
                    uploadData?.data
                        ?.url;

                const uploadedName =
                    uploadData?.name ||
                    uploadData?.data
                        ?.name ||
                    file.name;

                const uploadedSize =
                    uploadData?.size ??
                    uploadData?.data
                        ?.size ??
                    file.size;

                const uploadedMimeType =
                    uploadData?.mimeType ||
                    uploadData?.data
                        ?.mimeType ||
                    file.type;

                const uploadedType =
                    uploadData?.type ||
                    uploadData?.data
                        ?.type ||
                    type;

                if (!attachmentUrl) {
                    console.error(
                        "❌ Upload succeeded but no attachment URL was returned."
                    );

                    return;
                }

                socket.emit(
                    "send_message",
                    {
                        conversationId:
                            active.id,

                        content:
                            trimmedContent,

                        type:
                            uploadedType,

                        attachmentUrl,

                        attachmentName:
                            uploadedName,

                        attachmentSize:
                            uploadedSize,

                        attachmentMimeType:
                            uploadedMimeType,
                    },
                    (response) => {
                        if (
                            !response?.success
                        ) {
                            console.error(
                                "❌ SEND FILE MESSAGE:",
                                response?.message
                            );
                        }
                    }
                );
            } catch (error) {
                console.error(
                    "❌ FILE UPLOAD ERROR:",
                    error
                );
            }

            return;
        }

        // ========================================================
        // TEXT MESSAGE
        // ========================================================

        socket.emit(
            "send_message",
            {
                conversationId:
                    active.id,

                content:
                    trimmedContent,

                type: "TEXT",
            },
            (response) => {
                if (
                    response &&
                    !response.success
                ) {
                    console.error(
                        "❌ SEND MESSAGE:",
                        response.message
                    );
                }
            }
        );
    };

    // ============================================================
    // START TYPING
    // ============================================================

    const startTyping = () => {
        const active =
            activeConversationRef.current;

        if (
            !socket.connected ||
            !active
        ) {
            return;
        }

        socket.emit(
            "typing_start",
            {
                conversationId:
                    active.id,
            }
        );

        if (
            typingTimeoutRef.current
        ) {
            clearTimeout(
                typingTimeoutRef.current
            );
        }

        typingTimeoutRef.current =
            setTimeout(() => {
                stopTyping();
            }, 1500);
    };

    // ============================================================
    // STOP TYPING
    // ============================================================

    const stopTyping = () => {
        const active =
            activeConversationRef.current;

        if (
            !socket.connected ||
            !active
        ) {
            return;
        }

        socket.emit(
            "typing_stop",
            {
                conversationId:
                    active.id,
            }
        );

        if (
            typingTimeoutRef.current
        ) {
            clearTimeout(
                typingTimeoutRef.current
            );

            typingTimeoutRef.current =
                null;
        }
    };

    // ============================================================
    // EDIT MESSAGE
    // ============================================================

    const editMessage = (
        message
    ) => {
        if (!message) {
            return;
        }

        if (
            Number(
                message.senderId
            ) !== currentUserId
        ) {
            return;
        }

        if (message.deletedAt) {
            return;
        }

        const newContent =
            window.prompt(
                "Edit message",
                message.content || ""
            );

        if (
            newContent === null
        ) {
            return;
        }

        const trimmed =
            newContent.trim();

        if (!trimmed) {
            return;
        }

        if (!socket.connected) {
            return;
        }

        socket.emit(
            "edit_message",
            {
                messageId:
                    message.id,

                content:
                    trimmed,
            },
            (response) => {
                if (
                    response &&
                    !response.success
                ) {
                    console.error(
                        "❌ EDIT MESSAGE:",
                        response.message
                    );
                }
            }
        );
    };

    // ============================================================
    // REQUEST DELETE
    // ============================================================

    const deleteMessage = (
        message,
        mode = "FOR_ME"
    ) => {
        if (!message) {
            return;
        }

        if (!message.id) {
            return;
        }

        if (
            mode === "FOR_EVERYONE" &&
            Number(
                message.senderId
            ) !== currentUserId
        ) {
            return;
        }

        if (message.deletedAt) {
            return;
        }

        if (!socket.connected) {
            return;
        }

        setDeleteConfirmation({
            message,
            mode,
        });
    };

    // ============================================================
    // CONFIRM DELETE
    // ============================================================

    const confirmDeleteMessage =
        () => {
            if (
                !deleteConfirmation?.message
            ) {
                return;
            }

            const {
                message,
                mode,
            } = deleteConfirmation;

            if (!socket.connected) {
                setDeleteConfirmation(
                    null
                );

                return;
            }

            if (mode === "FOR_ME") {
                socket.emit(
                    "delete_message_for_me",
                    {
                        messageId:
                            message.id,
                    },
                    (response) => {
                        if (
                            response &&
                            !response.success
                        ) {
                            console.error(
                                "❌ DELETE FOR ME:",
                                response.message
                            );

                            return;
                        }

                        setMessages(
                            (previous) =>
                                previous.filter(
                                    (
                                        item
                                    ) =>
                                        Number(
                                            item.id
                                        ) !==
                                        Number(
                                            message.id
                                        )
                                )
                        );

                        setDeleteConfirmation(
                            null
                        );
                    }
                );

                return;
            }

            if (
                mode ===
                "FOR_EVERYONE"
            ) {
                socket.emit(
                    "delete_message",
                    {
                        messageId:
                            message.id,
                    },
                    (response) => {
                        if (
                            response &&
                            !response.success
                        ) {
                            console.error(
                                "❌ DELETE FOR EVERYONE:",
                                response.message
                            );

                            return;
                        }

                        setDeleteConfirmation(
                            null
                        );
                    }
                );
            }
        };

    // ============================================================
    // CANCEL DELETE
    // ============================================================

    const cancelDeleteMessage =
        () => {
            setDeleteConfirmation(
                null
            );
        };

    // ============================================================
    // TOGGLE REACTION
    // ============================================================

    const toggleReaction = (
        message,
        emoji
    ) => {
        if (
            !socket.connected ||
            !message ||
            message.deletedAt ||
            !emoji
        ) {
            return;
        }

        const existing = (
            message.reactions ||
            []
        ).find(
            (reaction) =>
                Number(
                    reaction.userId
                ) === currentUserId &&
                reaction.emoji ===
                    emoji
        );

        if (existing) {
            socket.emit(
                "remove_reaction",
                {
                    messageId:
                        message.id,

                    emoji,
                },
                (response) => {
                    if (
                        response &&
                        !response.success
                    ) {
                        console.error(
                            "❌ REMOVE REACTION:",
                            response.message
                        );
                    }
                }
            );

            return;
        }

        socket.emit(
            "add_reaction",
            {
                messageId:
                    message.id,

                emoji,
            },
            (response) => {
                if (
                    response &&
                    !response.success
                ) {
                    console.error(
                        "❌ ADD REACTION:",
                        response.message
                    );
                }
            }
        );
    };

    // ============================================================
    // CLEANUP TYPING TIMER
    // ============================================================

    useEffect(() => {
        return () => {
            if (
                typingTimeoutRef.current
            ) {
                clearTimeout(
                    typingTimeoutRef.current
                );

                typingTimeoutRef.current =
                    null;
            }

            if (
                socket.connected &&
                activeConversationRef.current
            ) {
                socket.emit(
                    "typing_stop",
                    {
                        conversationId:
                            activeConversationRef
                                .current
                                .id,
                    }
                );
            }
        };
    }, []);

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="relative flex h-full w-full overflow-hidden bg-background text-foreground transition-colors duration-200">

            {/* ==================================================
                SIDEBAR
            ================================================== */}

            <aside
                className={`
                    h-full
                    w-full
                    md:flex
                    md:w-[360px]
                    md:flex-shrink-0

                    ${
                        mobileChatOpen
                            ? "hidden"
                            : "flex"
                    }
                `}
            >
                <ChatSideBar
                    conversations={
                        conversations
                    }

                    activeConversation={
                        activeConversation
                    }

                    currentUser={
                        currentUser
                    }

                    currentUserId={
                        currentUserId
                    }

                    onSelectConversation={
                        selectConversation
                    }

                    onlineUsers={
                        onlineUsers
                    }
                />
            </aside>

            {/* ==================================================
                CHAT WINDOW
            ================================================== */}

            <main
                className={`
                    min-w-0
                    flex-1
                    h-full

                    ${
                        mobileChatOpen
                            ? "flex"
                            : "hidden"
                    }

                    md:flex
                `}
            >
                <ChatWindow
                    conversation={
                        activeConversation
                    }

                    messages={
                        messages
                    }

                    currentUser={
                        currentUser
                    }

                    currentUserId={
                        currentUserId
                    }

                    onlineUsers={
                        onlineUsers
                    }

                    typingUsers={
                        typingUsers
                    }

                    loadingMessages={
                        loadingMessages
                    }

                    socketConnected={
                        socketConnected
                    }

                    onSendMessage={
                        sendMessage
                    }

                    onStartTyping={
                        startTyping
                    }

                    onStopTyping={
                        stopTyping
                    }

                    onEditMessage={
                        editMessage
                    }

                    onDeleteMessage={
                        deleteMessage
                    }

                    onToggleReaction={
                        toggleReaction
                    }

                    onBack={
                        handleBackToConversations
                    }
                />
            </main>

            {/* ==================================================
                DELETE CONFIRMATION POPUP
            ================================================== */}

            {deleteConfirmation && (
                <div
                    className="
                        fixed
                        inset-0
                        z-[9999]
                        flex
                        items-center
                        justify-center
                        bg-black/40
                        p-4
                        backdrop-blur-[2px]
                    "
                    onMouseDown={(
                        event
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            cancelDeleteMessage();
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-message-title"
                        className="
                            w-full
                            max-w-[360px]
                            overflow-hidden
                            rounded-2xl
                            border
                            border-border
                            bg-surface
                            shadow-2xl
                            animate-in
                            fade-in
                            zoom-in-95
                            duration-150
                        "
                    >
                        <div className="px-5 pt-5">
                            <h2
                                id="delete-message-title"
                                className="
                                    text-base
                                    font-semibold
                                    text-foreground
                                "
                            >
                                {deleteConfirmation.mode ===
                                "FOR_EVERYONE"
                                    ? "Delete for everyone?"
                                    : "Delete for me?"}
                            </h2>

                            <p
                                className="
                                    mt-2
                                    text-sm
                                    leading-5
                                    text-muted
                                "
                            >
                                {deleteConfirmation.mode ===
                                "FOR_EVERYONE"
                                    ? "This message will be deleted for everyone in this conversation."
                                    : "This message will be removed from your view."}
                            </p>

                            {deleteConfirmation
                                .message
                                ?.content && (
                                <div
                                    className="
                                        mt-4
                                        max-h-20
                                        overflow-hidden
                                        rounded-xl
                                        bg-hover
                                        px-3
                                        py-2.5
                                        text-sm
                                        text-muted
                                    "
                                >
                                    <p className="line-clamp-3">
                                        {
                                            deleteConfirmation
                                                .message
                                                .content
                                        }
                                    </p>
                                </div>
                            )}
                        </div>

                        <div
                            className="
                                mt-5
                                flex
                                items-center
                                justify-end
                                gap-2
                                border-t
                                border-border
                                bg-background/30
                                px-4
                                py-3
                            "
                        >
                            <button
                                type="button"
                                onClick={
                                    cancelDeleteMessage
                                }
                                className="
                                    rounded-lg
                                    px-4
                                    py-2
                                    text-sm
                                    font-medium
                                    text-muted
                                    transition
                                    hover:bg-hover
                                    hover:text-foreground
                                    active:scale-95
                                "
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={
                                    confirmDeleteMessage
                                }
                                className="
                                    rounded-lg
                                    bg-red-500
                                    px-4
                                    py-2
                                    text-sm
                                    font-medium
                                    text-white
                                    transition
                                    hover:bg-red-600
                                    active:scale-95
                                "
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}