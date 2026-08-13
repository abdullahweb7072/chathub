import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

export async function POST(request) {
    try {
        // ============================================================
        // GET GOOGLE CREDENTIAL
        // ============================================================

        const { credential } = await request.json();

        if (!credential) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Google credential is required.",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // VERIFY GOOGLE ID TOKEN
        // ============================================================

        const ticket =
            await googleClient.verifyIdToken({
                idToken: credential,
                audience:
                    process.env.GOOGLE_CLIENT_ID,
            });

        const payload =
            ticket.getPayload();

        if (!payload) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid Google credential.",
                },
                { status: 401 }
            );
        }

        const {
            sub: googleId,
            email,
            email_verified: emailVerified,
            picture,
        } = payload;

        if (!googleId || !email) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Google account information is incomplete.",
                },
                { status: 400 }
            );
        }

        if (!emailVerified) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Your Google email is not verified.",
                },
                { status: 400 }
            );
        }

        const cleanEmail =
            email.trim().toLowerCase();

        // ============================================================
        // FIND GOOGLE ACCOUNT
        // ============================================================

        let account =
            await prisma.account.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: "google",
                        providerAccountId: googleId,
                    },
                },
                include: {
                    user: true,
                },
            });

        let user;

        // ============================================================
        // EXISTING GOOGLE ACCOUNT
        // ============================================================

        if (account) {
            user = account.user;

            // Keep Google profile picture updated
            if (
                picture &&
                picture !== user.avatar
            ) {
                user =
                    await prisma.user.update({
                        where: {
                            id: user.id,
                        },
                        data: {
                            avatar: picture,
                        },
                    });
            }
        }

        // ============================================================
        // GOOGLE ACCOUNT DOES NOT EXIST
        // ============================================================

        else {
            // --------------------------------------------------------
            // CHECK EXISTING CHAT HUB EMAIL
            // --------------------------------------------------------

            const existingUser =
                await prisma.user.findUnique({
                    where: {
                        email: cleanEmail,
                    },
                });

            if (existingUser) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "An account with this email already exists. Please login with your email and password first.",
                    },
                    { status: 409 }
                );
            }

            // --------------------------------------------------------
            // CREATE TEMPORARY GOOGLE USER
            //
            // IMPORTANT:
            // Every new Google user gets:
            //
            // __google_<googleId>
            //
            // This is used consistently throughout the app.
            // --------------------------------------------------------

            user =
                await prisma.$transaction(
                    async (tx) => {
                        const newUser =
                            await tx.user.create({
                                data: {
                                    username:
                                        `__google_${googleId}`,

                                    email:
                                        cleanEmail,

                                    password:
                                        null,

                                    avatar:
                                        picture ||
                                        null,

                                    emailVerified:
                                        true,

                                    emailVerifiedAt:
                                        new Date(),
                                },
                            });

                        await tx.account.create({
                            data: {
                                userId:
                                    newUser.id,

                                provider:
                                    "google",

                                providerAccountId:
                                    googleId,
                            },
                        });

                        return newUser;
                    }
                );
        }

        // ============================================================
        // CHECK TEMPORARY USERNAME
        // ============================================================

        const needsUsername =
            user.username.startsWith(
                "__google_"
            );

        // ============================================================
        // CREATE CHATHUB JWT
        //
        // We create the JWT immediately.
        //
        // Even if username is not completed yet, the user is still
        // authenticated. The frontend can redirect to
        // /complete-signup when needsUsername === true.
        // ============================================================

        if (!process.env.JWT_SECRET) {
            console.error(
                "❌ JWT_SECRET is not configured."
            );

            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Server configuration error.",
                },
                { status: 500 }
            );
        }

        const token =
            jwt.sign(
                {
                    id: user.id,

                    username:
                        user.username,

                    email:
                        user.email,

                    role:
                        user.role,

                    needsUsername,
                },

                process.env.JWT_SECRET,

                {
                    expiresIn: "1d",
                }
            );

        // ============================================================
        // RESPONSE
        // ============================================================

        const response =
            NextResponse.json(
                {
                    success: true,

                    message:
                        needsUsername
                            ? "Google login successful. Username required."
                            : "Google login successful.",

                    user: {
                        id:
                            user.id,

                        username:
                            user.username,

                        email:
                            user.email,

                        avatar:
                            user.avatar,

                        needsUsername,
                    },
                },

                {
                    status: 200,
                }
            );

        // ============================================================
        // CHAT HUB TOKEN
        // ============================================================

        response.cookies.set(
            "Token",
            token,
            {
                httpOnly: true,

                secure:
                    process.env.NODE_ENV ===
                    "production",

                sameSite: "lax",

                maxAge:
                    60 * 60 * 24,

                path: "/",
            }
        );

        console.log(
            "✅ Google ChatHub JWT created for user:",
            user.id
        );

        console.log(
            "Username:",
            user.username
        );

        console.log(
            "Needs username:",
            needsUsername
        );

        return response;
    } catch (error) {
        console.error(
            "❌ GOOGLE LOGIN ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Google authentication failed.",
            },
            {
                status: 500,
            }
        );
    }
}