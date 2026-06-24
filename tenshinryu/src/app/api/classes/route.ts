import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all classes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const upcoming = searchParams.get("upcoming") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");

    // Note: schedule is stored as a String (e.g., "Mon/Wed 16:00-17:00")
    // not a DateTime, so we can't filter by date. We return all classes.
    const classes = await prisma.class.findMany({
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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
      })),
    });
  } catch (error: any) {
    console.error("Fetch classes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}

// POST create new class
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, schedule, location, maxStudents, instructorId, isRecurring } = body;

    if (!name || !schedule) {
      return NextResponse.json(
        { error: "Name and schedule are required" },
        { status: 400 }
      );
    }

    // For now, use a default dojo and instructor
    // In production, this would come from the session
    const dojo = await prisma.dojo.findFirst();
    if (!dojo) {
      return NextResponse.json(
        { error: "No dojo found" },
        { status: 400 }
      );
    }

    let targetInstructorId = instructorId;
    if (!targetInstructorId) {
      const instructor = await prisma.instructor.findFirst({
        where: { dojoId: dojo.id },
      });
      if (!instructor) {
        return NextResponse.json(
          { error: "No instructor found" },
          { status: 400 }
        );
      }
      targetInstructorId = instructor.id;
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        schedule,
        location,
        maxStudents: maxStudents || 999,
        isRecurring: isRecurring || false,
        dojoId: dojo.id,
        instructorId: targetInstructorId,
      },
      include: {
        instructor: {
          select: {
            name: true,
          },
        },
      },
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
  } catch (error: any) {
    console.error("Create class error:", error);
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}

// PUT update class
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, schedule, location, maxStudents, isRecurring } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        name,
        schedule,
        location,
        maxStudents,
        isRecurring,
      },
      include: {
        instructor: {
          select: {
            name: true,
          },
        },
      },
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
  } catch (error: any) {
    console.error("Update class error:", error);
    return NextResponse.json(
      { error: "Failed to update class" },
      { status: 500 }
    );
  }
}

// DELETE class
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    await prisma.class.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete class error:", error);
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 }
    );
  }
}
