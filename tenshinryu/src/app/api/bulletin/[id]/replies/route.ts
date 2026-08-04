import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const member = await requireMember(req);
    if (member instanceof NextResponse) return member;

    const { id } = params;
    const post = await prisma.bulletinPost.findUnique({ where: { id } });
    if (!post || !member.dojoIds.includes(post.dojoId) || post.isHidden) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await req.json();
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Reply body is required" }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: "Reply too long" }, { status: 400 });
    }

    const isStaff = member.kind === "staff";
    const reply = await prisma.bulletinReply.create({
      data: {
        postId: id,
        authorId: member.userId,
        authorRole: member.role,
        authorName: member.name,
        body: text,
        isStaffReply: isStaff,
      },
    });

    return NextResponse.json({
      success: true,
      reply: {
        id: reply.id,
        body: reply.body,
        authorName: reply.authorName,
        authorRole: reply.authorRole,
        isStaffReply: reply.isStaffReply,
        createdAt: reply.createdAt,
      },
    });
  } catch (error) {
    console.error("Bulletin reply error:", error);
    return NextResponse.json({ error: "Failed to post reply" }, { status: 500 });
  }
}
