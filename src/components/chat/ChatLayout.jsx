"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { socket } from "@/lib/socket";
import { callManager } from "@/lib/callManager";

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

    if (
        !Number.isFinite(
            conversationId
        )
    ) {
        return conversations;
    }

    const isOwnMessage =
        Number(message?.senderId) ===
        Number(currentUserId);

    const isActive =
        Number(activeConversationId) ===
        conversationId;

    const existing =
        conversations.find(
            (conversation) =>
                Number(conversation.id) ===
                conversationId
        );

    if (!existing) {
        return conversations;
    }

    const updated =
        conversations.map(
            (conversation) => {
                if (
                    Number(
                        conversation.id
                    ) !== conversationId
                ) {
                    return conversation;
                }

                const currentUnread =
                    Number(
                        conversation.unreadCount ||
                            0
                    );

                return {
                    ...conversation,

                    latestMessage:
                        message,

                    updatedAt:
                        message.createdAt ||
                        new Date().toISOString(),

                    unreadCount:
                        isOwnMessage ||
                        isActive
                            ? currentUnread
                            : currentUnread + 1,
                };
            }
        );

    return [...updated].sort(
        (a, b) =>
            new Date(
                b.updatedAt || 0
            ) -
            new Date(
                a.updatedAt || 0
            )
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
                    Number(
                        member.userId
                    ) !== id
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
                Number(
                    member.userId
                ) !== id
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
    ] = useState(
        socket.connected
    );

    // ========================================================
    // MOBILE VIEW STATE
    // ========================================================

    const [
        mobileChatOpen,
        setMobileChatOpen,
    ] = useState(false);

    // ========================================================
    // CALL STATE
    // ========================================================

    const [callState, setCallState] =
        useState("idle");

    const [incomingCall, setIncomingCall] =
        useState(null);

    const [localStream, setLocalStream] =
        useState(null);

    const [remoteStream, setRemoteStream] =
        useState(null);

    const [isMuted, setIsMuted] =
        useState(false);

    const [isCameraOff, setIsCameraOff] =
        useState(false);

    const [callError, setCallError] =
        useState(null);

    // ========================================================
    // REFS
    // ========================================================

    const typingTimeoutRef =
        useRef(null);

    const initialConversationOpenedRef =
        useRef(false);

    const activeConversationRef =
        useRef(null);

    const conversationsRef =
        useRef(initialConversations || []);

    const currentUserId =
        Number(currentUser?.id);

    // ========================================================
    // KEEP ACTIVE CONVERSATION REF
    // ========================================================

    useEffect(() => {
        activeConversationRef.current =
            activeConversation;
    }, [activeConversation]);

    useEffect(() => {
        conversationsRef.current =
            conversations;
    }, [conversations]);

    // ========================================================
    // SOCKET CONNECTION
    // ========================================================

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        // ----------------------------------------------------
        // CONNECT
        // ----------------------------------------------------

        const onConnect = () => {
            console.log(
                "🟢 Chat socket connected:",
                socket.id
            );

            setSocketConnected(true);
        };

        // ----------------------------------------------------
        // DISCONNECT
        // ----------------------------------------------------

        const onDisconnect = (
            reason
        ) => {
            console.log(
                "🔴 Chat socket disconnected:",
                reason
            );

            setSocketConnected(false);
        };

        // ----------------------------------------------------
        // CONNECT ERROR
        // ----------------------------------------------------

        const onConnectError = (
            error
        ) => {
            console.error(
                "❌ Chat socket error:",
                error?.message
            );

            setSocketConnected(false);
        };

        // ----------------------------------------------------
        // PRESENCE STATE
        // ----------------------------------------------------

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

            // Keep conversation member state synchronized with initial presence while preserving privacy settings
            setConversations(
                (previous) =>
                    previous.map(
                        (
                            conversation
                        ) => ({
                            ...conversation,

                            members: (
                                conversation.members ||
                                []
                            ).map(
                                (
                                    member
                                ) => {
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
                                            showOnlineStatus: member.user?.showOnlineStatus ?? true,
                                            showLastSeen: member.user?.showLastSeen ?? true,
                                        },
                                    };
                                }
                            ),
                        })
                    )
            );
        };

        // ----------------------------------------------------
        // USER ONLINE
        // ----------------------------------------------------

        const onUserOnline = ({
            userId,
            showOnlineStatus,
            showLastSeen,
        }) => {
            const id = Number(userId);

            if (!Number.isFinite(id)) {
                return;
            }

            setOnlineUsers((previous) => {
                if (previous.includes(id)) {
                    return previous;
                }
                return [...previous, id];
            });

            const updates = {
                isOnline: true,
                ...(showOnlineStatus !== undefined && { showOnlineStatus: Boolean(showOnlineStatus) }),
                ...(showLastSeen !== undefined && { showLastSeen: Boolean(showLastSeen) }),
            };

            setConversations((previous) =>
                updateConversationMembers(previous, id, updates)
            );

            setActiveConversation((previous) =>
                updateActiveConversationMember(previous, id, updates)
            );
        };

        // ----------------------------------------------------
        // USER OFFLINE
        // ----------------------------------------------------

        const onUserOffline = ({
            userId,
            lastSeen,
            showOnlineStatus,
            showLastSeen,
            privacyHidden,
        }) => {
            const id = Number(userId);

            if (!Number.isFinite(id)) {
                return;
            }

            setOnlineUsers((previous) =>
                previous.filter((existingId) => Number(existingId) !== id)
            );

            const isLastSeenVisible = privacyHidden
                ? false
                : showLastSeen !== undefined
                ? Boolean(showLastSeen)
                : true;

            const updatedLastSeen = isLastSeenVisible
                ? lastSeen || new Date().toISOString()
                : null;

            const updates = {
                isOnline: false,
                lastSeen: updatedLastSeen,
                ...(showOnlineStatus !== undefined && { showOnlineStatus: Boolean(showOnlineStatus) }),
                showLastSeen: isLastSeenVisible,
            };

            setConversations((previous) =>
                updateConversationMembers(previous, id, updates)
            );

            setActiveConversation((previous) =>
                updateActiveConversationMember(previous, id, updates)
            );
        };

        // ----------------------------------------------------
        // USER LAST SEEN UPDATED
        // ----------------------------------------------------

        const onUserLastSeenUpdated = ({
            userId,
            lastSeen,
            privacyHidden,
        }) => {
            const id = Number(userId);

            if (!Number.isFinite(id)) {
                return;
            }

            const updatedLastSeen = privacyHidden
                ? null
                : lastSeen || new Date().toISOString();

            setConversations((previous) =>
                updateConversationMembers(
                    previous,
                    id,
                    {
                        lastSeen: updatedLastSeen,
                        showLastSeen: !privacyHidden,
                    }
                )
            );

            setActiveConversation((previous) =>
                updateActiveConversationMember(
                    previous,
                    id,
                    {
                        lastSeen: updatedLastSeen,
                        showLastSeen: !privacyHidden,
                    }
                )
            );
        };

        // ----------------------------------------------------
        // PRIVACY SETTINGS UPDATED
        // ----------------------------------------------------

        const onPrivacySettingsUpdated = ({
            userId,
            privacy,
        }) => {
            const id = Number(userId);

            if (!Number.isFinite(id)) {
                return;
            }

            const isLastSeenAllowed = Boolean(privacy?.lastSeen);

            setConversations((previous) =>
                updateConversationMembers(
                    previous,
                    id,
                    {
                        showOnlineStatus: Boolean(privacy?.onlineStatus),
                        showLastSeen: isLastSeenAllowed,
                        lastSeen: isLastSeenAllowed ? undefined : null,
                    }
                )
            );

            setActiveConversation((previous) =>
                updateActiveConversationMember(
                    previous,
                    id,
                    {
                        showOnlineStatus: Boolean(privacy?.onlineStatus),
                        showLastSeen: isLastSeenAllowed,
                        lastSeen: isLastSeenAllowed ? undefined : null,
                    }
                )
            );
        };

        // ====================================================
        // REGISTER
        // ====================================================

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

        socket.on(
            "user_last_seen_updated",
            onUserLastSeenUpdated
        );

        socket.on(
            "privacy_settings_updated",
            onPrivacySettingsUpdated
        );

        // ====================================================
        // CLEANUP
        // ====================================================

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

            socket.off(
                "user_last_seen_updated",
                onUserLastSeenUpdated
            );

            socket.off(
                "privacy_settings_updated",
                onPrivacySettingsUpdated
            );
        };
    }, []);

    // ============================================================
    // CALL MANAGER
    // ============================================================

    useEffect(() => {
        if (
            !Number.isInteger(currentUserId) ||
            currentUserId <= 0
        ) {
            return;
        }

        const getCallerFromConversation = (
            conversationId,
            callerId
        ) => {
            const conversation =
                conversationsRef.current.find(
                    (item) =>
                        Number(item?.id) ===
                        Number(conversationId)
                );

            const member = (
                conversation?.members || []
            ).find(
                (item) =>
                    Number(
                        item?.userId ??
                            item?.user?.id
                    ) === Number(callerId)
            );

            return member?.user || null;
        };

        callManager.initialize(
            currentUserId
        );

        callManager.setCallbacks({
            onIncomingCall: (data) => {
                const caller =
                    getCallerFromConversation(
                        data?.conversationId,
                        data?.callerId
                    );

                setIncomingCall({
                    ...data,
                    caller,
                });

                setCallError(null);
                setCallState("incoming");
            },

            onCallStarted: () => {
                setIncomingCall(null);
                setCallError(null);
                setCallState("outgoing");
            },

            onCallAccepted: () => {
                setIncomingCall(null);
                setCallError(null);
                setCallState("connecting");
            },

            onCallConnected: () => {
                setIncomingCall(null);
                setCallError(null);
                setCallState("connected");
            },

            onLocalStream: (stream) => {
                setLocalStream(stream || null);
            },

            onRemoteStream: (stream) => {
                setRemoteStream(stream || null);
            },

            onCallRejected: () => {
                setIncomingCall(null);
                setLocalStream(null);
                setRemoteStream(null);
                setIsMuted(false);
                setIsCameraOff(false);
                setCallState("idle");
            },

            onCallEnded: () => {
                setIncomingCall(null);
                setLocalStream(null);
                setRemoteStream(null);
                setIsMuted(false);
                setIsCameraOff(false);
                setCallState("idle");
            },

            onMuteChanged: (muted) => {
                setIsMuted(Boolean(muted));
            },

            onCameraChanged: (cameraOff) => {
                setIsCameraOff(Boolean(cameraOff));
            },

            onCallError: (message) => {
                setCallError(
                    message ||
                        "Unable to establish the call."
                );
            },
        });

        return () => {
            callManager.destroy();
        };
    }, [currentUserId]);

    // ============================================================
    // NEW CONVERSATION CREATED
    // ============================================================

    useEffect(() => {
        const onConversationCreated =
            (data) => {
                const conversation =
                    data?.conversation;

                if (
                    !conversation?.id
                ) {
                    console.warn(
                        "⚠️ conversation_created received without conversation"
                    );

                    return;
                }

                const conversationId =
                    Number(
                        conversation.id
                    );

                console.log(
                    "💬 New conversation received:",
                    conversation
                );

                setConversations(
                    (previous) => {
                        const exists =
                            previous.some(
                                (
                                    item
                                ) =>
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

                if (
                    socket.connected
                ) {
                    socket.emit(
                        "join_conversation",
                        {
                            conversationId,
                        },
                        (
                            response
                        ) => {
                            if (
                                response?.success
                            ) {
                                console.log(
                                    `👥 Joined new conversation room: ${conversationId}`
                                );
                            } else {
                                console.error(
                                    "❌ Failed to join new conversation:",
                                    response?.message
                                );
                            }
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

    const hasDeliveredReceipt =
        useCallback(
            (message) => {
                const receipts =
                    message?.receipts ||
                    [];

                return receipts.some(
                    (receipt) =>
                        Number(
                            receipt.userId
                        ) ===
                            currentUserId &&
                        Boolean(
                            receipt.deliveredAt
                        )
                );
            },
            [currentUserId]
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
                            (
                                conversation
                            ) =>
                                Number(
                                    conversation.id
                                ) ===
                                Number(
                                    conversationId
                                )
                                    ? {
                                          ...conversation,

                                          unreadCount: 0,

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
                if (
                    !conversation?.id
                ) {
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

                if (
                    socket.connected
                ) {
                    socket.emit(
                        "join_conversation",
                        {
                            conversationId,
                        },
                        (
                            response
                        ) => {
                            if (
                                !response?.success
                            ) {
                                console.error(
                                    "❌ JOIN CONVERSATION:",
                                    response?.message
                                );
                            }
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
                            (
                                item
                            ) =>
                                Number(
                                    item.id
                                ) ===
                                conversationId
                                    ? {
                                          ...item,
                                          unreadCount: 0,
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
    // CALL ACTIONS
    // ============================================================

    const getOtherConversationMember =
        useCallback(() => {
            const active =
                activeConversationRef.current;

            if (!active) {
                return null;
            }

            return (active.members || []).find(
                (member) =>
                    Number(
                        member?.userId ??
                            member?.user?.id
                    ) !== currentUserId
            ) || null;
        }, [currentUserId]);

    const startAudioCall =
        useCallback(async () => {
            const active =
                activeConversationRef.current;
            const member =
                getOtherConversationMember();
            const receiverId = Number(
                member?.userId ??
                    member?.user?.id
            );

            if (
                !active?.id ||
                !Number.isInteger(receiverId) ||
                receiverId <= 0
            ) {
                setCallError(
                    "Unable to find the other user for this call."
                );
                return { success: false };
            }

            setCallError(null);

            return callManager.startAudioCall(
                Number(active.id),
                receiverId
            );
        }, [getOtherConversationMember]);

    const startVideoCall =
        useCallback(async () => {
            const active =
                activeConversationRef.current;
            const member =
                getOtherConversationMember();
            const receiverId = Number(
                member?.userId ??
                    member?.user?.id
            );

            if (
                !active?.id ||
                !Number.isInteger(receiverId) ||
                receiverId <= 0
            ) {
                setCallError(
                    "Unable to find the other user for this call."
                );
                return { success: false };
            }

            setCallError(null);

            return callManager.startVideoCall(
                Number(active.id),
                receiverId
            );
        }, [getOtherConversationMember]);

    const acceptIncomingCall =
        useCallback(async () => {
            setCallError(null);
            return callManager.acceptCall();
        }, []);

    const rejectIncomingCall =
        useCallback((reason = "rejected") => {
            callManager.rejectCall(reason);
        }, []);

    const endCurrentCall =
        useCallback((reason = "ended") => {
            callManager.endCall(reason);
        }, []);

    const toggleCallMute =
        useCallback(() => {
            return callManager.toggleMute();
        }, []);

    const toggleCallCamera =
        useCallback(() => {
            return callManager.toggleCamera();
        }, []);

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
                                (
                                    item
                                ) =>
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

                            const existing =
                                receipts.find(
                                    (
                                        item
                                    ) =>
                                        Number(
                                            item.userId
                                        ) ===
                                        Number(
                                            receipt.userId
                                        )
                                );

                            if (
                                existing
                            ) {
                                return {
                                    ...message,

                                    receipts:
                                        receipts.map(
                                            (
                                                item
                                            ) =>
                                                Number(
                                                    item.userId
                                                ) ===
                                                Number(
                                                    receipt.userId
                                                )
                                                    ? {
                                                          ...item,
                                                          ...receipt,
                                                      }
                                                    : item
                                        ),
                                };
                            }

                            return {
                                ...message,

                                receipts: [
                                    ...receipts,
                                    receipt,
                                ],
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
                                    (
                                        item
                                    ) =>
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
                                          (
                                              item
                                          ) =>
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
            typeof content ===
            "string"
                ? content.trim()
                : "";

        if (
            !trimmedContent &&
            !file
        ) {
            return;
        }

        stopTyping();

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
                    return;
                }

                if (
                    !uploadResponse.ok ||
                    !uploadData?.success
                ) {
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

                if (
                    !attachmentUrl
                ) {
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
                    !response?.success
                ) {
                    console.error(
                        "❌ SEND MESSAGE:",
                        response?.message
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
    // DELETE MESSAGE
    // ============================================================

    const deleteMessage = (
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

        const confirmed =
            window.confirm(
                "Delete message?"
            );

        if (!confirmed) {
            return;
        }

        if (!socket.connected) {
            return;
        }

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
                        "❌ DELETE MESSAGE:",
                        response.message
                    );
                }
            }
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

        const existing =
            (
                message.reactions ||
                []
            ).find(
                (reaction) =>
                    Number(
                        reaction.userId
                    ) ===
                        currentUserId &&
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
        <div className="flex h-full w-full overflow-hidden bg-[#111b21] text-white">
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

                    callState={
                        callState
                    }

                    incomingCall={
                        incomingCall
                    }

                    localStream={
                        localStream
                    }

                    remoteStream={
                        remoteStream
                    }

                    isMuted={
                        isMuted
                    }

                    isCameraOff={
                        isCameraOff
                    }

                    callError={
                        callError
                    }

                    onStartAudioCall={
                        startAudioCall
                    }

                    onStartVideoCall={
                        startVideoCall
                    }

                    onAcceptCall={
                        acceptIncomingCall
                    }

                    onRejectCall={
                        rejectIncomingCall
                    }

                    onEndCall={
                        endCurrentCall
                    }

                    onToggleCallMute={
                        toggleCallMute
                    }

                    onToggleCallCamera={
                        toggleCallCamera
                    }

                    onBack={
                        handleBackToConversations
                    }
                />
            </main>
        </div>
    );
}