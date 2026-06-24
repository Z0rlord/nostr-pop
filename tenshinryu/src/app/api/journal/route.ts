import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/journal - Get journal entries for a student
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const entryType = searchParams.get("entryType");
    const search = searchParams.get("search");

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    const where: any = { studentId };

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate);
      if (endDate) where.entryDate.lte = new Date(endDate);
    }

    if (entryType) {
      where.entryType = entryType;
    }

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

    // Get entry type stats
    const stats = await prisma.journalEntry.groupBy({
      by: ["entryType"],
      where: { studentId },
      _count: { entryType: true },
    });

    return NextResponse.json({ entries, stats });
  } catch (error: any) {
    console.error("[Journal] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch journal entries" },
      { status: 500 }
    );
  }
}

// POST /api/journal - Create a new journal entry
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
  } catch (error: any) {
    console.error("[Journal] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create journal entry" },
      { status: 500 }
    );
  }
}

// PUT /api/journal - Update a journal entry
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const entry = await prisma.journalEntry.update({
      where: { id },
      data: {
        ...updateData,
        entryDate: updateData.entryDate ? new Date(updateData.entryDate) : undefined,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    console.error("[Journal] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update journal entry" },
      { status: 500 }
    );
  }
}

// DELETE /api/journal - Delete a journal entry
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.journalEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Journal] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete journal entry" },
      { status: 500 }
    );
  }
}
