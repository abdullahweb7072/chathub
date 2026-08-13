import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// ============================================================
// ALLOWED REACTIONS
// ============================================================

const ALLOWED_REACTIONS = [
    "❤️",
    "👍",
    "😂",
    "😮",
    "😢",
    "😡",
];

// ============================================================
// GET CURRENT USER'S REACTION
// ============================================================

export async function GET(request, { params }) {
    try {
        // ========================================================
        // AUTH
        // ========================================================

        const currentUser =
            await verifyAuth(request);

        const currentUserId =
            Number(currentUser.id);

        if (!currentUserId) {
            return Response.json(
                {
                    success: false,
                    message: "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // PARAMS
        // ========================================================

        const { id } = await params;

        const statusId = Number(id);

        if (
            !statusId ||
            Number.isNaN(statusId)
        ) {
            return Response.json(
                {
                    success: false,
                    message: "Invalid status ID",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // FIND STATUS
        // ========================================================

        const status =
            await prisma.status.findUnique({
                where: {
                    id: statusId,
                },

                select: {
                    id: true,
                    userId: true,
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

        if (!status) {
            return Response.json(
                {
                    success: false,
                    message: "Status not found",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // EXPIRATION
        // ========================================================

        if (
            status.expiresAt <=
            new Date()
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "This status has expired",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // GET CURRENT USER REACTION
        // ========================================================

        const reaction =
            await prisma.statusReaction.findUnique({
                where: {
                    statusId_userId: {
                        statusId,
                        userId:
                            currentUserId,
                    },
                },

                select: {
                    id: true,
                    statusId: true,
                    userId: true,
                    reaction: true,
                    message: true,
                    createdAt: true,
                },
            });

        // ========================================================
        // RESPONSE
        // ========================================================

        return Response.json({
            success: true,

            statusId,

            reaction: reaction
                ? {
                      id:
                          reaction.id,

                      statusId:
                          reaction.statusId,

                      userId:
                          reaction.userId,

                      reaction:
                          reaction.reaction,

                      message:
                          reaction.message,

                      createdAt:
                          reaction.createdAt,
                  }
                : null,

            status: {
                id:
                    status.id,

                userId:
                    status.userId,

                content:
                    status.content,

                mediaUrl:
                    status.mediaUrl,

                mediaType:
                    status.mediaType,

                mediaName:
                    status.mediaName,

                backgroundColor:
                    status.backgroundColor,

                createdAt:
                    status.createdAt,

                expiresAt:
                    status.expiresAt,

                user:
                    status.user,
            },
        });
    } catch (error) {
        console.error(
            "GET STATUS REACTION ERROR:",
            error
        );

        if (
            error?.message ===
            "Unauthorized"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        return Response.json(
            {
                success: false,
                message:
                    "Failed to get status reaction",
            },
            {
                status: 500,
            }
        );
    }
}

// ============================================================
// POST
//
// TWO INDEPENDENT OPERATIONS
//
// REACTION ONLY:
//
// {
//     reaction: "❤️",
//     message: ""
// }
//
// Creates a ChatHub message:
//
//     content = "❤️"
//
// TEXT REPLY:
//
// {
//     reaction: "❤️",
//     message: "Nice status!"
// }
//
// Creates a ChatHub message:
//
//     content = "Nice status!"
//
// IMPORTANT:
//
// Reaction and text are NEVER combined.
//
// ============================================================

export async function POST(request, { params }) {
    try {
        // ========================================================
        // AUTH
        // ========================================================

        const currentUser =
            await verifyAuth(request);

        const currentUserId =
            Number(currentUser.id);

        if (!currentUserId) {
            return Response.json(
                {
                    success: false,
                    message: "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // PARAMS
        // ========================================================

        const { id } = await params;

        const statusId = Number(id);

        if (
            !statusId ||
            Number.isNaN(statusId)
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid status ID",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // BODY
        // ========================================================

        const body =
            await request.json();

        const reaction =
            typeof body?.reaction ===
            "string"
                ? body.reaction.trim()
                : "";

        const responseMessage =
            typeof body?.message ===
            "string"
                ? body.message.trim()
                : "";

        // ========================================================
        // VALIDATE REACTION
        // ========================================================

        if (!reaction) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Reaction is required",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !ALLOWED_REACTIONS.includes(
                reaction
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid reaction",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // VALIDATE MESSAGE
        // ========================================================

        if (
            responseMessage.length >
            2000
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Status reply cannot exceed 2000 characters",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // FIND STATUS
        // ========================================================

        const status =
            await prisma.status.findUnique({
                where: {
                    id: statusId,
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
                    expiresAt: true,

                    user: {
                        select: {
                            id: true,
                            username:
                                true,
                            displayName:
                                true,
                            avatar: true,
                        },
                    },
                },
            });

        if (!status) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Status not found",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // EXPIRATION
        // ========================================================

        if (
            status.expiresAt <=
            new Date()
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "This status has expired",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // OWNER CANNOT REACT / REPLY
        // ========================================================

        if (
            Number(status.userId) ===
            currentUserId
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "You cannot react to your own status",
                },
                {
                    status: 403,
                }
            );
        }

        // ========================================================
        // FIND EXISTING STATUS REACTION
        // ========================================================

        const existingReaction =
            await prisma.statusReaction.findUnique({
                where: {
                    statusId_userId: {
                        statusId,
                        userId:
                            currentUserId,
                    },
                },

                select: {
                    id: true,
                    reaction: true,
                    message: true,
                    createdAt: true,
                },
            });

        // ========================================================
        // DETERMINE OPERATION
        // ========================================================

        const isTextReply =
            Boolean(responseMessage);

        const isReactionOnly =
            !isTextReply;

        // ========================================================
        // SAVE / UPDATE STATUS REACTION
        // ========================================================
        //
        // StatusReaction represents the user's CURRENT
        // reaction to the status.
        //
        // Text replies are separate ChatHub messages and
        // do not overwrite StatusReaction.message.
        //
        // ========================================================

        let savedReaction;

        if (isReactionOnly) {
            // ====================================================
            // REACTION ONLY
            // ====================================================

            savedReaction =
                await prisma.statusReaction.upsert({
                    where: {
                        statusId_userId: {
                            statusId,
                            userId:
                                currentUserId,
                        },
                    },

                    create: {
                        statusId,
                        userId:
                            currentUserId,
                        reaction,
                        message: null,
                    },

                    update: {
                        reaction,
                    },

                    select: {
                        id: true,
                        statusId: true,
                        userId: true,
                        reaction: true,
                        message: true,
                        createdAt: true,
                    },
                });
        } else {
            // ====================================================
            // TEXT REPLY
            // ====================================================
            //
            // Keep the existing reaction unchanged.
            //
            // If no reaction exists, create one so the current
            // reaction can still be associated with this user.
            //
            // ====================================================

            if (existingReaction) {
                savedReaction =
                    existingReaction;
            } else {
                savedReaction =
                    await prisma.statusReaction.create({
                        data: {
                            statusId,
                            userId:
                                currentUserId,
                            reaction,
                            message: null,
                        },

                        select: {
                            id: true,
                            statusId: true,
                            userId: true,
                            reaction: true,
                            message: true,
                            createdAt: true,
                        },
                    });
            }
        }

        // ========================================================
        // CURRENT USER
        // ========================================================

        const reactionUser =
            await prisma.user.findUnique({
                where: {
                    id: currentUserId,
                },

                select: {
                    id: true,
                    username: true,
                    displayName:
                        true,
                    avatar: true,
                },
            });

        // ========================================================
        // FIND DIRECT CONVERSATION
        // ========================================================

        const conversation =
            await prisma.conversation.findFirst({
                where: {
                    type: "DIRECT",

                    AND: [
                        {
                            members: {
                                some: {
                                    userId:
                                        currentUserId,
                                },
                            },
                        },

                        {
                            members: {
                                some: {
                                    userId:
                                        Number(
                                            status.userId
                                        ),
                                },
                            },
                        },
                    ],
                },

                select: {
                    id: true,
                },
            });

        // ========================================================
        // CREATE CHAT MESSAGE
        // ========================================================

        let reactionMessage = null;

        if (conversation?.id) {
            // ====================================================
            // MESSAGE CONTENT
            // ====================================================
            //
            // REACTION:
            //
            //     ❤️
            //
            // TEXT:
            //
            //     Nice status!
            //
            // NEVER:
            //
            //     ❤️ Nice status!
            //
            // ====================================================

            const chatContent =
                isTextReply
                    ? responseMessage
                    : reaction;

            // ====================================================
            // CREATE MESSAGE
            // ====================================================

            const createdMessage =
                await prisma.message.create({
                    data: {
                        conversationId:
                            conversation.id,

                        senderId:
                            currentUserId,

                        content:
                            chatContent,

                        type: "TEXT",

                        statusId:
                            status.id,
                    },

                    select: {
                        id: true,
                        conversationId:
                            true,
                        senderId: true,
                        content: true,
                        type: true,
                        statusId: true,
                        createdAt: true,

                        status: {
                            select: {
                                id: true,
                                userId:
                                    true,
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
                                        avatar: true,
                                    },
                                },
                            },
                        },
                    },
                });

            // ====================================================
            // CREATE MESSAGE RECEIPT
            // ====================================================
            //
            // IMPORTANT:
            //
            // The status owner is the recipient of this
            // ChatHub message.
            //
            // This is what allows:
            //
            //     ✓
            //
            // to become:
            //
            //     ✓✓
            //
            // and later:
            //
            //     ✓✓ read
            //
            // ====================================================

            const recipientId =
                Number(status.userId);

            await prisma.messageReceipt.upsert({
                where: {
                    messageId_userId: {
                        messageId:
                            createdMessage.id,

                        userId:
                            recipientId,
                    },
                },

                create: {
                    messageId:
                        createdMessage.id,

                    userId:
                        recipientId,
                },

                update: {},
            });

            // ====================================================
            // LOAD RECEIPTS
            // ====================================================

            const receipts =
                await prisma.messageReceipt.findMany({
                    where: {
                        messageId:
                            createdMessage.id,
                    },

                    select: {
                        id: true,
                        messageId: true,
                        userId: true,
                        deliveredAt:
                            true,
                        readAt: true,
                    },
                });

            // ====================================================
            // COMPLETE MESSAGE
            // ====================================================

            reactionMessage = {
                ...createdMessage,

                receipts,
            };

            // ====================================================
            // BROADCAST THROUGH SOCKET.IO
            // ====================================================
            //
            // server.js exposes:
            //
            // globalThis.io
            //
            // This makes the status reaction/reply behave
            // exactly like a normal ChatHub message.
            //
            // ====================================================

            const io =
                globalThis.io;

            if (io) {
                io.to(
                    `conversation:${conversation.id}`
                ).emit(
                    "new_message",
                    reactionMessage
                );
            }
        }

        // ========================================================
        // STATUS PREVIEW
        // ========================================================

        const statusPreview = {
            id: status.id,

            userId:
                status.userId,

            content:
                status.content,

            mediaUrl:
                status.mediaUrl,

            mediaType:
                status.mediaType,

            mediaName:
                status.mediaName,

            backgroundColor:
                status.backgroundColor,

            createdAt:
                status.createdAt,

            user:
                status.user,
        };

        // ========================================================
        // RESPONSE
        // ========================================================

        return Response.json(
            {
                success: true,

                message:
                    isTextReply
                        ? "Status reply sent successfully"
                        : "Status reaction sent successfully",

                // ==================================================
                // CURRENT STATUS REACTION
                // ==================================================

                reaction: {
                    id:
                        savedReaction.id,

                    statusId:
                        savedReaction.statusId,

                    userId:
                        savedReaction.userId,

                    reaction:
                        savedReaction.reaction,

                    message:
                        savedReaction.message,

                    createdAt:
                        savedReaction.createdAt,

                    user:
                        reactionUser,
                },

                // ==================================================
                // STATUS
                // ==================================================

                status:
                    statusPreview,

                // ==================================================
                // CHAT MESSAGE
                // ==================================================

                chatMessage:
                    reactionMessage,

                // ==================================================
                // STATUS REPLY INFO
                // ==================================================

                statusReply: {
                    statusId:
                        status.id,

                    statusOwnerId:
                        status.userId,

                    reaction,

                    message:
                        isTextReply
                            ? responseMessage
                            : null,

                    isReply:
                        isTextReply,

                    isReaction:
                        isReactionOnly,

                    messageCreated:
                        Boolean(
                            reactionMessage
                        ),

                    preview:
                        statusPreview,
                },
            },

            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "POST STATUS REACTION ERROR:",
            error
        );

        if (
            error?.message ===
            "Unauthorized"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        return Response.json(
            {
                success: false,
                message:
                    "Failed to save status reaction",
            },
            {
                status: 500,
            }
        );
    }
}

// ============================================================
// DELETE REACTION
// ============================================================
//
// Removes the CURRENT status reaction.
//
// IMPORTANT:
//
// This does NOT delete previously-created ChatHub messages.
//
// ============================================================

export async function DELETE(
    request,
    { params }
) {
    try {
        // ========================================================
        // AUTH
        // ========================================================

        const currentUser =
            await verifyAuth(request);

        const currentUserId =
            Number(currentUser.id);

        if (!currentUserId) {
            return Response.json(
                {
                    success: false,
                    message: "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // PARAMS
        // ========================================================

        const { id } = await params;

        const statusId = Number(id);

        if (
            !statusId ||
            Number.isNaN(statusId)
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid status ID",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // FIND REACTION
        // ========================================================

        const existingReaction =
            await prisma.statusReaction.findUnique({
                where: {
                    statusId_userId: {
                        statusId,
                        userId:
                            currentUserId,
                    },
                },

                select: {
                    id: true,
                    statusId: true,
                    reaction: true,
                    message: true,
                },
            });

        // ========================================================
        // NOTHING TO DELETE
        // ========================================================

        if (!existingReaction) {
            return Response.json({
                success: true,

                message:
                    "No reaction found",

                statusId,

                reaction: null,
            });
        }

        // ========================================================
        // DELETE CURRENT REACTION
        // ========================================================

        await prisma.statusReaction.delete({
            where: {
                id:
                    existingReaction.id,
            },
        });

        // ========================================================
        // RESPONSE
        // ========================================================

        return Response.json({
            success: true,

            message:
                "Status reaction removed successfully",

            statusId,

            deletedReaction: {
                id:
                    existingReaction.id,

                reaction:
                    existingReaction.reaction,

                message:
                    existingReaction.message,
            },
        });
    } catch (error) {
        console.error(
            "DELETE STATUS REACTION ERROR:",
            error
        );

        if (
            error?.message ===
            "Unauthorized"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        return Response.json(
            {
                success: false,
                message:
                    "Failed to remove status reaction",
            },
            {
                status: 500,
            }
        );
    }
}