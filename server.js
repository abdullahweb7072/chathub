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
// GAME HELPERS
// ============================================================

function getGameRoom(gameId) {
    return `game:${gameId}`;
}

// ============================================================
// TIC TAC TOE
// ============================================================

function checkTicTacToeWinner(board) {
    const winningLines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],

        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],

        [0, 4, 8],
        [2, 4, 6],
    ];

    for (const [a, b, c] of winningLines) {
        if (
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
        ) {
            return board[a];
        }
    }

    return null;
}

function isTicTacToeDraw(board) {
    return board.every((cell) => cell !== null);
}

// ============================================================
// CONNECT FOUR
// ============================================================

function checkConnectFourWinner(board, row, col, player) {
    const directions = [
        [0, 1],  // horizontal
        [1, 0],  // vertical
        [1, 1],  // diagonal
        [1, -1], // diagonal
    ];

    for (const [rowDirection, colDirection] of directions) {
        let count = 1;

        // Forward
        let r = row + rowDirection;
        let c = col + colDirection;

        while (
            r >= 0 &&
            r < 6 &&
            c >= 0 &&
            c < 7 &&
            board[r][c] === player
        ) {
            count++;

            r += rowDirection;
            c += colDirection;
        }

        // Backward
        r = row - rowDirection;
        c = col - colDirection;

        while (
            r >= 0 &&
            r < 6 &&
            c >= 0 &&
            c < 7 &&
            board[r][c] === player
        ) {
            count++;

            r -= rowDirection;
            c -= colDirection;
        }

        if (count >= 4) {
            return true;
        }
    }

    return false;
}

function isConnectFourDraw(board) {
    return board.every((row) =>
        row.every((cell) => cell !== null)
    );
}

// ============================================================
// ROCK PAPER SCISSORS
// ============================================================

const VALID_RPS_CHOICES = [
    "rock",
    "paper",
    "scissors",
];

function getRpsWinner(choice1, choice2) {
    if (choice1 === choice2) {
        return "DRAW";
    }

    if (
        (choice1 === "rock" && choice2 === "scissors") ||
        (choice1 === "paper" && choice2 === "rock") ||
        (choice1 === "scissors" && choice2 === "paper")
    ) {
        return "PLAYER1";
    }

    return "PLAYER2";
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
// GAME HELPERS
// ============================================================

function getGameRoom(gameId) {
    return `game:${gameId}`;
}

function emitGameEvent(conversationId, event, game) {
    if (!globalThis.io) {
        console.warn(
            "⚠️ Socket.IO instance is not available for game event:",
            event
        );

        return;
    }

    globalThis.io
        .to(getConversationRoom(conversationId))
        .emit(event, game);
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
                    socket.user?.id
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
                data?.callType ===
                "video"
                    ? "video"
                    : "audio";

            // ====================================================
            // VALIDATION
            // ====================================================

            if (
                !Number.isInteger(
                    callerId
                ) ||
                callerId <= 0
            ) {
                throw new Error(
                    "Invalid caller."
                );
            }

            if (
                !Number.isInteger(
                    receiverId
                ) ||
                receiverId <= 0
            ) {
                throw new Error(
                    "Invalid receiver."
                );
            }

            if (
                !Number.isInteger(
                    conversationId
                ) ||
                conversationId <= 0
            ) {
                throw new Error(
                    "Invalid conversation."
                );
            }

            if (
                callerId ===
                receiverId
            ) {
                throw new Error(
                    "Cannot call yourself."
                );
            }

            // ====================================================
            // CHECK IF CALLER ALREADY HAS A CALL
            // ====================================================

            if (
                userActiveCalls.has(
                    callerId
                )
            ) {
                const response = {
                    success: false,

                    message:
                        "You are already in another call.",

                    reason: "busy",
                };

                if (
                    typeof callback ===
                    "function"
                ) {
                    callback(
                        response
                    );
                }

                return;
            }

            // ====================================================
            // CHECK IF RECEIVER IS ALREADY IN A CALL
            // ====================================================

            if (
                userActiveCalls.has(
                    receiverId
                )
            ) {
                const response = {
                    success: false,

                    message:
                        "User is busy.",

                    reason: "busy",
                };

                if (
                    typeof callback ===
                    "function"
                ) {
                    callback(
                        response
                    );
                }

                // Notify caller UI too.
                socket.emit(
                    "call_rejected",
                    {
                        callId: null,

                        conversationId,

                        callerId,

                        receiverId,

                        reason: "busy",
                    }
                );

                return;
            }

            // ====================================================
            // GENERATE ONE OFFICIAL CALL ID
            // ====================================================

            const callId =
                `${callerId}-${receiverId}-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 10)}`;

            // ====================================================
            // STORE CALL
            // ====================================================

            const call = {
                callId,

                conversationId,

                callerId,

                receiverId,

                callType,

                status: "ringing",

                createdAt:
                    Date.now(),
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

            console.log(
                "📞 CALL CREATED:",
                call
            );

            // ====================================================
            // GET CALLER INFORMATION
            // ====================================================

            const caller =
                await prisma.user.findUnique(
                    {
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
                    }
                );

            // ====================================================
            // SEND INCOMING CALL
            // ====================================================

            io.to(
                getUserRoom(
                    receiverId
                )
            ).emit(
                "incoming_call",
                {
                    callId,

                    conversationId,

                    callerId,

                    receiverId,

                    callType,

                    // Compatibility
                    type:
                        callType,

                    caller:
                        caller || {
                            id:
                                callerId,
                        },
                }
            );

            // ====================================================
            // SEND SUCCESS TO CALLER
            // ====================================================

            const response = {
                success: true,

                callId,

                type:
                    callType,

                callType,

                message:
                    "Call started",
            };

            if (
                typeof callback ===
                "function"
            ) {
                callback(
                    response
                );
            }
        } catch (error) {
            console.error(
                "❌ CALL_USER ERROR:",
                error
            );

            if (
                typeof callback ===
                "function"
            ) {
                callback({
                    success: false,

                    message:
                        error?.message ||
                        "Unable to start call.",
                });
            }
        }
    }
);

                // ====================================================
                // ACCEPT CALL
                // ====================================================
socket.on(
    "call_accept",
    async (data) => {
        try {
            const userId =
                Number(
                    socket.user?.id
                );

            const callId =
                data?.callId;

            if (!callId) {
                console.error(
                    "❌ call_accept: missing callId"
                );

                return;
            }

            const call =
                activeCalls.get(
                    callId
                );

            if (!call) {
                console.error(
                    "❌ call_accept: call not found:",
                    callId
                );

                return;
            }

            // Only receiver can accept.
            if (
                Number(
                    call.receiverId
                ) !== userId
            ) {
                console.error(
                    "❌ Unauthorized call acceptance:",
                    {
                        callId,
                        userId,
                    }
                );

                return;
            }

            call.status =
                "active";

            activeCalls.set(
                callId,
                call
            );

            console.log(
                "✅ CALL ACCEPTED:",
                call
            );

            // ----------------------------------------------------
            // NOTIFY CALLER
            // ----------------------------------------------------

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

                    callerId:
                        call.callerId,

                    receiverId:
                        call.receiverId,

                    callType:
                        call.callType,

                    type:
                        call.callType,
                }
            );
        } catch (error) {
            console.error(
                "❌ CALL ACCEPT ERROR:",
                error
            );
        }
    }
);

                // ====================================================
                // REJECT CALL
                // ====================================================

               socket.on(
    "call_reject",
    async (data) => {
        try {
            const userId =
                Number(
                    socket.user?.id
                );

            const callId =
                data?.callId;

            const reason =
                data?.reason ||
                "rejected";

            if (!callId) {
                console.error(
                    "❌ call_reject: missing callId"
                );

                return;
            }

            const call =
                activeCalls.get(
                    callId
                );

            if (!call) {
                console.warn(
                    "⚠️ call_reject: call not found:",
                    callId
                );

                return;
            }

            if (
                userId !==
                    call.callerId &&
                userId !==
                    call.receiverId
            ) {
                console.error(
                    "❌ Unauthorized call rejection:",
                    {
                        callId,
                        userId,
                    }
                );

                return;
            }

            console.log(
                "❌ CALL REJECTED:",
                {
                    callId,
                    reason,
                }
            );

            cleanupCall(
                callId
            );

            // Notify both sides
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

                    callerId:
                        call.callerId,

                    receiverId:
                        call.receiverId,

                    reason,
                }
            );

            io.to(
                getUserRoom(
                    call.receiverId
                )
            ).emit(
                "call_rejected",
                {
                    callId,

                    conversationId:
                        call.conversationId,

                    callerId:
                        call.callerId,

                    receiverId:
                        call.receiverId,

                    reason,
                }
            );
        } catch (error) {
            console.error(
                "❌ CALL_REJECT ERROR:",
                error
            );
        }
    }
);

                // ====================================================
                // END CALL
                // ====================================================

             socket.on(
    "call_end",
    async (data) => {
        try {
            const userId =
                Number(
                    socket.user?.id
                );

            const callId =
                data?.callId;

            const reason =
                data?.reason ||
                "ended";

            if (!callId) {
                console.warn(
                    "⚠️ call_end: missing callId"
                );

                return;
            }

            const call =
                activeCalls.get(
                    callId
                );

            if (!call) {
                console.warn(
                    "⚠️ call_end: call already cleaned:",
                    callId
                );

                return;
            }

            if (
                userId !==
                    call.callerId &&
                userId !==
                    call.receiverId
            ) {
                console.error(
                    "❌ Unauthorized call end:",
                    {
                        callId,
                        userId,
                    }
                );

                return;
            }

            console.log(
                "📞 CALL ENDED:",
                {
                    callId,
                    reason,
                }
            );

            cleanupCall(
                callId
            );

            const payload = {
                callId,

                conversationId:
                    call.conversationId,

                callerId:
                    call.callerId,

                receiverId:
                    call.receiverId,

                reason,
            };

            // Notify caller
            io.to(
                getUserRoom(
                    call.callerId
                )
            ).emit(
                "call_ended",
                payload
            );

            // Notify receiver
            io.to(
                getUserRoom(
                    call.receiverId
                )
            ).emit(
                "call_ended",
                payload
            );
        } catch (error) {
            console.error(
                "❌ CALL_END ERROR:",
                error
            );
        }
    }
);

// ============================================================
// WEBRTC OFFER
// ============================================================

socket.on(
    "webrtc_offer",
    async (data, callback) => {
        try {
            const currentUserId =
                Number(
                    socket.user?.id
                );

            const callId =
                data?.callId;

            const offer =
                data?.offer;

            if (
                !callId ||
                !offer
            ) {
                callback?.({
                    success: false,

                    message:
                        "Call ID and offer are required.",
                });

                return;
            }

            const call =
                activeCalls.get(
                    callId
                );

            if (!call) {
                callback?.({
                    success: false,

                    message:
                        "Call not found.",
                });

                return;
            }

            // ----------------------------------------------------
            // SECURITY
            // ----------------------------------------------------

            if (
                currentUserId !==
                    call.callerId &&
                currentUserId !==
                    call.receiverId
            ) {
                callback?.({
                    success: false,

                    message:
                        "You are not part of this call.",
                });

                return;
            }

            // ----------------------------------------------------
            // FIND OTHER USER
            // ----------------------------------------------------

            const receiverId =
                currentUserId ===
                call.callerId
                    ? call.receiverId
                    : call.callerId;

            // ----------------------------------------------------
            // FORWARD OFFER
            // ----------------------------------------------------

            io.to(
                getUserRoom(
                    receiverId
                )
            ).emit(
                "webrtc_offer",
                {
                    callId,

                    conversationId:
                        call.conversationId,

                    offer,

                    // IMPORTANT
                    fromUserId:
                        currentUserId,

                    // Compatibility
                    senderId:
                        currentUserId,

                    callerId:
                        currentUserId,

                    receiverId,
                }
            );

            console.log(
                "📡 WebRTC OFFER forwarded:",
                {
                    callId,
                    from:
                        currentUserId,
                    to:
                        receiverId,
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
                    "Failed to send WebRTC offer.",
            });
        }
    }
);

// ============================================================
// WEBRTC ANSWER
// ============================================================

socket.on(
    "webrtc_answer",
    async (data, callback) => {
        try {
            const currentUserId =
                Number(
                    socket.user?.id
                );

            const callId =
                data?.callId;

            const answer =
                data?.answer;

            if (
                !callId ||
                !answer
            ) {
                callback?.({
                    success: false,

                    message:
                        "Call ID and answer are required.",
                });

                return;
            }

            const call =
                activeCalls.get(
                    callId
                );

            if (!call) {
                callback?.({
                    success: false,

                    message:
                        "Call not found.",
                });

                return;
            }

            // ----------------------------------------------------
            // SECURITY
            // ----------------------------------------------------

            if (
                currentUserId !==
                    call.callerId &&
                currentUserId !==
                    call.receiverId
            ) {
                callback?.({
                    success: false,

                    message:
                        "You are not part of this call.",
                });

                return;
            }

            // ----------------------------------------------------
            // FIND OTHER USER
            // ----------------------------------------------------

            const receiverId =
                currentUserId ===
                call.callerId
                    ? call.receiverId
                    : call.callerId;

            // ----------------------------------------------------
            // FORWARD ANSWER
            // ----------------------------------------------------

            io.to(
                getUserRoom(
                    receiverId
                )
            ).emit(
                "webrtc_answer",
                {
                    callId,

                    conversationId:
                        call.conversationId,

                    answer,

                    fromUserId:
                        currentUserId,

                    senderId:
                        currentUserId,

                    callerId:
                        currentUserId,

                    receiverId,
                }
            );

            console.log(
                "📡 WebRTC ANSWER forwarded:",
                {
                    callId,
                    from:
                        currentUserId,
                    to:
                        receiverId,
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
                    "Failed to send WebRTC answer.",
            });
        }
    }
);

// ============================================================
// ICE CANDIDATE
// ============================================================

socket.on(
    "ice_candidate",
    (data) => {
        try {
            const currentUserId =
                Number(
                    socket.user?.id
                );

            const callId =
                data?.callId;

            const candidate =
                data?.candidate;

            if (
                !callId ||
                !candidate
            ) {
                return;
            }

            const call =
                activeCalls.get(
                    callId
                );

            if (!call) {
                console.warn(
                    "⚠️ ICE: call not found:",
                    callId
                );

                return;
            }

            // ----------------------------------------------------
            // SECURITY
            // ----------------------------------------------------

            if (
                currentUserId !==
                    call.callerId &&
                currentUserId !==
                    call.receiverId
            ) {
                console.warn(
                    "⚠️ ICE: unauthorized user:",
                    currentUserId
                );

                return;
            }

            // ----------------------------------------------------
            // FIND OTHER USER
            // ----------------------------------------------------

            const receiverId =
                currentUserId ===
                call.callerId
                    ? call.receiverId
                    : call.callerId;

            // ----------------------------------------------------
            // FORWARD ICE
            // ----------------------------------------------------

            io.to(
                getUserRoom(
                    receiverId
                )
            ).emit(
                "ice_candidate",
                {
                    callId,

                    conversationId:
                        call.conversationId,

                    candidate,

                    fromUserId:
                        currentUserId,

                    senderId:
                        currentUserId,

                    callerId:
                        call.callerId,

                    receiverId:
                        call.receiverId,
                }
            );
        } catch (error) {
            console.error(
                "❌ ICE CANDIDATE ERROR:",
                error
            );
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


// ============================================================
// ============================================================
// GAME FEATURE
// ============================================================
// ============================================================

// ============================================================
// JOIN GAME ROOM
// ============================================================

socket.on(
    "join_game",
    async (data, callback) => {
        try {
            const gameId = Number(data?.gameId);

            if (
                !Number.isInteger(gameId) ||
                gameId <= 0
            ) {
                return callback?.({
                    success: false,
                    message: "Invalid game ID.",
                });
            }

            const game =
                await prisma.game.findUnique({
                    where: {
                        id: gameId,
                    },
                });

            if (!game) {
                return callback?.({
                    success: false,
                    message: "Game not found.",
                });
            }

            if (
                game.status === "FINISHED" ||
                game.status === "CANCELLED"
            ) {
                return callback?.({
                    success: false,
                    message:
                        "This game is no longer active.",
                });
            }

            const isMember =
                await isConversationMember(
                    userId,
                    game.conversationId
                );

            if (!isMember) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a member of this conversation.",
                });
            }

            // Join dedicated game room
            socket.join(
                getGameRoom(game.id)
            );

            console.log(
                `🎮 User ${userId} joined game room ${game.id}`
            );

            callback?.({
                success: true,
                gameId: game.id,
                conversationId:
                    game.conversationId,
                game,
            });
        } catch (error) {
            console.error(
                "❌ JOIN GAME SOCKET ERROR:",
                error
            );

            callback?.({
                success: false,
                message:
                    "Failed to join game room.",
            });
        }
    }
);

// ============================================================
// LEAVE GAME ROOM
// ============================================================

socket.on(
    "leave_game",
    async (data, callback) => {
        try {
            const gameId =
                Number(data?.gameId);

            if (
                !Number.isInteger(gameId) ||
                gameId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid game ID.",
                });
            }

            socket.leave(
                getGameRoom(gameId)
            );

            console.log(
                `🎮 User ${userId} left game room ${gameId}`
            );

            callback?.({
                success: true,
                gameId,
            });
        } catch (error) {
            console.error(
                "❌ LEAVE GAME SOCKET ERROR:",
                error
            );

            callback?.({
                success: false,
                message:
                    "Failed to leave game room.",
            });
        }
    }
);

// ============================================================
// GAME MOVE
// ============================================================

socket.on(
    "game_move",
    async (data, callback) => {
        try {
            const gameId =
                Number(data?.gameId);

            const currentUserId =
                Number(socket.user?.id);

            // ========================================================
            // VALIDATION
            // ========================================================

            if (
                !Number.isInteger(gameId) ||
                gameId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid game ID.",
                });
            }

            if (
                !Number.isInteger(
                    currentUserId
                ) ||
                currentUserId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Unauthorized.",
                });
            }

            // ========================================================
            // FIND GAME
            // ========================================================

            const game =
                await prisma.game.findUnique({
                    where: {
                        id: gameId,
                    },
                });

            if (!game) {
                return callback?.({
                    success: false,
                    message:
                        "Game not found.",
                });
            }

            // ========================================================
            // CHECK GAME STATUS
            // ========================================================

            if (
                game.status !== "PLAYING"
            ) {
                return callback?.({
                    success: false,
                    message:
                        "This game is not currently playing.",
                });
            }

            // ========================================================
            // CHECK CONVERSATION MEMBERSHIP
            // ========================================================

            const isMember =
                await isConversationMember(
                    currentUserId,
                    game.conversationId
                );

            if (!isMember) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a member of this conversation.",
                });
            }

            // ========================================================
            // CURRENT STATE
            // ========================================================

            const currentState =
                game.state &&
                typeof game.state === "object"
                    ? game.state
                    : {};

            const players =
                currentState.players || {};

            // ========================================================
            // CHECK PLAYER
            // ========================================================

            const isPlayer =
                Object.values(
                    players
                ).some(
                    (playerId) =>
                        Number(playerId) ===
                        currentUserId
                );

            if (!isPlayer) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a player in this game.",
                });
            }

            let updatedState = {
                ...currentState,
            };

            let gameFinished = false;

            // ========================================================
            // TIC TAC TOE
            // ========================================================

            if (
                game.type ===
                "TIC_TAC_TOE"
            ) {
                const index =
                    Number(data?.index);

                const board =
                    Array.isArray(
                        currentState.board
                    )
                        ? [
                              ...currentState.board,
                          ]
                        : [];

                if (
                    !Number.isInteger(
                        index
                    ) ||
                    index < 0 ||
                    index > 8
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "Invalid Tic-Tac-Toe position.",
                    });
                }

                if (
                    board.length !== 9
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "Invalid game board.",
                    });
                }

                const playerSymbol =
                    Object.entries(
                        players
                    ).find(
                        ([, playerId]) =>
                            Number(
                                playerId
                            ) ===
                            currentUserId
                    )?.[0];

                if (
                    !playerSymbol ||
                    ![
                        "X",
                        "O",
                    ].includes(
                        playerSymbol
                    )
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "Invalid player.",
                    });
                }

                // Turn validation
                if (
                    currentState.turn !==
                    playerSymbol
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "It is not your turn.",
                    });
                }

                // Cell validation
                if (
                    board[index] !== null
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "That position is already occupied.",
                    });
                }

                board[index] =
                    playerSymbol;

                const winner =
                    checkTicTacToeWinner(
                        board
                    );

                const draw =
                    !winner &&
                    isTicTacToeDraw(
                        board
                    );

                updatedState = {
                    ...currentState,

                    board,

                    winner,

                    draw,

                    turn:
                        winner || draw
                            ? currentState.turn
                            : playerSymbol ===
                              "X"
                            ? "O"
                            : "X",
                };

                gameFinished =
                    Boolean(
                        winner ||
                            draw
                    );
            }

            // ========================================================
            // CONNECT FOUR
            // ========================================================

            else if (
                game.type ===
                "CONNECT_FOUR"
            ) {
                const column =
                    Number(
                        data?.column
                    );

                const board =
                    Array.isArray(
                        currentState.board
                    )
                        ? currentState.board.map(
                              (row) =>
                                  Array.isArray(
                                      row
                                  )
                                      ? [
                                            ...row,
                                        ]
                                      : []
                          )
                        : [];

                if (
                    !Number.isInteger(
                        column
                    ) ||
                    column < 0 ||
                    column > 6
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "Invalid Connect Four column.",
                    });
                }

                if (
                    board.length !==
                        6 ||
                    board.some(
                        (row) =>
                            row.length !==
                            7
                    )
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "Invalid game board.",
                    });
                }

                const player =
                    Object.entries(
                        players
                    ).find(
                        ([, playerId]) =>
                            Number(
                                playerId
                            ) ===
                            currentUserId
                    )?.[0];

                if (
                    !player ||
                    ![
                        "RED",
                        "YELLOW",
                    ].includes(
                        player
                    )
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "Invalid player.",
                    });
                }

                // Turn validation
                if (
                    currentState.turn !==
                    player
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "It is not your turn.",
                    });
                }

                // Find lowest available row
                let targetRow = -1;

                for (
                    let row = 5;
                    row >= 0;
                    row--
                ) {
                    if (
                        board[row][
                            column
                        ] === null
                    ) {
                        targetRow =
                            row;
                        break;
                    }
                }

                if (
                    targetRow === -1
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "That column is full.",
                    });
                }

                board[targetRow][
                    column
                ] = player;

                const winner =
                    checkConnectFourWinner(
                        board,
                        targetRow,
                        column,
                        player
                    )
                        ? player
                        : null;

                const draw =
                    !winner &&
                    isConnectFourDraw(
                        board
                    );

                updatedState = {
                    ...currentState,

                    board,

                    winner,

                    draw,

                    turn:
                        winner || draw
                            ? currentState.turn
                            : player ===
                              "RED"
                            ? "YELLOW"
                            : "RED",
                };

                gameFinished =
                    Boolean(
                        winner ||
                            draw
                    );
            }

            // ========================================================
            // ROCK PAPER SCISSORS
            // ========================================================

            else if (
                game.type ===
                "ROCK_PAPER_SCISSORS"
            ) {
                const choice =
                    String(
                        data?.choice ||
                            ""
                    ).toLowerCase();

                if (
                    !VALID_RPS_CHOICES.includes(
                        choice
                    )
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "Invalid choice. Use rock, paper, or scissors.",
                    });
                }

                const player1 =
                    Number(
                        players.player1
                    );

                const player2 =
                    Number(
                        players.player2
                    );

                if (
                    !player1 ||
                    !player2
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "The game does not have two players yet.",
                    });
                }

                if (
                    currentUserId !==
                        player1 &&
                    currentUserId !==
                        player2
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "You are not a player in this game.",
                    });
                }

                const choices = {
                    ...(currentState.choices ||
                        {}),
                };

                // Prevent duplicate choice
                if (
                    choices[
                        String(
                            currentUserId
                        )
                    ]
                ) {
                    return callback?.({
                        success: false,
                        message:
                            "You already selected a choice.",
                    });
                }

                choices[
                    String(
                        currentUserId
                    )
                ] = choice;

                const player1Choice =
                    choices[
                        String(
                            player1
                        )
                    ];

                const player2Choice =
                    choices[
                        String(
                            player2
                        )
                    ];

                let winner = null;
                let draw = false;
                let roundFinished =
                    false;

                if (
                    player1Choice &&
                    player2Choice
                ) {
                    roundFinished =
                        true;

                    const result =
                        getRpsWinner(
                            player1Choice,
                            player2Choice
                        );

                    if (
                        result ===
                        "PLAYER1"
                    ) {
                        winner =
                            player1;
                    } else if (
                        result ===
                        "PLAYER2"
                    ) {
                        winner =
                            player2;
                    } else {
                        draw = true;
                    }

                    gameFinished =
                        true;
                }

                updatedState = {
                    ...currentState,

                    choices,

                    winner,

                    draw,

                    roundFinished,
                };
            }

            // ========================================================
            // UNSUPPORTED GAME
            // ========================================================

            else {
                return callback?.({
                    success: false,
                    message:
                        "Unsupported game type.",
                });
            }

            // ========================================================
            // UPDATE GAME STATUS
            // ========================================================

            const newStatus =
                gameFinished
                    ? "FINISHED"
                    : "PLAYING";

            const updatedGame =
                await prisma.game.update({
                    where: {
                        id: gameId,
                    },

                    data: {
                        status:
                            newStatus,

                        state:
                            updatedState,
                    },
                });

            // ========================================================
            // EMIT GAME UPDATED
            // ========================================================

            io.to(
                getGameRoom(
                    gameId
                )
            ).emit(
                "game_updated",
                updatedGame
            );

            io.to(
                getConversationRoom(
                    game.conversationId
                )
            ).emit(
                "game_updated",
                updatedGame
            );

            // ========================================================
            // GAME FINISHED
            // ========================================================

            if (
                gameFinished
            ) {
                io.to(
                    getGameRoom(
                        gameId
                    )
                ).emit(
                    "game_finished",
                    updatedGame
                );

                io.to(
                    getConversationRoom(
                        game.conversationId
                    )
                ).emit(
                    "game_finished",
                    updatedGame
                );

                console.log(
                    `🏆 GAME FINISHED: ${game.type} #${gameId}`
                );
            } else {
                console.log(
                    `🎮 GAME UPDATED: ${game.type} #${gameId}`
                );
            }

            callback?.({
                success: true,
                game:
                    updatedGame,
            });
        } catch (error) {
            console.error(
                "❌ GAME MOVE SOCKET ERROR:",
                error
            );

            callback?.({
                success: false,
                message:
                    "Failed to process game move.",
            });
        }
    }
);

// ============================================================
// CANCEL GAME
// ============================================================

socket.on(
    "cancel_game",
    async (data, callback) => {
        try {
            const gameId =
                Number(data?.gameId);

            const currentUserId =
                Number(socket.user?.id);

            if (
                !Number.isInteger(
                    gameId
                ) ||
                gameId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Invalid game ID.",
                });
            }

            if (
                !Number.isInteger(
                    currentUserId
                ) ||
                currentUserId <= 0
            ) {
                return callback?.({
                    success: false,
                    message:
                        "Unauthorized.",
                });
            }

            const game =
                await prisma.game.findUnique({
                    where: {
                        id: gameId,
                    },
                });

            if (!game) {
                return callback?.({
                    success: false,
                    message:
                        "Game not found.",
                });
            }

            if (
                game.status ===
                    "FINISHED" ||
                game.status ===
                    "CANCELLED"
            ) {
                return callback?.({
                    success: false,
                    message:
                        "This game is already closed.",
                });
            }

            const isMember =
                await isConversationMember(
                    currentUserId,
                    game.conversationId
                );

            if (!isMember) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a member of this conversation.",
                });
            }

            const state =
                game.state &&
                typeof game.state ===
                    "object"
                    ? game.state
                    : {};

            const players =
                state.players ||
                {};

            const isPlayer =
                Object.values(
                    players
                ).some(
                    (playerId) =>
                        Number(
                            playerId
                        ) ===
                        currentUserId
                );

            if (!isPlayer) {
                return callback?.({
                    success: false,
                    message:
                        "You are not a player in this game.",
                });
            }

            const updatedGame =
                await prisma.game.update({
                    where: {
                        id: gameId,
                    },

                    data: {
                        status:
                            "CANCELLED",

                        state: {
                            ...state,

                            endedBy:
                                currentUserId,

                            endReason:
                                "PLAYER_LEFT",
                        },
                    },
                });

            // ========================================================
            // GAME CANCELLED
            // ========================================================

            io.to(
                getGameRoom(
                    gameId
                )
            ).emit(
                "game_cancelled",
                updatedGame
            );

            io.to(
                getConversationRoom(
                    game.conversationId
                )
            ).emit(
                "game_cancelled",
                updatedGame
            );

            // Also update game state
            io.to(
                getGameRoom(
                    gameId
                )
            ).emit(
                "game_updated",
                updatedGame
            );

            io.to(
                getConversationRoom(
                    game.conversationId
                )
            ).emit(
                "game_updated",
                updatedGame
            );

            console.log(
                `🚫 GAME CANCELLED: ${game.type} #${gameId} by user ${currentUserId}`
            );

            callback?.({
                success: true,
                game:
                    updatedGame,
            });
        } catch (error) {
            console.error(
                "❌ CANCEL GAME SOCKET ERROR:",
                error
            );

            callback?.({
                success: false,
                message:
                    "Failed to cancel game.",
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



// ----------------------------------------------------
// ACCEPT CALL
// ----------------------------------------------------




// ----------------------------------------------------
// REJECT CALL
// ----------------------------------------------------



// ----------------------------------------------------
// WEBRTC OFFER
// ----------------------------------------------------



// ----------------------------------------------------
// WEBRTC ANSWER
// ----------------------------------------------------



// ----------------------------------------------------
// ICE CANDIDATE
// ----------------------------------------------------





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