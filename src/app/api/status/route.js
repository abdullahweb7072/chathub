import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// ============================================================
// GET ACTIVE STATUSES
// ============================================================
//
// Returns:
// - Current user's active statuses
// - Friends' active statuses
// - Current user's ID
//
// Friendship is checked in BOTH directions because the database
// relationship is directional:
//
// userId -> friendId
//
// ============================================================

export async function GET(request) {
    try {
        // ========================================================
        // AUTHENTICATION
        // ========================================================

        const user = await verifyAuth(request);

        const currentUserId = Number(user.id);

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
        // CURRENT TIME
        // ========================================================

        const now = new Date();

        // ========================================================
        // GET FRIENDSHIPS
        // ========================================================
        //
        // We check both:
        //
        // userId = current user
        //
        // AND
        //
        // friendId = current user
        //
        // This allows the status system to work regardless of
        // which direction the Friendship record was created.
        //
        // ========================================================

        const friendships =
            await prisma.friendship.findMany({
                where: {
                    OR: [
                        {
                            userId: currentUserId,
                        },
                        {
                            friendId: currentUserId,
                        },
                    ],
                },

                select: {
                    userId: true,
                    friendId: true,
                },
            });

        // ========================================================
        // EXTRACT FRIEND IDS
        // ========================================================

        const friendIds = friendships
            .map((friendship) => {
                const friendshipUserId =
                    Number(friendship.userId);

                const friendshipFriendId =
                    Number(friendship.friendId);

                // Current user is userId
                if (
                    friendshipUserId ===
                    currentUserId
                ) {
                    return friendshipFriendId;
                }

                // Current user is friendId
                if (
                    friendshipFriendId ===
                    currentUserId
                ) {
                    return friendshipUserId;
                }

                return null;
            })
            .filter(
                (id) =>
                    Number.isInteger(id) &&
                    id !== currentUserId
            );

        // ========================================================
        // REMOVE DUPLICATES
        // ========================================================

        const uniqueFriendIds = [
            ...new Set(friendIds),
        ];

        // ========================================================
        // ALLOWED USER IDS
        // ========================================================

        const allowedUserIds = [
            currentUserId,
            ...uniqueFriendIds,
        ];

        // ========================================================
        // DEBUG
        // ========================================================

        console.log(
            "========================================"
        );

        console.log(
            "STATUS CURRENT USER:",
            currentUserId
        );

        console.log(
            "STATUS FRIENDSHIPS:",
            friendships
        );

        console.log(
            "STATUS FRIEND IDS:",
            uniqueFriendIds
        );

        console.log(
            "STATUS ALLOWED USER IDS:",
            allowedUserIds
        );

        console.log(
            "========================================"
        );

        // ========================================================
        // GET ACTIVE STATUSES
        // ========================================================

        const statuses =
            await prisma.status.findMany({
                where: {
                    // Only active statuses
                    expiresAt: {
                        gt: now,
                    },

                    // Current user + friends
                    userId: {
                        in: allowedUserIds,
                    },
                },

                include: {
                    // ==================================================
                    // STATUS OWNER
                    // ==================================================

                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatar: true,
                        },
                    },

                    // ==================================================
                    // CURRENT USER VIEW RECORD
                    // ==================================================

                    viewers: {
                        where: {
                            userId: currentUserId,
                        },

                        select: {
                            id: true,
                            viewedAt: true,
                        },
                    },
                },

                // Oldest first
                orderBy: {
                    createdAt: "asc",
                },
            });

        // ========================================================
        // FORMAT RESPONSE
        // ========================================================

        const formattedStatuses =
            statuses.map((status) => ({
                id: status.id,

                content: status.content,

                mediaUrl: status.mediaUrl,

                mediaType: status.mediaType,

                mediaName: status.mediaName,

                backgroundColor:
                    status.backgroundColor,

                createdAt: status.createdAt,

                expiresAt: status.expiresAt,

                user: status.user,

                viewed:
                    status.viewers.length > 0,

                viewedAt:
                    status.viewers.length > 0
                        ? status.viewers[0]
                              .viewedAt
                        : null,
            }));

        // ========================================================
        // DEBUG STATUS RESULTS
        // ========================================================

        console.log(
            "STATUS RESULTS:",
            formattedStatuses.map(
                (status) => ({
                    id: status.id,

                    userId:
                        status.user?.id,

                    username:
                        status.user?.username,
                })
            )
        );

        // ========================================================
        // RESPONSE
        // ========================================================

        return Response.json({
            success: true,

            currentUserId,

            statuses:
                formattedStatuses,
        });
    } catch (error) {
        console.error(
            "GET /api/status error:",
            error
        );

        // ========================================================
        // AUTH ERROR
        // ========================================================

        if (
            error?.message ===
            "Unauthorized"
        ) {
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
        // SERVER ERROR
        // ========================================================

        return Response.json(
            {
                success: false,
                message:
                    "Failed to fetch statuses",
            },
            {
                status: 500,
            }
        );
    }
}

// ============================================================
// CREATE STATUS
// ============================================================
//
// Supports:
//
// 1. TEXT
// 2. IMAGE
// 3. VIDEO
//
// Status automatically expires after 24 hours.
//
// ============================================================

export async function POST(request) {
    try {
        // ========================================================
        // AUTHENTICATION
        // ========================================================

        const user =
            await verifyAuth(request);

        // ========================================================
        // REQUEST BODY
        // ========================================================

        const body =
            await request.json();

        const {
            content,
            mediaUrl,
            mediaType,
            mediaName,
            backgroundColor,
        } = body;

        // ========================================================
        // VALIDATION
        // ========================================================

        const hasContent =
            typeof content === "string" &&
            content.trim().length > 0;

        const hasMedia =
            typeof mediaUrl === "string" &&
            mediaUrl.trim().length > 0;

        // ========================================================
        // STATUS MUST HAVE CONTENT OR MEDIA
        // ========================================================

        if (
            !hasContent &&
            !hasMedia
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Status must contain text or media",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // VALIDATE MEDIA TYPE
        // ========================================================

        if (
            hasMedia &&
            mediaType !== "IMAGE" &&
            mediaType !== "VIDEO"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid media type. Use IMAGE or VIDEO",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // EXPIRATION
        // ========================================================

        const createdAt =
            new Date();

        const expiresAt =
            new Date(
                createdAt.getTime() +
                    24 *
                        60 *
                        60 *
                        1000
            );

        // ========================================================
        // CREATE STATUS
        // ========================================================

        const status =
            await prisma.status.create({
                data: {
                    userId: user.id,

                    content: hasContent
                        ? content.trim()
                        : null,

                    mediaUrl: hasMedia
                        ? mediaUrl.trim()
                        : null,

                    mediaType: hasMedia
                        ? mediaType
                        : null,

                    mediaName:
                        hasMedia &&
                        mediaName
                            ? mediaName
                            : null,

                    backgroundColor:
                        backgroundColor ||
                        null,

                    createdAt,

                    expiresAt,
                },

                include: {
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

        // ========================================================
        // RESPONSE
        // ========================================================

        return Response.json(
            {
                success: true,

                message:
                    "Status created successfully",

                status: {
                    id: status.id,

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

                    user: status.user,

                    viewed: false,

                    viewedAt: null,
                },
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error(
            "POST /api/status error:",
            error
        );

        // ========================================================
        // AUTH ERROR
        // ========================================================

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

        // ========================================================
        // SERVER ERROR
        // ========================================================

        return Response.json(
            {
                success: false,
                message:
                    "Failed to create status",
            },
            {
                status: 500,
            }
        );
    }
}