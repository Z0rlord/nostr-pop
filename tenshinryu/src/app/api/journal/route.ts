import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudentAccess } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const entryType = searchParams.get("entryType");
    const search = searchParams.get("search");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const access = await requireStudentAccess(req, studentId);
    if (access instanceof NextResponse) return access;

    const where: Record<string, unknown> = { studentId };

    if (startDate || endDate) {
      const entryDate: Record<string, Date> = {};
      if (startDate) entryDate.gte = new Date(startDate);
      if (endDate) entryDate.lte = new Date(endDate);
      where.entryDate = entryDate;
    }

    if (entryType) where.entryType = entryType;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { entryDate: "desc" },
    });

    const stats = await prisma.journalEntry.groupBy({
      by: ["entryType"],
      where: { studentId },
      _count: { entryType: true },
    });

    return NextResponse.json({ entries, stats });
  } catch (error: unknown) {
    console.error("[Journal] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch journal entries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studentId,
      title,
      content,
      entryType,
      relatedClassId,
      relatedPracticeId,
      voiceNoteUrl,
      voiceNoteDuration,
      voiceNoteTranscript,
      photos,
      tags,
      isPrivate,
      entryDate,
    } = body;

    if (!studentId || !content) {
      return NextResponse.json(
        { error: "studentId and content are required" },
        { status: 400 }
      );
    }

    const access = await requireStudentAccess(req, studentId);
    if (access instanceof NextResponse) return access;

    const entry = await prisma.journalEntry.create({
      data: {
        studentId,
        title: title || "Untitled Entry",
        content,
        entryType: entryType || "general",
        relatedClassId,
        relatedPracticeId,
        voiceNoteUrl,
        voiceNoteDuration,
        voiceNoteTranscript,
        photos: photos || [],
        tags: tags || [],
        isPrivate: isPrivate !== undefined ? isPrivate : true,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: unknown) {
    console.error("[Journal] POST error:", error);
    return NextResponse.json({ error: "Failed to create journal entry" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.journalEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const access = await requireStudentAccess(req, existing.studentId);
    if (access instanceof NextResponse) return access;

    const entry = await prisma.journalEntry.update({
      where: { id },
      data: {
        ...updateData,
        entryDate: updateData.entryDate ? new Date(updateData.entryDate) : undefined,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: unknown) {
    console.error("[Journal] PUT error:", error);
    return NextResponse.json({ error: "Failed to update journal entry" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.journalEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const access = await requireStudentAccess(req, existing.studentId);
    if (access instanceof NextResponse) return access;

    await prisma.journalEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Journal] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete journal entry" }, { status: 500 });
  }
}
