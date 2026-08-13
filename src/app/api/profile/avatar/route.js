import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// ============================================================
// CONFIG
// ============================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

// ============================================================
// GET AUTHENTICATED USER
// ============================================================

async function getAuthenticatedUser() {
    const cookieStore = await cookies();

    // IMPORTANT:
    // Login route creates "Token" with capital T
    const token = cookieStore.get("Token")?.value;

    if (!token) {
        return {
            success: false,
            error: "Unauthorized.",
        };
    }

    if (!process.env.JWT_SECRET) {
        console.error(
            "JWT_SECRET is not configured."
        );

        return {
            success: false,
            error: "Server configuration error.",
        };
    }

    let decoded;

    try {
        decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
    } catch (error) {
        console.error(
            "AVATAR JWT ERROR:",
            error
        );

        return {
            success: false,
            error: "Invalid or expired token.",
        };
    }

    const userId = Number(
        decoded.id ?? decoded.userId
    );

    if (
        !userId ||
        Number.isNaN(userId)
    ) {
        return {
            success: false,
            error: "Invalid user information.",
        };
    }

    return {
        success: true,
        userId,
    };
}

// ============================================================
// POST AVATAR
// POST /api/profile/avatar
// ============================================================

export async function POST(request) {
    try {
        // ------------------------------------------------------
        // AUTHENTICATION
        // ------------------------------------------------------

        const auth =
            await getAuthenticatedUser();

        if (!auth.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: auth.error,
                },
                {
                    status:
                        auth.error ===
                        "Unauthorized."
                            ? 401
                            : 401,
                }
            );
        }

        const userId =
            auth.userId;

        // ------------------------------------------------------
        // CHECK CONTENT TYPE
        // ------------------------------------------------------

        const contentType =
            request.headers.get(
                "content-type"
            ) || "";

        if (
            !contentType.includes(
                "multipart/form-data"
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Request must use multipart/form-data.",
                },
                {
                    status: 400,
                }
            );
        }

        // ------------------------------------------------------
        // READ FORM DATA
        // ------------------------------------------------------

        const formData =
            await request.formData();

        const file =
            formData.get("avatar");

        // ------------------------------------------------------
        // CHECK FILE
        // ------------------------------------------------------

        if (!file) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Avatar image is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            typeof file ===
            "string"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Invalid avatar file.",
                },
                {
                    status: 400,
                }
            );
        }

        // ------------------------------------------------------
        // CHECK FILE TYPE
        // ------------------------------------------------------

        if (
            !ALLOWED_TYPES.includes(
                file.type
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Only JPG, PNG, WEBP, and GIF images are allowed.",
                },
                {
                    status: 400,
                }
            );
        }

        // ------------------------------------------------------
        // CHECK FILE SIZE
        // ------------------------------------------------------

        if (
            file.size >
            MAX_FILE_SIZE
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Avatar image cannot exceed 5 MB.",
                },
                {
                    status: 400,
                }
            );
        }

        // ------------------------------------------------------
        // FIND USER
        // ------------------------------------------------------

        const user =
            await prisma.user.findUnique({
                where: {
                    id: userId,
                },

                select: {
                    id: true,
                    avatar: true,
                },
            });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "User not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ------------------------------------------------------
        // CREATE UPLOAD DIRECTORY
        // ------------------------------------------------------

        const uploadDirectory =
            path.join(
                process.cwd(),
                "public",
                "uploads",
                "avatars"
            );

        await fs.mkdir(
            uploadDirectory,
            {
                recursive: true,
            }
        );

        // ------------------------------------------------------
        // DETERMINE FILE EXTENSION
        // ------------------------------------------------------

        const extensionMap = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        };

        const extension =
            extensionMap[
                file.type
            ];

        // ------------------------------------------------------
        // GENERATE UNIQUE FILE NAME
        // ------------------------------------------------------

        const randomName =
            crypto
                .randomBytes(16)
                .toString("hex");

        const fileName =
            `${userId}-${randomName}${extension}`;

        const filePath =
            path.join(
                uploadDirectory,
                fileName
            );

        // ------------------------------------------------------
        // SAVE FILE
        // ------------------------------------------------------

        const bytes =
            await file.arrayBuffer();

        const buffer =
            Buffer.from(bytes);

        await fs.writeFile(
            filePath,
            buffer
        );

        // ------------------------------------------------------
        // PUBLIC AVATAR URL
        // ------------------------------------------------------

        const avatarUrl =
            `/uploads/avatars/${fileName}`;

        // ------------------------------------------------------
        // UPDATE DATABASE
        // ------------------------------------------------------

        const updatedUser =
            await prisma.user.update({
                where: {
                    id: userId,
                },

                data: {
                    avatar:
                        avatarUrl,
                },

                select: {
                    id: true,
                    username: true,
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

        // ------------------------------------------------------
        // DELETE OLD AVATAR
        // ------------------------------------------------------

        if (
            user.avatar &&
            user.avatar.startsWith(
                "/uploads/avatars/"
            )
        ) {
            try {
                const oldFileName =
                    path.basename(
                        user.avatar
                    );

                const oldFilePath =
                    path.join(
                        uploadDirectory,
                        oldFileName
                    );

                // Prevent deleting anything
                // outside the avatar directory.
                if (
                    oldFilePath.startsWith(
                        uploadDirectory
                    )
                ) {
                    await fs.unlink(
                        oldFilePath
                    );
                }
            } catch (error) {
                // Old file may already be missing.
                console.warn(
                    "Could not delete old avatar:",
                    error.message
                );
            }
        }

        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------

        return NextResponse.json(
            {
                success: true,

                message:
                    "Profile picture updated successfully.",

                user: updatedUser,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "POST AVATAR ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "Failed to upload profile picture.",
            },
            {
                status: 500,
            }
        );
    }
}

// ============================================================
// DELETE AVATAR
// DELETE /api/profile/avatar
// ============================================================

export async function DELETE() {
    try {
        // ------------------------------------------------------
        // AUTHENTICATION
        // ------------------------------------------------------

        const auth =
            await getAuthenticatedUser();

        if (!auth.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: auth.error,
                },
                {
                    status: 401,
                }
            );
        }

        const userId =
            auth.userId;

        // ------------------------------------------------------
        // FIND USER
        // ------------------------------------------------------

        const user =
            await prisma.user.findUnique({
                where: {
                    id: userId,
                },

                select: {
                    id: true,
                    avatar: true,
                },
            });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "User not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ------------------------------------------------------
        // DELETE FILE
        // ------------------------------------------------------

        if (
            user.avatar &&
            user.avatar.startsWith(
                "/uploads/avatars/"
            )
        ) {
            try {
                const uploadDirectory =
                    path.join(
                        process.cwd(),
                        "public",
                        "uploads",
                        "avatars"
                    );

                const fileName =
                    path.basename(
                        user.avatar
                    );

                const filePath =
                    path.join(
                        uploadDirectory,
                        fileName
                    );

                if (
                    filePath.startsWith(
                        uploadDirectory
                    )
                ) {
                    await fs.unlink(
                        filePath
                    );
                }
            } catch (error) {
                console.warn(
                    "Could not delete avatar file:",
                    error.message
                );
            }
        }

        // ------------------------------------------------------
        // REMOVE AVATAR FROM DATABASE
        // ------------------------------------------------------

        const updatedUser =
            await prisma.user.update({
                where: {
                    id: userId,
                },

                data: {
                    avatar: null,
                },

                select: {
                    id: true,
                    username: true,
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

        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------

        return NextResponse.json(
            {
                success: true,

                message:
                    "Profile picture removed successfully.",

                user: updatedUser,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "DELETE AVATAR ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "Failed to remove profile picture.",
            },
            {
                status: 500,
            }
        );
    }
}