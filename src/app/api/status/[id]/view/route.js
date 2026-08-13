import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// ============================================================
// POST /api/status/[id]/view
// ============================================================

export async function POST(request, { params }) {
    try {
        // ========================================================
        // AUTHENTICATION
        // ========================================================

        const user = await verifyAuth(request);

        const currentUserId = Number(user.id);

        if (
            !Number.isInteger(currentUserId) ||
            currentUserId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message: "Invalid authenticated user.",
                },
                {
                    status: 401,
                }
            );
        }

        console.log(
            "========================================"
        );

        console.log(
            "STATUS VIEW REQUEST"
        );

        console.log(
            "Authenticated User:",
            {
                id: user.id,
                username: user.username,
                email: user.email,
            }
        );

        console.log(
            "Viewer User ID:",
            currentUserId
        );

        // ========================================================
        // STATUS ID
        // ========================================================

        const { id } = await params;

        const statusId = Number(id);

        if (
            !Number.isInteger(statusId) ||
            statusId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message: "Invalid status ID.",
                },
                {
                    status: 400,
                }
            );
        }

        console.log(
            "Status ID:",
            statusId
        );

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
                    expiresAt: true,

                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                        },
                    },
                },
            });

        if (!status) {
            console.log(
                "STATUS NOT FOUND:",
                statusId
            );

            return Response.json(
                {
                    success: false,
                    message: "Status not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // STATUS OWNER
        // ========================================================

        const statusOwnerId =
            Number(status.userId);

        console.log(
            "Status Owner ID:",
            statusOwnerId
        );

        console.log(
            "Status Owner:",
            {
                id: status.user?.id,
                username: status.user?.username,
                displayName:
                    status.user?.displayName,
            }
        );

        // ========================================================
        // EXPIRED STATUS
        // ========================================================

        if (
            status.expiresAt &&
            new Date(status.expiresAt) <=
                new Date()
        ) {
            console.log(
                "STATUS EXPIRED:",
                statusId
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "This status has expired.",
                },
                {
                    status: 410,
                }
            );
        }

        // ========================================================
        // OWNER VIEWING OWN STATUS
        // ========================================================

        if (
            statusOwnerId ===
            currentUserId
        ) {
            console.log(
                "OWNER VIEWED OWN STATUS - NOT RECORDED"
            );

            console.log(
                "Owner ID:",
                statusOwnerId
            );

            console.log(
                "Viewer ID:",
                currentUserId
            );

            console.log(
                "========================================"
            );

            return Response.json({
                success: true,
                viewed: false,
                alreadyViewed: false,
                owner: true,
                message:
                    "Own status does not count as a view.",
            });
        }

        // ========================================================
        // RECORD VIEW
        // ========================================================

        const existingViewer =
            await prisma.statusViewer.findUnique({
                where: {
                    statusId_userId: {
                        statusId,
                        userId: currentUserId,
                    },
                },

                select: {
                    id: true,
                    statusId: true,
                    userId: true,
                    viewedAt: true,
                },
            });

        // ========================================================
        // ALREADY VIEWED
        // ========================================================

        if (existingViewer) {
            console.log(
                "STATUS ALREADY VIEWED"
            );

            console.log(
                "Existing Viewer:",
                existingViewer
            );

            console.log(
                "========================================"
            );

            return Response.json({
                success: true,
                viewed: false,
                alreadyViewed: true,
                owner: false,
                viewer: existingViewer,
                message:
                    "Status already viewed.",
            });
        }

        // ========================================================
        // CREATE VIEWER
        // ========================================================

        const viewer =
            await prisma.statusViewer.create({
                data: {
                    statusId,
                    userId: currentUserId,
                },

                select: {
                    id: true,
                    statusId: true,
                    userId: true,
                    viewedAt: true,

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

        console.log(
            "NEW STATUS VIEWER CREATED"
        );

        console.log(
            "Viewer Record:",
            viewer
        );

        console.log(
            "========================================"
        );

        // ========================================================
        // SUCCESS
        // ========================================================

        return Response.json({
            success: true,

            viewed: true,

            alreadyViewed: false,

            owner: false,

            message:
                "Status view recorded.",

            viewer,
        });
    } catch (error) {
        console.error(
            "========================================"
        );

        console.error(
            "STATUS VIEW API ERROR"
        );

        console.error(
            error
        );

        console.error(
            "Error code:",
            error?.code
        );

        console.error(
            "Error message:",
            error?.message
        );

        console.error(
            "========================================"
        );

        // ========================================================
        // DUPLICATE VIEW
        // ========================================================

        if (
            error?.code === "P2002"
        ) {
            return Response.json({
                success: true,
                viewed: false,
                alreadyViewed: true,
                owner: false,
                message:
                    "Status already viewed.",
            });
        }

        // ========================================================
        // UNAUTHORIZED
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
                    error?.message ||
                    "Unable to record status view.",
            },
            {
                status: 500,
            }
        );
    }
}