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
// GET FRIENDS
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
      console.error("❌ JWT_SECRET is not configured");

      return NextResponse.json(
        {
          success: false,
          message: "Server configuration error",
        },
        { status: 500 }
      );
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const currentUserId = Number(decoded.id);

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
    // FIND ACCEPTED FRIEND REQUESTS
    // ========================================================

    const friendRequests =
      await prisma.friendRequest.findMany({
        where: {
          status: "ACCEPTED",

          OR: [
            {
              senderId: currentUserId,
            },
            {
              receiverId: currentUserId,
            },
          ],
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

          receiver: {
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

        orderBy: {
          updatedAt: "desc",
        },
      });

    // ========================================================
    // BUILD FRIEND LIST
    // ========================================================

    const friends = [];

    for (const request of friendRequests) {
      const friend =
        Number(request.senderId) === currentUserId
          ? request.receiver
          : request.sender;

      if (!friend) {
        continue;
      }

      // ======================================================
      // FIND DIRECT CONVERSATION
      // ======================================================

      const conversations =
        await prisma.conversation.findMany({
          where: {
            type: "DIRECT",

            members: {
              some: {
                userId: currentUserId,
              },
            },

            AND: {
              members: {
                some: {
                  userId: friend.id,
                },
              },
            },
          },

          include: {
            members: {
              select: {
                userId: true,
              },
            },
          },
        });

      const directConversation =
        conversations.find(
          (conversation) =>
            conversation.members.length === 2 &&
            conversation.members.some(
              (member) =>
                Number(member.userId) ===
                currentUserId
            ) &&
            conversation.members.some(
              (member) =>
                Number(member.userId) ===
                Number(friend.id)
            )
        );

      friends.push({
        friendshipId: request.id,

        friend: {
          id: friend.id,
          username: friend.username,
          avatar: friend.avatar,
          bio: friend.bio,
          isOnline: friend.isOnline,
          lastSeen: friend.lastSeen,
        },

        conversation: directConversation
          ? {
              id: directConversation.id,
              type: directConversation.type,
            }
          : null,
      });
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        count: friends.length,

        data: friends,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "❌ GET FRIENDS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch friends",
      },
      { status: 500 }
    );
  }
}