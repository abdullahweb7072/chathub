import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ================================================================
// POST - SEND MESSAGE
// ================================================================

export async function POST(request) {
    try {
        // ============================================================
        // 1. AUTHENTICATE USER
        // ============================================================

        const loggedInUser = await verifyAuth(request);

        // ============================================================
        // 2. READ REQUEST BODY
        // ============================================================

        const body = await request.json();

        const {
            conversationId,
            content = "",
            type = "TEXT",
            attachmentUrl = null,
            attachmentName = null,
            attachmentSize = null,
            attachmentMimeType = null,
        } = body || {};

        // ============================================================
        // 3. VALIDATE CONVERSATION ID
        // ============================================================

        if (
            conversationId === undefined ||
            conversationId === null ||
            conversationId === ""
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Conversation ID is required",
                },
                { status: 400 }
            );
        }

        const conversationIdNumber = Number(conversationId);

        if (
            !Number.isInteger(conversationIdNumber) ||
            conversationIdNumber <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid conversation ID",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // 4. VALIDATE MESSAGE TYPE
        // ============================================================

        const allowedTypes = [
            "TEXT",
            "IMAGE",
            "VIDEO",
            "FILE",
            "AUDIO",
        ];

        if (!allowedTypes.includes(type)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid message type",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // 5. VALIDATE CONTENT / ATTACHMENT
        // ============================================================

        const trimmedContent =
            typeof content === "string"
                ? content.trim()
                : "";

        const hasAttachment =
            typeof attachmentUrl === "string" &&
            attachmentUrl.trim().length > 0;

        if (!trimmedContent && !hasAttachment) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Message content or attachment is required",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // 6. LIMIT MESSAGE LENGTH
        // ============================================================

        if (trimmedContent.length > 5000) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Message cannot exceed 5000 characters",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // 7. VALIDATE ATTACHMENT SIZE
        // ============================================================

        let parsedAttachmentSize = null;

        if (
            attachmentSize !== null &&
            attachmentSize !== undefined &&
            attachmentSize !== ""
        ) {
            parsedAttachmentSize = Number(attachmentSize);

            if (
                !Number.isInteger(parsedAttachmentSize) ||
                parsedAttachmentSize < 0
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Invalid attachment size",
                    },
                    { status: 400 }
                );
            }
        }

        // ============================================================
        // 8. CHECK CONVERSATION MEMBERSHIP
        // ============================================================

        const membership =
            await prisma.conversationMember.findUnique({
                where: {
                    userId_conversationId: {
                        userId: loggedInUser.id,
                        conversationId: conversationIdNumber,
                    },
                },
            });

        if (!membership) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "You are not a member of this conversation",
                },
                { status: 403 }
            );
        }

        // ============================================================
        // 9. CREATE MESSAGE
        // ============================================================

        const message =
            await prisma.message.create({
                data: {
                    content: trimmedContent,

                    type,

                    senderId:
                        loggedInUser.id,

                    conversationId:
                        conversationIdNumber,

                    ...(hasAttachment && {
                        attachmentUrl:
                            attachmentUrl.trim(),
                    }),

                    ...(attachmentName && {
                        attachmentName,
                    }),

                    ...(parsedAttachmentSize !== null && {
                        attachmentSize:
                            parsedAttachmentSize,
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
                            email: true,
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

                    receipts: {
                        select: {
                            id: true,
                            messageId: true,
                            userId: true,
                            deliveredAt: true,
                            readAt: true,
                        },
                    },
                },
            });

        // ============================================================
        // 10. CREATE MESSAGE RECEIPTS
        // ============================================================

        const recipients =
            await prisma.conversationMember.findMany({
                where: {
                    conversationId:
                        conversationIdNumber,

                    userId: {
                        not: loggedInUser.id,
                    },
                },

                select: {
                    userId: true,
                },
            });

        if (recipients.length > 0) {
            await prisma.messageReceipt.createMany({
                data: recipients.map(
                    (recipient) => ({
                        messageId: message.id,
                        userId: recipient.userId,
                        deliveredAt: null,
                        readAt: null,
                    })
                ),

                skipDuplicates: true,
            });
        }

        // ============================================================
        // 11. LOAD FINAL RECEIPTS
        // ============================================================

        const receipts =
            await prisma.messageReceipt.findMany({
                where: {
                    messageId: message.id,
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
            ...message,
            receipts,
        };

        // ============================================================
        // 12. UPDATE CONVERSATION TIMESTAMP
        // ============================================================

        await prisma.conversation.update({
            where: {
                id: conversationIdNumber,
            },

            data: {
                updatedAt: new Date(),
            },
        });

        // ============================================================
        // 13. RETURN SUCCESS
        // ============================================================

        return NextResponse.json(
            {
                success: true,
                message:
                    "Message sent successfully",
                data: messageWithReceipts,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error(
            "SEND MESSAGE ERROR:",
            error
        );

        if (
            error.message ===
            "Unauthorized"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized",
                },
                { status: 401 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message:
                    "Something went wrong",
            },
            { status: 500 }
        );
    }
}

// ================================================================
// GET - GET CONVERSATION MESSAGES
// ================================================================

export async function GET(request) {
    try {
        // ============================================================
        // 1. AUTHENTICATE USER
        // ============================================================

        const loggedInUser =
            await verifyAuth(request);

        // ============================================================
        // 2. GET CONVERSATION ID
        // ============================================================

        const { searchParams } =
            new URL(request.url);

        const conversationId =
            searchParams.get(
                "conversationId"
            );

        if (!conversationId) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Conversation ID is required",
                },
                { status: 400 }
            );
        }

        const conversationIdNumber =
            Number(conversationId);

        if (
            !Number.isInteger(
                conversationIdNumber
            ) ||
            conversationIdNumber <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invalid conversation ID",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // 3. CHECK MEMBERSHIP
        // ============================================================

        const membership =
            await prisma.conversationMember.findUnique(
                {
                    where: {
                        userId_conversationId: {
                            userId:
                                loggedInUser.id,

                            conversationId:
                                conversationIdNumber,
                        },
                    },
                }
            );

        if (!membership) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "You are not a member of this conversation",
                },
                { status: 403 }
            );
        }

        // ============================================================
        // 4. GET MESSAGES
        //
        // deletedAt:
        //     null = message is visible globally
        //
        // deletedForUsers:
        //     current user has no deletion record
        //
        // ============================================================

        const messages =
            await prisma.message.findMany({
                where: {
                    conversationId:
                        conversationIdNumber,

                    // Delete for everyone
                    deletedAt: null,

                    // Delete for me
                    deletedForUsers: {
                        none: {
                            userId:
                                loggedInUser.id,
                        },
                    },
                },

                orderBy: {
                    createdAt: "asc",
                },

                include: {
                    // ==================================================
                    // SENDER
                    // ==================================================

                    sender: {
                        select: {
                            id: true,
                            displayName: true,
                            username: true,
                            email: true,
                            avatar: true,
                            isOnline: true,
                        },
                    },

                    // ==================================================
                    // REACTIONS
                    // ==================================================

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

                    // ==================================================
                    // RECEIPTS
                    // ==================================================

                    receipts: {
                        select: {
                            id: true,
                            messageId: true,
                            userId: true,
                            deliveredAt: true,
                            readAt: true,
                        },
                    },
                },
            });

        // ============================================================
        // 5. RETURN MESSAGES
        // ============================================================

        return NextResponse.json(
            {
                success: true,
                currentUserId:
                    loggedInUser.id,
                messages,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error(
            "GET MESSAGES ERROR:",
            error
        );

        if (
            error.message ===
            "Unauthorized"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized",
                },
                { status: 401 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message:
                    "Something went wrong",
            },
            { status: 500 }
        );
    }
}