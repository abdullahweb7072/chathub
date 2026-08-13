import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function DELETE(request, { params }) {
    try {
        const currentUser = await verifyAuth(request);

        const statusId = Number(params.id);

        if (!statusId || Number.isNaN(statusId)) {
            return Response.json(
                {
                    success: false,
                    message: "Invalid status ID",
                },
                { status: 400 }
            );
        }

        const status = await prisma.status.findUnique({
            where: {
                id: statusId,
            },
        });

        if (!status) {
            return Response.json(
                {
                    success: false,
                    message: "Status not found",
                },
                { status: 404 }
            );
        }

        // ----------------------------------------------------
        // ONLY OWNER CAN DELETE
        // ----------------------------------------------------

        if (status.userId !== currentUser.id) {
            return Response.json(
                {
                    success: false,
                    message: "You cannot delete this status",
                },
                { status: 403 }
            );
        }

        await prisma.status.delete({
            where: {
                id: statusId,
            },
        });

        return Response.json({
            success: true,
            message: "Status deleted successfully",
        });
    } catch (error) {
        console.error("DELETE STATUS ERROR:", error);

        if (error.message === "Unauthorized") {
            return Response.json(
                {
                    success: false,
                    message: "Unauthorized",
                },
                { status: 401 }
            );
        }

        return Response.json(
            {
                success: false,
                message: "Failed to delete status",
            },
            { status: 500 }
        );
    }
}