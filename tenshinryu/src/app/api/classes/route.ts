import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, isStaffForDojo } from "@/lib/session";

// GET classes for active dojo (staff)
export async function GET(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const classes = await prisma.class.findMany({
      where: { dojoId: staff.dojoId },
      include: {
        instructor: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        schedule: c.schedule,
        location: c.location,
        maxStudents: c.maxStudents,
        isRecurring: c.isRecurring,
        instructorId: c.instructorId,
        instructorName: c.instructor?.name || "Unknown",
        dojoId: c.dojoId,
      })),
      dojoId: staff.dojoId,
    });
  } catch (error: unknown) {
    console.error("Fetch classes error:", error);
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const body = await req.json();
    const { name, schedule, location, maxStudents, instructorId, isRecurring } = body;

    if (!name || !schedule) {
      return NextResponse.json({ error: "Name and schedule are required" }, { status: 400 });
    }

    const targetInstructorId = instructorId || staff.instructorId;
    if (!(await isStaffForDojo(targetInstructorId, staff.dojoId))) {
      return NextResponse.json(
        { error: "Instructor is not a member of this dojo" },
        { status: 400 }
      );
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        schedule,
        location,
        maxStudents: maxStudents || 999,
        isRecurring: isRecurring || false,
        dojoId: staff.dojoId,
        instructorId: targetInstructorId,
      },
      include: { instructor: { select: { name: true } } },
    });

    return NextResponse.json({
      success: true,
      class: {
        id: newClass.id,
        name: newClass.name,
        schedule: newClass.schedule,
        location: newClass.location,
        maxStudents: newClass.maxStudents,
        isRecurring: newClass.isRecurring,
        instructorName: newClass.instructor.name,
      },
    });
  } catch (error: unknown) {
    console.error("Create class error:", error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const body = await req.json();
    const { id, name, schedule, location, maxStudents, isRecurring } = body;

    if (!id) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
    }

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing || !staff.dojoIds.includes(existing.dojoId)) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: { name, schedule, location, maxStudents, isRecurring },
      include: { instructor: { select: { name: true } } },
    });

    return NextResponse.json({
      success: true,
      class: {
        id: updatedClass.id,
        name: updatedClass.name,
        schedule: updatedClass.schedule,
        location: updatedClass.location,
        maxStudents: updatedClass.maxStudents,
        isRecurring: updatedClass.isRecurring,
        instructorName: updatedClass.instructor.name,
      },
    });
  } catch (error: unknown) {
    console.error("Update class error:", error);
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
    }

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing || !staff.dojoIds.includes(existing.dojoId)) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Class deleted successfully" });
  } catch (error: unknown) {
    console.error("Delete class error:", error);
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
  }
}
