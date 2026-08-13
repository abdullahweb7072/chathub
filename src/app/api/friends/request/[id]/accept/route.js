import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// COOKIE PARSER
// ============================================================

function parseCookies(cookieHeader) {
    const cookies = {};

    if (!cookieHeader) {
        return cookies;
    }

    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...valueParts] = cookie.trim().split("=");

        if (!name) {
            return;
        }

        const value = valueParts.join("=");

        try {
            cookies[name] = decodeURIComponent(value);
        } catch {
            cookies[name] = value;
        }
    });

    return cookies;
}

// ============================================================
// POST - ACCEPT FRIEND REQUEST
// ============================================================

export async function POST(request, { params }) {
    try {
        // ========================================================
        // AUTHENTICATION
        // ========================================================

        const cookieHeader = request.headers.get("cookie");

        const cookies = parseCookies(cookieHeader);

        const token = cookies.Token;

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized",
                },
                { status: 401 }
            );
        }

        if (!process.env.JWT_SECRET) {
            console.error(
                "❌ JWT_SECRET is not configured"
            );

            return NextResponse.json(
                {
                    success: false,
                    message: "Server configuration error",
                },
                { status: 500 }
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
                "❌ JWT verification failed:",
                error.message
            );

            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid or expired token",
                },
                { status: 401 }
            );
        }

        const currentUserId = Number(decoded.id);

        if (
            !Number.isInteger(currentUserId) ||
            currentUserId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid user",
                },
                { status: 401 }
            );
        }

        // ========================================================
        // NEXT.JS 16
        // params IS A PROMISE
        // ========================================================

        const resolvedParams = await params;

        const requestId = Number(
            resolvedParams?.id
        );

        console.log("");
        console.log(
            "========================================"
        );
        console.log(
            "ACCEPT FRIEND REQUEST"
        );
        console.log(
            "========================================"
        );
        console.log(
            "Friend Request ID:",
            requestId
        );
        console.log(
            "Current User ID:",
            currentUserId
        );
        console.log(
            "========================================"
        );

        // ========================================================
        // VALIDATE REQUEST ID
        // ========================================================

        if (
            !Number.isInteger(requestId) ||
            requestId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invalid friend request ID",
                },
                { status: 400 }
            );
        }

        // ========================================================
        // FIND FRIEND REQUEST
        // ========================================================

        const friendRequest =
            await prisma.friendRequest.findUnique({
                where: {
                    id: requestId,
                },

                include: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },

                    receiver: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },
                },
            });

        if (!friendRequest) {
            console.log(
                `❌ Friend request ${requestId} not found`
            );

            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Friend request not found",
                },
                { status: 404 }
            );
        }

        console.log(
            "Friend Request:",
            {
                id: friendRequest.id,
                senderId:
                    friendRequest.senderId,
                receiverId:
                    friendRequest.receiverId,
                status:
                    friendRequest.status,
            }
        );

        // ========================================================
        // VERIFY CURRENT USER IS RECEIVER
        // ========================================================

        if (
            friendRequest.receiverId !==
            currentUserId
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "You are not authorized to accept this friend request",
                },
                { status: 403 }
            );
        }

        // ========================================================
        // CHECK REQUEST STATUS
        // ========================================================

        if (
            friendRequest.status ===
            "ACCEPTED"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "You are already friends",
                },
                { status: 409 }
            );
        }

        if (
            friendRequest.status !==
            "PENDING"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        `This friend request is ${friendRequest.status.toLowerCase()}`,
                },
                { status: 409 }
            );
        }

        // ========================================================
        // USER IDS
        // ========================================================

        const senderId =
            friendRequest.senderId;

        const receiverId =
            friendRequest.receiverId;

        // ========================================================
        // TRANSACTION
        // ========================================================

        const result =
            await prisma.$transaction(
                async (tx) => {

                    // ==================================================
                    // 1. ACCEPT FRIEND REQUEST
                    // ==================================================

                    const updatedRequest =
                        await tx.friendRequest.update({
                            where: {
                                id: requestId,
                            },

                            data: {
                                status:
                                    "ACCEPTED",
                            },

                            include: {
                                sender: {
                                    select: {
                                        id: true,
                                        username:
                                            true,
                                        avatar:
                                            true,
                                    },
                                },

                                receiver: {
                                    select: {
                                        id: true,
                                        username:
                                            true,
                                        avatar:
                                            true,
                                    },
                                },
                            },
                        });

                    // ==================================================
                    // 2. CREATE FRIENDSHIP
                    //
                    // sender -> receiver
                    // receiver -> sender
                    //
                    // We use upsert so this is safe even if
                    // friendship records already exist.
                    // ==================================================

                    const friendshipOne =
                        await tx.friendship.upsert({
                            where: {
                                userId_friendId: {
                                    userId:
                                        senderId,
                                    friendId:
                                        receiverId,
                                },
                            },

                            update: {},

                            create: {
                                userId:
                                    senderId,
                                friendId:
                                    receiverId,
                            },
                        });

                    const friendshipTwo =
                        await tx.friendship.upsert({
                            where: {
                                userId_friendId: {
                                    userId:
                                        receiverId,
                                    friendId:
                                        senderId,
                                },
                            },

                            update: {},

                            create: {
                                userId:
                                    receiverId,
                                friendId:
                                    senderId,
                            },
                        });

                    console.log(
                        "🤝 Friendship created:",
                        {
                            friendshipOne:
                                friendshipOne.id,
                            friendshipTwo:
                                friendshipTwo.id,
                        }
                    );

                    // ==================================================
                    // 3. FIND EXISTING DIRECT CONVERSATION
                    // ==================================================

                    const existingConversations =
                        await tx.conversation.findMany({
                            where: {
                                type: "DIRECT",

                                members: {
                                    some: {
                                        userId:
                                            senderId,
                                    },
                                },

                                AND: [
                                    {
                                        members: {
                                            some: {
                                                userId:
                                                    receiverId,
                                            },
                                        },
                                    },
                                ],
                            },

                            include: {
                                members: {
                                    select: {
                                        id: true,
                                        userId: true,
                                        conversationId:
                                            true,
                                        joinedAt:
                                            true,
                                        lastReadAt:
                                            true,
                                        isMuted:
                                            true,
                                        isArchived:
                                            true,
                                    },
                                },
                            },
                        });

                    // ==================================================
                    // FIND CONVERSATION WITH ONLY THESE TWO USERS
                    // ==================================================

                    let conversation =
                        existingConversations.find(
                            (conv) => {

                                if (
                                    conv.members
                                        .length !==
                                    2
                                ) {
                                    return false;
                                }

                                const hasSender =
                                    conv.members.some(
                                        (member) =>
                                            member.userId ===
                                            senderId
                                    );

                                const hasReceiver =
                                    conv.members.some(
                                        (member) =>
                                            member.userId ===
                                            receiverId
                                    );

                                return (
                                    hasSender &&
                                    hasReceiver
                                );
                            }
                        );

                    // ==================================================
                    // 4. CREATE CONVERSATION IF NEEDED
                    // ==================================================

                    if (!conversation) {

                        conversation =
                            await tx.conversation.create({
                                data: {
                                    type:
                                        "DIRECT",

                                    createdBy:
                                        receiverId,

                                    members: {
                                        create: [
                                            {
                                                userId:
                                                    senderId,
                                            },
                                            {
                                                userId:
                                                    receiverId,
                                            },
                                        ],
                                    },
                                },

                                include: {
                                    members: {
                                        select: {
                                            id: true,
                                            userId:
                                                true,
                                            conversationId:
                                                true,
                                            joinedAt:
                                                true,
                                            lastReadAt:
                                                true,
                                            isMuted:
                                                true,
                                            isArchived:
                                                true,
                                        },
                                    },
                                },
                            });

                        console.log(
                            `💬 Created DIRECT conversation ${conversation.id}`
                        );

                    } else {

                        // ==================================================
                        // 5. ENSURE BOTH USERS ARE MEMBERS
                        // ==================================================

                        await tx.conversationMember.upsert({
                            where: {
                                userId_conversationId:
                                    {
                                        userId:
                                            senderId,

                                        conversationId:
                                            conversation.id,
                                    },
                            },

                            update: {},

                            create: {
                                userId:
                                    senderId,

                                conversationId:
                                    conversation.id,
                            },
                        });

                        await tx.conversationMember.upsert({
                            where: {
                                userId_conversationId:
                                    {
                                        userId:
                                            receiverId,

                                        conversationId:
                                            conversation.id,
                                    },
                            },

                            update: {},

                            create: {
                                userId:
                                    receiverId,

                                conversationId:
                                    conversation.id,
                            },
                        });

                        console.log(
                            `💬 Existing DIRECT conversation ${conversation.id} reused`
                        );
                    }

                    // ==================================================
                    // 6. FETCH COMPLETE CONVERSATION
                    // ==================================================

                    const completeConversation =
                        await tx.conversation.findUnique({
                            where: {
                                id:
                                    conversation.id,
                            },

                            include: {
                                members: {
                                    include: {
                                        user: {
                                            select: {
                                                id: true,
                                                username:
                                                    true,
                                                avatar:
                                                    true,
                                                isOnline:
                                                    true,
                                                lastSeen:
                                                    true,
                                            },
                                        },
                                    },
                                },
                            },
                        });

                    // ==================================================
                    // RETURN TRANSACTION RESULT
                    // ==================================================

                    return {
                        friendRequest:
                            updatedRequest,

                        friendship: {
                            senderId,
                            receiverId,
                        },

                        conversation:
                            completeConversation,
                    };
                }
            );

        // ========================================================
        // SUCCESS
        // ========================================================

        console.log("");
        console.log(
            "========================================"
        );
        console.log(
            "✅ FRIEND REQUEST ACCEPTED"
        );
        console.log(
            "========================================"
        );

        console.log(
            "Friend Request:",
            result.friendRequest.id
        );

        console.log(
            "Friendship:",
            senderId,
            "↔",
            receiverId
        );

        console.log(
            "Conversation:",
            result.conversation?.id
        );

        console.log(
            "========================================"
        );

        return NextResponse.json(
            {
                success: true,

                message:
                    "Friend request accepted successfully",

                data: {
                    friendRequest:
                        result.friendRequest,

                    friendship:
                        result.friendship,

                    conversation:
                        result.conversation,
                },
            },
            { status: 200 }
        );

    } catch (error) {

        console.error(
            "❌ ACCEPT FRIEND REQUEST ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to accept friend request",
            },
            { status: 500 }
        );
    }
}