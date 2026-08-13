import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ============================================================
// USER SELECT
// ============================================================

const userSelect = {
  id: true,
  username: true,
  email: true,
  avatar: true,
  bio: true,
  isOnline: true,
  lastSeen: true,
};

// ============================================================
// CONVERSATION MEMBERS INCLUDE
// ============================================================

const membersInclude = {
  members: {
    include: {
      user: {
        select: userSelect,
      },
    },
  },
};

// ============================================================
// POST
// CREATE / GET DIRECT CONVERSATION
// ============================================================

export async function POST(request) {
  try {
    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const loggedInUser =
      await verifyAuth(request);

    const currentUserId =
      Number(loggedInUser.id);

    // ========================================================
    // REQUEST BODY
    // ========================================================

    const body =
      await request.json();

    const { userId } = body;

    // ========================================================
    // VALIDATE USER ID
    // ========================================================

    if (
      userId === undefined ||
      userId === null ||
      userId === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    const targetUserId =
      Number(userId);

    if (
      !Number.isInteger(
        targetUserId
      ) ||
      targetUserId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid User ID",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // CANNOT CHAT WITH YOURSELF
    // ========================================================

    if (
      targetUserId ===
      currentUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot create a conversation with yourself",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // FIND TARGET USER
    // ========================================================

    const otherUser =
      await prisma.user.findUnique({
        where: {
          id: targetUserId,
        },

        select: userSelect,
      });

    if (!otherUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // ========================================================
    // FIND EXISTING DIRECT CONVERSATION
    // ========================================================

    const existingConversations =
      await prisma.conversation.findMany({
        where: {
          type: "DIRECT",

          members: {
            some: {
              userId:
                currentUserId,
            },
          },

          AND: {
            members: {
              some: {
                userId:
                  targetUserId,
              },
            },
          },
        },

        include: {
          members: {
            include: {
              user: {
                select: userSelect,
              },
            },
          },
        },

        orderBy: {
          updatedAt: "desc",
        },
      });

    // ========================================================
    // MAKE SURE IT IS EXACTLY TWO MEMBERS
    // ========================================================

    const existingConversation =
      existingConversations.find(
        (conversation) => {
          if (
            conversation.members.length !==
            2
          ) {
            return false;
          }

          const hasCurrentUser =
            conversation.members.some(
              (member) =>
                Number(
                  member.userId
                ) ===
                currentUserId
            );

          const hasTargetUser =
            conversation.members.some(
              (member) =>
                Number(
                  member.userId
                ) ===
                targetUserId
            );

          return (
            hasCurrentUser &&
            hasTargetUser
          );
        }
      );

    // ========================================================
    // EXISTING CONVERSATION
    // ========================================================

    if (
      existingConversation
    ) {
      return NextResponse.json(
        {
          success: true,

          message:
            "Conversation already exists",

          currentUserId,

          conversation:
            existingConversation,
        },
        { status: 200 }
      );
    }

    // ========================================================
    // CREATE NEW DIRECT CONVERSATION
    // ========================================================

    const conversation =
      await prisma.conversation.create({
        data: {
          type: "DIRECT",

          createdBy:
            currentUserId,

          members: {
            create: [
              {
                userId:
                  currentUserId,
              },
              {
                userId:
                  targetUserId,
              },
            ],
          },
        },

        include: {
          members: {
            include: {
              user: {
                select: userSelect,
              },
            },
          },
        },
      });

    // ========================================================
    // SUCCESS
    // ========================================================

    console.log(
      "💬 DIRECT CONVERSATION CREATED"
    );

    console.log(
      "Conversation ID:",
      conversation.id
    );

    console.log(
      "Users:",
      currentUserId,
      "↔",
      targetUserId
    );

    return NextResponse.json(
      {
        success: true,

        message:
          "Conversation created successfully",

        currentUserId,

        conversation,
      },

      { status: 201 }
    );
  } catch (error) {
    console.error(
      "❌ CONVERSATION POST ERROR:",
      error
    );

    // ========================================================
    // AUTH ERROR
    // ========================================================

    if (
      error?.message ===
      "Unauthorized"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // ========================================================
    // GENERAL ERROR
    // ========================================================

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// GET
// GET ALL USER CONVERSATIONS
// ============================================================

export async function GET(request) {
  try {
    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const loggedInUser =
      await verifyAuth(request);

    const currentUserId =
      Number(loggedInUser.id);

    // ========================================================
    // FETCH CONVERSATIONS
    // ========================================================

    const conversations =
      await prisma.conversation.findMany({
        where: {
          members: {
            some: {
              userId:
                currentUserId,
            },
          },
        },

        include: {
          // ================================================
          // MEMBERS
          // ================================================

          members: {
            include: {
              user: {
                select: userSelect,
              },
            },
          },

          // ================================================
          // LATEST MESSAGE
          // ================================================

          messages: {
            where: {
              deletedAt: null,
            },

            orderBy: {
              createdAt: "desc",
            },

            take: 1,

            select: {
              id: true,
              conversationId: true,
              content: true,
              type: true,
              senderId: true,
              createdAt: true,
              editedAt: true,
              deletedAt: true,
            },
          },
        },

        orderBy: {
          updatedAt: "desc",
        },
      });

    // ========================================================
    // FORMAT CONVERSATIONS
    // ========================================================

    const formattedConversations =
      await Promise.all(
        conversations.map(
          async (conversation) => {
            // ==============================================
            // CURRENT USER MEMBER
            // ==============================================

            const currentMember =
              conversation.members.find(
                (member) =>
                  Number(
                    member.userId
                  ) ===
                  currentUserId
              );

            // ==============================================
            // UNREAD COUNT
            // ==============================================

            const unreadWhere = {
              conversationId:
                conversation.id,

              senderId: {
                not:
                  currentUserId,
              },

              deletedAt: null,
            };

            let unreadCount;

            if (
              currentMember?.lastReadAt
            ) {
              unreadCount =
                await prisma.message.count(
                  {
                    where: {
                      ...unreadWhere,

                      createdAt: {
                        gt: currentMember.lastReadAt,
                      },
                    },
                  }
                );
            } else {
              unreadCount =
                await prisma.message.count(
                  {
                    where:
                      unreadWhere,
                  }
                );
            }

            // ==============================================
            // LATEST MESSAGE
            // ==============================================

            const latestMessage =
              conversation
                .messages?.[0] ||
              null;

            // ==============================================
            // RETURN FULL CONVERSATION
            // ==============================================

            return {
              id: conversation.id,

              type:
                conversation.type,

              name:
                conversation.name ||
                null,

              avatar:
                conversation.avatar ||
                null,

              // IMPORTANT:
              // Keep conversationMember objects.
              //
              // ConversationList uses:
              // member.user.id
              // member.user.username
              // member.user.avatar
              // member.user.isOnline

              members:
                conversation.members,

              latestMessage,

              unreadCount,

              lastReadAt:
                currentMember?.lastReadAt ||
                null,

              createdAt:
                conversation.createdAt,

              updatedAt:
                conversation.updatedAt,
            };
          }
        )
      );

    // ========================================================
    // SUCCESS
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        currentUserId,

        currentUser: {
          id:
            loggedInUser.id,

          username:
            loggedInUser.username,

          email:
            loggedInUser.email,

          avatar:
            loggedInUser.avatar,

          bio:
            loggedInUser.bio,

          isOnline:
            loggedInUser.isOnline,

          lastSeen:
            loggedInUser.lastSeen,
        },

        conversations:
          formattedConversations,
      },

      { status: 200 }
    );
  } catch (error) {
    console.error(
      "❌ GET CONVERSATIONS ERROR:",
      error
    );

    // ========================================================
    // AUTH ERROR
    // ========================================================

    if (
      error?.message ===
      "Unauthorized"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // ========================================================
    // GENERAL ERROR
    // ========================================================

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong",
      },
      { status: 500 }
    );
  }
}