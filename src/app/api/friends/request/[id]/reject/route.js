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
// POST - REJECT FRIEND REQUEST
// ============================================================

export async function POST(request, { params }) {
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
    // VERIFY JWT
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
    // NEXT.JS 16
    // params IS A PROMISE
    // ========================================================

    const resolvedParams = await params;

    const requestId = Number(
      resolvedParams?.id
    );

    // ========================================================
    // VALIDATE REQUEST ID
    // ========================================================

    if (
      !Number.isInteger(requestId) ||
      requestId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid friend request ID",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // FIND FRIEND REQUEST
    // ========================================================

    const friendRequest =
      await prisma.friendRequest.findUnique({
        where: {
          id: requestId,
        },

        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },

          receiver: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

    if (!friendRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "Friend request not found",
        },
        { status: 404 }
      );
    }

    // ========================================================
    // VERIFY RECEIVER
    // ========================================================

    if (
      friendRequest.receiverId !==
      currentUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not authorized to reject this friend request",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // CHECK STATUS
    // ========================================================

    if (
      friendRequest.status === "REJECTED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Friend request has already been rejected",
        },
        { status: 409 }
      );
    }

    if (
      friendRequest.status === "ACCEPTED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot reject an accepted friend request",
        },
        { status: 409 }
      );
    }

    if (
      friendRequest.status !== "PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `This friend request is ${friendRequest.status.toLowerCase()}`,
        },
        { status: 409 }
      );
    }

    // ========================================================
    // REJECT REQUEST
    // ========================================================

    const updatedRequest =
      await prisma.friendRequest.update({
        where: {
          id: requestId,
        },

        data: {
          status: "REJECTED",
        },

        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },

          receiver: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

    // ========================================================
    // RESPONSE
    // ========================================================

    console.log(
      `❌ Friend request ${requestId} rejected by user ${currentUserId}`
    );

    return NextResponse.json(
      {
        success: true,

        message:
          "Friend request rejected successfully",

        data: updatedRequest,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "❌ REJECT FRIEND REQUEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to reject friend request",
      },
      { status: 500 }
    );
  }
}