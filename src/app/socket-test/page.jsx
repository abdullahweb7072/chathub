"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { socket } from "@/lib/socket";

// ==========================================
// CONFIGURATION
// ==========================================

const CONVERSATION_ID = 1;

const AVAILABLE_REACTIONS = [
  "❤️",
  "👍",
  "😂",
  "😮",
  "😢",
  "😡",
];

export default function SocketTest() {
  // ========================================
  // AUTH
  // ========================================

  const [email, setEmail] = useState(
    "abdullah@example.com"
  );

  const [password, setPassword] =
    useState("");

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  // ========================================
  // IMPORTANT
  // REAL LOGGED-IN USER ID
  // ========================================

  const [currentUserId, setCurrentUserId] =
    useState(null);

  // Ref because socket event handlers
  // should always have the latest user ID.
  const currentUserIdRef =
    useRef(null);

  // ========================================
  // CURRENT USER
  // ========================================

  const [currentUser, setCurrentUser] =
    useState(null);

  // ========================================
  // CHAT
  // ========================================

  const [messages, setMessages] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [status, setStatus] =
    useState("Disconnected");

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  // ========================================
  // PRESENCE
  // ========================================

  const [onlineUsers, setOnlineUsers] =
    useState([]);

  const [userPresence, setUserPresence] =
    useState({});

  // ========================================
  // TYPING
  // ========================================

  const [typingUsers, setTypingUsers] =
    useState([]);

  const isTypingRef =
    useRef(false);

  const typingTimeoutRef =
    useRef(null);

  // ========================================
  // LOAD MESSAGES
  // ========================================

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);

      const response = await fetch(
        `/api/conversations/${CONVERSATION_ID}/messages`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data =
        await response.json();

      console.log(
        "📚 PREVIOUS MESSAGES:",
        data
      );

      if (!response.ok) {
        setStatus(
          data.message ||
            "Failed to load messages"
        );

        return;
      }

      setMessages(
        data.messages || []
      );
    } catch (error) {
      console.error(
        "❌ LOAD MESSAGES ERROR:",
        error
      );

      setStatus(
        "Failed to load messages"
      );
    } finally {
      setLoadingMessages(false);
    }
  };

  // ========================================
  // LOGIN
  // ========================================

  const login = async () => {
    try {
      setStatus("Logging in...");

      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "LOGIN RESPONSE:",
        data
      );

      if (!response.ok) {
        setStatus(
          data.message ||
            "Login failed"
        );

        return;
      }

      // ====================================
      // GET REAL AUTHENTICATED USER
      // ====================================

      const loggedInUser =
        data.user ||
        data.data?.user ||
        null;

      const loggedInUserId =
        Number(loggedInUser?.id);

      if (
        !Number.isInteger(
          loggedInUserId
        ) ||
        loggedInUserId <= 0
      ) {
        console.error(
          "❌ Login response does not contain a valid user ID:",
          data
        );

        setStatus(
          "Login succeeded, but user ID was not returned by the API."
        );

        return;
      }

      // ====================================
      // STORE REAL USER ID
      // ====================================

      currentUserIdRef.current =
        loggedInUserId;

      setCurrentUserId(
        loggedInUserId
      );

      setCurrentUser(
        loggedInUser
      );

      setIsLoggedIn(true);

      setStatus(
        `Logged in as User ${loggedInUserId}`
      );

      console.log(
        "✅ CURRENT AUTHENTICATED USER:",
        loggedInUserId
      );

      // ====================================
      // LOAD OLD MESSAGES
      // ====================================

      await loadMessages();

      // ====================================
      // CONNECT SOCKET
      // ====================================

      if (!socket.connected) {
        socket.connect();
      } else {
        console.log(
          "🔌 Socket already connected:",
          socket.id
        );

        setTimeout(() => {
          markMessagesRead();
        }, 300);
      }
    } catch (error) {
      console.error(
        "❌ LOGIN ERROR:",
        error
      );

      setStatus(
        "Something went wrong"
      );
    }
  };

  // ========================================
  // STOP TYPING
  // ========================================

  const stopTyping = () => {
    if (!socket.connected) {
      return;
    }

    if (!isTypingRef.current) {
      return;
    }

    socket.emit(
      "typing_stop",
      {
        conversationId:
          CONVERSATION_ID,
      }
    );

    isTypingRef.current = false;
  };

  // ========================================
  // HANDLE TYPING
  // ========================================

  const handleTyping = (e) => {
    const value =
      e.target.value;

    setMessage(value);

    if (!socket.connected) {
      return;
    }

    if (
      typingTimeoutRef.current
    ) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    if (!value.trim()) {
      stopTyping();
      return;
    }

    if (!isTypingRef.current) {
      socket.emit(
        "typing_start",
        {
          conversationId:
            CONVERSATION_ID,
        }
      );

      isTypingRef.current = true;
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        stopTyping();
      }, 1000);
  };

  // ========================================
  // MARK CONVERSATION READ
  // ========================================

  const markMessagesRead = () => {
    if (!socket.connected) {
      console.log(
        "⚠️ Cannot mark read: socket disconnected"
      );

      return;
    }

    const userId =
      Number(
        currentUserIdRef.current
      );

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      console.log(
        "⚠️ Cannot mark read: current user ID unavailable"
      );

      return;
    }

    console.log(
      `👀 User ${userId} marking conversation ${CONVERSATION_ID} as read`
    );

    socket.emit(
      "mark_messages_read",
      {
        conversationId:
          CONVERSATION_ID,
      },
      (response) => {
        console.log(
          "👀 READ RESPONSE:",
          response
        );
      }
    );
  };

  // ========================================
  // SOCKET EVENTS
  // ========================================

  useEffect(() => {
    // ======================================
    // CONNECT
    // ======================================

    const handleConnect =
      () => {
        console.log(
          "🔌 Socket connected:",
          socket.id
        );

        const userId =
          Number(
            currentUserIdRef.current
          );

        setStatus(
          `Socket connected as User ${userId}: ${socket.id}`
        );

        // ==================================
        // Mark conversation as read
        // after socket connection.
        // ==================================

        setTimeout(() => {
          markMessagesRead();
        }, 300);
      };

    // ======================================
    // CONNECTION ERROR
    // ======================================

    const handleConnectError =
      (error) => {
        console.error(
          "❌ Socket connection error:",
          error.message
        );

        setStatus(
          `Socket error: ${error.message}`
        );
      };

    // ======================================
    // DISCONNECT
    // ======================================

    const handleDisconnect =
      (reason) => {
        console.log(
          "🔌 Socket disconnected:",
          reason
        );

        setStatus(
          `Disconnected: ${reason}`
        );

        isTypingRef.current =
          false;

        if (
          typingTimeoutRef.current
        ) {
          clearTimeout(
            typingTimeoutRef.current
          );

          typingTimeoutRef.current =
            null;
        }

        setTypingUsers([]);

        const loggedInUserId =
          Number(
            currentUserIdRef.current
          );

        setOnlineUsers(
          (previous) =>
            previous.filter(
              (id) =>
                Number(id) !==
                loggedInUserId
            )
        );

        setUserPresence(
          (previous) => ({
            ...previous,

            [loggedInUserId]: {
              isOnline: false,

              lastSeen:
                previous[
                  loggedInUserId
                ]?.lastSeen ||
                null,
            },
          })
        );
      };

    // ======================================
    // PRESENCE STATE
    // ======================================

    const handlePresenceState =
      (data) => {
        const users =
          data?.users || [];

        const numericUsers =
          users.map((id) =>
            Number(id)
          );

        console.log(
          "🟢 PRESENCE STATE:",
          numericUsers
        );

        setOnlineUsers(
          numericUsers
        );

        setUserPresence(
          (previous) => {
            const updated = {
              ...previous,
            };

            numericUsers.forEach(
              (userId) => {
                updated[userId] = {
                  isOnline: true,
                  lastSeen: null,
                };
              }
            );

            return updated;
          }
        );
      };

    // ======================================
    // USER ONLINE
    // ======================================

    const handleUserOnline =
      ({ userId }) => {
        const numericUserId =
          Number(userId);

        setOnlineUsers(
          (previous) => {
            if (
              previous.some(
                (id) =>
                  Number(id) ===
                  numericUserId
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              numericUserId,
            ];
          }
        );

        setUserPresence(
          (previous) => ({
            ...previous,

            [numericUserId]: {
              isOnline: true,
              lastSeen: null,
            },
          })
        );
      };

    // ======================================
    // USER OFFLINE
    // ======================================

    const handleUserOffline =
      ({
        userId,
        lastSeen,
      }) => {
        const numericUserId =
          Number(userId);

        setOnlineUsers(
          (previous) =>
            previous.filter(
              (id) =>
                Number(id) !==
                numericUserId
            )
        );

        setUserPresence(
          (previous) => ({
            ...previous,

            [numericUserId]: {
              isOnline: false,
              lastSeen,
            },
          })
        );

        setTypingUsers(
          (previous) =>
            previous.filter(
              (user) =>
                Number(
                  user.userId
                ) !==
                numericUserId
            )
        );
      };

    // ======================================
    // NEW MESSAGE
    // ======================================

    const handleNewMessage =
      (newMessage) => {
        console.log(
          "📩 NEW MESSAGE:",
          newMessage
        );

        if (
          Number(
            newMessage.conversationId
          ) !==
          Number(
            CONVERSATION_ID
          )
        ) {
          return;
        }

        setMessages(
          (previous) => {
            const exists =
              previous.some(
                (msg) =>
                  Number(msg.id) ===
                  Number(
                    newMessage.id
                  )
              );

            if (exists) {
              return previous;
            }

            return [
              ...previous,
              newMessage,
            ];
          }
        );

        // =================================
        // REAL CURRENT USER
        // =================================

        const loggedInUserId =
          Number(
            currentUserIdRef.current
          );

        // =================================
        // IMPORTANT:
        // If the sender is NOT us,
        // we are the recipient.
        // =================================

        if (
          Number(
            newMessage.senderId
          ) !== loggedInUserId
        ) {
          console.log(
            `📬 User ${loggedInUserId} received message ${newMessage.id}`
          );

          // -------------------------------
          // DELIVERY
          // -------------------------------

          socket.emit(
            "message_delivered",
            {
              messageId:
                newMessage.id,
            },
            (response) => {
              console.log(
                "📬 DELIVERY RESPONSE:",
                response
              );
            }
          );

          // -------------------------------
          // READ
          // -------------------------------

          setTimeout(() => {
            markMessagesRead();
          }, 200);
        }
      };

    // ======================================
    // RECEIPT UPDATED
    // ======================================

    const handleReceiptUpdated =
      (receipt) => {
        console.log(
          "✓ RECEIPT UPDATED:",
          receipt
        );

        setMessages(
          (previous) =>
            previous.map(
              (msg) => {
                if (
                  Number(msg.id) !==
                  Number(
                    receipt.messageId
                  )
                ) {
                  return msg;
                }

                const existingReceipts =
                  msg.receipts ||
                  [];

                const existingIndex =
                  existingReceipts.findIndex(
                    (item) =>
                      Number(
                        item.userId
                      ) ===
                      Number(
                        receipt.userId
                      )
                  );

                // -------------------------
                // Receipt doesn't exist
                // -------------------------

                if (
                  existingIndex === -1
                ) {
                  return {
                    ...msg,

                    receipts: [
                      ...existingReceipts,
                      receipt,
                    ],
                  };
                }

                // -------------------------
                // Update existing receipt
                // -------------------------

                return {
                  ...msg,

                  receipts:
                    existingReceipts.map(
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
            )
        );
      };

    // ======================================
    // MESSAGE UPDATED
    // ======================================

    const handleMessageUpdated =
      (updatedMessage) => {
        setMessages(
          (previous) =>
            previous.map(
              (msg) =>
                Number(msg.id) ===
                Number(
                  updatedMessage.id
                )
                  ? updatedMessage
                  : msg
            )
        );
      };

    // ======================================
    // MESSAGE DELETED
    // ======================================

    const handleMessageDeleted =
      (deletedMessage) => {
        setMessages(
          (previous) =>
            previous.map(
              (msg) =>
                Number(msg.id) ===
                Number(
                  deletedMessage.id
                )
                  ? {
                      ...msg,

                      deletedAt:
                        deletedMessage.deletedAt,

                      content:
                        "This message was deleted",
                    }
                  : msg
            )
        );
      };

    // ======================================
    // REACTION ADDED
    // ======================================

    const handleReactionAdded =
      (reaction) => {
        setMessages(
          (previous) =>
            previous.map(
              (msg) => {
                if (
                  Number(msg.id) !==
                  Number(
                    reaction.messageId
                  )
                ) {
                  return msg;
                }

                const reactions =
                  msg.reactions ||
                  [];

                if (
                  reactions.some(
                    (item) =>
                      Number(
                        item.id
                      ) ===
                      Number(
                        reaction.id
                      )
                  )
                ) {
                  return msg;
                }

                return {
                  ...msg,

                  reactions: [
                    ...reactions,
                    reaction,
                  ],
                };
              }
            )
        );
      };

    // ======================================
    // REACTION REMOVED
    // ======================================

    const handleReactionRemoved =
      (reaction) => {
        setMessages(
          (previous) =>
            previous.map(
              (msg) =>
                Number(msg.id) ===
                Number(
                  reaction.messageId
                )
                  ? {
                      ...msg,

                      reactions: (
                        msg.reactions ||
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
                  : msg
            )
        );
      };

    // ======================================
    // USER TYPING
    // ======================================

    const handleUserTyping =
      ({
        userId,
        username,
        conversationId,
      }) => {
        const numericUserId =
          Number(userId);

        const loggedInUserId =
          Number(
            currentUserIdRef.current
          );

        if (
          Number(
            conversationId
          ) !==
          Number(
            CONVERSATION_ID
          )
        ) {
          return;
        }

        // Don't show ourselves typing.
        if (
          numericUserId ===
          loggedInUserId
        ) {
          return;
        }

        setTypingUsers(
          (previous) => {
            if (
              previous.some(
                (user) =>
                  Number(
                    user.userId
                  ) ===
                  numericUserId
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              {
                userId:
                  numericUserId,

                username:
                  username ||
                  `User ${numericUserId}`,
              },
            ];
          }
        );
      };

    // ======================================
    // USER STOPPED TYPING
    // ======================================

    const handleUserStoppedTyping =
      ({
        userId,
        conversationId,
      }) => {
        const numericUserId =
          Number(userId);

        if (
          Number(
            conversationId
          ) !==
          Number(
            CONVERSATION_ID
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
                ) !==
                numericUserId
            )
        );
      };

    // ======================================
    // CONVERSATION READ
    // ======================================

    const handleConversationRead =
      ({
        userId,
        conversationId,
        lastReadAt,
      }) => {
        console.log(
          "👀 CONVERSATION READ:",
          {
            userId,
            conversationId,
            lastReadAt,
          }
        );
      };

    // ======================================
    // REGISTER EVENTS
    // ======================================

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "connect_error",
      handleConnectError
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "presence_state",
      handlePresenceState
    );

    socket.on(
      "user_online",
      handleUserOnline
    );

    socket.on(
      "user_offline",
      handleUserOffline
    );

    socket.on(
      "new_message",
      handleNewMessage
    );

    socket.on(
      "message_receipt_updated",
      handleReceiptUpdated
    );

    socket.on(
      "message_updated",
      handleMessageUpdated
    );

    socket.on(
      "message_deleted",
      handleMessageDeleted
    );

    socket.on(
      "message_reaction_added",
      handleReactionAdded
    );

    socket.on(
      "message_reaction_removed",
      handleReactionRemoved
    );

    socket.on(
      "user_typing",
      handleUserTyping
    );

    socket.on(
      "user_stopped_typing",
      handleUserStoppedTyping
    );

    socket.on(
      "conversation_read",
      handleConversationRead
    );

    // ======================================
    // CLEANUP
    // ======================================

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "connect_error",
        handleConnectError
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "presence_state",
        handlePresenceState
      );

      socket.off(
        "user_online",
        handleUserOnline
      );

      socket.off(
        "user_offline",
        handleUserOffline
      );

      socket.off(
        "new_message",
        handleNewMessage
      );

      socket.off(
        "message_receipt_updated",
        handleReceiptUpdated
      );

      socket.off(
        "message_updated",
        handleMessageUpdated
      );

      socket.off(
        "message_deleted",
        handleMessageDeleted
      );

      socket.off(
        "message_reaction_added",
        handleReactionAdded
      );

      socket.off(
        "message_reaction_removed",
        handleReactionRemoved
      );

      socket.off(
        "user_typing",
        handleUserTyping
      );

      socket.off(
        "user_stopped_typing",
        handleUserStoppedTyping
      );

      socket.off(
        "conversation_read",
        handleConversationRead
      );

      if (
        typingTimeoutRef.current
      ) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }
    };
  }, []);

  // ========================================
  // SEND MESSAGE
  // ========================================

  const sendMessage = () => {
    if (!message.trim()) {
      return;
    }

    if (!socket.connected) {
      setStatus(
        "Socket is not connected"
      );

      return;
    }

    const loggedInUserId =
      Number(
        currentUserIdRef.current
      );

    if (
      !Number.isInteger(
        loggedInUserId
      ) ||
      loggedInUserId <= 0
    ) {
      setStatus(
        "Current user is not available"
      );

      return;
    }

    if (
      typingTimeoutRef.current
    ) {
      clearTimeout(
        typingTimeoutRef.current
      );

      typingTimeoutRef.current =
        null;
    }

    stopTyping();

    const messageToSend =
      message.trim();

    socket.emit(
      "send_message",
      {
        conversationId:
          CONVERSATION_ID,

        content:
          messageToSend,

        type: "TEXT",
      },
      (response) => {
        console.log(
          "📨 SEND RESPONSE:",
          response
        );

        if (
          !response?.success
        ) {
          setStatus(
            response?.message ||
              "Message failed"
          );

          return;
        }

        setStatus(
          "Message sent ✓"
        );
      }
    );

    setMessage("");
  };

  // ========================================
  // EDIT MESSAGE
  // ========================================

  const editMessage = (
    msg
  ) => {
    const loggedInUserId =
      Number(
        currentUserIdRef.current
      );

    if (
      Number(msg.senderId) !==
      loggedInUserId
    ) {
      return;
    }

    if (msg.deletedAt) {
      return;
    }

    const newContent =
      window.prompt(
        "Edit message:",
        msg.content
      );

    if (
      newContent === null
    ) {
      return;
    }

    if (
      !newContent.trim()
    ) {
      alert(
        "Message cannot be empty."
      );

      return;
    }

    socket.emit(
      "edit_message",
      {
        messageId:
          msg.id,

        content:
          newContent.trim(),
      },
      (response) => {
        if (
          !response?.success
        ) {
          setStatus(
            response?.message ||
              "Failed to edit message"
          );
        }
      }
    );
  };

  // ========================================
  // DELETE MESSAGE
  // ========================================

  const deleteMessage = (
    msg
  ) => {
    const loggedInUserId =
      Number(
        currentUserIdRef.current
      );

    if (
      Number(msg.senderId) !==
      loggedInUserId
    ) {
      return;
    }

    if (msg.deletedAt) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this message?"
      );

    if (!confirmed) {
      return;
    }

    socket.emit(
      "delete_message",
      {
        messageId:
          msg.id,
      },
      (response) => {
        if (
          !response?.success
        ) {
          setStatus(
            response?.message ||
              "Failed to delete message"
          );
        }
      }
    );
  };

  // ========================================
  // REACTION
  // ========================================

  const toggleReaction = (
    msg,
    emoji
  ) => {
    if (
      msg.deletedAt ||
      !socket.connected
    ) {
      return;
    }

    const loggedInUserId =
      Number(
        currentUserIdRef.current
      );

    const reactions =
      msg.reactions || [];

    const existing =
      reactions.find(
        (reaction) =>
          Number(
            reaction.userId
          ) ===
            loggedInUserId &&
          reaction.emoji ===
            emoji
      );

    if (existing) {
      socket.emit(
        "remove_reaction",
        {
          messageId:
            msg.id,

          emoji,
        }
      );

      return;
    }

    socket.emit(
      "add_reaction",
      {
        messageId:
          msg.id,

        emoji,
      }
    );
  };

  // ========================================
  // REACTION COUNT
  // ========================================

  const getReactionCount =
    (
      reactions,
      emoji
    ) => {
      return (
        reactions?.filter(
          (reaction) =>
            reaction.emoji ===
            emoji
        ).length || 0
      );
    };

  // ========================================
  // HAS REACTION
  // ========================================

  const hasUserReaction =
    (
      reactions,
      emoji
    ) => {
      const loggedInUserId =
        Number(
          currentUserIdRef.current
        );

      return (
        reactions?.some(
          (reaction) =>
            Number(
              reaction.userId
            ) ===
              loggedInUserId &&
            reaction.emoji ===
              emoji
        ) || false
      );
    };

  // ========================================
  // PRESENCE
  // ========================================

  const getUserPresence =
    (userId) =>
      userPresence[userId] || {
        isOnline: false,
        lastSeen: null,
      };

  const formatLastSeen =
    (lastSeen) => {
      if (!lastSeen) {
        return "Last seen recently";
      }

      return new Date(
        lastSeen
      ).toLocaleTimeString(
        [],
        {
          hour: "numeric",
          minute: "2-digit",
        }
      );
    };

  // ========================================
  // MESSAGE RECEIPT STATUS
  // ========================================

  const getReceiptStatus =
    (msg) => {
      const loggedInUserId =
        Number(
          currentUserIdRef.current
        );

      // ====================================
      // Only our own messages get ticks
      // ====================================

      if (
        !loggedInUserId ||
        Number(msg.senderId) !==
          loggedInUserId
      ) {
        return null;
      }

      const receipts =
        msg.receipts || [];

      // ====================================
      // No recipient receipts
      // ====================================

      if (
        receipts.length === 0
      ) {
        return "sent";
      }

      // ====================================
      // EVERY RECIPIENT HAS READ
      // ====================================

      const allRead =
        receipts.every(
          (receipt) =>
            Boolean(
              receipt.readAt
            )
        );

      if (allRead) {
        return "read";
      }

      // ====================================
      // AT LEAST ONE DELIVERED
      // ====================================

      const anyDelivered =
        receipts.some(
          (receipt) =>
            Boolean(
              receipt.deliveredAt
            )
        );

      if (anyDelivered) {
        return "delivered";
      }

      // ====================================
      // SENT
      // ====================================

      return "sent";
    };

  // ========================================
  // RECEIPT UI
  // ========================================

  const renderReceipt =
    (msg) => {
      const status =
        getReceiptStatus(msg);

      if (!status) {
        return null;
      }

      // ====================================
      // SINGLE TICK
      // ====================================

      if (
        status === "sent"
      ) {
        return (
          <span
            style={{
              marginLeft: "5px",
              color: "#777",
              fontWeight: "bold",
            }}
            title="Sent"
          >
            ✓
          </span>
        );
      }

      // ====================================
      // DOUBLE GRAY TICK
      // ====================================

      if (
        status === "delivered"
      ) {
        return (
          <span
            style={{
              marginLeft: "5px",
              color: "#777",
              fontWeight: "bold",
            }}
            title="Delivered"
          >
            ✓✓
          </span>
        );
      }

      // ====================================
      // DOUBLE BLUE TICK
      // ====================================

      return (
        <span
          style={{
            marginLeft: "5px",
            color: "#2196f3",
            fontWeight: "bold",
          }}
          title="Read"
        >
          ✓✓
        </span>
      );
    };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "700px",
        margin: "0 auto",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <h1>
        ChatHub Socket Test
      </h1>

      {/* ================================== */}
      {/* STATUS */}
      {/* ================================== */}

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          border:
            "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <strong>
          Status:
        </strong>{" "}
        {status}
      </div>

      {/* ================================== */}
      {/* CURRENT USER */}
      {/* ================================== */}

      {isLoggedIn && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            border:
              "1px solid #ccc",
            borderRadius: "8px",
          }}
        >
          <h3>
            Authenticated User
          </h3>

          <p>
            User ID:{" "}
            <strong>
              {currentUserId}
            </strong>
          </p>

          <p>
            Username:{" "}
            <strong>
              {currentUser?.username ||
                "Unknown"}
            </strong>
          </p>

          <p>
            Email:{" "}
            <strong>
              {currentUser?.email ||
                email}
            </strong>
          </p>
        </div>
      )}

      {/* ================================== */}
      {/* PRESENCE */}
      {/* ================================== */}

      {isLoggedIn && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            border:
              "1px solid #ccc",
            borderRadius: "8px",
          }}
        >
          <h3>
            Online Presence
          </h3>

          <p>
            Online users:{" "}
            <strong>
              {
                onlineUsers.length
              }
            </strong>
          </p>

          <p>
            Current user:{" "}
            {getUserPresence(
              currentUserId
            ).isOnline ? (
              <span
                style={{
                  color: "green",
                  fontWeight:
                    "bold",
                }}
              >
                🟢 Online
              </span>
            ) : (
              <span
                style={{
                  color: "#777",
                }}
              >
                🔴 Offline
              </span>
            )}
          </p>

          <strong>
            Online User IDs:
          </strong>

          {onlineUsers.length ===
          0 ? (
            <p>
              No users online
            </p>
          ) : (
            <ul>
              {onlineUsers.map(
                (userId) => (
                  <li
                    key={userId}
                  >
                    User{" "}
                    {userId}{" "}
                    🟢 Online
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      )}

      {/* ================================== */}
      {/* LOGIN */}
      {/* ================================== */}

      {!isLoggedIn && (
        <div
          style={{
            marginTop: "30px",
          }}
        >
          <h2>
            Login
          </h2>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            style={{
              display:
                "block",
              width: "100%",
              padding: "10px",
              marginTop:
                "10px",
              boxSizing:
                "border-box",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            style={{
              display:
                "block",
              width: "100%",
              padding: "10px",
              marginTop:
                "10px",
              boxSizing:
                "border-box",
            }}
          />

          <button
            onClick={login}
            style={{
              marginTop:
                "10px",
              padding:
                "10px 20px",
              cursor:
                "pointer",
            }}
          >
            Login & Connect
          </button>
        </div>
      )}

      {/* ================================== */}
      {/* CHAT */}
      {/* ================================== */}

      {isLoggedIn && (
        <div
          style={{
            marginTop: "30px",
          }}
        >
          <h2>
            Conversation #
            {
              CONVERSATION_ID
            }
          </h2>

          <div
            style={{
              border:
                "1px solid #ccc",
              borderRadius:
                "8px",
              padding: "15px",
              minHeight:
                "250px",
              maxHeight:
                "500px",
              overflowY:
                "auto",
              marginTop:
                "15px",
            }}
          >
            {loadingMessages ? (
              <p>
                Loading
                messages...
              </p>
            ) : messages.length ===
              0 ? (
              <p>
                No messages yet.
              </p>
            ) : (
              messages.map(
                (msg) => {
                  const isOwn =
                    Number(
                      msg.senderId
                    ) ===
                    Number(
                      currentUserId
                    );

                  const isDeleted =
                    Boolean(
                      msg.deletedAt
                    );

                  const reactions =
                    msg.reactions ||
                    [];

                  return (
                    <div
                      key={msg.id}
                      style={{
                        marginBottom:
                          "15px",
                        padding:
                          "12px",
                        background:
                          isOwn
                            ? "#e7f3ff"
                            : "#f3f3f3",
                        borderRadius:
                          "8px",
                      }}
                    >
                      <strong>
                        {msg.sender
                          ?.username ||
                          "Unknown User"}
                      </strong>

                      {/* MESSAGE */}

                      <div
                        style={{
                          marginTop:
                            "5px",
                          fontSize:
                            "16px",
                          fontStyle:
                            isDeleted
                              ? "italic"
                              : "normal",
                          color:
                            isDeleted
                              ? "#777"
                              : "inherit",
                        }}
                      >
                        {isDeleted
                          ? "This message was deleted"
                          : msg.content}
                      </div>

                      {/* TIME + RECEIPT */}

                      <small
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          marginTop:
                            "5px",
                          color:
                            "#777",
                        }}
                      >
                        {new Date(
                          msg.createdAt
                        ).toLocaleTimeString()}

                        {renderReceipt(
                          msg
                        )}
                      </small>

                      {/* EDITED */}

                      {msg.editedAt &&
                        !isDeleted && (
                          <small
                            style={{
                              display:
                                "block",
                              color:
                                "#777",
                            }}
                          >
                            Edited
                          </small>
                        )}

                      {/* REACTIONS */}

                      {!isDeleted && (
                        <div
                          style={{
                            marginTop:
                              "10px",
                            display:
                              "flex",
                            flexWrap:
                              "wrap",
                            gap: "6px",
                          }}
                        >
                          {AVAILABLE_REACTIONS.map(
                            (
                              emoji
                            ) => {
                              const count =
                                getReactionCount(
                                  reactions,
                                  emoji
                                );

                              const selected =
                                hasUserReaction(
                                  reactions,
                                  emoji
                                );

                              return (
                                <button
                                  key={
                                    emoji
                                  }
                                  onClick={() =>
                                    toggleReaction(
                                      msg,
                                      emoji
                                    )
                                  }
                                  style={{
                                    padding:
                                      "5px 9px",
                                    border:
                                      selected
                                        ? "2px solid #333"
                                        : "1px solid #ccc",
                                    borderRadius:
                                      "15px",
                                    background:
                                      selected
                                        ? "#fff"
                                        : "#f8f8f8",
                                    cursor:
                                      "pointer",
                                  }}
                                >
                                  {
                                    emoji
                                  }

                                  {count >
                                    0 && (
                                    <span
                                      style={{
                                        marginLeft:
                                          "4px",
                                      }}
                                    >
                                      {
                                        count
                                      }
                                    </span>
                                  )}
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}

                      {/* EDIT DELETE */}

                      {isOwn &&
                        !isDeleted && (
                          <div
                            style={{
                              marginTop:
                                "10px",
                              display:
                                "flex",
                              gap: "8px",
                            }}
                          >
                            <button
                              onClick={() =>
                                editMessage(
                                  msg
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                deleteMessage(
                                  msg
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        )}
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* ================================= */}
          {/* TYPING */}
          {/* ================================= */}

          {typingUsers.length >
            0 && (
            <div
              style={{
                marginTop:
                  "8px",
                color: "#777",
                fontSize:
                  "14px",
                fontStyle:
                  "italic",
              }}
            >
              {typingUsers.length ===
              1
                ? `${typingUsers[0].username} is typing...`
                : `${typingUsers
                    .map(
                      (user) =>
                        user.username
                    )
                    .join(
                      ", "
                    )} are typing...`}
            </div>
          )}

          {/* ================================= */}
          {/* INPUT */}
          {/* ================================= */}

          <div
            style={{
              display:
                "flex",
              gap: "10px",
              marginTop:
                "15px",
            }}
          >
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={
                handleTyping
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  e.preventDefault();

                  sendMessage();
                }
              }}
              style={{
                flex: "1",
                padding:
                  "12px",
              }}
            />

            <button
              onClick={
                sendMessage
              }
              disabled={
                !socket.connected
              }
              style={{
                padding:
                  "12px 20px",
                cursor:
                  socket.connected
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}