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
    // 1. TRY CUSTOM TOKEN FIRST
    // ========================================================

    try {
        const token = request.cookies.get("Token")?.value;

        if (token) {
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            if (!decoded?.id) {
                throw new Error("Invalid token");
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: Number(decoded.id),
                },
            });

            if (user) {
                return user;
            }
        }
    } catch (error) {
        console.log(
            "Custom Token authentication failed, trying NextAuth..."
        );
    }

    // ========================================================
    // 2. TRY NEXTAUTH SESSION
    // ========================================================

    try {
        const session = await auth();

        if (session?.user?.email) {
            const cleanEmail = session.user.email
                .trim()
                .toLowerCase();

            const user = await prisma.user.findUnique({
                where: {
                    email: cleanEmail,
                },
            });

            if (user) {
                return user;
            }
        }
    } catch (error) {
        console.error(
            "NextAuth authentication error:",
            error
        );
    }

    // ========================================================
    // 3. NO AUTHENTICATION
    // ========================================================

    throw new Error("Unauthorized");
}