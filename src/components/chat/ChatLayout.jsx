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
import CallOverlay from "./CallOverlay";
import GameOverlay from "../games/GameOverlay";

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

    const updated =
        conversations.map(
            (conversation) => {
                if (
                    Number(conversation.id) !==
                    conversationId
                ) {
                    return conversation;
                }

                const currentUnread =
                    Number(
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
                    Number(member.userId) !== id
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
                Number(member.userId) !== id
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
// CREATE OPTIMISTIC MESSAGE
// ============================================================

function createOptimisticMessage({
    conversationId,
    currentUser,
    currentUserId,
    content,
    type = "TEXT",
    file = null,
}) {
    const tempId =
        `temp-${currentUserId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;

    const createdAt =
        new Date().toISOString();

    return {
        id: tempId,

        conversationId:
            Number(conversationId),

        senderId:
            Number(currentUserId),

        content:
            content || "",

        type,

        createdAt,

        updatedAt:
            createdAt,

        deletedAt: null,

        pending: true,
        sending: true,
        failed: false,

        sender:
            currentUser || null,

        user:
            currentUser || null,

        attachmentUrl:
            file?.url || null,

        attachmentName:
            file?.name || null,

        attachmentSize:
            file?.size || null,

        attachmentMimeType:
            file?.type || null,

        reactions: [],
        receipts: [],
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
    // CHAT STATE
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
    const [activeGame, setActiveGame] = useState(null);

    // ========================================================
    // CHAT THEME
    // ========================================================

    const [
        chatThemes,
        setChatThemes,
    ] = useState({});

    // ========================================================
    // MOBILE
    // ========================================================

    const [
        mobileChatOpen,
        setMobileChatOpen,
    ] = useState(false);

    // ========================================================
    // CALL STATE
    // ========================================================

    const [
        callState,
        setCallState,
    ] = useState("idle");

    const [
        callType,
        setCallType,
    ] = useState("audio");

    const [
        incomingCall,
        setIncomingCall,
    ] = useState(null);

    const [
        localStream,
        setLocalStream,
    ] = useState(null);

    const [
        remoteStream,
        setRemoteStream,
    ] = useState(null);

    const [
        isMuted,
        setIsMuted,
    ] = useState(false);

    const [
        isCameraOff,
        setIsCameraOff,
    ] = useState(false);

    const [
        callError,
        setCallError,
    ] = useState(null);

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
        useRef(
            initialConversations || []
        );

    // IMPORTANT:
    // Keeps the latest call state immediately available
    // inside CallManager callbacks.
    const callStateRef =
        useRef("idle");

    const currentUserId =
        Number(currentUser?.id);

    // ========================================================
    // KEEP REFS UPDATED
    // ========================================================

    useEffect(() => {
        activeConversationRef.current =
            activeConversation;
    }, [activeConversation]);

    useEffect(() => {
        conversationsRef.current =
            conversations;
    }, [conversations]);

    // IMPORTANT:
    // Keep callStateRef synchronized with React state.
    useEffect(() => {
        callStateRef.current =
            callState;
    }, [callState]);

    // ========================================================
    // GAME INVITATION / GAME ACTIVATION
    //
    // IMPORTANT:
    // ChatWindow creates the game through POST /api/games and
    // dispatches "chathub:game-created" locally.
    //
    // ChatLayout forwards that event through Socket.IO using
    // "game_created". The server then broadcasts "game_created"
    // to every member of the conversation room.
    //
    // This is what makes the receiver see GameOverlay too.
    // ========================================================

    useEffect(() => {
        const handleLocalGameCreated = (event) => {
            const game = event.detail?.game;

            if (!game?.id) {
                console.warn(
                    "⚠️ chathub:game-created received without a valid game"
                );
                return;
            }

            console.log(
                "🎮 Local game created:",
                game
            );

            // Open immediately for the creator.
            setActiveGame(game);

            // Tell the server so the other conversation member(s)
            // receive the invitation in real time.
            if (!socket.connected) {
                console.warn(
                    "⚠️ Cannot announce game: socket is not connected."
                );
                return;
            }

            socket.emit(
                "game_created",
                {
                    game,
                },
                (response) => {
                    if (!response?.success) {
                        console.error(
                            "❌ GAME INVITATION BROADCAST FAILED:",
                            response?.message
                        );
                        return;
                    }

                    console.log(
                        "🎮 GAME INVITATION BROADCASTED:",
                        response.game
                    );
                }
            );
        };

        window.addEventListener(
            "chathub:game-created",
            handleLocalGameCreated
        );

        return () => {
            window.removeEventListener(
                "chathub:game-created",
                handleLocalGameCreated
            );
        };
    }, []);

    // ========================================================
    // RECEIVE GAME INVITATION FROM SERVER
    //
    // This listener is the important receiver-side piece.
    // The server emits "game_created" to the conversation room,
    // so every connected member receives the game.
    // ========================================================

    useEffect(() => {
        const handleGameCreated = (game) => {
            if (!game?.id) {
                console.warn(
                    "⚠️ game_created received without a valid game"
                );
                return;
            }

            console.log(
                "🎮 GAME INVITATION RECEIVED:",
                game
            );

            setActiveGame(game);
        };

        socket.on(
            "game_created",
            handleGameCreated
        );

        return () => {
            socket.off(
                "game_created",
                handleGameCreated
            );
        };
    }, []);

    // ========================================================
    // OPTIONAL: KEEP GAME UPDATED IF SERVER SENDS AN UPDATE
    // ========================================================

    useEffect(() => {
        const handleGameUpdated = (game) => {
            if (!game?.id) {
                return;
            }

            setActiveGame((previous) => {
                if (
                    !previous ||
                    Number(previous.id) !== Number(game.id)
                ) {
                    return previous;
                }

                return {
                    ...previous,
                    ...game,
                };
            });
        };

        socket.on(
            "game_updated",
            handleGameUpdated
        );

        return () => {
            socket.off(
                "game_updated",
                handleGameUpdated
            );
        };
    }, []);

    // ========================================================
    // LOAD SAVED CHAT THEMES
    // ========================================================
    useEffect(() => {
        try {
            const stored =
                window.localStorage.getItem(
                    "chathub:conversation-themes"
                );

            if (stored) {
                const parsed =
                    JSON.parse(stored);

                if (
                    parsed &&
                    typeof parsed === "object"
                ) {
                    setChatThemes(parsed);
                }
            }
        } catch (error) {
            console.error(
                "❌ Failed to load chat themes:",
                error
            );
        }
    }, []);

    // ========================================================
    // SELECT CHAT THEME
    // ========================================================

    const handleSelectTheme =
        useCallback(
            (themeId) => {
                const conversationId =
                    Number(
                        activeConversationRef
                            .current?.id
                    );

                if (
                    !Number.isInteger(
                        conversationId
                    ) ||
                    !themeId
                ) {
                    return;
                }

                setChatThemes(
                    (previous) => {
                        const updated = {
                            ...previous,
                            [conversationId]:
                                themeId,
                        };

                        try {
                            window.localStorage.setItem(
                                "chathub:conversation-themes",
                                JSON.stringify(updated)
                            );
                        } catch (error) {
                            console.error(
                                "❌ Failed to save chat theme:",
                                error
                            );
                        }

                        return updated;
                    }
                );
            },
            []
        );

    // ========================================================
    // KEEP THEME AVAILABLE
    // ========================================================

    useEffect(() => {
        const conversationId =
            Number(
                activeConversation?.id
            );

        if (
            !Number.isInteger(
                conversationId
            )
        ) {
            return;
        }

        const theme =
            chatThemes[
                conversationId
            ] ||
            activeConversation?.theme ||
            "default";

        setActiveConversation(
            (previous) => {
                if (
                    !previous ||
                    Number(previous.id) !==
                        conversationId
                ) {
                    return previous;
                }

                if (
                    previous.theme ===
                    theme
                ) {
                    return previous;
                }

                return {
                    ...previous,
                    theme,
                };
            }
        );

        setConversations(
            (previous) =>
                previous.map(
                    (conversation) =>
                        Number(
                            conversation.id
                        ) ===
                        conversationId
                            ? {
                                  ...conversation,
                                  theme,
                              }
                            : conversation
                )
        );
    }, [
        chatThemes,
        activeConversation?.id,
    ]);

    // ============================================================
    // SOCKET CONNECTION
    // ============================================================

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        // --------------------------------------------------------
        // CONNECT
        // --------------------------------------------------------

        const onConnect = () => {
            console.log(
                "🟢 Chat socket connected:",
                socket.id
            );

            setSocketConnected(true);
        };

        // --------------------------------------------------------
        // DISCONNECT
        // --------------------------------------------------------

        const onDisconnect = (
            reason
        ) => {
            console.log(
                "🔴 Chat socket disconnected:",
                reason
            );

            setSocketConnected(false);
        };

        // --------------------------------------------------------
        // CONNECT ERROR
        // --------------------------------------------------------

        const onConnectError = (
            error
        ) => {
            console.error(
                "❌ Chat socket error:",
                error?.message
            );

            setSocketConnected(false);
        };

        // --------------------------------------------------------
        // PRESENCE STATE
        // --------------------------------------------------------

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
                                                member?.user?.id
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
                                            showOnlineStatus:
                                                member
                                                    .user
                                                    ?.showOnlineStatus ??
                                                true,
                                            showLastSeen:
                                                member
                                                    .user
                                                    ?.showLastSeen ??
                                                true,
                                        },
                                    };
                                }
                            ),
                        })
                    )
            );
        };

        // --------------------------------------------------------
        // USER ONLINE
        // --------------------------------------------------------

        const onUserOnline = ({
            userId,
            showOnlineStatus,
            showLastSeen,
        }) => {
            const id =
                Number(userId);

            if (
                !Number.isFinite(id)
            ) {
                return;
            }

            setOnlineUsers(
                (previous) => {
                    if (
                        previous.includes(id)
                    ) {
                        return previous;
                    }

                    return [
                        ...previous,
                        id,
                    ];
                }
            );

            const updates = {
                isOnline: true,

                ...(showOnlineStatus !==
                    undefined && {
                    showOnlineStatus:
                        Boolean(
                            showOnlineStatus
                        ),
                }),

                ...(showLastSeen !==
                    undefined && {
                    showLastSeen:
                        Boolean(
                            showLastSeen
                        ),
                }),
            };

            setConversations(
                (previous) =>
                    updateConversationMembers(
                        previous,
                        id,
                        updates
                    )
            );

            setActiveConversation(
                (previous) =>
                    updateActiveConversationMember(
                        previous,
                        id,
                        updates
                    )
            );
        };

        // --------------------------------------------------------
        // USER OFFLINE
        // --------------------------------------------------------

        const onUserOffline = ({
            userId,
            lastSeen,
            showOnlineStatus,
            showLastSeen,
            privacyHidden,
        }) => {
            const id =
                Number(userId);

            if (
                !Number.isFinite(id)
            ) {
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

            const isLastSeenVisible =
                privacyHidden
                    ? false
                    : showLastSeen !==
                      undefined
                    ? Boolean(
                          showLastSeen
                      )
                    : true;

            const updatedLastSeen =
                isLastSeenVisible
                    ? lastSeen ||
                      new Date().toISOString()
                    : null;

            const updates = {
                isOnline: false,

                lastSeen:
                    updatedLastSeen,

                ...(showOnlineStatus !==
                    undefined && {
                    showOnlineStatus:
                        Boolean(
                            showOnlineStatus
                        ),
                }),

                showLastSeen:
                    isLastSeenVisible,
            };

            setConversations(
                (previous) =>
                    updateConversationMembers(
                        previous,
                        id,
                        updates
                    )
            );

            setActiveConversation(
                (previous) =>
                    updateActiveConversationMember(
                        previous,
                        id,
                        updates
                    )
            );
        };

        // --------------------------------------------------------
        // LAST SEEN
        // --------------------------------------------------------

        const onUserLastSeenUpdated = ({
            userId,
            lastSeen,
            privacyHidden,
        }) => {
            const id =
                Number(userId);

            if (
                !Number.isFinite(id)
            ) {
                return;
            }

            const updatedLastSeen =
                privacyHidden
                    ? null
                    : lastSeen ||
                      new Date().toISOString();

            const updates = {
                lastSeen:
                    updatedLastSeen,

                showLastSeen:
                    !privacyHidden,
            };

            setConversations(
                (previous) =>
                    updateConversationMembers(
                        previous,
                        id,
                        updates
                    )
            );

            setActiveConversation(
                (previous) =>
                    updateActiveConversationMember(
                        previous,
                        id,
                        updates
                    )
            );
        };

        // --------------------------------------------------------
        // PRIVACY SETTINGS
        // --------------------------------------------------------

        const onPrivacySettingsUpdated = ({
            userId,
            privacy,
        }) => {
            const id =
                Number(userId);

            if (
                !Number.isFinite(id)
            ) {
                return;
            }

            const isLastSeenAllowed =
                Boolean(
                    privacy?.lastSeen
                );

            const updates = {
                showOnlineStatus:
                    Boolean(
                        privacy?.onlineStatus
                    ),

                showLastSeen:
                    isLastSeenAllowed,

                lastSeen:
                    isLastSeenAllowed
                        ? undefined
                        : null,
            };

            setConversations(
                (previous) =>
                    updateConversationMembers(
                        previous,
                        id,
                        updates
                    )
            );

            setActiveConversation(
                (previous) =>
                    updateActiveConversationMember(
                        previous,
                        id,
                        updates
                    )
            );
        };

        // --------------------------------------------------------
        // REGISTER
        // --------------------------------------------------------

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
            !Number.isInteger(
                currentUserId
            ) ||
            currentUserId <= 0
        ) {
            return;
        }

        // --------------------------------------------------------
        // FIND CALLER
        // --------------------------------------------------------

        const getCallerFromConversation = (
            conversationId,
            callerId
        ) => {
            const conversation =
                conversationsRef.current.find(
                    (item) =>
                        Number(
                            item?.id
                        ) ===
                        Number(
                            conversationId
                        )
                );

            const member = (
                conversation?.members ||
                []
            ).find(
                (item) =>
                    Number(
                        item?.userId ??
                            item?.user?.id
                    ) ===
                    Number(callerId)
            );

            return (
                member?.user ||
                null
            );
        };

        // --------------------------------------------------------
        // INITIALIZE
        // --------------------------------------------------------

        console.log(
            "📞 Initializing CallManager for user:",
            currentUserId
        );

        callManager.initialize(
            currentUserId
        );

        // --------------------------------------------------------
        // CALLBACKS
        // --------------------------------------------------------

        callManager.setCallbacks({
            // ====================================================
            // INCOMING CALL
            // ====================================================

            onIncomingCall:
                (data) => {
                    console.log(
                        "📞 INCOMING CALL:",
                        data
                    );

                    const incomingType =
                        data?.callType ||
                        data?.type ||
                        (
                            data?.isVideo
                                ? "video"
                                : "audio"
                        );

                    const normalizedType =
                        incomingType ===
                        "video"
                            ? "video"
                            : "audio";

                    const caller =
                        getCallerFromConversation(
                            data?.conversationId,
                            data?.callerId
                        );

                    setCallType(
                        normalizedType
                    );

                    setIncomingCall({
                        ...data,
                        caller,
                    });

                    setCallError(null);

                    // IMPORTANT:
                    // This user is the RECEIVER.
                    callStateRef.current =
                        "incoming";

                    setCallState(
                        "incoming"
                    );
                },

            // ====================================================
            // OUTGOING CALL STARTED
            // ====================================================

            onCallStarted:
                (data) => {
                    console.log(
                        "📞 OUTGOING CALL STARTED:",
                        data
                    );

                    const outgoingType =
                        data?.callType ||
                        data?.type ||
                        (
                            data?.isVideo
                                ? "video"
                                : callType
                        );

                    setCallType(
                        outgoingType ===
                            "video"
                            ? "video"
                            : "audio"
                    );

                    setIncomingCall(null);
                    setCallError(null);

                    // IMPORTANT:
                    // This user is the CALLER/SENDER.
                    callStateRef.current =
                        "outgoing";

                    setCallState(
                        "outgoing"
                    );
                },

            // ====================================================
            // ACCEPTED
            // ====================================================

            onCallAccepted:
                (data) => {
                    console.log(
                        "📞 CALL ACCEPTED:",
                        data
                    );

                    const acceptedType =
                        data?.callType ||
                        data?.type;

                    if (
                        acceptedType ===
                            "video" ||
                        acceptedType ===
                            "audio"
                    ) {
                        setCallType(
                            acceptedType
                        );
                    }

                    setIncomingCall(null);
                    setCallError(null);

                    callStateRef.current =
                        "connecting";

                    setCallState(
                        "connecting"
                    );
                },

            // ====================================================
            // CONNECTED
            // ====================================================

            onCallConnected:
                (data) => {
                    console.log(
                        "📞 CALL CONNECTED:",
                        data
                    );

                    const connectedType =
                        data?.callType ||
                        data?.type;

                    if (
                        connectedType ===
                            "video" ||
                        connectedType ===
                            "audio"
                    ) {
                        setCallType(
                            connectedType
                        );
                    }

                    setIncomingCall(null);
                    setCallError(null);

                    callStateRef.current =
                        "connected";

                    setCallState(
                        "connected"
                    );
                },

            // ====================================================
            // LOCAL STREAM
            // ====================================================

            onLocalStream:
                (stream) => {
                    console.log(
                        "🎤 LOCAL STREAM:",
                        stream
                    );

                    setLocalStream(
                        stream || null
                    );
                },

            // ====================================================
            // REMOTE STREAM
            // ====================================================

            onRemoteStream:
                (stream) => {
                    console.log(
                        "📺 REMOTE STREAM:",
                        stream
                    );

                    setRemoteStream(
                        stream || null
                    );
                },

            // ====================================================
            // REJECTED
            // ====================================================

            onCallRejected:
                (data) => {
                    console.log(
                        "📞 CALL REJECTED:",
                        data
                    );

                    const currentCallState =
                        callStateRef.current;

                    console.log(
                        "📞 Local call state when rejection received:",
                        currentCallState
                    );

                    // ==================================================
                    // RECEIVER SIDE
                    //
                    // The receiver pressed Decline.
                    //
                    // Receiver must NOT see:
                    // "Call declined"
                    //
                    // Receiver simply closes the call UI.
                    // ==================================================

                    if (
                        currentCallState ===
                        "incoming"
                    ) {
                        console.log(
                            "📞 Receiver declined the call. Closing receiver UI."
                        );

                        setIncomingCall(null);
                        setLocalStream(null);
                        setRemoteStream(null);

                        setIsMuted(false);
                        setIsCameraOff(false);

                        setCallError(null);
                        setCallType("audio");

                        callStateRef.current =
                            "idle";

                        setCallState(
                            "idle"
                        );

                        return;
                    }

                    // ==================================================
                    // SENDER / CALLER SIDE
                    //
                    // The other user rejected our outgoing call.
                    //
                    // ONLY the sender sees:
                    // "Call declined"
                    // ==================================================

                    if (
                        currentCallState ===
                        "outgoing"
                    ) {
                        console.log(
                            "📞 Receiver declined our outgoing call. Showing declined UI to sender."
                        );

                        setIncomingCall(null);
                        setLocalStream(null);
                        setRemoteStream(null);

                        setIsMuted(false);
                        setIsCameraOff(false);

                        setCallError(null);

                        const rejectedType =
                            data?.callType ||
                            data?.type;

                        if (
                            rejectedType ===
                                "video" ||
                            rejectedType ===
                                "audio"
                        ) {
                            setCallType(
                                rejectedType
                            );
                        }

                        callStateRef.current =
                            "declined";

                        setCallState(
                            "declined"
                        );

                        return;
                    }

                    // ==================================================
                    // SAFETY FALLBACK
                    //
                    // If we don't know the local call direction,
                    // do NOT show "Call declined".
                    //
                    // This prevents the receiver from accidentally
                    // seeing the declined screen.
                    // ==================================================

                    console.warn(
                        "⚠️ Unable to determine local call direction:",
                        {
                            data,
                            currentCallState,
                        }
                    );

                    setIncomingCall(null);
                    setLocalStream(null);
                    setRemoteStream(null);

                    setIsMuted(false);
                    setIsCameraOff(false);

                    setCallError(null);
                    setCallType("audio");

                    callStateRef.current =
                        "idle";

                    setCallState(
                        "idle"
                    );
                },

            // ====================================================
            // ENDED
            // ====================================================

            onCallEnded:
                (data) => {
                    console.log(
                        "📴 CALL ENDED:",
                        data
                    );

                    setIncomingCall(null);
                    setLocalStream(null);
                    setRemoteStream(null);

                    setIsMuted(false);
                    setIsCameraOff(false);

                    setCallError(null);
                    setCallType("audio");

                    callStateRef.current =
                        "idle";

                    setCallState(
                        "idle"
                    );
                },

            // ====================================================
            // MUTE
            // ====================================================

            onMuteChanged:
                (muted) => {
                    setIsMuted(
                        Boolean(muted)
                    );
                },

            // ====================================================
            // CAMERA
            // ====================================================

            onCameraChanged:
                (cameraOff) => {
                    setIsCameraOff(
                        Boolean(cameraOff)
                    );
                },

            // ====================================================
            // CALL ERROR
            // ====================================================

            onCallError:
                (message) => {
                    console.error(
                        "❌ CALL ERROR:",
                        message
                    );

                    setCallError(
                        message ||
                            "Unable to establish the call."
                    );
                },
        });

        // --------------------------------------------------------
        // CLEANUP
        // --------------------------------------------------------

        return () => {
            console.log(
                "🧹 Destroying CallManager from ChatLayout"
            );

            callManager.destroy();

            callStateRef.current =
                "idle";
        };
    }, [
        currentUserId,
    ]);

    // ============================================================
    // DISMISS CALL OVERLAY
    // ============================================================

    const dismissCallOverlay =
        useCallback(() => {
            console.log(
                "👋 Dismissing call overlay"
            );

            callStateRef.current =
                "idle";

            setCallState("idle");

            setIncomingCall(null);

            setLocalStream(null);

            setRemoteStream(null);

            setIsMuted(false);

            setIsCameraOff(false);

            setCallError(null);

            setCallType("audio");
        }, []);

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

                if (
                    socket.connected
                ) {
                    socket.emit(
                        "join_conversation",
                        {
                            conversationId,
                        },
                        (response) => {
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
                if (
                    !conversationId
                ) {
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
                                method:
                                    "GET",

                                credentials:
                                    "include",

                                cache:
                                    "no-store",
                            }
                        );

                    const rawText =
                        await response.text();

                    let data =
                        null;

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
    // MARK READ
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
                        (response) => {
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
            },
            [
                loadMessages,
                markConversationRead,
            ]
        );

    // ============================================================
    // GET OTHER MEMBER
    // ============================================================

    const getOtherConversationMember =
        useCallback(
            () => {
                const active =
                    activeConversationRef.current;

                if (!active) {
                    return null;
                }

                return (
                    active.members || []
                ).find(
                    (member) =>
                        Number(
                            member?.userId ??
                                member?.user?.id
                        ) !==
                        currentUserId
                ) || null;
            },
            [currentUserId]
        );

    // ============================================================
    // START AUDIO CALL
    // ============================================================

    const startAudioCall =
        useCallback(
            async () => {
                const active =
                    activeConversationRef.current;

                const member =
                    getOtherConversationMember();

                const receiverId =
                    Number(
                        member?.userId ??
                            member?.user?.id
                    );

                if (
                    !active?.id ||
                    !Number.isInteger(
                        receiverId
                    ) ||
                    receiverId <= 0
                ) {
                    setCallError(
                        "Unable to find the other user for this call."
                    );

                    return {
                        success: false,
                    };
                }

                setCallType(
                    "audio"
                );

                setCallError(null);

                return callManager.startAudioCall(
                    Number(
                        active.id
                    ),
                    receiverId
                );
            },
            [
                getOtherConversationMember,
            ]
        );

    // ============================================================
    // START VIDEO CALL
    // ============================================================

    const startVideoCall =
        useCallback(
            async () => {
                const active =
                    activeConversationRef.current;

                const member =
                    getOtherConversationMember();

                const receiverId =
                    Number(
                        member?.userId ??
                            member?.user?.id
                    );

                if (
                    !active?.id ||
                    !Number.isInteger(
                        receiverId
                    ) ||
                    receiverId <= 0
                ) {
                    setCallError(
                        "Unable to find the other user for this call."
                    );

                    return {
                        success: false,
                    };
                }

                setCallType(
                    "video"
                );

                setCallError(null);

                return callManager.startVideoCall(
                    Number(
                        active.id
                    ),
                    receiverId
                );
            },
            [
                getOtherConversationMember,
            ]
        );

    // ============================================================
    // ACCEPT CALL
    // ============================================================

    const acceptIncomingCall =
        useCallback(
            async () => {
                setCallError(null);

                return callManager.acceptCall();
            },
            []
        );

    // ============================================================
    // REJECT CALL
    // ============================================================

    const rejectIncomingCall =
        useCallback(
            (
                reason = "rejected"
            ) => {
                console.log(
                    "📞 Rejecting incoming call"
                );

                // IMPORTANT:
                // The receiver is dismissing the incoming
                // call. The receiver must NOT show
                // "Call declined".
                callStateRef.current =
                    "idle";

                setCallState(
                    "idle"
                );

                setIncomingCall(
                    null
                );

                setCallError(
                    null
                );

                callManager.rejectCall(
                    reason
                );
            },
            []
        );

    // ============================================================
    // END CALL
    // ============================================================

    const endCurrentCall =
        useCallback(
            (
                reason = "ended"
            ) => {
                callManager.endCall(
                    reason
                );
            },
            []
        );

    // ============================================================
    // TOGGLE MUTE
    // ============================================================

    const toggleCallMute =
        useCallback(
            () => {
                return callManager.toggleMute();
            },
            []
        );

    // ============================================================
    // TOGGLE CAMERA
    // ============================================================

    const toggleCallCamera =
        useCallback(
            () => {
                return callManager.toggleCamera();
            },
            []
        );

    // ============================================================
    // BACK TO CONVERSATIONS
    // ============================================================

    const handleBackToConversations =
        useCallback(
            () => {
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
            },
            []
        );

    // ============================================================
    // OPEN INITIAL CONVERSATION
    // ============================================================

    useEffect(() => {
        if (
            initialConversationOpenedRef.current
        ) {
            return;
        }

        if (
            !initialConversationId
        ) {
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
                    Number(
                        item.id
                    ) ===
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
                Number(
                    active.id
                ) ===
                    conversationId;

            setMessages(
                (previous) => {
                    const existing =
                        previous.find(
                            (item) =>
                                Number(
                                    item.id
                                ) ===
                                Number(
                                    message.id
                                )
                        );

                    if (existing) {
                        return previous.map(
                            (item) =>
                                Number(
                                    item.id
                                ) ===
                                Number(
                                    message.id
                                )
                                    ? {
                                          ...item,
                                          ...message,
                                          pending:
                                              false,
                                          sending:
                                              false,
                                          failed:
                                              false,
                                      }
                                    : item
                        );
                    }

                    if (
                        Number(
                            message.senderId
                        ) ===
                        currentUserId
                    ) {
                        const optimisticIndex =
                            previous.findIndex(
                                (item) =>
                                    item?.pending ===
                                        true &&
                                    Number(
                                        item.senderId
                                    ) ===
                                        currentUserId &&
                                    Number(
                                        item.conversationId
                                    ) ===
                                        conversationId &&
                                    String(
                                        item.content ||
                                            ""
                                    ) ===
                                        String(
                                            message.content ||
                                                ""
                                        ) &&
                                    Math.abs(
                                        new Date(
                                            message.createdAt
                                        ).getTime() -
                                            new Date(
                                                item.createdAt
                                            ).getTime()
                                    ) <
                                        30000
                            );

                        if (
                            optimisticIndex !==
                            -1
                        ) {
                            const updated = [
                                ...previous,
                            ];

                            updated[
                                optimisticIndex
                            ] = {
                                ...message,
                                pending:
                                    false,
                                sending:
                                    false,
                                failed:
                                    false,
                            };

                            return updated;
                        }
                    }

                    if (
                        !isActiveConversation
                    ) {
                        return previous;
                    }

                    return [
                        ...previous,
                        message,
                    ];
                }
            );

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
                isActiveConversation &&
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

                            const existing =
                                receipts.find(
                                    (item) =>
                                        Number(
                                            item.userId
                                        ) ===
                                        Number(
                                            receipt.userId
                                        )
                                );

                            if (existing) {
                                return {
                                    ...message,

                                    receipts:
                                        receipts.map(
                                            (item) =>
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

        // ========================================================
        // MESSAGE UPDATED
        // ========================================================

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

        // ========================================================
        // MESSAGE DELETED
        // ========================================================

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

        // ========================================================
        // REACTION ADDED
        // ========================================================

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

                            if (exists) {
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

        // ========================================================
        // REACTION REMOVED
        // ========================================================

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

        // ========================================================
        // USER TYPING
        // ========================================================

        const onUserTyping = ({
            userId,
            username,
            conversationId,
        }) => {
            const id =
                Number(userId);

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
                Number(
                    active.id
                ) !==
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

        // ========================================================
        // USER STOPPED TYPING
        // ========================================================

        const onUserStoppedTyping = ({
            userId,
            conversationId,
        }) => {
            const id =
                Number(userId);

            const active =
                activeConversationRef.current;

            if (
                !active ||
                Number(
                    active.id
                ) !==
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

        // ========================================================
        // REGISTER
        // ========================================================

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

        // ========================================================
        // CLEANUP
        // ========================================================

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

    const sendMessage =
        async (messageData) => {
            if (!messageData) {
                return;
            }

            const active =
                activeConversationRef.current;

            if (!active) {
                return;
            }

            if (
                !socket.connected
            ) {
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

            // ====================================================
            // TEXT MESSAGE
            // ====================================================

            if (!file) {
                const optimisticMessage =
                    createOptimisticMessage({
                        conversationId:
                            active.id,

                        currentUser,

                        currentUserId,

                        content:
                            trimmedContent,

                        type:
                            "TEXT",
                    });

                setMessages(
                    (previous) => [
                        ...previous,
                        optimisticMessage,
                    ]
                );

                setConversations(
                    (previous) =>
                        updateConversationPreview(
                            previous,
                            optimisticMessage,
                            currentUserId,
                            active.id
                        )
                );

                socket.emit(
                    "send_message",
                    {
                        conversationId:
                            active.id,

                        content:
                            trimmedContent,

                        type:
                            "TEXT",
                    },
                    (response) => {
                        if (
                            !response?.success
                        ) {
                            console.error(
                                "❌ SEND MESSAGE:",
                                response?.message
                            );

                            setMessages(
                                (previous) =>
                                    previous.map(
                                        (
                                            message
                                        ) =>
                                            message.id ===
                                            optimisticMessage.id
                                                ? {
                                                      ...message,
                                                      pending:
                                                          false,
                                                      sending:
                                                          false,
                                                      failed:
                                                          true,
                                                  }
                                                : message
                                    )
                            );

                            return;
                        }

                        const serverMessage =
                            response?.message ||
                            response?.data
                                ?.message ||
                            response?.data;

                        if (
                            !serverMessage?.id
                        ) {
                            return;
                        }

                        setMessages(
                            (previous) =>
                                previous.map(
                                    (
                                        message
                                    ) =>
                                        message.id ===
                                        optimisticMessage.id
                                            ? {
                                                  ...serverMessage,
                                                  pending:
                                                      false,
                                                  sending:
                                                      false,
                                                  failed:
                                                      false,
                                              }
                                            : message
                                )
                        );

                        setConversations(
                            (previous) =>
                                updateConversationPreview(
                                    previous,
                                    serverMessage,
                                    currentUserId,
                                    active.id
                                )
                        );
                    }
                );

                return;
            }

            // ====================================================
            // FILE MESSAGE
            // ====================================================

            const optimisticFileMessage =
                createOptimisticMessage({
                    conversationId:
                        active.id,

                    currentUser,

                    currentUserId,

                    content:
                        trimmedContent,

                    type,

                    file,
                });

            setMessages(
                (previous) => [
                    ...previous,
                    optimisticFileMessage,
                ]
            );

            setConversations(
                (previous) =>
                    updateConversationPreview(
                        previous,
                        optimisticFileMessage,
                        currentUserId,
                        active.id
                    )
            );

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
                            method:
                                "POST",

                            credentials:
                                "include",

                            body:
                                formData,
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
                        "❌ FILE UPLOAD returned invalid JSON."
                    );

                    setMessages(
                        (previous) =>
                            previous.map(
                                (
                                    message
                                ) =>
                                    message.id ===
                                    optimisticFileMessage.id
                                        ? {
                                              ...message,
                                              pending:
                                                  false,
                                              sending:
                                                  false,
                                              failed:
                                                  true,
                                          }
                                        : message
                            )
                    );

                    return;
                }

                if (
                    !uploadResponse.ok ||
                    !uploadData?.success
                ) {
                    console.error(
                        "❌ FILE UPLOAD:",
                        uploadData?.message ||
                            `HTTP ${uploadResponse.status}`
                    );

                    setMessages(
                        (previous) =>
                            previous.map(
                                (
                                    message
                                ) =>
                                    message.id ===
                                    optimisticFileMessage.id
                                        ? {
                                              ...message,
                                              pending:
                                                  false,
                                              sending:
                                                  false,
                                              failed:
                                                  true,
                                          }
                                        : message
                            )
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

                if (
                    !attachmentUrl
                ) {
                    console.error(
                        "❌ FILE UPLOAD succeeded but no URL was returned."
                    );

                    setMessages(
                        (previous) =>
                            previous.map(
                                (
                                    message
                                ) =>
                                    message.id ===
                                    optimisticFileMessage.id
                                        ? {
                                              ...message,
                                              pending:
                                                  false,
                                              sending:
                                                  false,
                                              failed:
                                                  true,
                                          }
                                        : message
                            )
                    );

                    return;
                }

                setMessages(
                    (previous) =>
                        previous.map(
                            (
                                message
                            ) =>
                                message.id ===
                                optimisticFileMessage.id
                                    ? {
                                          ...message,
                                          attachmentUrl,
                                          attachmentName:
                                              uploadedName,
                                          attachmentSize:
                                              uploadedSize,
                                          attachmentMimeType:
                                              uploadedMimeType,
                                          type:
                                              uploadedType,
                                      }
                                    : message
                        )
                );

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

                            setMessages(
                                (previous) =>
                                    previous.map(
                                        (
                                            message
                                        ) =>
                                            message.id ===
                                            optimisticFileMessage.id
                                                ? {
                                                      ...message,
                                                      pending:
                                                          false,
                                                      sending:
                                                          false,
                                                      failed:
                                                          true,
                                                  }
                                                : message
                                    )
                            );

                            return;
                        }

                        const serverMessage =
                            response?.message ||
                            response?.data
                                ?.message ||
                            response?.data;

                        if (
                            !serverMessage?.id
                        ) {
                            return;
                        }

                        setMessages(
                            (previous) =>
                                previous.map(
                                    (
                                        message
                                    ) =>
                                        message.id ===
                                        optimisticFileMessage.id
                                            ? {
                                                  ...serverMessage,
                                                  pending:
                                                      false,
                                                  sending:
                                                      false,
                                                  failed:
                                                      false,
                                              }
                                            : message
                                )
                        );

                        setConversations(
                            (previous) =>
                                updateConversationPreview(
                                    previous,
                                    serverMessage,
                                    currentUserId,
                                    active.id
                                )
                        );
                    }
                );
            } catch (error) {
                console.error(
                    "❌ FILE UPLOAD ERROR:",
                    error
                );

                setMessages(
                    (previous) =>
                        previous.map(
                            (
                                message
                            ) =>
                                message.id ===
                                optimisticFileMessage.id
                                    ? {
                                          ...message,
                                          pending:
                                              false,
                                          sending:
                                              false,
                                          failed:
                                              true,
                                      }
                                    : message
                        )
                );
            }
        };

    // ============================================================
    // START TYPING
    // ============================================================

    const startTyping =
        () => {
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

    const stopTyping =
        () => {
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

    const editMessage =
        (message) => {
            if (!message) {
                return;
            }

            if (
                Number(
                    message.senderId
                ) !==
                currentUserId
            ) {
                return;
            }

            if (
                message.deletedAt
            ) {
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

            if (
                !socket.connected
            ) {
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

    const deleteMessage =
        (message) => {
            if (!message) {
                return;
            }

            if (
                Number(
                    message.senderId
                ) !==
                currentUserId
            ) {
                return;
            }

            if (
                message.deletedAt
            ) {
                return;
            }

            const confirmed =
                window.confirm(
                    "Delete message?"
                );

            if (!confirmed) {
                return;
            }

            if (
                !socket.connected
            ) {
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

    const toggleReaction =
        (
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
        <div className="relative flex h-full w-full overflow-hidden bg-[#111b21] text-white">

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

                    selectedTheme={
                        chatThemes[
                            Number(
                                activeConversation?.id
                            )
                        ] ||
                        activeConversation?.theme ||
                        "default"
                    }

                    onSelectTheme={
                        handleSelectTheme
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

                    onStartAudioCall={
                        startAudioCall
                    }

                    onStartVideoCall={
                        startVideoCall
                    }
                    onOpenGame={(game) => setActiveGame(game)}
                />
            </main>

            {/* ==================================================
                CALL OVERLAY

                IMPORTANT:
                This is intentionally OUTSIDE ChatWindow.

                CallOverlay uses:
                    fixed inset-0 z-[100]

                Therefore it can cover the entire ChatHub UI.
            ================================================== */}

            <CallOverlay
                callState={
                    callState
                }

                callType={
                    callType
                }

                incomingCall={
                    incomingCall
                }

                currentUser={
                    currentUser
                }

                activeConversation={
                    activeConversation
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

                onCallDismiss={
                    dismissCallOverlay
                }
            />
            <GameOverlay
    game={activeGame}
    currentUser={currentUser}
    onClose={() => setActiveGame(null)}
/>
        </div>
    );
}