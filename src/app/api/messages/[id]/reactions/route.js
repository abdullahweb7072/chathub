import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    // 1. Authenticate user
    const loggedInUser = await verifyAuth(request);

    // 2. Get message ID
    const messageId = Number((await params).id);

    if (Number.isNaN(messageId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid message ID",
        },
        { status: 400 }
      );
    }

    // 3. Get emoji
    const { emoji } = await request.json();

    if (!emoji || !emoji.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Emoji is required",
        },
        { status: 400 }
      );
    }

    // 4. Find message
    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Message not found",
        },
        { status: 404 }
      );
    }

    // 5. Check conversation membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        userId_conversationId: {
          userId: loggedInUser.id,
          conversationId: message.conversationId,
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

    // 6. Check if reaction already exists
    const existingReaction = await prisma.messageReaction.findUnique({
      where: {
        userId_messageId_emoji: {
          userId: loggedInUser.id,
          messageId,
          emoji: emoji.trim(),
        },
      },
    });

    if (existingReaction) {
      return NextResponse.json(
        {
          success: false,
          message: "You already reacted with this emoji",
        },
        { status: 409 }
      );
    }

    // 7. Create reaction
    const reaction = await prisma.messageReaction.create({
      data: {
        emoji: emoji.trim(),
        userId: loggedInUser.id,
        messageId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Reaction added successfully",
        reaction,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ADD REACTION ERROR:", error);

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

export async function DELETE(request, { params }) {
  try {
    // 1. Authenticate user
    const loggedInUser = await verifyAuth(request);

    // 2. Get message ID
    const messageId = Number((await params).id);

    if (Number.isNaN(messageId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid message ID",
        },
        { status: 400 }
      );
    }

    // 3. Get emoji
    const { emoji } = await request.json();

    if (!emoji || !emoji.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Emoji is required",
        },
        { status: 400 }
      );
    }

    // 4. Find message
    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Message not found",
        },
        { status: 404 }
      );
    }

    // 5. Check conversation membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        userId_conversationId: {
          userId: loggedInUser.id,
          conversationId: message.conversationId,
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

    // 6. Find user's reaction
    const reaction = await prisma.messageReaction.findUnique({
      where: {
        userId_messageId_emoji: {
          userId: loggedInUser.id,
          messageId,
          emoji: emoji.trim(),
        },
      },
    });

    if (!reaction) {
      return NextResponse.json(
        {
          success: false,
          message: "Reaction not found",
        },
        { status: 404 }
      );
    }

    // 7. Delete reaction
    await prisma.messageReaction.delete({
      where: {
        id: reaction.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Reaction removed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("REMOVE REACTION ERROR:", error);

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