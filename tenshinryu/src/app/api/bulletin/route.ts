import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (member instanceof NextResponse) return member;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const includeHidden = member.kind === "staff" && searchParams.get("all") === "1";

    const posts = await prisma.bulletinPost.findMany({
      where: {
        dojoId: member.dojoId,
        ...(includeHidden ? {} : { isHidden: false }),
      },
      include: {
        replies: {
          orderBy: { createdAt: "asc" },
          take: 3,
        },
        _count: { select: { replies: true } },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        authorName: p.authorName,
        authorRole: p.authorRole,
        isPinned: p.isPinned,
        isHidden: p.isHidden,
        createdAt: p.createdAt,
        replyCount: p._count.replies,
        previewReplies: p.replies.map((r) => ({
          id: r.id,
          body: r.body,
          authorName: r.authorName,
          authorRole: r.authorRole,
          isStaffReply: r.isStaffReply,
          createdAt: r.createdAt,
        })),
      })),
      dojoId: member.dojoId,
      canModerate: member.kind === "staff",
    });
  } catch (error) {
    console.error("Bulletin GET error:", error);
    return NextResponse.json({ error: "Failed to load board" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (member instanceof NextResponse) return member;

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";

    if (!title || !text) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }
    if (title.length > 200 || text.length > 5000) {
      return NextResponse.json({ error: "Title or body too long" }, { status: 400 });
    }

    const post = await prisma.bulletinPost.create({
      data: {
        dojoId: member.dojoId,
        authorId: member.userId,
        authorRole: member.role,
        authorName: member.name,
        title,
        body: text,
      },
    });

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        body: post.body,
        authorName: post.authorName,
        authorRole: post.authorRole,
        isPinned: post.isPinned,
        createdAt: post.createdAt,
        replyCount: 0,
      },
    });
  } catch (error) {
    console.error("Bulletin POST error:", error);
    return NextResponse.json({ error: "Failed to post question" }, { status: 500 });
  }
}
