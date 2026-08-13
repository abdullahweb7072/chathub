
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import { prisma } from "@/lib/prisma";

// ============================================================
// GET /api/profile
//
// CURRENT USER:
// /api/profile
//
// OTHER USER:
// /api/profile?userId=5
//
// Privacy rules:
// - Own profile -> can see own online + last seen
// - Other profile -> respect target's privacy settings
// ============================================================

export async function GET(request) {
    try {
        // ========================================================
        // GET TOKEN
        // ========================================================

        const cookieStore = await cookies();

        const token =
            cookieStore.get("Token")?.value;

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // CHECK JWT SECRET
        // ========================================================

        if (!process.env.JWT_SECRET) {
            console.error(
                "❌ JWT_SECRET is not configured."
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "Server configuration error.",
                },
                {
                    status: 500,
                }
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
                "❌ PROFILE JWT ERROR:",
                error.message
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid or expired token.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // GET LOGGED-IN USER ID
        // ========================================================

        const currentUserId = Number(
            decoded?.id ??
                decoded?.userId
        );

        if (
            !Number.isInteger(
                currentUserId
            ) ||
            currentUserId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid user information.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // GET REQUESTED USER ID
        // ========================================================

        const { searchParams } =
            new URL(request.url);

        const requestedUserId =
            searchParams.get("userId");

        let profileUserId;

        if (
            requestedUserId === null ||
            requestedUserId === ""
        ) {
            profileUserId =
                currentUserId;
        } else {
            profileUserId =
                Number(requestedUserId);

            if (
                !Number.isInteger(
                    profileUserId
                ) ||
                profileUserId <= 0
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        error:
                            "Invalid user ID.",
                    },
                    {
                        status: 400,
                    }
                );
            }
        }

        // ========================================================
        // IS OWN PROFILE?
        // ========================================================

        const isOwnProfile =
            profileUserId ===
            currentUserId;

        // ========================================================
        // FIND USER
        // ========================================================

        const user =
            await prisma.user.findUnique({
                where: {
                    id: profileUserId,
                },

                select: {
                    id: true,

                    // Identity
                    username: true,
                    displayName: true,

                    // Private / profile
                    email: true,
                    avatar: true,
                    bio: true,
                    role: true,

                    // Presence
                    isOnline: true,
                    lastSeen: true,

                    // Privacy
                    showOnlineStatus: true,
                    showLastSeen: true,

                    createdAt: true,
                    updatedAt: true,
                },
            });

        // ========================================================
        // USER NOT FOUND
        // ========================================================

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // VISIBLE PRESENCE
        // ========================================================

        let visibleIsOnline = false;
        let visibleLastSeen = null;

        if (isOwnProfile) {
            visibleIsOnline =
                user.isOnline;

            visibleLastSeen =
                user.lastSeen;
        } else {
            if (
                user.showOnlineStatus ===
                true
            ) {
                visibleIsOnline =
                    user.isOnline;
            }

            if (
                user.showLastSeen ===
                true
            ) {
                visibleLastSeen =
                    user.lastSeen;
            }
        }

        // ========================================================
        // RETURN PROFILE
        // ========================================================

        return NextResponse.json(
            {
                success: true,

                user: {
                    id: user.id,

                    // Username is the permanent identifier
                    username: user.username,

                    // Display name is what users see
                    displayName:
                        user.displayName ||
                        user.username,

                    // Email only visible to owner
                    email: isOwnProfile
                        ? user.email
                        : null,

                    avatar: user.avatar,
                    bio: user.bio,
                    role: user.role,

                    // Privacy-safe presence
                    isOnline:
                        visibleIsOnline,

                    lastSeen:
                        visibleLastSeen,

                    createdAt:
                        user.createdAt,

                    updatedAt:
                        user.updatedAt,

                    isOwnProfile,
                },
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "❌ GET PROFILE ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "Failed to fetch profile.",
            },
            {
                status: 500,
            }
        );
    }
}

// ============================================================
// PUT /api/profile
//
// ONLY CURRENT USER CAN UPDATE THEIR PROFILE
//
// Supported:
// - displayName
// - bio
//
// IMPORTANT:
// username is intentionally NOT accepted.
// Username is permanent.
// ============================================================

export async function PUT(request) {
    try {
        // ========================================================
        // GET TOKEN
        // ========================================================

        const cookieStore = await cookies();

        const token =
            cookieStore.get("Token")?.value;

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // CHECK JWT SECRET
        // ========================================================

        if (!process.env.JWT_SECRET) {
            console.error(
                "❌ JWT_SECRET is not configured."
            );

            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Server configuration error.",
                },
                {
                    status: 500,
                }
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
                "❌ PROFILE JWT ERROR:",
                error.message
            );

            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Invalid or expired token.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // GET CURRENT USER ID
        // ========================================================

        const userId = Number(
            decoded?.id ??
                decoded?.userId
        );

        if (
            !Number.isInteger(
                userId
            ) ||
            userId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Invalid user information.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // READ BODY
        // ========================================================

        let body;

        try {
            body =
                await request.json();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Invalid JSON body.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // GET VALUES
        // ========================================================

        const {
            displayName,
            bio,
        } = body || {};

        // ========================================================
        // SECURITY
        //
        // If someone manually sends username in the request,
        // we simply ignore it.
        //
        // Username can NEVER be changed through this endpoint.
        // ========================================================

        // ========================================================
        // DISPLAY NAME TYPE
        // ========================================================

        if (
            displayName !== undefined &&
            typeof displayName !==
                "string"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Display name must be a string.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // BIO TYPE
        // ========================================================

        if (
            bio !== undefined &&
            typeof bio !== "string"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Bio must be a string.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // CLEAN VALUES
        // ========================================================

        const cleanDisplayName =
            displayName !== undefined
                ? displayName.trim()
                : undefined;

        const cleanBio =
            bio !== undefined
                ? bio.trim()
                : undefined;

        // ========================================================
        // DISPLAY NAME VALIDATION
        // ========================================================

        if (
            cleanDisplayName !==
                undefined &&
            cleanDisplayName.length < 1
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Display name cannot be empty.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            cleanDisplayName !==
                undefined &&
            cleanDisplayName.length > 50
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Display name cannot exceed 50 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // BIO LENGTH
        // ========================================================

        if (
            cleanBio !== undefined &&
            cleanBio.length > 160
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Bio cannot exceed 160 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // BUILD UPDATE DATA
        // ========================================================

        const updateData = {};

        if (
            cleanDisplayName !==
                undefined
        ) {
            updateData.displayName =
                cleanDisplayName;
        }

        if (
            cleanBio !==
                undefined
        ) {
            updateData.bio =
                cleanBio || null;
        }

        // ========================================================
        // NOTHING TO UPDATE
        // ========================================================

        if (
            Object.keys(
                updateData
            ).length === 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "No profile changes provided.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // UPDATE USER
        // ========================================================

        const updatedUser =
            await prisma.user.update({
                where: {
                    id: userId,
                },

                data: updateData,

                select: {
                    id: true,

                    username: true,
                    displayName: true,

                    email: true,
                    avatar: true,
                    bio: true,
                    role: true,

                    isOnline: true,
                    lastSeen: true,

                    createdAt: true,
                    updatedAt: true,
                },
            });

        // ========================================================
        // SUCCESS
        // ========================================================

        return NextResponse.json(
            {
                success: true,

                message:
                    "Profile updated successfully.",

                user: {
                    ...updatedUser,

                    displayName:
                        updatedUser.displayName ||
                        updatedUser.username,

                    isOwnProfile: true,
                },
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "❌ PUT PROFILE ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "Failed to update profile.",
            },
            {
                status: 500,
            }
        );
    }
}

