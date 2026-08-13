import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const {
    handlers,
    auth,
    signIn,
    signOut,
} = NextAuth({
    // ========================================================
    // PROVIDERS
    // ========================================================

    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret:
                process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],

    // ========================================================
    // SESSION
    // ========================================================

    session: {
        strategy: "jwt",
    },

    // ========================================================
    // PAGES
    // ========================================================

    pages: {
        signIn: "/login",
    },

    // ========================================================
    // CALLBACKS
    // ========================================================

    callbacks: {
        // ====================================================
        // GOOGLE SIGN-IN
        // ====================================================

        async signIn({ user, account }) {
            if (account?.provider !== "google") {
                return true;
            }

            if (!user?.email) {
                console.error(
                    "❌ Google account did not provide an email."
                );

                return false;
            }

            const cleanEmail =
                user.email
                    .trim()
                    .toLowerCase();

            // ==================================================
            // FIND USER
            // ==================================================

            let dbUser =
                await prisma.user.findUnique({
                    where: {
                        email: cleanEmail,
                    },
                });

            // ==================================================
            // CREATE NEW GOOGLE USER
            // ==================================================

            if (!dbUser) {
                const providerId =
                    account.providerAccountId;

                let temporaryUsername =
                    `__google_${providerId}`;

                temporaryUsername =
                    temporaryUsername.substring(
                        0,
                        30
                    );

                const originalUsername =
                    temporaryUsername;

                let counter = 1;

                while (
                    await prisma.user.findUnique({
                        where: {
                            username:
                                temporaryUsername,
                        },
                    })
                ) {
                    const suffix =
                        String(counter);

                    const maxLength =
                        30 -
                        suffix.length;

                    temporaryUsername =
                        `${originalUsername.substring(
                            0,
                            maxLength
                        )}${suffix}`;

                    counter++;
                }

                dbUser =
                    await prisma.user.create({
                        data: {
                            username:
                                temporaryUsername,

                            email:
                                cleanEmail,

                            password:
                                null,

                            avatar:
                                user.image ||
                                null,

                            emailVerified:
                                true,

                            emailVerifiedAt:
                                new Date(),
                        },
                    });

                console.log(
                    `✅ New Google user created: ${cleanEmail}`
                );
            }

            // ==================================================
            // EXISTING USER
            // ==================================================

            else {
                const updateData = {};

                if (!dbUser.emailVerified) {
                    updateData.emailVerified =
                        true;

                    updateData.emailVerifiedAt =
                        new Date();
                }

                if (
                    !dbUser.avatar &&
                    user.image
                ) {
                    updateData.avatar =
                        user.image;
                }

                if (
                    Object.keys(updateData)
                        .length > 0
                ) {
                    dbUser =
                        await prisma.user.update({
                            where: {
                                id: dbUser.id,
                            },

                            data: updateData,
                        });
                }

                console.log(
                    `✅ Existing Google user signed in: ${cleanEmail}`
                );
            }

            // ==================================================
            // LINK GOOGLE ACCOUNT
            // ==================================================

            if (
                account?.providerAccountId
            ) {
                const existingAccount =
                    await prisma.account.findUnique(
                        {
                            where: {
                                provider_providerAccountId:
                                    {
                                        provider:
                                            "google",

                                        providerAccountId:
                                            account.providerAccountId,
                                    },
                            },
                        }
                    );

                if (!existingAccount) {
                    await prisma.account.create({
                        data: {
                            userId:
                                dbUser.id,

                            provider:
                                "google",

                            providerAccountId:
                                account.providerAccountId,
                        },
                    });

                    console.log(
                        `✅ Google account linked to user ${dbUser.id}`
                    );
                }
            }

            return true;
        },

        // ====================================================
        // AUTH.JS JWT
        // ====================================================

        async jwt({
            token,
            user,
            trigger,
            session,
        }) {
            // ==================================================
            // INITIAL LOGIN
            // ==================================================

            if (user?.email) {
                const dbUser =
                    await prisma.user.findUnique({
                        where: {
                            email:
                                user.email
                                    .trim()
                                    .toLowerCase(),
                        },
                    });

                if (dbUser) {
                    token.id =
                        dbUser.id;

                    token.username =
                        dbUser.username;

                    token.email =
                        dbUser.email;

                    token.role =
                        dbUser.role;

                    token.avatar =
                        dbUser.avatar;

                    token.needsUsername =
                        dbUser.username.startsWith(
                            "__google_"
                        );
                }
            }

            // ==================================================
            // SESSION UPDATE
            // ==================================================

            if (
                trigger === "update" &&
                session
            ) {
                if (
                    session.username
                ) {
                    token.username =
                        session.username;
                }

                if (
                    typeof session.needsUsername ===
                    "boolean"
                ) {
                    token.needsUsername =
                        session.needsUsername;
                }

                if (
                    typeof session.avatar ===
                    "string"
                ) {
                    token.avatar =
                        session.avatar;
                }
            }

            return token;
        },

        // ====================================================
        // SESSION
        // ====================================================

        async session({
            session,
            token,
        }) {
            if (session.user) {
                session.user.id =
                    token.id;

                session.user.username =
                    token.username;

                session.user.email =
                    token.email;

                session.user.role =
                    token.role;

                session.user.avatar =
                    token.avatar || null;

                session.user.needsUsername =
                    Boolean(
                        token.needsUsername
                    );
            }

            return session;
        },

        // ====================================================
        // REDIRECT
        // ====================================================

        async redirect({
            url,
            baseUrl,
        }) {
            console.log(
                "🔀 AUTH REDIRECT:",
                url
            );

            if (
                url === baseUrl ||
                url ===
                    `${baseUrl}/` ||
                url === "/"
            ) {
                return `${baseUrl}/chat`;
            }

            if (
                url.startsWith("/")
            ) {
                return `${baseUrl}${url}`;
            }

            if (
                url.startsWith(baseUrl)
            ) {
                return url;
            }

            return `${baseUrl}/chat`;
        },
    },
});