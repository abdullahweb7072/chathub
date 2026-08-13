import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/resend";

export async function POST(request) {
    try {
        const {
            username,
            email,
            password,
        } = await request.json();

        // ============================================================
        // CLEAN INPUT
        // ============================================================

        const cleanUsername =
            username?.trim();

        const cleanEmail =
            email?.trim().toLowerCase();

        // ============================================================
        // REQUIRED FIELDS
        // ============================================================

        if (
            !cleanUsername ||
            !cleanEmail ||
            !password
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Username, email and password are required.",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // USERNAME VALIDATION
        // ============================================================

        if (cleanUsername.length < 7) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Username must contain at least 7 characters.",
                },
                { status: 400 }
            );
        }

        if (cleanUsername.length > 30) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Username cannot exceed 30 characters.",
                },
                { status: 400 }
            );
        }

        const specialCharacterRegex =
            /[^a-zA-Z0-9\s]/;

        if (
            !specialCharacterRegex.test(
                cleanUsername
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Username must contain at least one special character.",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // EMAIL VALIDATION
        // ============================================================

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Please enter a valid email address.",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // PASSWORD VALIDATION
        // ============================================================

        if (password.length < 6) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Password must contain at least 6 characters.",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // CHECK EXISTING USER EMAIL
        // ============================================================

        const existingUser =
            await prisma.user.findUnique({
                where: {
                    email: cleanEmail,
                },
            });

        if (existingUser) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Email is already registered.",
                },
                { status: 409 }
            );
        }

        // ============================================================
        // CHECK EXISTING USERNAME
        // ============================================================

        const existingUsername =
            await prisma.user.findUnique({
                where: {
                    username: cleanUsername,
                },
            });

        if (existingUsername) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Username is already taken.",
                },
                { status: 409 }
            );
        }

        // ============================================================
        // CHECK PENDING REGISTRATION
        // ============================================================

        const existingPending =
            await prisma.pendingRegistration.findUnique({
                where: {
                    email: cleanEmail,
                },
            });

        // ============================================================
        // HASH PASSWORD
        // ============================================================

        const passwordHash =
            await bcrypt.hash(password, 10);

        // ============================================================
        // GENERATE VERIFICATION CODE
        // ============================================================

        const verificationCode =
            crypto
                .randomInt(100000, 1000000)
                .toString();

        // Store only a hash of the code
        const verificationCodeHash =
            crypto
                .createHash("sha256")
                .update(verificationCode)
                .digest("hex");

        // ============================================================
        // CODE EXPIRATION
        // ============================================================

        const verificationExpires =
            new Date(
                Date.now() +
                10 * 60 * 1000
            );

        // ============================================================
        // CREATE / UPDATE PENDING REGISTRATION
        // ============================================================

        if (existingPending) {
            await prisma.pendingRegistration.update({
                where: {
                    email: cleanEmail,
                },
                data: {
                    username: cleanUsername,
                    passwordHash,
                    verificationCodeHash,
                    verificationExpires,
                    attempts: 0,
                },
            });
        } else {
            await prisma.pendingRegistration.create({
                data: {
                    username: cleanUsername,
                    email: cleanEmail,
                    passwordHash,
                    verificationCodeHash,
                    verificationExpires,
                    attempts: 0,
                },
            });
        }

        // ============================================================
        // SEND EMAIL
        // ============================================================

        try {
            await sendVerificationEmail({
                email: cleanEmail,
                username: cleanUsername,
                code: verificationCode,
            });
        } catch (emailError) {
            console.error(
                "VERIFICATION EMAIL ERROR:",
                emailError
            );

            // Remove pending registration if email failed
            await prisma.pendingRegistration.deleteMany({
                where: {
                    email: cleanEmail,
                },
            });

            return Response.json(
                {
                    success: false,
                    message:
                        "We could not send the verification email. Please try again.",
                },
                { status: 500 }
            );
        }

        // ============================================================
        // SUCCESS
        // ============================================================

        return Response.json(
            {
                success: true,
                message:
                    "Verification code sent to your email.",
                email: cleanEmail,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error(
            "REGISTER ERROR:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Something went wrong. Please try again.",
            },
            { status: 500 }
        );
    }
}