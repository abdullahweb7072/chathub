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
// AUTHENTICATE USER
// ============================================================

function authenticateUser(request) {
  const cookieHeader = request.headers.get("cookie");

  const cookies = parseCookies(cookieHeader);

  // Your application uses "Token"
  const token = cookies.Token;

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      ),
    };
  }

  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET is not configured");

    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Server configuration error",
        },
        { status: 500 }
      ),
    };
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId = Number(decoded.id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            message: "Invalid user",
          },
          { status: 401 }
        ),
      };
    }

    return {
      success: true,
      userId,
    };
  } catch (error) {
    console.error(
      "❌ JWT VERIFICATION ERROR:",
      error.message
    );

    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      ),
    };
  }
}

// ============================================================
// POST
// SEND FRIEND REQUEST
// ============================================================

export async function POST(request) {
  try {
    // ========================================================
    // AUTHENTICATE USER
    // ========================================================

    const auth = authenticateUser(request);

    if (!auth.success) {
      return auth.response;
    }

    const senderId = auth.userId;

    // ========================================================
    // READ REQUEST BODY
    // ========================================================

    const body = await request.json();

    const receiverId = Number(
      body?.receiverId
    );

    if (
      !Number.isInteger(receiverId) ||
      receiverId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid receiver ID",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // CANNOT SEND REQUEST TO YOURSELF
    // ========================================================

    if (senderId === receiverId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot send a friend request to yourself",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // CHECK RECEIVER
    // ========================================================

    const receiver =
      await prisma.user.findUnique({
        where: {
          id: receiverId,
        },

        select: {
          id: true,
          username: true,
          avatar: true,
        },
      });

    if (!receiver) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // ========================================================
    // CHECK EXISTING REQUEST
    // ========================================================

    const existingRequest =
      await prisma.friendRequest.findUnique({
        where: {
          senderId_receiverId: {
            senderId,
            receiverId,
          },
        },
      });

    if (existingRequest) {
      // ------------------------------------------------------
      // REQUEST ALREADY PENDING
      // ------------------------------------------------------

      if (
        existingRequest.status ===
        "PENDING"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Friend request already sent",
          },
          { status: 409 }
        );
      }

      // ------------------------------------------------------
      // ALREADY FRIENDS
      // ------------------------------------------------------

      if (
        existingRequest.status ===
        "ACCEPTED"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You are already friends",
          },
          { status: 409 }
        );
      }

      // ------------------------------------------------------
      // REJECTED / CANCELLED
      // RE-SEND REQUEST
      // ------------------------------------------------------

      const updatedRequest =
        await prisma.friendRequest.update({
          where: {
            id: existingRequest.id,
          },

          data: {
            status: "PENDING",
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

      console.log(
        `👥 Friend request re-sent: ${senderId} → ${receiverId}`
      );

      return NextResponse.json({
        success: true,
        message:
          "Friend request sent successfully",
        data: updatedRequest,
      });
    }

    // ========================================================
    // CHECK REVERSE REQUEST
    // ========================================================
    //
    // Example:
    //
    // Current user = 5
    // Other user = 10
    //
    // Existing request:
    //
    // senderId = 10
    // receiverId = 5
    //
    // Therefore the other user already sent us a request.
    //
    // ========================================================

    const reverseRequest =
      await prisma.friendRequest.findUnique({
        where: {
          senderId_receiverId: {
            senderId: receiverId,
            receiverId: senderId,
          },
        },
      });

    if (reverseRequest) {
      // ------------------------------------------------------
      // OTHER USER ALREADY SENT REQUEST
      // ------------------------------------------------------

      if (
        reverseRequest.status ===
        "PENDING"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This user has already sent you a friend request",
          },
          { status: 409 }
        );
      }

      // ------------------------------------------------------
      // ALREADY FRIENDS
      // ------------------------------------------------------

      if (
        reverseRequest.status ===
        "ACCEPTED"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You are already friends",
          },
          { status: 409 }
        );
      }
    }

    // ========================================================
    // CREATE FRIEND REQUEST
    // ========================================================

    const friendRequest =
      await prisma.friendRequest.create({
        data: {
          senderId,
          receiverId,
          status: "PENDING",
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

    console.log(
      `👥 Friend request sent: ${senderId} → ${receiverId}`
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,
        message:
          "Friend request sent successfully",
        data: friendRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "❌ SEND FRIEND REQUEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to send friend request",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// GET
// GET INCOMING PENDING FRIEND REQUESTS
// ============================================================

export async function GET(request) {
  try {
    // ========================================================
    // AUTHENTICATE USER
    // ========================================================

    const auth = authenticateUser(request);

    if (!auth.success) {
      return auth.response;
    }

    const userId = auth.userId;

    // ========================================================
    // GET PENDING REQUESTS
    // ========================================================

    const requests =
      await prisma.friendRequest.findMany({
        where: {
          receiverId: userId,

          status: "PENDING",
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,

          senderId: true,

          receiverId: true,

          status: true,

          createdAt: true,

          updatedAt: true,

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

    return NextResponse.json({
      success: true,

      count: requests.length,

      requests,
    });
  } catch (error) {
    console.error(
      "❌ GET FRIEND REQUESTS ERROR:",
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

// ============================================================
// PATCH
// ACCEPT / REJECT FRIEND REQUEST
// ============================================================

export async function PATCH(request) {
  try {
    // ========================================================
    // AUTHENTICATE USER
    // ========================================================

    const auth = authenticateUser(request);

    if (!auth.success) {
      return auth.response;
    }

    const userId = auth.userId;

    // ========================================================
    // READ REQUEST BODY
    // ========================================================

    const body = await request.json();

    const requestId = Number(body?.requestId);
    const action = body?.action;

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
    // VALIDATE ACTION
    // ========================================================

    if (
      action !== "accept" &&
      action !== "reject"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Action must be either "accept" or "reject"',
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
    // ONLY RECEIVER CAN ACCEPT / REJECT
    // ========================================================

    if (friendRequest.receiverId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not authorized to manage this friend request",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // REQUEST MUST BE PENDING
    // ========================================================

    if (friendRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message:
            `Friend request is already ${friendRequest.status.toLowerCase()}`,
        },
        { status: 409 }
      );
    }

    // ========================================================
    // REJECT
    // ========================================================

    if (action === "reject") {
      const rejectedRequest =
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

      console.log(
        `❌ Friend request rejected: ${friendRequest.senderId} → ${friendRequest.receiverId}`
      );

      return NextResponse.json({
        success: true,
        message: "Friend request rejected",
        data: rejectedRequest,
      });
    }

    // ========================================================
    // ACCEPT
    // ========================================================

    const result = await prisma.$transaction(
      async (tx) => {
        // ----------------------------------------------------
        // UPDATE FRIEND REQUEST
        // ----------------------------------------------------

        const acceptedRequest =
          await tx.friendRequest.update({
            where: {
              id: requestId,
            },

            data: {
              status: "ACCEPTED",
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

        // ----------------------------------------------------
        // CHECK IF DIRECT CONVERSATION ALREADY EXISTS
        // ----------------------------------------------------

        const senderId =
          friendRequest.senderId;

        const receiverId =
          friendRequest.receiverId;

        const senderMemberships =
          await tx.conversationMember.findMany({
            where: {
              userId: senderId,
            },

            select: {
              conversationId: true,
            },
          });

        const receiverMemberships =
          await tx.conversationMember.findMany({
            where: {
              userId: receiverId,
            },

            select: {
              conversationId: true,
            },
          });

        const senderConversationIds =
          new Set(
            senderMemberships.map(
              (membership) =>
                membership.conversationId
            )
          );

        let directConversation = null;

        for (
          const membership of receiverMemberships
        ) {
          if (
            senderConversationIds.has(
              membership.conversationId
            )
          ) {
            const conversation =
              await tx.conversation.findFirst({
                where: {
                  id: membership.conversationId,

                  type: "DIRECT",

                  members: {
                    every: {
                      userId: {
                        in: [
                          senderId,
                          receiverId,
                        ],
                      },
                    },
                  },
                },

                include: {
                  members: true,
                },
              });

            if (
              conversation &&
              conversation.members.length === 2
            ) {
              directConversation =
                conversation;

              break;
            }
          }
        }

        // ----------------------------------------------------
        // CREATE DIRECT CONVERSATION IF NEEDED
        // ----------------------------------------------------

        if (!directConversation) {
          directConversation =
            await tx.conversation.create({
              data: {
                type: "DIRECT",

                createdBy: receiverId,

                members: {
                  create: [
                    {
                      userId: senderId,
                    },
                    {
                      userId: receiverId,
                    },
                  ],
                },
              },

              include: {
                members: true,
              },
            });
        }

        // ----------------------------------------------------
        // RETURN EVERYTHING
        // ----------------------------------------------------

        return {
          acceptedRequest,
          conversation:
            directConversation,
        };
      }
    );

    console.log(
      `✅ Friend request accepted: ${friendRequest.senderId} ↔ ${friendRequest.receiverId}`
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json({
      success: true,

      message:
        "Friend request accepted",

      data: {
        request:
          result.acceptedRequest,

        conversation:
          result.conversation,
      },
    });
  } catch (error) {
    console.error(
      "❌ MANAGE FRIEND REQUEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to manage friend request",
      },
      { status: 500 }
    );
  }
}