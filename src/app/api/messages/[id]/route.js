import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ================================================================
// PATCH - EDIT MESSAGE
// ================================================================

export async function PATCH(
    request,
    { params }
) {
    try {
        // ============================================================
        // 1. AUTHENTICATE USER
        // ============================================================

        const loggedInUser =
            await verifyAuth(request);

        // ============================================================
        // 2. GET MESSAGE ID
        // ============================================================

        const messageId =
            Number((await params).id);

        if (
            !Number.isInteger(messageId) ||
            messageId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invalid message ID",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // 3. GET NEW CONTENT
        // ============================================================

        const { content } =
            await request.json();

        if (
            typeof content !== "string" ||
            !content.trim()
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Message content is required",
                },
                { status: 400 }
            );
        }

        const trimmedContent =
            content.trim();

        // ============================================================
        // 4. LIMIT MESSAGE LENGTH
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
        // 5. FIND MESSAGE
        // ============================================================

        const message =
            await prisma.message.findUnique({
                where: {
                    id: messageId,
                },

                select: {
                    id: true,
                    senderId: true,
                    conversationId: true,
                    deletedAt: true,
                },
            });

        if (!message) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Message not found",
                },
                { status: 404 }
            );
        }

        // ============================================================
        // 6. CHECK OWNERSHIP
        // ============================================================

        if (
            message.senderId !==
            loggedInUser.id
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "You can only edit your own messages",
                },
                { status: 403 }
            );
        }

        // ============================================================
        // 7. DON'T EDIT DELETED MESSAGE
        // ============================================================

        if (message.deletedAt) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Deleted messages cannot be edited",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // 8. UPDATE MESSAGE
        // ============================================================

        const updatedMessage =
            await prisma.message.update({
                where: {
                    id: messageId,
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
        // 9. RETURN UPDATED MESSAGE
        // ============================================================

        return NextResponse.json(
            {
                success: true,
                message:
                    "Message updated successfully",
                data: updatedMessage,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error(
            "EDIT MESSAGE ERROR:",
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
// DELETE - DELETE MESSAGE
//
// mode = "forMe"
//      → Only current user's view is affected
//      → Message remains in Message table
//
// mode = "forEveryone"
//      → Only sender can do this
//      → Sets Message.deletedAt
//      → Message disappears for everyone
//
// ================================================================

export async function DELETE(
    request,
    { params }
) {
    try {
        // ============================================================
        // 1. AUTHENTICATE USER
        // ============================================================

        const loggedInUser =
            await verifyAuth(request);

        // ============================================================
        // 2. GET MESSAGE ID
        // ============================================================

        const messageId =
            Number((await params).id);

        if (
            !Number.isInteger(messageId) ||
            messageId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invalid message ID",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // 3. READ DELETE MODE
        // ============================================================

        let body = {};

        try {
            body = await request.json();
        } catch {
            body = {};
        }

        const mode =
            body?.mode || "forMe";

        // ============================================================
        // 4. VALIDATE DELETE MODE
        // ============================================================

        if (
            ![
                "forMe",
                "forEveryone",
            ].includes(mode)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invalid delete mode",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // 5. FIND MESSAGE
        // ============================================================

        const message =
            await prisma.message.findUnique({
                where: {
                    id: messageId,
                },

                select: {
                    id: true,
                    senderId: true,
                    conversationId: true,
                    deletedAt: true,
                },
            });

        if (!message) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Message not found",
                },
                { status: 404 }
            );
        }

        // ============================================================
        // 6. DELETE FOR ME
        //
        // IMPORTANT:
        //
        // We DO NOT modify message.deletedAt.
        //
        // Instead we create:
        //
        // MessageDeletion
        //      userId
        //      messageId
        //
        // This means only this user stops seeing the message.
        //
        // ============================================================

        if (mode === "forMe") {
            await prisma.messageDeletion.upsert(
                {
                    where: {
                        userId_messageId: {
                            userId:
                                loggedInUser.id,

                            messageId:
                                messageId,
                        },
                    },

                    update: {
                        deletedAt:
                            new Date(),
                    },

                    create: {
                        userId:
                            loggedInUser.id,

                        messageId:
                            messageId,
                    },
                }
            );

            return NextResponse.json(
                {
                    success: true,
                    mode: "forMe",
                    message:
                        "Message deleted for you",
                    messageId,
                },
                { status: 200 }
            );
        }

        // ============================================================
        // 7. DELETE FOR EVERYONE
        // ============================================================

        if (mode === "forEveryone") {
            // --------------------------------------------------------
            // Only message sender can delete for everyone
            // --------------------------------------------------------

            if (
                message.senderId !==
                loggedInUser.id
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "You can only delete your own messages for everyone",
                    },
                    { status: 403 }
                );
            }

            // --------------------------------------------------------
            // Don't delete an already deleted message
            // --------------------------------------------------------

            if (message.deletedAt) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Message has already been deleted for everyone",
                    },
                    { status: 400 }
                );
            }

            // --------------------------------------------------------
            // Soft delete globally
            // --------------------------------------------------------

            const deletedMessage =
                await prisma.message.update({
                    where: {
                        id: messageId,
                    },

                    data: {
                        deletedAt:
                            new Date(),
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

            return NextResponse.json(
                {
                    success: true,
                    mode: "forEveryone",
                    message:
                        "Message deleted for everyone",
                    data: deletedMessage,
                },
                { status: 200 }
            );
        }

        // ============================================================
        // 8. FALLBACK
        // ============================================================

        return NextResponse.json(
            {
                success: false,
                message:
                    "Invalid delete operation",
            },
            { status: 400 }
        );
    } catch (error) {
        console.error(
            "DELETE MESSAGE ERROR:",
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