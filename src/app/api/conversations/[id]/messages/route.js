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

        const loggedInUser =
            await verifyAuth(request);

        // ============================================================
        // 2. READ REQUEST BODY
        // ============================================================

        const body =
            await request.json();

        const {
            conversationId,
            content = "",
            type = "TEXT",
            attachmentUrl = null,
            attachmentName = null,
            attachmentSize = null,
            attachmentMimeType = null,

            // ========================================================
            // STATUS REPLY
            //
            // If your status reply system sends statusId,
            // this will connect the message to the status.
            // ========================================================

            statusId = null,
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
        // 4. VALIDATE MESSAGE TYPE
        // ============================================================

        const allowedTypes = [
            "TEXT",
            "IMAGE",
            "VIDEO",
            "FILE",
            "AUDIO",
        ];

        if (
            !allowedTypes.includes(type)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invalid message type",
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

        // ============================================================
        // STATUS ID
        // ============================================================

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
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Invalid status ID",
                    },
                    { status: 400 }
                );
            }
        }

        if (
            !trimmedContent &&
            !hasAttachment &&
            !parsedStatusId
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Message content, attachment, or status is required",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // 6. LIMIT MESSAGE LENGTH
        // ============================================================

        if (
            trimmedContent.length >
            5000
        ) {
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

        let parsedAttachmentSize =
            null;

        if (
            attachmentSize !== null &&
            attachmentSize !== undefined &&
            attachmentSize !== ""
        ) {
            parsedAttachmentSize =
                Number(
                    attachmentSize
                );

            if (
                !Number.isInteger(
                    parsedAttachmentSize
                ) ||
                parsedAttachmentSize < 0
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Invalid attachment size",
                    },
                    { status: 400 }
                );
            }
        }

        // ============================================================
        // 8. CHECK CONVERSATION MEMBERSHIP
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
        // 9. VALIDATE STATUS
        // ============================================================

        if (parsedStatusId) {
            const status =
                await prisma.status.findUnique(
                    {
                        where: {
                            id:
                                parsedStatusId,
                        },

                        select: {
                            id: true,
                            userId: true,
                            content: true,
                            mediaUrl: true,
                            mediaType: true,
                            mediaName: true,
                            backgroundColor:
                                true,
                            createdAt: true,
                        },
                    }
                );

            if (!status) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Status not found",
                    },
                    { status: 404 }
                );
            }
        }

        // ============================================================
        // 10. CREATE MESSAGE
        // ============================================================

        const message =
            await prisma.message.create(
                {
                    data: {
                        content:
                            trimmedContent,

                        type,

                        senderId:
                            loggedInUser.id,

                        conversationId:
                            conversationIdNumber,

                        // ====================================================
                        // STATUS RELATION
                        // ====================================================

                        ...(parsedStatusId && {
                            status: {
                                connect: {
                                    id:
                                        parsedStatusId,
                                },
                            },
                        }),

                        ...(hasAttachment && {
                            attachmentUrl:
                                attachmentUrl.trim(),
                        }),

                        ...(attachmentName && {
                            attachmentName,
                        }),

                        ...(parsedAttachmentSize !==
                            null && {
                            attachmentSize:
                                parsedAttachmentSize,
                        }),

                        ...(attachmentMimeType && {
                            attachmentMimeType,
                        }),
                    },

                    include: {
                        // ====================================================
                        // SENDER
                        // ====================================================

                        sender: {
                            select: {
                                id: true,
                                displayName:
                                    true,
                                username:
                                    true,
                                email: true,
                                avatar: true,
                                isOnline:
                                    true,
                            },
                        },

                        // ====================================================
                        // STATUS
                        // ====================================================

                        status: {
                            select: {
                                id: true,
                                userId: true,
                                content:
                                    true,
                                mediaUrl:
                                    true,
                                mediaType:
                                    true,
                                mediaName:
                                    true,
                                backgroundColor:
                                    true,
                                createdAt:
                                    true,

                                user: {
                                    select: {
                                        id: true,
                                        username:
                                            true,
                                        displayName:
                                            true,
                                        avatar:
                                            true,
                                    },
                                },
                            },
                        },

                        // ====================================================
                        // REACTIONS
                        // ====================================================

                        reactions: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        displayName:
                                            true,
                                        username:
                                            true,
                                        avatar:
                                            true,
                                    },
                                },
                            },
                        },

                        // ====================================================
                        // RECEIPTS
                        // ====================================================

                        receipts: {
                            select: {
                                id: true,
                                messageId:
                                    true,
                                userId:
                                    true,
                                deliveredAt:
                                    true,
                                readAt:
                                    true,
                            },
                        },
                    },
                }
            );

        // ============================================================
        // 11. CREATE MESSAGE RECEIPTS
        // ============================================================

        const recipients =
            await prisma.conversationMember.findMany(
                {
                    where: {
                        conversationId:
                            conversationIdNumber,

                        userId: {
                            not:
                                loggedInUser.id,
                        },
                    },

                    select: {
                        userId: true,
                    },
                }
            );

        if (
            recipients.length >
            0
        ) {
            await prisma.messageReceipt.createMany(
                {
                    data:
                        recipients.map(
                            (
                                recipient
                            ) => ({
                                messageId:
                                    message.id,

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
                }
            );
        }

        // ============================================================
        // 12. LOAD FINAL RECEIPTS
        // ============================================================

        const receipts =
            await prisma.messageReceipt.findMany(
                {
                    where: {
                        messageId:
                            message.id,
                    },

                    select: {
                        id: true,
                        messageId:
                            true,
                        userId: true,
                        deliveredAt:
                            true,
                        readAt: true,
                    },
                }
            );

        const messageWithReceipts = {
            ...message,
            receipts,
        };

        // ============================================================
        // 13. UPDATE CONVERSATION TIMESTAMP
        // ============================================================

        await prisma.conversation.update(
            {
                where: {
                    id:
                        conversationIdNumber,
                },

                data: {
                    updatedAt:
                        new Date(),
                },
            }
        );

        // ============================================================
        // 14. RETURN SUCCESS
        // ============================================================

        return NextResponse.json(
            {
                success: true,

                message:
                    "Message sent successfully",

                data:
                    messageWithReceipts,
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
                    message:
                        "Unauthorized",
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

export async function GET(
    request,
    context
) {
    try {
        // ============================================================
        // 1. AUTHENTICATE USER
        // ============================================================

        const loggedInUser =
            await verifyAuth(request);

        // ============================================================
        // 2. GET CONVERSATION ID
        // ============================================================

        const { id } =
            await context.params;

        const conversationId =
            Number(id);

        // ============================================================
        // 3. VALIDATE CONVERSATION ID
        // ============================================================

        if (
            !Number.isInteger(
                conversationId
            ) ||
            conversationId <= 0
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
        // 4. CHECK CONVERSATION MEMBERSHIP
        // ============================================================

        const membership =
            await prisma.conversationMember.findUnique(
                {
                    where: {
                        userId_conversationId: {
                            userId:
                                loggedInUser.id,

                            conversationId,
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
        // 5. LOAD MESSAGES
        // ============================================================

        const messages =
            await prisma.message.findMany(
                {
                    where: {
                        conversationId,

                        deletedAt: null,

                        deletedForUsers: {
                            none: {
                                userId:
                                    loggedInUser.id,
                            },
                        },
                    },

                    orderBy: {
                        createdAt:
                            "asc",
                    },

                    include: {
                        // ==================================================
                        // SENDER
                        // ==================================================

                        sender: {
                            select: {
                                id: true,
                                displayName:
                                    true,
                                username:
                                    true,
                                email: true,
                                avatar: true,
                                isOnline:
                                    true,
                            },
                        },

                        // ==================================================
                        // STATUS
                        //
                        // THIS IS THE IMPORTANT PART.
                        //
                        // Every message that is a status reply now
                        // contains its original status.
                        // ==================================================

                        status: {
                            select: {
                                id: true,
                                userId: true,
                                content:
                                    true,
                                mediaUrl:
                                    true,
                                mediaType:
                                    true,
                                mediaName:
                                    true,
                                backgroundColor:
                                    true,
                                createdAt:
                                    true,

                                user: {
                                    select: {
                                        id: true,
                                        username:
                                            true,
                                        displayName:
                                            true,
                                        avatar:
                                            true,
                                    },
                                },
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
                                        displayName:
                                            true,
                                        username:
                                            true,
                                        avatar:
                                            true,
                                    },
                                },
                            },
                        },

                        // ==================================================
                        // MESSAGE RECEIPTS
                        // ==================================================

                        receipts: {
                            select: {
                                id: true,
                                messageId:
                                    true,
                                userId:
                                    true,
                                deliveredAt:
                                    true,
                                readAt:
                                    true,
                            },
                        },
                    },
                }
            );

        // ============================================================
        // 6. RETURN MESSAGES
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
                    message:
                        "Unauthorized",
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