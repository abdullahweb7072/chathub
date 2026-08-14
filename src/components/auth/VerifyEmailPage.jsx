import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import crypto from "crypto";

// ============================================================
// POST /api/auth/verify-email
// ============================================================

export async function POST(request) {
    try {
        console.log("");
        console.log("========================================");
        console.log("📧 VERIFY EMAIL REQUEST");
        console.log("========================================");

        // ========================================================
        // READ REQUEST
        // ========================================================

        const body = await request.json();

        const {
            email,
            code,
        } = body;

        console.log("📥 Raw request received:", {
            hasEmail: Boolean(email),
            hasCode: Boolean(code),
        });

        // ========================================================
        // CLEAN INPUT
        // ========================================================

        const cleanEmail =
            email?.trim().toLowerCase();

        const cleanCode =
            code?.toString().trim();

        console.log("📧 Clean email:", cleanEmail);
        console.log(
            "🔢 Code received:",
            cleanCode ? "YES" : "NO"
        );

        // ========================================================
        // REQUIRED FIELDS
        // ========================================================

        if (!cleanEmail || !cleanCode) {
            console.log(
                "❌ Missing email or verification code"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Email and verification code are required.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // CODE FORMAT
        // ========================================================

        if (!/^\d{6}$/.test(cleanCode)) {
            console.log(
                "❌ Invalid verification code format"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Verification code must contain exactly 6 digits.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // FIND PENDING REGISTRATION
        // ========================================================

        console.log(
            "🔎 Searching pending registration..."
        );

        console.log(
            "🔎 Lookup email:",
            cleanEmail
        );

        const pendingRegistration =
            await prisma.pendingRegistration.findUnique({
                where: {
                    email: cleanEmail,
                },
            });

        // ========================================================
        // DEBUG DATABASE RESULT
        // ========================================================

        console.log(
            "📦 Pending registration result:",
            pendingRegistration
                ? {
                      id:
                          pendingRegistration.id,
                      email:
                          pendingRegistration.email,
                      username:
                          pendingRegistration.username,
                      attempts:
                          pendingRegistration.attempts,
                      hasVerificationHash:
                          Boolean(
                              pendingRegistration.verificationCodeHash
                          ),
                      verificationExpires:
                          pendingRegistration.verificationExpires,
                  }
                : null
        );

        // ========================================================
        // NOT FOUND
        // ========================================================

        if (!pendingRegistration) {
            console.log(
                "❌ PENDING REGISTRATION NOT FOUND"
            );

            console.log(
                "❌ Email searched:",
                cleanEmail
            );

            console.log(
                "========================================"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Verification request not found. Please register again.",
                },
                {
                    status: 404,
                }
            );
        }

        // ========================================================
        // CHECK EXPIRATION
        // ========================================================

        const now = new Date();

        if (
            pendingRegistration.verificationExpires &&
            new Date(
                pendingRegistration.verificationExpires
            ) <= now
        ) {
            console.log(
                "❌ VERIFICATION CODE EXPIRED"
            );

            console.log(
                "Expires:",
                pendingRegistration.verificationExpires
            );

            console.log(
                "Current:",
                now
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Verification code has expired. Please register again.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // MAX ATTEMPTS
        // ========================================================

        const MAX_ATTEMPTS = 5;

        if (
            pendingRegistration.attempts >=
            MAX_ATTEMPTS
        ) {
            console.log(
                "❌ MAX VERIFICATION ATTEMPTS REACHED"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Too many incorrect attempts. Please register again.",
                },
                {
                    status: 429,
                }
            );
        }

        // ========================================================
        // HASH SUBMITTED CODE
        // ========================================================

        const submittedCodeHash =
            crypto
                .createHash("sha256")
                .update(cleanCode)
                .digest("hex");

        console.log(
            "🔐 Submitted code hashed successfully"
        );

        // ========================================================
        // COMPARE HASHES
        // ========================================================

        const codeMatches =
            submittedCodeHash ===
            pendingRegistration.verificationCodeHash;

        console.log(
            "🔍 Verification code matches:",
            codeMatches
        );

        // ========================================================
        // INVALID CODE
        // ========================================================

        if (!codeMatches) {
            console.log(
                "❌ INVALID VERIFICATION CODE"
            );

            const updatedAttempts =
                pendingRegistration.attempts + 1;

            await prisma.pendingRegistration.update({
                where: {
                    email: cleanEmail,
                },
                data: {
                    attempts:
                        updatedAttempts,
                },
            });

            console.log(
                "🔢 Attempts:",
                updatedAttempts,
                "/",
                MAX_ATTEMPTS
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid verification code.",
                    attemptsRemaining:
                        Math.max(
                            0,
                            MAX_ATTEMPTS -
                                updatedAttempts
                        ),
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // CHECK USER AGAIN
        // ========================================================

        const existingUser =
            await prisma.user.findUnique({
                where: {
                    email: cleanEmail,
                },
            });

        if (existingUser) {
            console.log(
                "⚠️ USER ALREADY EXISTS:",
                existingUser.id
            );

            // Remove pending registration
            await prisma.pendingRegistration.deleteMany({
                where: {
                    email: cleanEmail,
                },
            });

            return Response.json(
                {
                    success: false,
                    message:
                        "Email is already registered.",
                },
                {
                    status: 409,
                }
            );
        }

        // ========================================================
        // HASH PASSWORD
        // ========================================================

        const passwordHash =
            pendingRegistration.passwordHash;

        if (!passwordHash) {
            console.error(
                "❌ Pending registration has no password hash"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Registration data is incomplete. Please register again.",
                },
                {
                    status: 400,
                }
            );
        }

        // ========================================================
        // CREATE USER
        // ========================================================

        console.log(
            "👤 Creating verified user..."
        );

        const user =
            await prisma.user.create({
                data: {
                    username:
                        pendingRegistration.username,

                    email:
                        pendingRegistration.email,

                    password:
                        passwordHash,

                    emailVerified:
                        new Date(),
                },

                select: {
                    id: true,
                    username: true,
                    email: true,
                    emailVerified: true,
                },
            });

        console.log(
            "✅ USER CREATED:",
            user
        );

        // ========================================================
        // DELETE PENDING REGISTRATION
        // ========================================================

        await prisma.pendingRegistration.delete({
            where: {
                email: cleanEmail,
            },
        });

        console.log(
            "🗑️ Pending registration deleted"
        );

        // ========================================================
        // SUCCESS
        // ========================================================

        console.log(
            "========================================"
        );

        console.log(
            "✅ EMAIL VERIFICATION SUCCESSFUL"
        );

        console.log(
            "User ID:",
            user.id
        );

        console.log(
            "Username:",
            user.username
        );

        console.log(
            "Email:",
            user.email
        );

        console.log(
            "========================================"
        );

        return Response.json(
            {
                success: true,

                message:
                    "Email verified successfully. Your account has been created.",

                user: {
                    id: user.id,
                    username:
                        user.username,
                    email:
                        user.email,
                    emailVerified:
                        user.emailVerified,
                },
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error("");
        console.error(
            "========================================"
        );

        console.error(
            "❌ VERIFY EMAIL ERROR"
        );

        console.error(
            "Error:",
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
        // PRISMA UNIQUE ERROR
        // ========================================================

        if (error?.code === "P2002") {
            return Response.json(
                {
                    success: false,
                    message:
                        "An account with this email or username already exists.",
                },
                {
                    status: 409,
                }
            );
        }

        // ========================================================
        // PRISMA RECORD NOT FOUND
        // ========================================================

        if (error?.code === "P2025") {
            return Response.json(
                {
                    success: false,
                    message:
                        "Verification request could not be found. Please register again.",
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
                    "Unable to verify email.",
            },
            {
                status: 500,
            }
        );
    }
}