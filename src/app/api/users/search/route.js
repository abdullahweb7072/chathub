import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
    try {
        const { searchParams } =
            new URL(request.url);

        const username =
            searchParams
                .get("username")
                ?.trim();

        if (!username) {
            return NextResponse.json({
                success: true,
                users: [],
            });
        }

        const users =
            await prisma.user.findMany({
                where: {
                    username: {
                        contains: username,
                        mode: "insensitive",
                    },
                },

                select: {
                    id: true,
                    username: true,
                    avatar: true,
                    bio: true,
                    isOnline: true,
                    lastSeen: true,
                },

                take: 20,

                orderBy: {
                    username: "asc",
                },
            });

        return NextResponse.json({
            success: true,
            users,
        });
    } catch (error) {
        console.error(
            "USER SEARCH ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to search users",
            },
            { status: 500 }
        );
    }
}