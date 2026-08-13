import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  try {
    // 1. Authenticate the user
    const loggedInUser = await verifyAuth(request);

    // 2. Get conversation ID
    const conversationId = Number((await params).id);

    if (Number.isNaN(conversationId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid conversation ID",
        },
        { status: 400 }
      );
    }

    // 3. Check if user belongs to this conversation
    const membership = await prisma.conversationMember.findUnique({
      where: {
        userId_conversationId: {
          userId: loggedInUser.id,
          conversationId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not a member of this conversation",
        },
        { status: 403 }
      );
    }

    // 4. Update lastReadAt
    const updatedMembership = await prisma.conversationMember.update({
      where: {
        userId_conversationId: {
          userId: loggedInUser.id,
          conversationId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Conversation marked as read",
        lastReadAt: updatedMembership.lastReadAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("MARK AS READ ERROR:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}