import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import path from "path";
import { randomUUID } from "crypto";
import {
    S3Client,
    PutObjectCommand,
} from "@aws-sdk/client-s3";

// ============================================================
// CONFIGURATION
// ============================================================

// Maximum upload size: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// ============================================================
// S3 / CLOUD STORAGE CLIENT
// ============================================================

const s3 = new S3Client({
    region: process.env.TOKEN_AI_REGION,

    endpoint: process.env.TOKEN_AI_ENDPOINT,

    credentials: {
        accessKeyId: process.env.TOKEN_AI_ACCESS_KEY,
        secretAccessKey: process.env.TOKEN_AI_SECRET_KEY,
    },

    forcePathStyle: true,
});

// ============================================================
// ALLOWED FILE TYPES
// ============================================================

const ALLOWED_TYPES = {
    IMAGE: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    ],

    VIDEO: [
        "video/mp4",
        "video/webm",
        "video/quicktime",
    ],

    AUDIO: [
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "audio/webm",
    ],

    FILE: [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
    ],
};

// ============================================================
// GET MESSAGE TYPE
// ============================================================

function getMessageType(mimeType) {
    if (ALLOWED_TYPES.IMAGE.includes(mimeType)) {
        return "IMAGE";
    }

    if (ALLOWED_TYPES.VIDEO.includes(mimeType)) {
        return "VIDEO";
    }

    if (ALLOWED_TYPES.AUDIO.includes(mimeType)) {
        return "AUDIO";
    }

    if (ALLOWED_TYPES.FILE.includes(mimeType)) {
        return "FILE";
    }

    return null;
}

// ============================================================
// PARSE COOKIES
// ============================================================

function parseCookies(cookieHeader) {
    const cookies = {};

    if (!cookieHeader) {
        return cookies;
    }

    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...valueParts] = cookie
            .trim()
            .split("=");

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
// POST
// ============================================================

export async function POST(request) {
    try {
        console.log("");
        console.log("================================");
        console.log("📎 CHAT FILE UPLOAD");
        console.log("================================");

        // ==================================================
        // CHECK STORAGE CONFIGURATION
        // ==================================================

        if (
            !process.env.TOKEN_AI_ACCESS_KEY ||
            !process.env.TOKEN_AI_SECRET_KEY ||
            !process.env.TOKEN_AI_ENDPOINT ||
            !process.env.TOKEN_AI_BUCKET ||
            !process.env.TOKEN_AI_REGION
        ) {
            console.error(
                "❌ Cloud storage environment variables are missing"
            );

            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Cloud storage is not configured correctly",
                },
                {
                    status: 500,
                }
            );
        }

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        const cookieHeader =
            request.headers.get("cookie");

        const cookies =
            parseCookies(cookieHeader);

        const token = cookies.Token;

        if (!token) {
            console.log(
                "❌ Upload rejected: no Token cookie"
            );

            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        if (!process.env.JWT_SECRET) {
            console.error(
                "❌ JWT_SECRET is not configured"
            );

            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Server authentication is not configured",
                },
                {
                    status: 500,
                }
            );
        }

        let decoded;

        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );
        } catch (error) {
            console.error(
                "❌ Invalid JWT:",
                error.message
            );

            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invalid authentication token",
                },
                {
                    status: 401,
                }
            );
        }

        console.log(
            "✅ Upload authenticated user:",
            decoded.id
        );

        // ==================================================
        // FORM DATA
        // ==================================================

        const formData =
            await request.formData();

        const file =
            formData.get("file");

        if (
            !file ||
            typeof file === "string"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "No file provided",
                },
                {
                    status: 400,
                }
            );
        }

        // ==================================================
        // BASIC FILE VALIDATION
        // ==================================================

        if (!file.name) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "File name is missing",
                },
                {
                    status: 400,
                }
            );
        }

        if (file.size <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Cannot upload an empty file",
                },
                {
                    status: 400,
                }
            );
        }

        // ==================================================
        // FILE SIZE
        // ==================================================

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "File size cannot exceed 50 MB",
                },
                {
                    status: 400,
                }
            );
        }

        // ==================================================
        // MIME TYPE
        // ==================================================

        const messageType =
            getMessageType(file.type);

        if (!messageType) {
            console.log(
                "❌ Unsupported MIME type:",
                file.type
            );

            return NextResponse.json(
                {
                    success: false,
                    message:
                        `This file type is not supported: ${
                            file.type || "unknown"
                        }`,
                },
                {
                    status: 400,
                }
            );
        }

        // ==================================================
        // LOG FILE INFORMATION
        // ==================================================

        console.log(
            "📄 File:",
            file.name
        );

        console.log(
            "📦 Size:",
            file.size,
            `(${(
                file.size /
                (1024 * 1024)
            ).toFixed(2)} MB)`
        );

        console.log(
            "📋 MIME:",
            file.type
        );

        console.log(
            "💬 Message type:",
            messageType
        );

        // ==================================================
        // SAFE FILE NAME
        // ==================================================

        const extension =
            path.extname(file.name);

        const originalBaseName =
            path.basename(
                file.name,
                extension
            );

        const baseName =
            originalBaseName
                .replace(
                    /[^a-zA-Z0-9-_]/g,
                    "-"
                )
                .replace(
                    /-+/g,
                    "-"
                )
                .slice(0, 80);

        const safeBaseName =
            baseName || "file";

        // ==================================================
        // UNIQUE OBJECT NAME
        // ==================================================

        const uniqueName =
            `${Date.now()}-${randomUUID()}-${safeBaseName}${extension}`;

        // Keep files organized by type
        const objectKey =
            `chat/${messageType.toLowerCase()}/${uniqueName}`;

        console.log(
            "☁️ Uploading to bucket..."
        );

        console.log(
            "🪣 Bucket:",
            process.env.TOKEN_AI_BUCKET
        );

        console.log(
            "🔑 Object:",
            objectKey
        );

        // ==================================================
        // CONVERT FILE TO BUFFER
        // ==================================================

        const bytes =
            await file.arrayBuffer();

        const buffer =
            Buffer.from(bytes);

        // ==================================================
        // UPLOAD TO CLOUD STORAGE
        // ==================================================

        const uploadCommand =
            new PutObjectCommand({
                Bucket:
                    process.env.TOKEN_AI_BUCKET,

                Key:
                    objectKey,

                Body:
                    buffer,

                ContentType:
                    file.type,

                ContentLength:
                    file.size,

                // Useful if your bucket supports
                // public object access.
                ContentDisposition:
                    `inline; filename="${encodeURIComponent(
                        file.name
                    )}"`,
            });

        await s3.send(
            uploadCommand
        );

        console.log(
            "✅ File uploaded to cloud storage"
        );

        // ==================================================
        // PUBLIC URL
        // ==================================================

        const endpoint =
            process.env.TOKEN_AI_ENDPOINT.replace(
                /\/$/,
                ""
            );

        const bucket =
            process.env.TOKEN_AI_BUCKET;

        const url =
            `${endpoint}/${bucket}/${objectKey}`;

        console.log(
            "🌐 Public URL:",
            url
        );

        // ==================================================
        // RESPONSE
        // ==================================================

        return NextResponse.json(
            {
                success: true,

                url,

                name:
                    file.name,

                size:
                    file.size,

                mimeType:
                    file.type,

                type:
                    messageType,

                data: {
                    url,

                    name:
                        file.name,

                    size:
                        file.size,

                    mimeType:
                        file.type,

                    type:
                        messageType,
                },
            },
            {
                status: 200,
            }
        );

    } catch (error) {
        console.error(
            "❌ FILE UPLOAD ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,

                message:
                    error?.message ||
                    "Failed to upload file",
            },
            {
                status: 500,
            }
        );
    }
}