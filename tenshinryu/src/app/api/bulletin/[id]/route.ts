import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember, requireStaff, forbidden } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const member = await requireMember(req);
    if (member instanceof NextResponse) return member;

    const { id } = params;
    const post = await prisma.bulletinPost.findUnique({
      where: { id },
      include: {
        replies: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!post || !member.dojoIds.includes(post.dojoId)) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (post.isHidden && member.kind !== "staff") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        body: post.body,
        authorName: post.authorName,
        authorRole: post.authorRole,
        authorId: post.authorId,
        isPinned: post.isPinned,
        isHidden: post.isHidden,
        createdAt: post.createdAt,
        replies: post.replies.map((r) => ({
          id: r.id,
          body: r.body,
          authorName: r.authorName,
          authorRole: r.authorRole,
          isStaffReply: r.isStaffReply,
          createdAt: r.createdAt,
        })),
      },
      canModerate: member.kind === "staff",
      canReply: true,
    });
  } catch (error) {
    console.error("Bulletin detail error:", error);
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const { id } = params;
    const existing = await prisma.bulletinPost.findUnique({ where: { id } });
    if (!existing || !staff.dojoIds.includes(existing.dojoId)) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: { isPinned?: boolean; isHidden?: boolean } = {};
    if (typeof body.isPinned === "boolean") data.isPinned = body.isPinned;
    if (typeof body.isHidden === "boolean") data.isHidden = body.isHidden;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const post = await prisma.bulletinPost.update({ where: { id }, data });
    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        isPinned: post.isPinned,
        isHidden: post.isHidden,
      },
    });
  } catch (error) {
    console.error("Bulletin PATCH error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const member = await requireMember(req);
    if (member instanceof NextResponse) return member;

    const { id } = params;
    const existing = await prisma.bulletinPost.findUnique({ where: { id } });
    if (!existing || !member.dojoIds.includes(existing.dojoId)) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isOwner = existing.authorId === member.userId;
    if (!isOwner && member.kind !== "staff") {
      return forbidden("Only the author or staff can delete");
    }

    await prisma.bulletinPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulletin DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
