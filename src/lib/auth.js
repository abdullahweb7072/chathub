import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { auth } from "@/auth";

// ============================================================
// VERIFY AUTH
// Supports:
//
// 1. Custom Token cookie
//    → Email/password login
//
// 2. NextAuth session
//    → Google login
// ============================================================
export async function verifyAuth(request) {
    // ========================================================
    // 1. CUSTOM TOKEN
    // ========================================================

    try {
        const token = request.cookies.get("Token")?.value;

        console.log("========================================");
        console.log("🔐 AUTH DEBUG");
        console.log("========================================");

        console.log(
            "🍪 Token cookie exists:",
            !!token
        );

        console.log(
            "🍪 Token length:",
            token?.length || 0
        );

        if (token) {
            try {
                const decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );

                console.log(
                    "✅ JWT VERIFIED:",
                    decoded
                );

                if (!decoded?.id) {
                    console.log(
                        "❌ JWT has no user ID"
                    );
                } else {
                    const user =
                        await prisma.user.findUnique({
                            where: {
                                id: Number(decoded.id),
                            },
                        });

                    console.log(
                        "👤 DB USER FOUND:",
                        !!user
                    );

                    if (user) {
                        console.log(
                            "👤 USER ID:",
                            user.id
                        );

                        console.log(
                            "👤 USERNAME:",
                            user.username
                        );

                        console.log(
                            "========================================"
                        );

                        return user;
                    }
                }
            } catch (jwtError) {
                console.error(
                    "❌ JWT VERIFICATION FAILED:",
                    jwtError?.message
                );
            }
        }
    } catch (error) {
        console.error(
            "❌ TOKEN AUTH ERROR:",
            error?.message
        );
    }

    // ========================================================
    // 2. NEXTAUTH
    // ========================================================

    try {
        console.log(
            "🔎 Trying NextAuth..."
        );

        const session = await auth();

        console.log(
            "🔐 NextAuth session exists:",
            !!session
        );

        console.log(
            "📧 NextAuth email:",
            session?.user?.email || "NONE"
        );

        if (session?.user?.email) {
            const cleanEmail =
                session.user.email
                    .trim()
                    .toLowerCase();

            const user =
                await prisma.user.findUnique({
                    where: {
                        email: cleanEmail,
                    },
                });

            console.log(
                "👤 NextAuth DB user:",
                !!user
            );

            if (user) {
                console.log(
                    "========================================"
                );

                return user;
            }
        }
    } catch (error) {
        console.error(
            "❌ NEXTAUTH ERROR:",
            error?.message
        );
    }

    // ========================================================
    // 3. FAILED
    // ========================================================

    console.error(
        "❌❌❌ AUTH FAILED COMPLETELY ❌❌❌"
    );

    console.log(
        "========================================"
    );

    throw new Error("Unauthorized");
}