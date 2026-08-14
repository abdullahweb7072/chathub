const { createServer } = require("http");
const { parse: parseUrl } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ============================================================
// ONLINE CONNECTION TRACKER
// ============================================================

const onlineUsers = new Map();

// ============================================================
// ACTIVE CALL TRACKER
// ============================================================

// callId -> {
//     callId,
//     conversationId,
//     callerId,
//     receiverId,
//     type,
//     status,
//     startedAt
// }

const activeCalls = new Map();

// userId -> callId
const userActiveCalls = new Map();

// ============================================================
// CONFIGURATION
// ============================================================

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT) || 3000;

// ============================================================
// DEFAULT PRIVACY SETTINGS
// ============================================================

const DEFAULT_PRIVACY_SETTINGS = {
    onlineStatus: true,
    lastSeen: true,
    readReceipts: true,
    typingIndicator: true,
};

// ============================================================
// DEFAULT NOTIFICATION SETTINGS
// ============================================================

const DEFAULT_NOTIFICATION_SETTINGS = {
    messages: true,
    friendRequests: true,
    sound: true,
    preview: true,
};

// ============================================================
// GET USER PRIVACY SETTINGS
// ============================================================

function getPrivacySettings(user) {
    return {
        ...DEFAULT_PRIVACY_SETTINGS,

        onlineStatus:
            user?.showOnlineStatus ??
            DEFAULT_PRIVACY_SETTINGS.onlineStatus,

        lastSeen:
            user?.showLastSeen ??
            DEFAULT_PRIVACY_SETTINGS.lastSeen,

        readReceipts:
            user?.readReceipts ??
            DEFAULT_PRIVACY_SETTINGS.readReceipts,

        typingIndicator:
            user?.typingIndicator ??
            DEFAULT_PRIVACY_SETTINGS.typingIndicator,
    };
}

// ============================================================
// GET USER NOTIFICATION SETTINGS
// ============================================================

function getNotificationSettings(user) {
    return {
        ...DEFAULT_NOTIFICATION_SETTINGS,

        messages:
            user?.messageNotifications ??
            DEFAULT_NOTIFICATION_SETTINGS.messages,

        friendRequests:
            user?.friendRequestNotifications ??
            DEFAULT_NOTIFICATION_SETTINGS.friendRequests,

        sound:
            user?.notificationSound ??
            DEFAULT_NOTIFICATION_SETTINGS.sound,

        preview:
            user?.notificationPreview ??
            DEFAULT_NOTIFICATION_SETTINGS.preview,
    };
}

// ============================================================
// COOKIE PARSER
// ============================================================

function parseCookies(cookieHeader) {
    const cookies = {};

    if (!cookieHeader) {
        return cookies;
    }

    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...valueParts] =
            cookie.trim().split("=");

        if (!name) {
            return;
        }

        const value = valueParts.join("=");

        try {
            cookies[name] =
                decodeURIComponent(value);
        } catch {
            cookies[name] = value;
        }
    });

    return cookies;
}

// ============================================================
// GET VISIBLE ONLINE USERS
// ============================================================

async function getVisibleOnlineUserIds() {
    const onlineUserIds =
        Array.from(onlineUsers.keys());

    if (onlineUserIds.length === 0) {
        return [];
    }

    try {
        const users =
            await prisma.user.findMany({
                where: {
                    id: {
                        in: onlineUserIds,
                    },

                    showOnlineStatus: true,
                },

                select: {
                    id: true,
                },
            });

        return users.map(
            (user) => user.id
        );
    } catch (error) {
        console.error(
            "❌ GET VISIBLE ONLINE USERS ERROR:",
            error
        );

        return [];
    }
}

// ============================================================
// GET CURRENT PRESENCE PRIVACY
// ============================================================

async function getLatestPresencePrivacy(userId) {
    try {
        const user =
            await prisma.user.findUnique({
                where: {
                    id: userId,
                },

                select: {
                    showOnlineStatus: true,
                    showLastSeen: true,
                    readReceipts: true,
                    typingIndicator: true,
                },
            });

        if (!user) {
            return {
                onlineStatus: true,
                lastSeen: true,
                readReceipts: true,
                typingIndicator: true,
            };
        }

        return {
            onlineStatus:
                user.showOnlineStatus ?? true,

            lastSeen:
                user.showLastSeen ?? true,

            readReceipts:
                user.readReceipts ?? true,

            typingIndicator:
                user.typingIndicator ?? true,
        };
    } catch (error) {
        console.error(
            "❌ GET LATEST PRESENCE PRIVACY ERROR:",
            error
        );

        return {
            onlineStatus: true,
            lastSeen: true,
            readReceipts: true,
            typingIndicator: true,
        };
    }
}

// ============================================================
// GENERATE CALL ID
// ============================================================

function generateCallId() {
    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 12)}`;
}

// ============================================================
// GET USER SOCKET ROOM
// ============================================================

function getUserRoom(userId) {
    return `user:${userId}`;
}

// ============================================================
// GET CONVERSATION ROOM
// ============================================================

function getConversationRoom(conversationId) {
    return `conversation:${conversationId}`;
}

// ============================================================
// CHECK CONVERSATION MEMBERSHIP
// ============================================================

async function isConversationMember(
    userId,
    conversationId
) {
    try {
        const membership =
            await prisma.conversationMember.findUnique({
                where: {
                    userId_conversationId: {
                        userId,
                        conversationId,
                    },
                },
            });

        return Boolean(membership);
    } catch (error) {
        console.error(
            "❌ MEMBERSHIP CHECK ERROR:",
            error
        );

        return false;
    }
}

// ============================================================
// GET CALL PARTICIPANT
// ============================================================

function getOtherCallParticipant(
    call,
    userId
) {
    if (call.callerId === userId) {
        return call.receiverId;
    }

    if (call.receiverId === userId) {
        return call.callerId;
    }

    return null;
}

// ============================================================
// CLEANUP CALL
// ============================================================

function cleanupCall(callId) {
    const call = activeCalls.get(callId);

    if (!call) {
        return null;
    }

    activeCalls.delete(callId);

    if (
        userActiveCalls.get(call.callerId) ===
        callId
    ) {
        userActiveCalls.delete(call.callerId);
    }

    if (
        userActiveCalls.get(call.receiverId) ===
        callId
    ) {
        userActiveCalls.delete(call.receiverId);
    }

    return call;
}

// ============================================================
// NEXT.JS
// ============================================================

const app = next({
    dev,
    hostname,
    port,
});

const handle =
    app.getRequestHandler();

// ============================================================
// PREPARE NEXT.JS
// ============================================================

app.prepare()
    .then(async () => {
        console.log(
            "Next.js prepared successfully"
        );

        // ========================================================
        // RESET STALE ONLINE USERS
        // ========================================================

        try {
            await prisma.user.updateMany({
                where: {
                    isOnline: true,
                },

                data: {
                    isOnline: false,
                },
            });

            console.log(
                "✅ Reset stale online status flags"
            );
        } catch (error) {
            console.error(
                "❌ Failed to reset online users:",
                error
            );
        }

        // ========================================================
        // HTTP SERVER
        // ========================================================

        const httpServer =
            createServer((req, res) => {
                const parsedUrl =
                    parseUrl(
                        req.url,
                        true
                    );

                handle(
                    req,
                    res,
                    parsedUrl
                );
            });

        // ========================================================
        // SOCKET.IO
        // ========================================================

        const io =
            new Server(
                httpServer,
                {
                    cors: {
                        origin: true,

                        methods: [
                            "GET",
                            "POST",
                        ],

                        credentials: true,
                    },
                }
            );

        globalThis.io = io;

        // ========================================================
        // SOCKET AUTHENTICATION
        // ========================================================

        io.use(
            (socket, next) => {
                try {
                    const rawCookie =
                        socket.handshake
                            .headers
                            .cookie;

                    if (!rawCookie) {
                        return next(
                            new Error(
                                "Unauthorized"
                            )
                        );
                    }

                    const cookies =
                        parseCookies(
                            rawCookie
                        );

                    const token =
                        cookies.Token;

                    if (!token) {
                        return next(
                            new Error(
                                "Unauthorized"
                            )
                        );
                    }

                    if (
                        !process.env.JWT_SECRET
                    ) {
                        return next(
                            new Error(
                                "Server configuration error"
                            )
                        );
                    }

                    const decoded =
                        jwt.verify(
                            token,
                            process.env.JWT_SECRET
                        );

                    socket.user =
                        decoded;

                    next();
                } catch (error) {
                    console.error(
                        "❌ SOCKET AUTH ERROR:",
                        error.message
                    );

                    next(
                        new Error(
                            "Unauthorized"
                        )
                    );
                }
            }
        );

        // ========================================================
        // SOCKET CONNECTION
        // ========================================================

        io.on(
            "connection",
            async (socket) => {
                const userId =
                    Number(
                        socket.user.id
                    );

                console.log(
                    `🟢 User ${userId} connected: ${socket.id}`
                );

                let currentUser = null;

                try {
                    currentUser =
                        await prisma.user.findUnique(
                            {
                                where: {
                                    id: userId,
                                },

                                select: {
                                    id: true,
                                    username: true,
                                    showOnlineStatus: true,
                                    showLastSeen: true,
                                    readReceipts: true,
                                    typingIndicator: true,
                                    messageNotifications: true,
                                    friendRequestNotifications: true,
                                    notificationSound: true,
                                    notificationPreview: true,
                                },
                            }
                        );
                } catch (error) {
                    console.error(
                        "❌ FAILED TO LOAD USER SETTINGS:",
                        error
                    );
                }

                const userRoom =
                    getUserRoom(userId);

                socket.join(userRoom);

                // ====================================================
                // ONLINE PRESENCE & DISCOVERY
                // ====================================================

                try {
                    const currentConnections =
                        onlineUsers.get(userId) || 0;

                    onlineUsers.set(
                        userId,
                        currentConnections + 1
                    );

                    const isFirstConnection =
                        currentConnections === 0;

                    if (isFirstConnection) {
                        await prisma.user.update({
                            where: {
                                id: userId,
                            },

                            data: {
                                isOnline: true,
                            },
                        });

                        const latestPrivacy =
                            await getLatestPresencePrivacy(
                                userId
                            );

                        io.emit(
                            "user_online",
                            {
                                userId,

                                showOnlineStatus:
                                    latestPrivacy.onlineStatus,

                                showLastSeen:
                                    latestPrivacy.lastSeen,
                            }
                        );
                    }

                    const visibleOnlineUserIds =
                        await getVisibleOnlineUserIds();

                    socket.emit(
                        "presence_state",
                        {
                            users:
                                visibleOnlineUserIds,
                        }
                    );
                } catch (error) {
                    console.error(
                        "❌ ONLINE PRESENCE ERROR:",
                        error
                    );
                }

                // ====================================================
                // JOIN ALL EXISTING CONVERSATION ROOMS
                // ====================================================

                try {
                    const memberships =
                        await prisma.conversationMember.findMany({
                            where: {
                                userId,
                            },

                            select: {
                                conversationId: true,
                            },
                        });

                    for (
                        const membership of memberships
                    ) {
                        socket.join(
                            getConversationRoom(
                                membership.conversationId
                            )
                        );
                    }
                } catch (error) {
                    console.error(
                        "❌ ROOM JOIN ERROR:",
                        error
                    );
                }

                // ====================================================
                // JOIN CONVERSATION
                // ====================================================

                socket.on(
                    "join_conversation",
                    async (data, callback) => {
                        try {
                            const conversationId =
                                Number(
                                    data?.conversationId
                                );

                            if (
                                !Number.isInteger(
                                    conversationId
                                ) ||
                                conversationId <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid conversation ID",
                                });
                            }

                            const membership =
                                await prisma.conversationMember.findUnique({
                                    where: {
                                        userId_conversationId: {
                                            userId,
                                            conversationId,
                                        },
                                    },
                                });

                            if (!membership) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are not a member of this conversation",
                                });
                            }

                            socket.join(
                                getConversationRoom(
                                    conversationId
                                )
                            );

                            callback?.({
                                success: true,
                                conversationId,
                            });
                        } catch (error) {
                            console.error(
                                "❌ JOIN CONVERSATION ERROR:",
                                error
                            );

                            callback?.({
                                success: false,
                                message:
                                    "Failed to join conversation",
                            });
                        }
                    }
                );

                // ====================================================
                // LEAVE CONVERSATION
                // ====================================================

                socket.on(
                    "leave_conversation",
                    async (data, callback) => {
                        try {
                            const conversationId =
                                Number(
                                    data?.conversationId
                                );

                            if (
                                !Number.isInteger(
                                    conversationId
                                ) ||
                                conversationId <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid conversation ID",
                                });
                            }

                            socket.leave(
                                getConversationRoom(
                                    conversationId
                                )
                            );

                            callback?.({
                                success: true,
                                conversationId,
                            });
                        } catch (error) {
                            console.error(
                                "❌ LEAVE CONVERSATION ERROR:",
                                error
                            );

                            callback?.({
                                success: false,
                                message:
                                    "Failed to leave conversation",
                            });
                        }
                    }
                );

                // ====================================================
                // ====================================================
                // CALL FEATURE
                // ====================================================
                // ====================================================

                // ====================================================
                // START CALL
                // ====================================================

                socket.on(
                    "call_user",
                    async (data, callback) => {
                        try {
                            const callerId =
                                Number(
                                    socket.user.id
                                );

                            const receiverId =
                                Number(
                                    data?.receiverId
                                );

                            const conversationId =
                                Number(
                                    data?.conversationId
                                );

                            const callType =
                                data?.type === "video"
                                    ? "video"
                                    : "audio";

                            if (
                                !Number.isInteger(
                                    receiverId
                                ) ||
                                receiverId <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid receiver ID",
                                });
                            }

                            if (
                                !Number.isInteger(
                                    conversationId
                                ) ||
                                conversationId <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid conversation ID",
                                });
                            }

                            if (
                                receiverId ===
                                callerId
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You cannot call yourself",
                                });
                            }

                            // ==================================================
                            // VERIFY CALLER MEMBERSHIP
                            // ==================================================

                            const callerIsMember =
                                await isConversationMember(
                                    callerId,
                                    conversationId
                                );

                            if (!callerIsMember) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are not a member of this conversation",
                                });
                            }

                            // ==================================================
                            // VERIFY RECEIVER MEMBERSHIP
                            // ==================================================

                            const receiverIsMember =
                                await isConversationMember(
                                    receiverId,
                                    conversationId
                                );

                            if (!receiverIsMember) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "The selected user is not a member of this conversation",
                                });
                            }

                            // ==================================================
                            // CHECK CALLER ALREADY IN CALL
                            // ==================================================

                            if (
                                userActiveCalls.has(
                                    callerId
                                )
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are already in a call",
                                });
                            }

                            // ==================================================
                            // CHECK RECEIVER ALREADY IN CALL
                            // ==================================================

                            if (
                                userActiveCalls.has(
                                    receiverId
                                )
                            ) {
                                socket.emit(
                                    "call_busy",
                                    {
                                        receiverId,
                                        conversationId,
                                        type:
                                            callType,
                                    }
                                );

                                return callback?.({
                                    success: false,
                                    message:
                                        "User is already in another call",
                                    code:
                                        "USER_BUSY",
                                });
                            }

                            // ==================================================
                            // CHECK RECEIVER ONLINE
                            // ==================================================

                            const receiverConnections =
                                onlineUsers.get(
                                    receiverId
                                ) || 0;

                            if (
                                receiverConnections <=
                                0
                            ) {
                                socket.emit(
                                    "call_unavailable",
                                    {
                                        receiverId,
                                        conversationId,
                                        type:
                                            callType,
                                        reason:
                                            "USER_OFFLINE",
                                    }
                                );

                                return callback?.({
                                    success: false,
                                    message:
                                        "User is offline",
                                    code:
                                        "USER_OFFLINE",
                                });
                            }

                            // ==================================================
                            // CREATE CALL
                            // ==================================================

                            const callId =
                                generateCallId();

                            const call = {
                                callId,

                                conversationId,

                                callerId,

                                receiverId,

                                type:
                                    callType,

                                status:
                                    "ringing",

                                startedAt:
                                    new Date(),
                            };

                            activeCalls.set(
                                callId,
                                call
                            );

                            userActiveCalls.set(
                                callerId,
                                callId
                            );

                            userActiveCalls.set(
                                receiverId,
                                callId
                            );

                            // ==================================================
                            // GET CALLER INFORMATION
                            // ==================================================

                            const caller =
                                await prisma.user.findUnique({
                                    where: {
                                        id:
                                            callerId,
                                    },

                                    select: {
                                        id: true,
                                        username: true,
                                        displayName: true,
                                        avatar: true,
                                    },
                                });

                            // ==================================================
                            // SEND INCOMING CALL
                            // ==================================================

                            io.to(
                                getUserRoom(
                                    receiverId
                                )
                            ).emit(
                                "incoming_call",
                                {
                                    callId,

                                    conversationId,

                                    type:
                                        callType,

                                    caller: {
                                        id:
                                            caller?.id ??
                                            callerId,

                                        username:
                                            caller?.username ??
                                            null,

                                        displayName:
                                            caller?.displayName ??
                                            null,

                                        avatar:
                                            caller?.avatar ??
                                            null,
                                    },
                                }
                            );

                            console.log(
                                `📞 ${callType.toUpperCase()} CALL STARTED: ${callerId} -> ${receiverId}`
                            );

                            callback?.({
                                success: true,

                                callId,

                                type:
                                    callType,

                                message:
                                    "Call started",
                            });
                        } catch (error) {
                            console.error(
                                "❌ CALL USER ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to start call",
                            });
                        }
                    }
                );

                // ====================================================
                // ACCEPT CALL
                // ====================================================

                socket.on(
                    "call_accept",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const callId =
                                data?.callId;

                            if (!callId) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call ID is required",
                                });
                            }

                            const call =
                                activeCalls.get(
                                    callId
                                );

                            if (!call) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call no longer exists",
                                });
                            }

                            // Only receiver can accept.
                            if (
                                call.receiverId !==
                                currentUserId
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You cannot accept this call",
                                });
                            }

                            if (
                                call.status !==
                                "ringing"
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call is no longer ringing",
                                });
                            }

                            call.status =
                                "accepted";

                            activeCalls.set(
                                callId,
                                call
                            );

                            // ==================================================
                            // INFORM CALLER
                            // ==================================================

                            io.to(
                                getUserRoom(
                                    call.callerId
                                )
                            ).emit(
                                "call_accepted",
                                {
                                    callId,

                                    conversationId:
                                        call.conversationId,

                                    type:
                                        call.type,

                                    acceptedBy:
                                        currentUserId,
                                }
                            );

                            console.log(
                                `📞 CALL ACCEPTED: ${callId}`
                            );

                            callback?.({
                                success: true,

                                callId,

                                message:
                                    "Call accepted",
                            });
                        } catch (error) {
                            console.error(
                                "❌ CALL ACCEPT ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to accept call",
                            });
                        }
                    }
                );

                // ====================================================
                // REJECT CALL
                // ====================================================

                socket.on(
                    "call_reject",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const callId =
                                data?.callId;

                            if (!callId) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call ID is required",
                                });
                            }

                            const call =
                                activeCalls.get(
                                    callId
                                );

                            if (!call) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call no longer exists",
                                });
                            }

                            if (
                                call.receiverId !==
                                currentUserId
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You cannot reject this call",
                                });
                            }

                            io.to(
                                getUserRoom(
                                    call.callerId
                                )
                            ).emit(
                                "call_rejected",
                                {
                                    callId,

                                    conversationId:
                                        call.conversationId,

                                    type:
                                        call.type,

                                    rejectedBy:
                                        currentUserId,
                                }
                            );

                            cleanupCall(
                                callId
                            );

                            console.log(
                                `📞 CALL REJECTED: ${callId}`
                            );

                            callback?.({
                                success: true,

                                callId,

                                message:
                                    "Call rejected",
                            });
                        } catch (error) {
                            console.error(
                                "❌ CALL REJECT ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to reject call",
                            });
                        }
                    }
                );

                // ====================================================
                // END CALL
                // ====================================================

                socket.on(
                    "call_end",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const callId =
                                data?.callId;

                            if (!callId) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call ID is required",
                                });
                            }

                            const call =
                                activeCalls.get(
                                    callId
                                );

                            if (!call) {
                                return callback?.({
                                    success: true,

                                    message:
                                        "Call already ended",
                                });
                            }

                            const participant =
                                getOtherCallParticipant(
                                    call,
                                    currentUserId
                                );

                            if (!participant) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are not part of this call",
                                });
                            }

                            io.to(
                                getUserRoom(
                                    participant
                                )
                            ).emit(
                                "call_ended",
                                {
                                    callId,

                                    conversationId:
                                        call.conversationId,

                                    type:
                                        call.type,

                                    endedBy:
                                        currentUserId,
                                }
                            );

                            cleanupCall(
                                callId
                            );

                            console.log(
                                `📞 CALL ENDED: ${callId}`
                            );

                            callback?.({
                                success: true,

                                callId,

                                message:
                                    "Call ended",
                            });
                        } catch (error) {
                            console.error(
                                "❌ CALL END ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to end call",
                            });
                        }
                    }
                );

                // ====================================================
                // WEBRTC OFFER
                // ====================================================

                socket.on(
                    "webrtc_offer",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const {
                                callId,
                                offer,
                            } = data || {};

                            if (
                                !callId ||
                                !offer
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call ID and offer are required",
                                });
                            }

                            const call =
                                activeCalls.get(
                                    callId
                                );

                            if (!call) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call not found",
                                });
                            }

                            const receiverId =
                                getOtherCallParticipant(
                                    call,
                                    currentUserId
                                );

                            if (!receiverId) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are not part of this call",
                                });
                            }

                            io.to(
                                getUserRoom(
                                    receiverId
                                )
                            ).emit(
                                "webrtc_offer",
                                {
                                    callId,

                                    offer,

                                    fromUserId:
                                        currentUserId,
                                }
                            );

                            callback?.({
                                success: true,
                            });
                        } catch (error) {
                            console.error(
                                "❌ WEBRTC OFFER ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to send WebRTC offer",
                            });
                        }
                    }
                );

                // ====================================================
                // WEBRTC ANSWER
                // ====================================================

                socket.on(
                    "webrtc_answer",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const {
                                callId,
                                answer,
                            } = data || {};

                            if (
                                !callId ||
                                !answer
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call ID and answer are required",
                                });
                            }

                            const call =
                                activeCalls.get(
                                    callId
                                );

                            if (!call) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call not found",
                                });
                            }

                            const receiverId =
                                getOtherCallParticipant(
                                    call,
                                    currentUserId
                                );

                            if (!receiverId) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are not part of this call",
                                });
                            }

                            io.to(
                                getUserRoom(
                                    receiverId
                                )
                            ).emit(
                                "webrtc_answer",
                                {
                                    callId,

                                    answer,

                                    fromUserId:
                                        currentUserId,
                                }
                            );

                            callback?.({
                                success: true,
                            });
                        } catch (error) {
                            console.error(
                                "❌ WEBRTC ANSWER ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to send WebRTC answer",
                            });
                        }
                    }
                );

                // ====================================================
                // WEBRTC ICE CANDIDATE
                // ====================================================

                socket.on(
                    "webrtc_ice_candidate",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const {
                                callId,
                                candidate,
                            } = data || {};

                            if (
                                !callId ||
                                !candidate
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call ID and ICE candidate are required",
                                });
                            }

                            const call =
                                activeCalls.get(
                                    callId
                                );

                            if (!call) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call not found",
                                });
                            }

                            const receiverId =
                                getOtherCallParticipant(
                                    call,
                                    currentUserId
                                );

                            if (!receiverId) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are not part of this call",
                                });
                            }

                            io.to(
                                getUserRoom(
                                    receiverId
                                )
                            ).emit(
                                "webrtc_ice_candidate",
                                {
                                    callId,

                                    candidate,

                                    fromUserId:
                                        currentUserId,
                                }
                            );

                            callback?.({
                                success: true,
                            });
                        } catch (error) {
                            console.error(
                                "❌ WEBRTC ICE ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to send ICE candidate",
                            });
                        }
                    }
                );

                // ====================================================
                // CALL STATUS
                // ====================================================

                socket.on(
                    "call_get_status",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const callId =
                                data?.callId;

                            if (!callId) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Call ID is required",
                                });
                            }

                            const call =
                                activeCalls.get(
                                    callId
                                );

                            if (!call) {
                                return callback?.({
                                    success: true,

                                    active: false,

                                    call: null,
                                });
                            }

                            const isParticipant =
                                call.callerId ===
                                    currentUserId ||
                                call.receiverId ===
                                    currentUserId;

                            if (!isParticipant) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Unauthorized",
                                });
                            }

                            callback?.({
                                success: true,

                                active: true,

                                call,
                            });
                        } catch (error) {
                            console.error(
                                "❌ CALL STATUS ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to get call status",
                            });
                        }
                    }
                );

                // ====================================================
                // SEND MESSAGE
                // ====================================================

                socket.on(
                    "send_message",
                    async (data, callback) => {
                        try {
                            const {
                                conversationId,
                                content = "",
                                type = "TEXT",

                                attachmentUrl = null,
                                attachmentName = null,
                                attachmentSize = null,
                                attachmentMimeType = null,

                                statusId = null,
                            } = data || {};

                            const senderId =
                                Number(
                                    socket.user.id
                                );

                            const parsedConversationId =
                                Number(
                                    conversationId
                                );

                            if (
                                !Number.isInteger(
                                    parsedConversationId
                                ) ||
                                parsedConversationId <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid conversation ID",
                                });
                            }

                            const allowedTypes = [
                                "TEXT",
                                "IMAGE",
                                "VIDEO",
                                "FILE",
                                "AUDIO",
                            ];

                            if (
                                !allowedTypes.includes(
                                    type
                                )
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid message type",
                                });
                            }

                            const trimmedContent =
                                typeof content === "string"
                                    ? content.trim()
                                    : "";

                            const hasAttachment =
                                Boolean(
                                    attachmentUrl &&
                                    typeof attachmentUrl ===
                                        "string" &&
                                    attachmentUrl.trim()
                                );

                            let parsedStatusId = null;

                            if (
                                statusId !== null &&
                                statusId !== undefined &&
                                statusId !== ""
                            ) {
                                parsedStatusId =
                                    Number(statusId);

                                if (
                                    !Number.isInteger(
                                        parsedStatusId
                                    ) ||
                                    parsedStatusId <= 0
                                ) {
                                    return callback?.({
                                        success: false,
                                        message:
                                            "Invalid status ID",
                                    });
                                }
                            }

                            if (
                                !trimmedContent &&
                                !hasAttachment &&
                                !parsedStatusId
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Message content or attachment is required",
                                });
                            }

                            if (
                                trimmedContent.length >
                                5000
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Message cannot exceed 5000 characters",
                                });
                            }

                            const senderMembership =
                                await prisma.conversationMember.findUnique({
                                    where: {
                                        userId_conversationId: {
                                            userId:
                                                senderId,

                                            conversationId:
                                                parsedConversationId,
                                        },
                                    },
                                });

                            if (!senderMembership) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are not a member of this conversation",
                                });
                            }

                            let statusPreview = null;

                            if (parsedStatusId) {
                                statusPreview =
                                    await prisma.status.findUnique({
                                        where: {
                                            id:
                                                parsedStatusId,
                                        },

                                        select: {
                                            id: true,
                                            content: true,
                                            mediaUrl: true,
                                            mediaType: true,
                                            mediaName: true,
                                            backgroundColor: true,
                                            createdAt: true,
                                            expiresAt: true,

                                            user: {
                                                select: {
                                                    id: true,
                                                    username: true,
                                                    displayName: true,
                                                    avatar: true,
                                                },
                                            },
                                        },
                                    });

                                if (!statusPreview) {
                                    return callback?.({
                                        success: false,
                                        message:
                                            "Status not found",
                                    });
                                }

                                if (
                                    statusPreview.expiresAt <=
                                    new Date()
                                ) {
                                    return callback?.({
                                        success: false,
                                        message:
                                            "This status has expired",
                                    });
                                }
                            }

                            const newMessage =
                                await prisma.message.create({
                                    data: {
                                        content:
                                            trimmedContent,

                                        type,

                                        senderId,

                                        conversationId:
                                            parsedConversationId,

                                        ...(parsedStatusId && {
                                            statusId:
                                                parsedStatusId,
                                        }),

                                        ...(attachmentUrl && {
                                            attachmentUrl,
                                        }),

                                        ...(attachmentName && {
                                            attachmentName,
                                        }),

                                        ...(attachmentSize !=
                                            null && {
                                            attachmentSize:
                                                Number(
                                                    attachmentSize
                                                ),
                                        }),

                                        ...(attachmentMimeType && {
                                            attachmentMimeType,
                                        }),
                                    },

                                    include: {
                                        sender: {
                                            select: {
                                                id: true,
                                                displayName: true,
                                                username: true,
                                                avatar: true,
                                                isOnline: true,
                                            },
                                        },

                                        reactions: {
                                            include: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        displayName: true,
                                                        username: true,
                                                        avatar: true,
                                                    },
                                                },
                                            },
                                        },

                                        receipts: true,

                                        status: {
                                            select: {
                                                id: true,
                                                content: true,
                                                mediaUrl: true,
                                                mediaType: true,
                                                mediaName: true,
                                                backgroundColor: true,
                                                createdAt: true,
                                                expiresAt: true,

                                                user: {
                                                    select: {
                                                        id: true,
                                                        username: true,
                                                        displayName: true,
                                                        avatar: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                });

                            await prisma.conversation.update({
                                where: {
                                    id:
                                        parsedConversationId,
                                },

                                data: {
                                    updatedAt:
                                        new Date(),
                                },
                            });

                            const recipients =
                                await prisma.conversationMember.findMany({
                                    where: {
                                        conversationId:
                                            parsedConversationId,

                                        userId: {
                                            not:
                                                senderId,
                                        },
                                    },

                                    select: {
                                        userId: true,
                                    },
                                });

                            if (
                                recipients.length >
                                0
                            ) {
                                await prisma.messageReceipt.createMany({
                                    data:
                                        recipients.map(
                                            (recipient) => ({
                                                messageId:
                                                    newMessage.id,

                                                userId:
                                                    recipient.userId,

                                                deliveredAt:
                                                    null,

                                                readAt:
                                                    null,
                                            })
                                        ),

                                    skipDuplicates:
                                        true,
                                });
                            }

                            const receipts =
                                await prisma.messageReceipt.findMany({
                                    where: {
                                        messageId:
                                            newMessage.id,
                                    },

                                    select: {
                                        id: true,
                                        messageId: true,
                                        userId: true,
                                        deliveredAt: true,
                                        readAt: true,
                                    },
                                });

                            const messageWithReceipts = {
                                ...newMessage,
                                receipts,
                            };

                            io.to(
                                getConversationRoom(
                                    parsedConversationId
                                )
                            ).emit(
                                "new_message",
                                messageWithReceipts
                            );

                            for (
                                const recipient of recipients
                            ) {
                                try {
                                    const recipientUser =
                                        await prisma.user.findUnique({
                                            where: {
                                                id:
                                                    recipient.userId,
                                            },

                                            select: {
                                                id: true,

                                                messageNotifications:
                                                    true,

                                                friendRequestNotifications:
                                                    true,

                                                notificationSound:
                                                    true,

                                                notificationPreview:
                                                    true,
                                            },
                                        });

                                    const recipientNotifications =
                                        getNotificationSettings(
                                            recipientUser
                                        );

                                    if (
                                        recipientNotifications.messages
                                    ) {
                                        io.to(
                                            getUserRoom(
                                                recipient.userId
                                            )
                                        ).emit(
                                            "message_notification",
                                            {
                                                message:
                                                    messageWithReceipts,

                                                settings:
                                                    recipientNotifications,
                                            }
                                        );
                                    }
                                } catch (
                                    notificationError
                                ) {
                                    console.error(
                                        "❌ MESSAGE NOTIFICATION ERROR:",
                                        notificationError
                                    );
                                }
                            }

                            callback?.({
                                success: true,

                                message:
                                    "Message sent successfully",

                                data:
                                    messageWithReceipts,
                            });
                        } catch (error) {
                            console.error(
                                "❌ SEND MESSAGE ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to send message",
                            });
                        }
                    }
                );

                // ====================================================
                // MESSAGE DELIVERED
                // ====================================================

                socket.on(
                    "message_delivered",
                    async (data, callback) => {
                        try {
                            const recipientId =
                                Number(
                                    socket.user.id
                                );

                            const messageId =
                                Number(
                                    data?.messageId
                                );

                            if (
                                !Number.isInteger(
                                    messageId
                                ) ||
                                messageId <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid message ID",
                                });
                            }

                            const receipt =
                                await prisma.messageReceipt.findUnique({
                                    where: {
                                        messageId_userId: {
                                            messageId,

                                            userId:
                                                recipientId,
                                        },
                                    },

                                    select: {
                                        id: true,
                                        messageId: true,
                                        userId: true,
                                        deliveredAt: true,
                                        readAt: true,

                                        message: {
                                            select: {
                                                id: true,
                                                senderId: true,
                                                conversationId:
                                                    true,
                                            },
                                        },
                                    },
                                });

                            if (!receipt) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Receipt not found",
                                });
                            }

                            if (
                                receipt.userId !==
                                recipientId
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Unauthorized receipt update",
                                });
                            }

                            if (
                                receipt.deliveredAt
                            ) {
                                const existingReceipt = {
                                    messageId:
                                        receipt.messageId,

                                    userId:
                                        receipt.userId,

                                    deliveredAt:
                                        receipt.deliveredAt,

                                    readAt:
                                        receipt.readAt,
                                };

                                callback?.({
                                    success: true,

                                    data:
                                        existingReceipt,
                                });

                                return;
                            }

                            const deliveredAt =
                                new Date();

                            const updatedReceipt =
                                await prisma.messageReceipt.update({
                                    where: {
                                        id:
                                            receipt.id,
                                    },

                                    data: {
                                        deliveredAt,
                                    },

                                    select: {
                                        id: true,
                                        messageId: true,
                                        userId: true,
                                        deliveredAt: true,
                                        readAt: true,
                                    },
                                });

                            const receiptUpdate = {
                                messageId:
                                    updatedReceipt.messageId,

                                userId:
                                    updatedReceipt.userId,

                                deliveredAt:
                                    updatedReceipt.deliveredAt,

                                readAt:
                                    updatedReceipt.readAt,
                            };

                            console.log(
                                "📨 MESSAGE DELIVERED:",
                                receiptUpdate
                            );

                            io.to(
                                getConversationRoom(
                                    receipt.message.conversationId
                                )
                            ).emit(
                                "message_receipt_updated",
                                receiptUpdate
                            );

                            callback?.({
                                success: true,

                                data:
                                    receiptUpdate,
                            });
                        } catch (error) {
                            console.error(
                                "❌ MESSAGE DELIVERED ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to mark message delivered",
                            });
                        }
                    }
                );

                // ====================================================
                // MARK MESSAGES READ
                // ====================================================

                socket.on(
                    "mark_messages_read",
                    async (data, callback) => {
                        try {
                            const readerId =
                                Number(
                                    socket.user.id
                                );

                            const conversationId =
                                Number(
                                    data?.conversationId
                                );

                            if (
                                !Number.isInteger(
                                    conversationId
                                ) ||
                                conversationId <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid conversation ID",
                                });
                            }

                            const membership =
                                await prisma.conversationMember.findUnique({
                                    where: {
                                        userId_conversationId: {
                                            userId:
                                                readerId,

                                            conversationId,
                                        },
                                    },
                                });

                            if (!membership) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are not a member of this conversation",
                                });
                            }

                            const lastReadAt =
                                new Date();

                            await prisma.conversationMember.update({
                                where: {
                                    userId_conversationId: {
                                        userId:
                                            readerId,

                                        conversationId,
                                    },
                                },

                                data: {
                                    lastReadAt,
                                },
                            });

                            const unreadReceipts =
                                await prisma.messageReceipt.findMany({
                                    where: {
                                        userId:
                                            readerId,

                                        readAt: null,

                                        message: {
                                            conversationId,

                                            senderId: {
                                                not:
                                                    readerId,
                                            },
                                        },
                                    },

                                    select: {
                                        id: true,
                                        messageId: true,
                                        deliveredAt: true,
                                        readAt: true,
                                    },
                                });

                            const receiptUpdates = [];

                            for (
                                const receipt of unreadReceipts
                            ) {
                                const readAt =
                                    lastReadAt;

                                const deliveredAt =
                                    receipt.deliveredAt ||
                                    readAt;

                                const updatedReceipt =
                                    await prisma.messageReceipt.update({
                                        where: {
                                            id:
                                                receipt.id,
                                        },

                                        data: {
                                            deliveredAt,

                                            readAt,
                                        },

                                        select: {
                                            messageId: true,
                                            userId: true,
                                            deliveredAt: true,
                                            readAt: true,
                                        },
                                    });

                                receiptUpdates.push(
                                    updatedReceipt
                                );
                            }

                            const latestPrivacy =
                                await getLatestPresencePrivacy(
                                    readerId
                                );

                            if (
                                latestPrivacy.readReceipts
                            ) {
                                for (
                                    const update of receiptUpdates
                                ) {
                                    console.log(
                                        "👁️ MESSAGE READ:",
                                        update
                                    );

                                    io.to(
                                        getConversationRoom(
                                            conversationId
                                        )
                                    ).emit(
                                        "message_receipt_updated",
                                        update
                                    );
                                }

                                socket
                                    .to(
                                        getConversationRoom(
                                            conversationId
                                        )
                                    )
                                    .emit(
                                        "conversation_read",
                                        {
                                            userId:
                                                readerId,

                                            conversationId,

                                            lastReadAt,
                                        }
                                    );
                            }

                            callback?.({
                                success: true,

                                message:
                                    "Messages marked as read",

                                data: {
                                    userId:
                                        readerId,

                                    conversationId,

                                    lastReadAt,

                                    receiptUpdates:
                                        latestPrivacy.readReceipts
                                            ? receiptUpdates
                                            : [],
                                },
                            });
                        } catch (error) {
                            console.error(
                                "❌ MARK MESSAGES READ ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to mark messages as read",
                            });
                        }
                    }
                );

                // ====================================================
                // EDIT MESSAGE
                // ====================================================

                socket.on(
                    "edit_message",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const {
                                messageId,
                                content,
                            } = data || {};

                            const id =
                                Number(
                                    messageId
                                );

                            if (
                                !Number.isInteger(
                                    id
                                ) ||
                                id <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid message ID",
                                });
                            }

                            if (
                                typeof content !==
                                    "string" ||
                                !content.trim()
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Message content is required",
                                });
                            }

                            const trimmedContent =
                                content.trim();

                            if (
                                trimmedContent.length >
                                5000
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Message cannot exceed 5000 characters",
                                });
                            }

                            const message =
                                await prisma.message.findUnique({
                                    where: {
                                        id,
                                    },

                                    select: {
                                        id: true,
                                        senderId: true,
                                        conversationId:
                                            true,
                                        deletedAt:
                                            true,
                                    },
                                });

                            if (!message) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Message not found",
                                });
                            }

                            if (
                                message.senderId !==
                                currentUserId
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You can only edit your own messages",
                                });
                            }

                            if (
                                message.deletedAt
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Deleted messages cannot be edited",
                                });
                            }

                            const updatedMessage =
                                await prisma.message.update({
                                    where: {
                                        id,
                                    },

                                    data: {
                                        content:
                                            trimmedContent,

                                        editedAt:
                                            new Date(),
                                    },

                                    include: {
                                        sender: {
                                            select: {
                                                id: true,
                                                displayName: true,
                                                username: true,
                                                avatar: true,
                                                isOnline: true,
                                            },
                                        },

                                        reactions: {
                                            include: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        displayName: true,
                                                        username: true,
                                                        avatar: true,
                                                    },
                                                },
                                            },
                                        },

                                        receipts: true,

                                        status: {
                                            select: {
                                                id: true,
                                                content: true,
                                                mediaUrl: true,
                                                mediaType: true,
                                                mediaName: true,
                                                backgroundColor: true,
                                                createdAt: true,
                                                expiresAt: true,

                                                user: {
                                                    select: {
                                                        id: true,
                                                        username: true,
                                                        displayName: true,
                                                        avatar: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                });

                            io.to(
                                getConversationRoom(
                                    message.conversationId
                                )
                            ).emit(
                                "message_updated",
                                updatedMessage
                            );

                            callback?.({
                                success: true,

                                message:
                                    "Message updated successfully",

                                data:
                                    updatedMessage,
                            });
                        } catch (error) {
                            console.error(
                                "❌ EDIT MESSAGE ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to edit message",
                            });
                        }
                    }
                );

                // ====================================================
                // DELETE MESSAGE FOR ME
                // ====================================================

                socket.on(
                    "delete_message_for_me",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const messageId =
                                Number(
                                    data?.messageId
                                );

                            if (
                                !Number.isInteger(
                                    messageId
                                ) ||
                                messageId <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid message ID",
                                });
                            }

                            const message =
                                await prisma.message.findUnique({
                                    where: {
                                        id:
                                            messageId,
                                    },

                                    select: {
                                        id: true,
                                        conversationId:
                                            true,
                                    },
                                });

                            if (!message) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Message not found",
                                });
                            }

                            const membership =
                                await prisma.conversationMember.findUnique({
                                    where: {
                                        userId_conversationId: {
                                            userId:
                                                currentUserId,

                                            conversationId:
                                                message.conversationId,
                                        },
                                    },
                                });

                            if (!membership) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are not a member of this conversation",
                                });
                            }

                            const deletion =
                                await prisma.messageDeletion.upsert({
                                    where: {
                                        userId_messageId: {
                                            userId:
                                                currentUserId,

                                            messageId,
                                        },
                                    },

                                    update: {
                                        deletedAt:
                                            new Date(),
                                    },

                                    create: {
                                        userId:
                                            currentUserId,

                                        messageId,
                                    },
                                });

                            io.to(
                                getUserRoom(
                                    currentUserId
                                )
                            ).emit(
                                "message_deleted_for_me",
                                {
                                    messageId,

                                    conversationId:
                                        message.conversationId,

                                    userId:
                                        currentUserId,

                                    deletedAt:
                                        deletion.deletedAt,
                                }
                            );

                            callback?.({
                                success: true,

                                mode:
                                    "forMe",

                                message:
                                    "Message deleted for you",

                                data: {
                                    messageId,

                                    conversationId:
                                        message.conversationId,

                                    userId:
                                        currentUserId,

                                    deletedAt:
                                        deletion.deletedAt,
                                },
                            });
                        } catch (error) {
                            console.error(
                                "❌ DELETE MESSAGE FOR ME ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to delete message for you",
                            });
                        }
                    }
                );

                // ====================================================
                // DELETE MESSAGE FOR EVERYONE
                // ====================================================

                socket.on(
                    "delete_message",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const id =
                                Number(
                                    data?.messageId
                                );

                            if (
                                !Number.isInteger(
                                    id
                                ) ||
                                id <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid message ID",
                                });
                            }

                            const message =
                                await prisma.message.findUnique({
                                    where: {
                                        id,
                                    },

                                    select: {
                                        id: true,
                                        senderId: true,
                                        conversationId:
                                            true,
                                        deletedAt:
                                            true,
                                    },
                                });

                            if (!message) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Message not found",
                                });
                            }

                            if (
                                message.senderId !==
                                currentUserId
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You can only delete your own messages",
                                });
                            }

                            if (
                                message.deletedAt
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Message has already been deleted",
                                });
                            }

                            const deletedAt =
                                new Date();

                            const deletedMessage =
                                await prisma.message.update({
                                    where: {
                                        id,
                                    },

                                    data: {
                                        deletedAt,
                                    },

                                    include: {
                                        sender: {
                                            select: {
                                                id: true,
                                                displayName: true,
                                                username: true,
                                                avatar: true,
                                                isOnline: true,
                                            },
                                        },

                                        reactions: {
                                            include: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        displayName: true,
                                                        username: true,
                                                        avatar: true,
                                                    },
                                                },
                                            },
                                        },

                                        receipts: true,

                                        status: {
                                            select: {
                                                id: true,
                                                content: true,
                                                mediaUrl: true,
                                                mediaType: true,
                                                mediaName: true,
                                                backgroundColor: true,
                                                createdAt: true,
                                                expiresAt: true,

                                                user: {
                                                    select: {
                                                        id: true,
                                                        username: true,
                                                        displayName: true,
                                                        avatar: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                });

                            io.to(
                                getConversationRoom(
                                    message.conversationId
                                )
                            ).emit(
                                "message_deleted",
                                deletedMessage
                            );

                            callback?.({
                                success: true,

                                mode:
                                    "forEveryone",

                                message:
                                    "Message deleted for everyone",

                                data:
                                    deletedMessage,
                            });
                        } catch (error) {
                            console.error(
                                "❌ DELETE MESSAGE ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to delete message",
                            });
                        }
                    }
                );

                // ====================================================
                // ADD REACTION
                // ====================================================

                socket.on(
                    "add_reaction",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const id =
                                Number(
                                    data?.messageId
                                );

                            const emoji =
                                data?.emoji?.trim();

                            if (
                                !Number.isInteger(
                                    id
                                ) ||
                                id <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid message ID",
                                });
                            }

                            if (!emoji) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Emoji is required",
                                });
                            }

                            const message =
                                await prisma.message.findUnique({
                                    where: {
                                        id,
                                    },

                                    select: {
                                        id: true,
                                        conversationId:
                                            true,
                                        deletedAt:
                                            true,
                                    },
                                });

                            if (!message) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Message not found",
                                });
                            }

                            if (
                                message.deletedAt
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Cannot react to a deleted message",
                                });
                            }

                            const membership =
                                await prisma.conversationMember.findUnique({
                                    where: {
                                        userId_conversationId: {
                                            userId:
                                                currentUserId,

                                            conversationId:
                                                message.conversationId,
                                        },
                                    },
                                });

                            if (!membership) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "You are not a member of this conversation",
                                });
                            }

                            const reaction =
                                await prisma.messageReaction.create({
                                    data: {
                                        emoji,

                                        userId:
                                            currentUserId,

                                        messageId:
                                            id,
                                    },

                                    include: {
                                        user: {
                                            select: {
                                                id: true,
                                                displayName: true,
                                                username: true,
                                                avatar: true,
                                            },
                                        },
                                    },
                                });

                            io.to(
                                getConversationRoom(
                                    message.conversationId
                                )
                            ).emit(
                                "message_reaction_added",
                                reaction
                            );

                            callback?.({
                                success: true,

                                data:
                                    reaction,
                            });
                        } catch (error) {
                            if (
                                error?.code ===
                                "P2002"
                            ) {
                                return callback?.({
                                    success: false,

                                    message:
                                        "You already added this reaction",
                                });
                            }

                            console.error(
                                "❌ ADD REACTION ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to add reaction",
                            });
                        }
                    }
                );

                // ====================================================
                // REMOVE REACTION
                // ====================================================

                socket.on(
                    "remove_reaction",
                    async (data, callback) => {
                        try {
                            const currentUserId =
                                Number(
                                    socket.user.id
                                );

                            const id =
                                Number(
                                    data?.messageId
                                );

                            const emoji =
                                data?.emoji?.trim();

                            if (
                                !Number.isInteger(
                                    id
                                ) ||
                                id <= 0
                            ) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Invalid message ID",
                                });
                            }

                            if (!emoji) {
                                return callback?.({
                                    success: false,
                                    message:
                                        "Emoji is required",
                                });
                            }

                            const reaction =
                                await prisma.messageReaction.findFirst({
                                    where: {
                                        userId:
                                            currentUserId,

                                        messageId:
                                            id,

                                        emoji,
                                    },

                                    select: {
                                        id: true,

                                        messageId:
                                            true,

                                        emoji:
                                            true,

                                        userId:
                                            true,

                                        message: {
                                            select: {
                                                conversationId:
                                                    true,
                                            },
                                        },
                                    },
                                });

                            if (!reaction) {
                                return callback?.({
                                    success: false,

                                    message:
                                        "Reaction not found",
                                });
                            }

                            await prisma.messageReaction.delete({
                                where: {
                                    id:
                                        reaction.id,
                                },
                            });

                            const payload = {
                                id:
                                    reaction.id,

                                messageId:
                                    reaction.messageId,

                                emoji:
                                    reaction.emoji,

                                userId:
                                    reaction.userId,
                            };

                            io.to(
                                getConversationRoom(
                                    reaction.message.conversationId
                                )
                            ).emit(
                                "message_reaction_removed",
                                payload
                            );

                            callback?.({
                                success: true,

                                data:
                                    payload,
                            });
                        } catch (error) {
                            console.error(
                                "❌ REMOVE REACTION ERROR:",
                                error
                            );

                            callback?.({
                                success: false,

                                message:
                                    "Failed to remove reaction",
                            });
                        }
                    }
                );

                // ====================================================
                // TYPING START
                // ====================================================

                socket.on(
                    "typing_start",
                    async (data) => {
                        try {
                            const latestPrivacy =
                                await getLatestPresencePrivacy(
                                    userId
                                );

                            if (
                                !latestPrivacy.typingIndicator
                            ) {
                                return;
                            }

                            const conversationId =
                                Number(
                                    data?.conversationId
                                );

                            if (
                                !Number.isInteger(
                                    conversationId
                                ) ||
                                conversationId <= 0
                            ) {
                                return;
                            }

                            const membership =
                                await prisma.conversationMember.findUnique({
                                    where: {
                                        userId_conversationId: {
                                            userId,

                                            conversationId,
                                        },
                                    },
                                });

                            if (!membership) {
                                return;
                            }

                            socket
                                .to(
                                    getConversationRoom(
                                        conversationId
                                    )
                                )
                                .emit(
                                    "user_typing",
                                    {
                                        userId,

                                        username:
                                            socket.user
                                                .username,

                                        conversationId,
                                    }
                                );
                        } catch (error) {
                            console.error(
                                "❌ TYPING START ERROR:",
                                error
                            );
                        }
                    }
                );

                // ====================================================
                // TYPING STOP
                // ====================================================

                socket.on(
                    "typing_stop",
                    async (data) => {
                        try {
                            const latestPrivacy =
                                await getLatestPresencePrivacy(
                                    userId
                                );

                            if (
                                !latestPrivacy.typingIndicator
                            ) {
                                return;
                            }

                            const conversationId =
                                Number(
                                    data?.conversationId
                                );

                            if (
                                !Number.isInteger(
                                    conversationId
                                ) ||
                                conversationId <= 0
                            ) {
                                return;
                            }

                            const membership =
                                await prisma.conversationMember.findUnique({
                                    where: {
                                        userId_conversationId: {
                                            userId,

                                            conversationId,
                                        },
                                    },
                                });

                            if (!membership) {
                                return;
                            }

                            socket
                                .to(
                                    getConversationRoom(
                                        conversationId
                                    )
                                )
                                .emit(
                                    "user_stopped_typing",
                                    {
                                        userId,

                                        username:
                                            socket.user
                                                .username,

                                        conversationId,
                                    }
                                );
                        } catch (error) {
                            console.error(
                                "❌ TYPING STOP ERROR:",
                                error
                            );
                        }
                    }
                );
         
                // ====================================================
// CALL SIGNALING
// ====================================================

// ----------------------------------------------------
// START CALL
// ----------------------------------------------------

socket.on(
    "call_user",
    async (data, callback) => {
        try {
            const callerId = Number(socket.user.id);

            const {
                conversationId,
                receiverId,
                callType = "audio",
            } = data || {};

            const parsedConversationId =
                Number(conversationId);

            const parsedReceiverId =
                Number(receiverId);

            // =================================================
            // VALIDATE CALL TYPE
            // =================================================

            if (
                callType !== "audio" &&
                callType !== "video"
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid call type",
                });
            }

            // =================================================
            // VALIDATE RECEIVER
            // =================================================

            if (
                !Number.isInteger(parsedReceiverId) ||
                parsedReceiverId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid receiver ID",
                });
            }

            if (
                parsedReceiverId === callerId
            ) {
                return callback?.({
                    success: false,
                    message:
                        "You cannot call yourself",
                });
            }

            // =================================================
            // VALIDATE CONVERSATION
            // =================================================

            if (
                !Number.isInteger(
                    parsedConversationId
                ) ||
                parsedConversationId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid conversation ID",
                });
            }

            // =================================================
            // VERIFY CALLER MEMBERSHIP
            // =================================================

            const callerMembership =
                await prisma.conversationMember.findUnique({
                    where: {
                        userId_conversationId: {
                            userId: callerId,
                            conversationId:
                                parsedConversationId,
                        },
                    },
                });

            if (!callerMembership) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a member of this conversation",
                });
            }

            // =================================================
            // VERIFY RECEIVER MEMBERSHIP
            // =================================================

            const receiverMembership =
                await prisma.conversationMember.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                parsedReceiverId,

                            conversationId:
                                parsedConversationId,
                        },
                    },
                });

            if (!receiverMembership) {
                return callback?.({
                    success: false,
                    message:
                        "The user is not a member of this conversation",
                });
            }

            // =================================================
            // GET CALLER
            // =================================================

            const caller =
                await prisma.user.findUnique({
                    where: {
                        id: callerId,
                    },

                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                    },
                });

            if (!caller) {
                return callback?.({
                    success: false,
                    message:
                        "Caller not found",
                });
            }

            // =================================================
            // GET RECEIVER
            // =================================================

            const receiver =
                await prisma.user.findUnique({
                    where: {
                        id: parsedReceiverId,
                    },

                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                        isOnline: true,
                    },
                });

            if (!receiver) {
                return callback?.({
                    success: false,
                    message:
                        "Receiver not found",
                });
            }

            // =================================================
            // GENERATE CALL ID
            // =================================================

            const callId =
                `${callerId}-${parsedReceiverId}-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 10)}`;

            // =================================================
            // CHECK RECEIVER ONLINE
            // =================================================

            const receiverConnections =
                onlineUsers.get(
                    parsedReceiverId
                ) || 0;

            if (
                receiverConnections <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "User is currently offline",
                    code:
                        "USER_OFFLINE",
                });
            }

            // =================================================
            // INCOMING CALL PAYLOAD
            // =================================================

            const incomingCall = {
                callId,

                conversationId:
                    parsedConversationId,

                callerId,

                receiverId:
                    parsedReceiverId,

                callType,

                caller: {
                    id: caller.id,
                    username:
                        caller.username,
                    displayName:
                        caller.displayName,
                    avatar:
                        caller.avatar,
                },

                createdAt:
                    new Date().toISOString(),
            };

            console.log(
                "📞 INCOMING CALL:",
                incomingCall
            );

            // =================================================
            // SEND CALL TO RECEIVER
            // =================================================

            io.to(
                `user:${parsedReceiverId}`
            ).emit(
                "incoming_call",
                incomingCall
            );

            // =================================================
            // CONFIRM TO CALLER
            // =================================================

            callback?.({
                success: true,

                message:
                    "Call initiated successfully",

                data: {
                    callId,

                    conversationId:
                        parsedConversationId,

                    callerId,

                    receiverId:
                        parsedReceiverId,

                    callType,
                },
            });
        } catch (error) {
            console.error(
                "❌ CALL USER ERROR:",
                error
            );

            callback?.({
                success: false,

                message:
                    "Failed to start call",
            });
        }
    }
);


// ----------------------------------------------------
// ACCEPT CALL
// ----------------------------------------------------

socket.on(
    "call_accepted",
    async (data, callback) => {
        try {
            const receiverId =
                Number(socket.user.id);

            const {
                callId,
                callerId,
                conversationId,
            } = data || {};

            const parsedCallerId =
                Number(callerId);

            const parsedConversationId =
                Number(conversationId);

            // =================================================
            // VALIDATION
            // =================================================

            if (!callId) {
                return callback?.({
                    success: false,
                    message:
                        "Call ID is required",
                });
            }

            if (
                !Number.isInteger(
                    parsedCallerId
                ) ||
                parsedCallerId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid caller ID",
                });
            }

            if (
                !Number.isInteger(
                    parsedConversationId
                ) ||
                parsedConversationId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid conversation ID",
                });
            }

            // =================================================
            // VERIFY MEMBERSHIP
            // =================================================

            const receiverMembership =
                await prisma.conversationMember.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                receiverId,

                            conversationId:
                                parsedConversationId,
                        },
                    },
                });

            const callerMembership =
                await prisma.conversationMember.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                parsedCallerId,

                            conversationId:
                                parsedConversationId,
                        },
                    },
                });

            if (
                !receiverMembership ||
                !callerMembership
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Call participants are not members of this conversation",
                });
            }

            // =================================================
            // SEND ACCEPTED EVENT TO CALLER
            // =================================================

            console.log(
                "✅ CALL ACCEPTED:",
                {
                    callId,
                    callerId:
                        parsedCallerId,
                    receiverId,
                }
            );

            io.to(
                `user:${parsedCallerId}`
            ).emit(
                "call_accepted",
                {
                    callId,

                    conversationId:
                        parsedConversationId,

                    callerId:
                        parsedCallerId,

                    receiverId,

                    acceptedAt:
                        new Date().toISOString(),
                }
            );

            callback?.({
                success: true,

                message:
                    "Call accepted",
            });
        } catch (error) {
            console.error(
                "❌ CALL ACCEPT ERROR:",
                error
            );

            callback?.({
                success: false,

                message:
                    "Failed to accept call",
            });
        }
    }
);


// ----------------------------------------------------
// REJECT CALL
// ----------------------------------------------------

socket.on(
    "call_rejected",
    async (data, callback) => {
        try {
            const receiverId =
                Number(socket.user.id);

            const {
                callId,
                callerId,
                conversationId,
                reason = "rejected",
            } = data || {};

            const parsedCallerId =
                Number(callerId);

            const parsedConversationId =
                Number(conversationId);

            if (!callId) {
                return callback?.({
                    success: false,
                    message:
                        "Call ID is required",
                });
            }

            if (
                !Number.isInteger(
                    parsedCallerId
                ) ||
                parsedCallerId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid caller ID",
                });
            }

            if (
                !Number.isInteger(
                    parsedConversationId
                ) ||
                parsedConversationId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid conversation ID",
                });
            }

            // =================================================
            // VERIFY RECEIVER MEMBERSHIP
            // =================================================

            const receiverMembership =
                await prisma.conversationMember.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                receiverId,

                            conversationId:
                                parsedConversationId,
                        },
                    },
                });

            if (!receiverMembership) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a member of this conversation",
                });
            }

            // =================================================
            // SEND REJECTION TO CALLER
            // =================================================

            console.log(
                "❌ CALL REJECTED:",
                {
                    callId,
                    callerId:
                        parsedCallerId,
                    receiverId,
                    reason,
                }
            );

            io.to(
                `user:${parsedCallerId}`
            ).emit(
                "call_rejected",
                {
                    callId,

                    conversationId:
                        parsedConversationId,

                    callerId:
                        parsedCallerId,

                    receiverId,

                    reason,

                    rejectedAt:
                        new Date().toISOString(),
                }
            );

            callback?.({
                success: true,

                message:
                    "Call rejected",
            });
        } catch (error) {
            console.error(
                "❌ CALL REJECT ERROR:",
                error
            );

            callback?.({
                success: false,

                message:
                    "Failed to reject call",
            });
        }
    }
);


// ----------------------------------------------------
// WEBRTC OFFER
// ----------------------------------------------------

socket.on(
    "webrtc_offer",
    async (data, callback) => {
        try {
            const senderId =
                Number(socket.user.id);

            const {
                callId,
                receiverId,
                conversationId,
                offer,
            } = data || {};

            const parsedReceiverId =
                Number(receiverId);

            const parsedConversationId =
                Number(conversationId);

            if (!callId) {
                return callback?.({
                    success: false,
                    message:
                        "Call ID is required",
                });
            }

            if (
                !offer
            ) {
                return callback?.({
                    success: false,
                    message:
                        "WebRTC offer is required",
                });
            }

            if (
                !Number.isInteger(
                    parsedReceiverId
                ) ||
                parsedReceiverId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid receiver ID",
                });
            }

            if (
                !Number.isInteger(
                    parsedConversationId
                ) ||
                parsedConversationId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid conversation ID",
                });
            }

            // =================================================
            // VERIFY MEMBERSHIP
            // =================================================

            const membership =
                await prisma.conversationMember.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                senderId,

                            conversationId:
                                parsedConversationId,
                        },
                    },
                });

            if (!membership) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a member of this conversation",
                });
            }

            // =================================================
            // FORWARD OFFER
            // =================================================

            console.log(
                "📡 WEBRTC OFFER:",
                {
                    callId,
                    senderId,
                    receiverId:
                        parsedReceiverId,
                }
            );

            io.to(
                `user:${parsedReceiverId}`
            ).emit(
                "webrtc_offer",
                {
                    callId,

                    conversationId:
                        parsedConversationId,

                    senderId,

                    receiverId:
                        parsedReceiverId,

                    offer,
                }
            );

            callback?.({
                success: true,
            });
        } catch (error) {
            console.error(
                "❌ WEBRTC OFFER ERROR:",
                error
            );

            callback?.({
                success: false,

                message:
                    "Failed to send WebRTC offer",
            });
        }
    }
);


// ----------------------------------------------------
// WEBRTC ANSWER
// ----------------------------------------------------

socket.on(
    "webrtc_answer",
    async (data, callback) => {
        try {
            const senderId =
                Number(socket.user.id);

            const {
                callId,
                receiverId,
                conversationId,
                answer,
            } = data || {};

            const parsedReceiverId =
                Number(receiverId);

            const parsedConversationId =
                Number(conversationId);

            if (!callId) {
                return callback?.({
                    success: false,
                    message:
                        "Call ID is required",
                });
            }

            if (!answer) {
                return callback?.({
                    success: false,
                    message:
                        "WebRTC answer is required",
                });
            }

            if (
                !Number.isInteger(
                    parsedReceiverId
                ) ||
                parsedReceiverId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid receiver ID",
                });
            }

            if (
                !Number.isInteger(
                    parsedConversationId
                ) ||
                parsedConversationId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid conversation ID",
                });
            }

            // =================================================
            // VERIFY MEMBERSHIP
            // =================================================

            const membership =
                await prisma.conversationMember.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                senderId,

                            conversationId:
                                parsedConversationId,
                        },
                    },
                });

            if (!membership) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a member of this conversation",
                });
            }

            // =================================================
            // FORWARD ANSWER
            // =================================================

            console.log(
                "📡 WEBRTC ANSWER:",
                {
                    callId,
                    senderId,
                    receiverId:
                        parsedReceiverId,
                }
            );

            io.to(
                `user:${parsedReceiverId}`
            ).emit(
                "webrtc_answer",
                {
                    callId,

                    conversationId:
                        parsedConversationId,

                    senderId,

                    receiverId:
                        parsedReceiverId,

                    answer,
                }
            );

            callback?.({
                success: true,
            });
        } catch (error) {
            console.error(
                "❌ WEBRTC ANSWER ERROR:",
                error
            );

            callback?.({
                success: false,

                message:
                    "Failed to send WebRTC answer",
            });
        }
    }
);


// ----------------------------------------------------
// ICE CANDIDATE
// ----------------------------------------------------

socket.on(
    "ice_candidate",
    async (data, callback) => {
        try {
            const senderId =
                Number(socket.user.id);

            const {
                callId,
                receiverId,
                conversationId,
                candidate,
            } = data || {};

            const parsedReceiverId =
                Number(receiverId);

            const parsedConversationId =
                Number(conversationId);

            if (!callId) {
                return callback?.({
                    success: false,
                    message:
                        "Call ID is required",
                });
            }

            if (!candidate) {
                return callback?.({
                    success: false,
                    message:
                        "ICE candidate is required",
                });
            }

            if (
                !Number.isInteger(
                    parsedReceiverId
                ) ||
                parsedReceiverId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid receiver ID",
                });
            }

            if (
                !Number.isInteger(
                    parsedConversationId
                ) ||
                parsedConversationId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid conversation ID",
                });
            }

            // =================================================
            // VERIFY MEMBERSHIP
            // =================================================

            const membership =
                await prisma.conversationMember.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                senderId,

                            conversationId:
                                parsedConversationId,
                        },
                    },
                });

            if (!membership) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a member of this conversation",
                });
            }

            // =================================================
            // FORWARD ICE CANDIDATE
            // =================================================

            io.to(
                `user:${parsedReceiverId}`
            ).emit(
                "ice_candidate",
                {
                    callId,

                    conversationId:
                        parsedConversationId,

                    senderId,

                    receiverId:
                        parsedReceiverId,

                    candidate,
                }
            );

            callback?.({
                success: true,
            });
        } catch (error) {
            console.error(
                "❌ ICE CANDIDATE ERROR:",
                error
            );

            callback?.({
                success: false,

                message:
                    "Failed to send ICE candidate",
            });
        }
    }
);


// ----------------------------------------------------
// END CALL
// ----------------------------------------------------

socket.on(
    "call_ended",
    async (data, callback) => {
        try {
            const senderId =
                Number(socket.user.id);

            const {
                callId,
                receiverId,
                conversationId,
                reason = "ended",
            } = data || {};

            const parsedReceiverId =
                Number(receiverId);

            const parsedConversationId =
                Number(conversationId);

            if (!callId) {
                return callback?.({
                    success: false,
                    message:
                        "Call ID is required",
                });
            }

            if (
                !Number.isInteger(
                    parsedReceiverId
                ) ||
                parsedReceiverId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid receiver ID",
                });
            }

            if (
                !Number.isInteger(
                    parsedConversationId
                ) ||
                parsedConversationId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid conversation ID",
                });
            }

            // =================================================
            // VERIFY MEMBERSHIP
            // =================================================

            const membership =
                await prisma.conversationMember.findUnique({
                    where: {
                        userId_conversationId: {
                            userId:
                                senderId,

                            conversationId:
                                parsedConversationId,
                        },
                    },
                });

            if (!membership) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a member of this conversation",
                });
            }

            // =================================================
            // SEND END CALL EVENT
            // =================================================

            console.log(
                "📴 CALL ENDED:",
                {
                    callId,
                    senderId,
                    receiverId:
                        parsedReceiverId,
                    reason,
                }
            );

            io.to(
                `user:${parsedReceiverId}`
            ).emit(
                "call_ended",
                {
                    callId,

                    conversationId:
                        parsedConversationId,

                    senderId,

                    receiverId:
                        parsedReceiverId,

                    reason,

                    endedAt:
                        new Date().toISOString(),
                }
            );

            callback?.({
                success: true,

                message:
                    "Call ended",
            });
        } catch (error) {
            console.error(
                "❌ END CALL ERROR:",
                error
            );

            callback?.({
                success: false,

                message:
                    "Failed to end call",
            });
        }
    }
);
                // ====================================================
                // DISCONNECT
                // ====================================================

                socket.on(
                    "disconnect",
                    async (reason) => {
                        try {
                            // ==================================================
                            // HANDLE ACTIVE CALL
                            // ==================================================

                            const callId =
                                userActiveCalls.get(
                                    userId
                                );

                            if (callId) {
                                const call =
                                    activeCalls.get(
                                        callId
                                    );

                                if (call) {
                                    const otherUserId =
                                        getOtherCallParticipant(
                                            call,
                                            userId
                                        );

                                    if (
                                        otherUserId
                                    ) {
                                        io.to(
                                            getUserRoom(
                                                otherUserId
                                            )
                                        ).emit(
                                            "call_ended",
                                            {
                                                callId,

                                                conversationId:
                                                    call.conversationId,

                                                type:
                                                    call.type,

                                                endedBy:
                                                    userId,

                                                reason:
                                                    "DISCONNECTED",
                                            }
                                        );
                                    }

                                    cleanupCall(
                                        callId
                                    );
                                }
                            }

                            // ==================================================
                            // PRESENCE
                            // ==================================================

                            const currentConnections =
                                onlineUsers.get(
                                    userId
                                ) || 0;

                            if (
                                currentConnections >
                                1
                            ) {
                                onlineUsers.set(
                                    userId,

                                    currentConnections -
                                        1
                                );

                                return;
                            }

                            onlineUsers.delete(
                                userId
                            );

                            const lastSeen =
                                new Date();

                            const latestPrivacy =
                                await getLatestPresencePrivacy(
                                    userId
                                );

                            await prisma.user.update({
                                where: {
                                    id:
                                        userId,
                                },

                                data: {
                                    isOnline:
                                        false,

                                    lastSeen,
                                },
                            });

                            io.emit(
                                "user_offline",
                                {
                                    userId,

                                    lastSeen:
                                        latestPrivacy.lastSeen
                                            ? lastSeen
                                            : null,

                                    showOnlineStatus:
                                        latestPrivacy.onlineStatus,

                                    showLastSeen:
                                        latestPrivacy.lastSeen,

                                    privacyHidden:
                                        !latestPrivacy.lastSeen,
                                }
                            );
                        } catch (error) {
                            console.error(
                                "❌ OFFLINE PRESENCE ERROR:",
                                error
                            );
                        }
                    }
                );
            }
        );

        // ========================================================
        // START SERVER
        // ========================================================

        httpServer
            .once(
                "error",
                (error) => {
                    console.error(
                        "❌ SERVER ERROR:",
                        error
                    );

                    process.exit(1);
                }
            )
            .listen(
                port,
                () => {
                    console.log(
                        `> Ready on http://${hostname}:${port}`
                    );

                    console.log(
                        "📞 Audio/Video calling signaling enabled"
                    );
                }
            );

        // ========================================================
        // GRACEFUL SHUTDOWN
        // ========================================================

        const shutdown = async () => {
            console.log(
                "\nShutting down gracefully..."
            );

            try {
                // ==================================================
                // END ALL ACTIVE CALLS
                // ==================================================

                for (
                    const [
                        callId,
                        call,
                    ] of activeCalls
                ) {
                    io.to(
                        getUserRoom(
                            call.callerId
                        )
                    ).emit(
                        "call_ended",
                        {
                            callId,

                            conversationId:
                                call.conversationId,

                            type:
                                call.type,

                            endedBy:
                                null,

                            reason:
                                "SERVER_SHUTDOWN",
                        }
                    );

                    io.to(
                        getUserRoom(
                            call.receiverId
                        )
                    ).emit(
                        "call_ended",
                        {
                            callId,

                            conversationId:
                                call.conversationId,

                            type:
                                call.type,

                            endedBy:
                                null,

                            reason:
                                "SERVER_SHUTDOWN",
                        }
                    );
                }

                activeCalls.clear();
                userActiveCalls.clear();

                await prisma.user.updateMany({
                    where: {
                        isOnline: true,
                    },

                    data: {
                        isOnline: false,
                    },
                });

                onlineUsers.clear();

                await prisma.$disconnect();

                io.close();

                httpServer.close(
                    () => {
                        console.log(
                            "HTTP server closed."
                        );

                        process.exit(0);
                    }
                );
            } catch (error) {
                console.error(
                    "❌ Shutdown error:",
                    error
                );

                process.exit(1);
            }
        };

        process.on(
            "SIGINT",
            shutdown
        );

        process.on(
            "SIGTERM",
            shutdown
        );
    })
    .catch((error) => {
        console.error(
            "❌ Failed to prepare Next.js:",
            error
        );

        process.exit(1);
    });