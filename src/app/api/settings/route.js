import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import { prisma } from "@/lib/prisma";

// ============================================================
// GET /api/settings
// GET CURRENT USER SETTINGS
// ============================================================

export async function GET() {
    try {
        // ========================================================
        // GET TOKEN
        // ========================================================

        const cookieStore = await cookies();

        const token = cookieStore.get("Token")?.value;

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // CHECK JWT SECRET
        // ========================================================

        if (!process.env.JWT_SECRET) {
            console.error(
                "❌ JWT_SECRET is not configured."
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "Server configuration error.",
                },
                {
                    status: 500,
                }
            );
        }

        // ========================================================
        // VERIFY JWT
        // ========================================================

        let decoded;

        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );
        } catch (error) {
            console.error(
                "❌ SETTINGS JWT ERROR:",
                error.message
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid or expired token.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // GET USER ID
        // ========================================================

        const userId = Number(
            decoded?.id ??
            decoded?.userId
        );

        if (
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid user information.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // FIND USER
        // ========================================================

        const user =
            await prisma.user.findUnique({
                where: {
                    id: userId,
                },

                select: {
                    id: true,

                    // Notifications
                    messageNotifications: true,
                    friendRequestNotifications: true,
                    notificationSound: true,
                    notificationPreview: true,

                    // Privacy
                    showOnlineStatus: true,
                    showLastSeen: true,
                    readReceipts: true,
                    typingIndicator: true,

                    // Presence
                    isOnline: true,
                    lastSeen: true,
                },
            });

        // ========================================================
        // USER NOT FOUND
        // ========================================================

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // RETURN SETTINGS
        // ========================================================

        return NextResponse.json(
            {
                success: true,

                settings: {
                    notifications: {
                        messages:
                            user.messageNotifications,

                        friendRequests:
                            user.friendRequestNotifications,

                        sound:
                            user.notificationSound,

                        preview:
                            user.notificationPreview,
                    },

                    privacy: {
                        onlineStatus:
                            user.showOnlineStatus,

                        lastSeen:
                            user.showLastSeen,

                        readReceipts:
                            user.readReceipts,

                        typingIndicator:
                            user.typingIndicator,
                    },

                    // Do NOT expose lastSeen here
                    // as a general presence value.
                    //
                    // The server should decide whether another
                    // user is allowed to see it.
                },
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "❌ GET SETTINGS ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch settings.",
            },
            {
                status: 500,
            }
        );
    }
}


// ============================================================
// PUT /api/settings
// UPDATE CURRENT USER SETTINGS
// ============================================================

export async function PUT(request) {
    try {
        // ========================================================
        // GET TOKEN
        // ========================================================

        const cookieStore = await cookies();

        const token = cookieStore.get("Token")?.value;

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // CHECK JWT SECRET
        // ========================================================

        if (!process.env.JWT_SECRET) {
            console.error(
                "❌ JWT_SECRET is not configured."
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "Server configuration error.",
                },
                {
                    status: 500,
                }
            );
        }

        // ========================================================
        // VERIFY JWT
        // ========================================================

        let decoded;

        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );
        } catch (error) {
            console.error(
                "❌ SETTINGS JWT ERROR:",
                error.message
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid or expired token.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // GET USER ID
        // ========================================================

        const userId = Number(
            decoded?.id ??
            decoded?.userId
        );

        if (
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid user information.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // READ BODY
        // ========================================================

        let body;

        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid JSON body.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // GET SETTINGS
        // ========================================================

        const notifications =
            body?.notifications;

        const privacy =
            body?.privacy;

        // ========================================================
        // BUILD UPDATE DATA
        // ========================================================

        const updateData = {};

        // ========================================================
        // NOTIFICATION SETTINGS
        // ========================================================

        if (
            notifications &&
            typeof notifications === "object"
        ) {
            // ----------------------------------------------------
            // Messages
            // ----------------------------------------------------

            if (
                notifications.messages !== undefined
            ) {
                if (
                    typeof notifications.messages !==
                    "boolean"
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            error:
                                "messages must be a boolean.",
                        },
                        {
                            status: 400,
                        }
                    );
                }

                updateData.messageNotifications =
                    notifications.messages;
            }

            // ----------------------------------------------------
            // Friend Requests
            // ----------------------------------------------------

            if (
                notifications.friendRequests !==
                undefined
            ) {
                if (
                    typeof notifications.friendRequests !==
                    "boolean"
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            error:
                                "friendRequests must be a boolean.",
                        },
                        {
                            status: 400,
                        }
                    );
                }

                updateData.friendRequestNotifications =
                    notifications.friendRequests;
            }

            // ----------------------------------------------------
            // Sound
            // ----------------------------------------------------

            if (
                notifications.sound !== undefined
            ) {
                if (
                    typeof notifications.sound !==
                    "boolean"
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            error:
                                "sound must be a boolean.",
                        },
                        {
                            status: 400,
                        }
                    );
                }

                updateData.notificationSound =
                    notifications.sound;
            }

            // ----------------------------------------------------
            // Preview
            // ----------------------------------------------------

            if (
                notifications.preview !== undefined
            ) {
                if (
                    typeof notifications.preview !==
                    "boolean"
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            error:
                                "preview must be a boolean.",
                        },
                        {
                            status: 400,
                        }
                    );
                }

                updateData.notificationPreview =
                    notifications.preview;
            }
        }

        // ========================================================
        // PRIVACY SETTINGS
        // ========================================================

        if (
            privacy &&
            typeof privacy === "object"
        ) {
            // ----------------------------------------------------
            // ONLINE STATUS
            // ----------------------------------------------------

            if (
                privacy.onlineStatus !== undefined
            ) {
                if (
                    typeof privacy.onlineStatus !==
                    "boolean"
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            error:
                                "onlineStatus must be a boolean.",
                        },
                        {
                            status: 400,
                        }
                    );
                }

                updateData.showOnlineStatus =
                    privacy.onlineStatus;
            }

            // ----------------------------------------------------
            // LAST SEEN
            // ----------------------------------------------------

            if (
                privacy.lastSeen !== undefined
            ) {
                if (
                    typeof privacy.lastSeen !==
                    "boolean"
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            error:
                                "lastSeen must be a boolean.",
                        },
                        {
                            status: 400,
                        }
                    );
                }

                updateData.showLastSeen =
                    privacy.lastSeen;
            }

            // ----------------------------------------------------
            // READ RECEIPTS
            // ----------------------------------------------------

            if (
                privacy.readReceipts !== undefined
            ) {
                if (
                    typeof privacy.readReceipts !==
                    "boolean"
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            error:
                                "readReceipts must be a boolean.",
                        },
                        {
                            status: 400,
                        }
                    );
                }

                updateData.readReceipts =
                    privacy.readReceipts;
            }

            // ----------------------------------------------------
            // TYPING INDICATOR
            // ----------------------------------------------------

            if (
                privacy.typingIndicator !==
                undefined
            ) {
                if (
                    typeof privacy.typingIndicator !==
                    "boolean"
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            error:
                                "typingIndicator must be a boolean.",
                        },
                        {
                            status: 400,
                        }
                    );
                }

                updateData.typingIndicator =
                    privacy.typingIndicator;
            }
        }

        // ========================================================
        // NOTHING TO UPDATE
        // ========================================================

        if (
            Object.keys(updateData).length === 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "No settings changes provided.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // GET PREVIOUS STATE
        // ========================================================

        const previousUser =
            await prisma.user.findUnique({
                where: {
                    id: userId,
                },

                select: {
                    id: true,

                    showOnlineStatus: true,
                    showLastSeen: true,

                    readReceipts: true,
                    typingIndicator: true,

                    messageNotifications: true,
                    friendRequestNotifications: true,
                    notificationSound: true,
                    notificationPreview: true,

                    isOnline: true,
                    lastSeen: true,
                },
            });

        if (!previousUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // SAVE CHANGES
        // ========================================================

        const updatedUser =
            await prisma.user.update({
                where: {
                    id: userId,
                },

                data: updateData,

                select: {
                    id: true,

                    // Notifications
                    messageNotifications: true,
                    friendRequestNotifications: true,
                    notificationSound: true,
                    notificationPreview: true,

                    // Privacy
                    showOnlineStatus: true,
                    showLastSeen: true,
                    readReceipts: true,
                    typingIndicator: true,

                    // Presence
                    isOnline: true,
                    lastSeen: true,
                },
            });

        // ========================================================
        // SOCKET.IO REAL-TIME PRIVACY UPDATE
        // ========================================================

        const io = globalThis.io;

        if (io) {
            // ====================================================
            // BROADCAST GENERIC PRIVACY UPDATE
            // ====================================================

            io.emit(
                "privacy_settings_updated",
                {
                    userId: updatedUser.id,

                    privacy: {
                        onlineStatus:
                            updatedUser.showOnlineStatus,

                        lastSeen:
                            updatedUser.showLastSeen,

                        readReceipts:
                            updatedUser.readReceipts,

                        typingIndicator:
                            updatedUser.typingIndicator,
                    },
                }
            );

            // ====================================================
            // ONLINE STATUS CHANGED
            // ====================================================

            const onlineStatusChanged =
                previousUser.showOnlineStatus !==
                updatedUser.showOnlineStatus;

            if (onlineStatusChanged) {
                // ------------------------------------------------
                // ONLINE STATUS DISABLED
                // ------------------------------------------------

                if (
                    updatedUser.showOnlineStatus ===
                    false
                ) {
                    console.log(
                        `🔒 User ${userId} disabled online status`
                    );

                    io.emit(
                        "user_offline",
                        {
                            userId:
                                updatedUser.id,

                            lastSeen:
                                null,

                            privacyHidden:
                                true,
                        }
                    );
                }

                // ------------------------------------------------
                // ONLINE STATUS ENABLED
                // ------------------------------------------------

                else {
                    console.log(
                        `👁️ User ${userId} enabled online status`
                    );

                    if (
                        updatedUser.isOnline
                    ) {
                        io.emit(
                            "user_online",
                            {
                                userId:
                                    updatedUser.id,
                            }
                        );
                    }
                }
            }

            // ====================================================
            // LAST SEEN PRIVACY CHANGED
            // ====================================================

            const lastSeenPrivacyChanged =
                previousUser.showLastSeen !==
                updatedUser.showLastSeen;

            if (lastSeenPrivacyChanged) {
                // ------------------------------------------------
                // LAST SEEN DISABLED
                // ------------------------------------------------

                if (
                    updatedUser.showLastSeen ===
                    false
                ) {
                    console.log(
                        `🔒 User ${userId} disabled last seen`
                    );

                    // IMPORTANT:
                    //
                    // Never send the real timestamp when
                    // lastSeen privacy is disabled.
                    //
                    io.emit(
                        "user_last_seen_updated",
                        {
                            userId:
                                updatedUser.id,

                            lastSeen:
                                null,

                            privacyHidden:
                                true,
                        }
                    );
                }

                // ------------------------------------------------
                // LAST SEEN ENABLED
                // ------------------------------------------------

                else {
                    console.log(
                        `👁️ User ${userId} enabled last seen`
                    );

                    // If the user is currently offline,
                    // we can now reveal their stored lastSeen.
                    //
                    // If they are online, there is no need to
                    // send a lastSeen value.
                    //
                    if (
                        !updatedUser.isOnline
                    ) {
                        io.emit(
                            "user_last_seen_updated",
                            {
                                userId:
                                    updatedUser.id,

                                lastSeen:
                                    updatedUser.lastSeen ??
                                    null,

                                privacyHidden:
                                    false,
                            }
                        );
                    }
                }
            }

            // ====================================================
            // IMPORTANT:
            // IF ONLINE STATUS DID NOT CHANGE BUT LAST SEEN
            // PRIVACY CHANGED, CLIENTS STILL GET THE UPDATE.
            // ====================================================

            // ====================================================
            // IF LAST SEEN WAS DISABLED WHILE USER IS ONLINE,
            // CLEAR ANY OLD LAST-SEEN VALUE CLIENTS MAY HAVE.
            // ====================================================

            if (
                updatedUser.showLastSeen ===
                false
            ) {
                io.emit(
                    "user_last_seen_updated",
                    {
                        userId:
                            updatedUser.id,

                        lastSeen:
                            null,

                        privacyHidden:
                            true,
                    }
                );
            }
        } else {
            console.warn(
                "⚠️ globalThis.io is not available."
            );
        }

        // ========================================================
        // RETURN UPDATED SETTINGS
        // ========================================================

        return NextResponse.json(
            {
                success: true,

                message:
                    "Settings updated successfully.",

                settings: {
                    notifications: {
                        messages:
                            updatedUser.messageNotifications,

                        friendRequests:
                            updatedUser.friendRequestNotifications,

                        sound:
                            updatedUser.notificationSound,

                        preview:
                            updatedUser.notificationPreview,
                    },

                    privacy: {
                        onlineStatus:
                            updatedUser.showOnlineStatus,

                        lastSeen:
                            updatedUser.showLastSeen,

                        readReceipts:
                            updatedUser.readReceipts,

                        typingIndicator:
                            updatedUser.typingIndicator,
                    },
                },
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "❌ PUT SETTINGS ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "Failed to update settings.",
            },
            {
                status: 500,
            }
        );
    }
}