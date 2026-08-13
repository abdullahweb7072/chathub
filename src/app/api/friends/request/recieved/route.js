import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// COOKIE PARSER
// ============================================================

function parseCookies(cookieHeader) {
  const cookies = {};

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (!name) return;

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
// GET - RECEIVED FRIEND REQUESTS
// ============================================================

export async function GET(request) {
  try {
    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const cookieHeader = request.headers.get("cookie");

    const cookies = parseCookies(cookieHeader);

    const token = cookies.Token;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (!process.env.JWT_SECRET) {
      console.error(
        "❌ JWT_SECRET is not configured"
      );

      return NextResponse.json(
        {
          success: false,
          message: "Server configuration error",
        },
        { status: 500 }
      );
    }

    // ========================================================
    // VERIFY TOKEN
    // ========================================================

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      console.error(
        "❌ JWT verification failed:",
        error.message
      );

      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const currentUserId = Number(
      decoded.id
    );

    if (
      !Number.isInteger(currentUserId) ||
      currentUserId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user",
        },
        { status: 401 }
      );
    }

    // ========================================================
    // FETCH RECEIVED REQUESTS
    // ========================================================

    const requests =
      await prisma.friendRequest.findMany({
        where: {
          receiverId: currentUserId,
          status: "PENDING",
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              isOnline: true,
              lastSeen: true,
            },
          },
        },
      });

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        count: requests.length,

        data: requests,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "❌ GET RECEIVED FRIEND REQUESTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch friend requests",
      },
      { status: 500 }
    );
  }
}