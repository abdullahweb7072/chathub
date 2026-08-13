
import { prisma } from "@/lib/prisma";

import crypto from "crypto";


// ================================================================
// POST /api/auth/verify-email
// ================================================================

export async function POST(request) {

    try {

        // ========================================================
        // READ REQUEST
        // ========================================================

        const {
            email,
            code,
        } = await request.json();


        // ========================================================
        // CLEAN INPUT
        // ========================================================

        const cleanEmail =
            email?.trim().toLowerCase();

        const cleanCode =
            String(code || "").trim();


        // ========================================================
        // REQUIRED FIELDS
        // ========================================================

        if (
            !cleanEmail ||
            !cleanCode
        ) {

            return Response.json(
                {
                    success: false,
                    message:
                        "Email and verification code are required.",
                },
                { status: 400 }
            );
        }


        // ========================================================
        // CODE VALIDATION
        // ========================================================

        if (
            !/^\d{6}$/.test(cleanCode)
        ) {

            return Response.json(
                {
                    success: false,
                    message:
                        "Verification code must be 6 digits.",
                },
                { status: 400 }
            );
        }


        // ========================================================
        // FIND PENDING REGISTRATION
        // ========================================================

        const pendingRegistration =
            await prisma.pendingRegistration.findUnique({
                where: {
                    email: cleanEmail,
                },
            });


        if (!pendingRegistration) {

            return Response.json(
                {
                    success: false,
                    message:
                        "Verification request not found. Please register again.",
                },
                { status: 404 }
            );
        }


        // ========================================================
        // CHECK EXPIRATION
        // ========================================================

        if (
            pendingRegistration.verificationExpires <
            new Date()
        ) {

            await prisma.pendingRegistration.delete({
                where: {
                    id: pendingRegistration.id,
                },
            });

            return Response.json(
                {
                    success: false,
                    message:
                        "Verification code has expired. Please register again.",
                },
                { status: 410 }
            );
        }


        // ========================================================
        // HASH ENTERED CODE
        // ========================================================

        const codeHash =
            crypto
                .createHash("sha256")
                .update(cleanCode)
                .digest("hex");


        // ========================================================
        // COMPARE CODE
        // ========================================================

        if (
            codeHash !==
            pendingRegistration.verificationCodeHash
        ) {

            const newAttempts =
                pendingRegistration.attempts + 1;


            // Optional security limit
            if (newAttempts >= 5) {

                await prisma.pendingRegistration.delete({
                    where: {
                        id: pendingRegistration.id,
                    },
                });

                return Response.json(
                    {
                        success: false,
                        message:
                            "Too many incorrect attempts. Please register again.",
                    },
                    { status: 429 }
                );
            }


            await prisma.pendingRegistration.update({
                where: {
                    id: pendingRegistration.id,
                },
                data: {
                    attempts: newAttempts,
                },
            });


            return Response.json(
                {
                    success: false,
                    message:
                        "Incorrect verification code.",
                },
                { status: 400 }
            );
        }


        // ========================================================
        // CHECK USERNAME / EMAIL AGAIN
        // ========================================================

        const existingEmail =
            await prisma.user.findUnique({
                where: {
                    email: cleanEmail,
                },
            });


        if (existingEmail) {

            await prisma.pendingRegistration.delete({
                where: {
                    id: pendingRegistration.id,
                },
            });

            return Response.json(
                {
                    success: false,
                    message:
                        "Email is already registered.",
                },
                { status: 409 }
            );
        }


        const existingUsername =
            await prisma.user.findUnique({
                where: {
                    username:
                        pendingRegistration.username,
                },
            });


        if (existingUsername) {

            return Response.json(
                {
                    success: false,
                    message:
                        "Username is no longer available. Please register again.",
                },
                { status: 409 }
            );
        }


        // ========================================================
        // CREATE USER
        // ========================================================

        const user =
            await prisma.$transaction(
                async (tx) => {

                    const newUser =
                        await tx.user.create({
                            data: {
                                username:
                                    pendingRegistration.username,

                                email:
                                    pendingRegistration.email,

                                password:
                                    pendingRegistration.passwordHash,

                                emailVerified:
                                    true,

                                emailVerifiedAt:
                                    new Date(),
                            },
                        });


                    // ============================================
                    // DELETE PENDING REGISTRATION
                    // ============================================

                    await tx.pendingRegistration.delete({
                        where: {
                            id:
                                pendingRegistration.id,
                        },
                    });


                    return newUser;
                }
            );


        // ========================================================
        // SUCCESS
        // ========================================================

        return Response.json(
            {
                success: true,
                message:
                    "Email verified and account created successfully.",

                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                },
            },
            { status: 201 }
        );


    } catch (error) {

        console.error(
            "VERIFY EMAIL ERROR:",
            error
        );


        // ========================================================
        // PRISMA UNIQUE CONSTRAINT
        // ========================================================

        if (
            error?.code === "P2002"
        ) {

            const fields =
                error?.meta?.target || [];


            if (
                fields.includes("username")
            ) {

                return Response.json(
                    {
                        success: false,
                        message:
                            "Username is already taken.",
                    },
                    { status: 409 }
                );
            }


            if (
                fields.includes("email")
            ) {

                return Response.json(
                    {
                        success: false,
                        message:
                            "Email is already registered.",
                    },
                    { status: 409 }
                );
            }
        }


        return Response.json(
            {
                success: false,
                message:
                    "Something went wrong while verifying your email.",
            },
            { status: 500 }
        );
    }
}

