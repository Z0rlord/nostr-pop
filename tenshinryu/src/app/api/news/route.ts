import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember, requireStaff } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (member instanceof NextResponse) return member;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);
    const breakingOnly = searchParams.get("breaking") === "1";
    const includeHidden = member.kind === "staff" && searchParams.get("all") === "1";
    const now = new Date();

    const items = await prisma.newsItem.findMany({
      where: {
        dojoId: member.dojoId,
        ...(includeHidden ? {} : { isHidden: false }),
        ...(breakingOnly ? { isBreaking: true } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ isBreaking: "desc" }, { publishedAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        authorName: n.authorName,
        isBreaking: n.isBreaking,
        publishedAt: n.publishedAt,
        expiresAt: n.expiresAt,
        isHidden: n.isHidden,
      })),
      dojoId: member.dojoId,
      canManage: member.kind === "staff",
    });
  } catch (error) {
    console.error("News GET error:", error);
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const isBreaking = !!body.isBreaking;
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    if (!title || !text) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }
    if (title.length > 200 || text.length > 10000) {
      return NextResponse.json({ error: "Title or body too long" }, { status: 400 });
    }

    const item = await prisma.newsItem.create({
      data: {
        dojoId: staff.dojoId,
        authorId: staff.instructorId,
        authorName: staff.name,
        title,
        body: text,
        isBreaking,
        expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        title: item.title,
        body: item.body,
        authorName: item.authorName,
        isBreaking: item.isBreaking,
        publishedAt: item.publishedAt,
        expiresAt: item.expiresAt,
      },
    });
  } catch (error) {
    console.error("News POST error:", error);
    return NextResponse.json({ error: "Failed to publish news" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "News ID is required" }, { status: 400 });
    }

    const existing = await prisma.newsItem.findUnique({ where: { id } });
    if (!existing || !staff.dojoIds.includes(existing.dojoId)) {
      return NextResponse.json({ error: "News not found" }, { status: 404 });
    }

    const data: {
      title?: string;
      body?: string;
      isBreaking?: boolean;
      isHidden?: boolean;
      expiresAt?: Date | null;
    } = {};
    if (typeof body.title === "string") data.title = body.title.trim();
    if (typeof body.body === "string") data.body = body.body.trim();
    if (typeof body.isBreaking === "boolean") data.isBreaking = body.isBreaking;
    if (typeof body.isHidden === "boolean") data.isHidden = body.isHidden;
    if (body.expiresAt === null) data.expiresAt = null;
    else if (body.expiresAt) {
      const d = new Date(body.expiresAt);
      if (!Number.isNaN(d.getTime())) data.expiresAt = d;
    }

    const item = await prisma.newsItem.update({ where: { id }, data });
    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        title: item.title,
        body: item.body,
        isBreaking: item.isBreaking,
        isHidden: item.isHidden,
        publishedAt: item.publishedAt,
        expiresAt: item.expiresAt,
      },
    });
  } catch (error) {
    console.error("News PUT error:", error);
    return NextResponse.json({ error: "Failed to update news" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "News ID is required" }, { status: 400 });
    }

    const existing = await prisma.newsItem.findUnique({ where: { id } });
    if (!existing || !staff.dojoIds.includes(existing.dojoId)) {
      return NextResponse.json({ error: "News not found" }, { status: 404 });
    }

    await prisma.newsItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("News DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete news" }, { status: 500 });
  }
}
