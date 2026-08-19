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

    const [conversations, setConversations] = useState(
        initialConversations || []
    );

    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [socketConnected, setSocketConnected] = useState(socket.connected);
    const [activeGame, setActiveGame] = useState(null);

    // ========================================================
    // CHAT THEME
    // ========================================================

    const [chatThemes, setChatThemes] = useState({});

    // ========================================================
    // MOBILE
    // ========================================================

    const [mobileChatOpen, setMobileChatOpen] = useState(false);

    // ========================================================
    // CALL STATE
    // ========================================================

    const [callState, setCallState] = useState("idle");
    const [callType, setCallType] = useState("audio");
    const [incomingCall, setIncomingCall] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callError, setCallError] = useState(null);

    // ========================================================
    // REFS
    // ========================================================

    const typingTimeoutRef = useRef(null);
    const initialConversationOpenedRef = useRef(false);
    const activeConversationRef = useRef(null);
    const conversationsRef = useRef(initialConversations || []);
    const callStateRef = useRef("idle");

    const currentUserId = Number(currentUser?.id);

    // ========================================================
    // KEEP REFS UPDATED
    // ========================================================

    useEffect(() => {
        activeConversationRef.current = activeConversation;
    }, [activeConversation]);

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    // ========================================================
    // GAME INVITATION LISTENERS & SOCKET EMISSION
    // ========================================================

    useEffect(() => {
        // 1. Listen for local window dispatch from ChatWindow when creator starts game
        const handleLocalGameCreated = (event) => {
            const game = event.detail?.game || event.detail;
            if (!game?.id) return;

            console.log("🎮 Local Game Created Event Detected:", game);

            // Emit to socket server so receiver gets notified
            socket.emit("game_created", { game }, (response) => {
                if (response?.success) {
                    console.log("✅ Game creation broadcasted via Socket.IO");
                } else {
                    console.error("❌ Failed to broadcast game:", response?.message);
                }
            });

            // Set state for creator
            setActiveGame({
                ...game,
                isCreator: true,
                isReceiver: false,
            });
        };

        // 2. Listen for socket event from server (for Receiver)
        const handleServerGameCreated = (game) => {
            if (!game?.id) return;

            const creatorId = Number(game.createdBy);
            const myId = Number(currentUserId);

            console.log("🎮 Socket Game Created Event Received:", {
                game,
                creatorId,
                myId,
                isCreator: creatorId === myId,
            });

            if (creatorId === myId) {
                setActiveGame({
                    ...game,
                    isCreator: true,
                    isReceiver: false,
                });
            } else {
                setActiveGame({
                    ...game,
                    isCreator: false,
                    isReceiver: true,
                });
            }
        };

        // Event listeners
        window.addEventListener("chathub:game-created", handleLocalGameCreated);
        socket.on("game_created", handleServerGameCreated);

        return () => {
            window.removeEventListener("chathub:game-created", handleLocalGameCreated);
            socket.off("game_created", handleServerGameCreated);
        };
    }, [currentUserId]);

    // ========================================================
    // KEEP GAME UPDATED ON GAME EVENTS
    // ========================================================

    useEffect(() => {
        const handleGameUpdated = (game) => {
            if (!game?.id) return;

            setActiveGame((previous) => {
                if (!previous || Number(previous.id) !== Number(game.id)) {
                    return previous;
                }

                return {
                    ...previous,
                    ...game,
                };
            });
        };

        const handleGameCancelled = (game) => {
            setActiveGame((previous) => {
                if (previous && Number(previous.id) === Number(game?.id)) {
                    return null;
                }
                return previous;
            });
        };

        socket.on("game_updated", handleGameUpdated);
        socket.on("game_cancelled", handleGameCancelled);
        socket.on("game_finished", handleGameUpdated);

        return () => {
            socket.off("game_updated", handleGameUpdated);
            socket.off("game_cancelled", handleGameCancelled);
            socket.off("game_finished", handleGameUpdated);
        };
    }, []);

    // ========================================================
    // LOAD SAVED CHAT THEMES
    // ========================================================

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(
                "chathub:conversation-themes"
            );

            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === "object") {
                    setChatThemes(parsed);
                }
            }
        } catch (error) {
            console.error("❌ Failed to load chat themes:", error);
        }
    }, []);

    // ========================================================
    // SELECT CHAT THEME
    // ========================================================

    const handleSelectTheme = useCallback((themeId) => {
        const conversationId = Number(activeConversationRef.current?.id);

        if (!Number.isInteger(conversationId) || !themeId) {
            return;
        }

        setChatThemes((previous) => {
            const updated = {
                ...previous,
                [conversationId]: themeId,
            };

            try {
                window.localStorage.setItem(
                    "chathub:conversation-themes",
                    JSON.stringify(updated)
                );
            } catch (error) {
                console.error("❌ Failed to save chat theme:", error);
            }

            return updated;
        });
    }, []);

    // ========================================================
    // KEEP THEME AVAILABLE
    // ========================================================

    useEffect(() => {
        const conversationId = Number(activeConversation?.id);

        if (!Number.isInteger(conversationId)) {
            return;
        }

        const theme =
            chatThemes[conversationId] ||
            activeConversation?.theme ||
            "default";

        setActiveConversation((previous) => {
            if (!previous || Number(previous.id) !== conversationId) {
                return previous;
            }

            if (previous.theme === theme) {
                return previous;
            }

            return {
                ...previous,
                theme,
            };
        });

        setConversations((previous) =>
            previous.map((conversation) =>
                Number(conversation.id) === conversationId
                    ? {
                          ...conversation,
                          theme,
                      }
                    : conversation
            )
        );
    }, [chatThemes, activeConversation?.id]);

    // ============================================================
    // SOCKET CONNECTION
    // ============================================================

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        const onConnect = () => {
            console.log("🟢 Chat socket connected:", socket.id);
            setSocketConnected(true);
        };

        const onDisconnect = () => {
            console.log("🔴 Chat socket disconnected");
            setSocketConnected(false);
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
        };
    }, []);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
            <ChatSideBar
                conversations={conversations}
                activeConversation={activeConversation}
                setActiveConversation={setActiveConversation}
                onlineUsers={onlineUsers}
                currentUser={currentUser}
                mobileChatOpen={mobileChatOpen}
                setMobileChatOpen={setMobileChatOpen}
            />

            <ChatWindow
                activeConversation={activeConversation}
                messages={messages}
                setMessages={setMessages}
                currentUser={currentUser}
                loadingMessages={loadingMessages}
                typingUsers={typingUsers}
                handleSelectTheme={handleSelectTheme}
                mobileChatOpen={mobileChatOpen}
                setMobileChatOpen={setMobileChatOpen}
            />

            {callState !== "idle" && (
                <CallOverlay
                    callState={callState}
                    callType={callType}
                    incomingCall={incomingCall}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    isMuted={isMuted}
                    isCameraOff={isCameraOff}
                    callError={callError}
                    setCallState={setCallState}
                />
            )}

            {activeGame && (
                <GameOverlay
                    game={activeGame}
                    currentUser={currentUser}
                    onClose={() => setActiveGame(null)}
                />
            )}
        </div>
    );
}