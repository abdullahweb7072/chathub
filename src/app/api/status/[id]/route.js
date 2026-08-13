import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function DELETE(request, { params }) {
    try {
        // ========================================================
        // AUTHENTICATION
        // ========================================================

        const currentUser = await verifyAuth(request);

        const currentUserId = Number(currentUser.id);

        if (
            !Number.isInteger(currentUserId) ||
            currentUserId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message: "Invalid authenticated user",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // STATUS ID
        // ========================================================

        const { id } = await params;

        const statusId = Number(id);

        console.log("========================================");
        console.log("DELETE STATUS REQUEST");
        console.log("Status ID:", statusId);
        console.log("Current User ID:", currentUserId);
        console.log("========================================");

        if (
            !Number.isInteger(statusId) ||
            statusId <= 0
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

        console.log(
            "Status Owner ID:",
            status.userId
        );

        // ========================================================
        // ONLY OWNER CAN DELETE
        // ========================================================

        if (
            Number(status.userId) !==
            currentUserId
        ) {
            console.log(
                "❌ DELETE REJECTED: User is not the owner"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "You cannot delete this status",
                },
                {
                    status: 403,
                }
            );
        }

        // ========================================================
        // DELETE STATUS
        // ========================================================

        await prisma.status.delete({
            where: {
                id: statusId,
            },
        });

        console.log(
            "✅ STATUS DELETED:",
            statusId
        );

        // ========================================================
        // SUCCESS
        // ========================================================

        return Response.json({
            success: true,
            message:
                "Status deleted successfully",
            statusId,
        });

    } catch (error) {
        console.error(
            "========================================"
        );

        console.error(
            "DELETE STATUS ERROR:",
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
        // UNAUTHORIZED
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
        // STATUS NOT FOUND
        // ========================================================

        if (
            error?.code === "P2025"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Status no longer exists",
                },
                {
                    status: 404,
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
                    "Failed to delete status",
            },
            {
                status: 500,
            }
        );
    }
}