import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
    try {
        // ============================================================
        // AUTHENTICATION
        // ============================================================

        const session = await auth();

        if (!session?.user?.id) {
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

        const currentUserId = Number(
            session.user.id
        );

        if (
            !Number.isInteger(currentUserId) ||
            currentUserId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message: "Invalid user.",
                },
                {
                    status: 401,
                }
            );
        }

        // ============================================================
        // STATUS ID
        // ============================================================

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
            "========================================"
        );

        console.log(
            "STATUS VIEWERS REQUEST"
        );

        console.log(
            "Status ID:",
            statusId
        );

        console.log(
            "Current User ID:",
            currentUserId
        );

        // ============================================================
        // FIND STATUS
        // ============================================================

        const status =
            await prisma.status.findUnique({
                where: {
                    id: statusId,
                },

                select: {
                    id: true,
                    userId: true,
                },
            });

        if (!status) {
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

        // ============================================================
        // ONLY OWNER CAN SEE VIEWERS
        // ============================================================

        if (
            Number(status.userId) !==
            currentUserId
        ) {
            console.log(
                "VIEWER LIST DENIED"
            );

            console.log(
                "Status owner:",
                status.userId
            );

            console.log(
                "Current user:",
                currentUserId
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "You are not allowed to view status viewers.",
                },
                {
                    status: 403,
                }
            );
        }

        // ============================================================
        // LOAD VIEWERS
        // ============================================================

        const viewers =
            await prisma.statusViewer.findMany({
                where: {
                    statusId: statusId,
                },

                orderBy: {
                    viewedAt: "desc",
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
            "VIEWERS FOUND:",
            viewers.length
        );

        console.log(
            "VIEWERS:",
            viewers
        );

        console.log(
            "========================================"
        );

        // ============================================================
        // SUCCESS
        // ============================================================

        return Response.json({
            success: true,

            viewers,

            count: viewers.length,
        });
    } catch (error) {
        console.error(
            "========================================"
        );

        console.error(
            "STATUS VIEWERS API ERROR"
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

        return Response.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Unable to load status viewers.",
            },
            {
                status: 500,
            }
        );
    }
}