import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember, requireStaff, isStaffForDojo } from "@/lib/session";
import type { ClassMode } from "@prisma/client";

function serializeClass(c: {
  id: string;
  name: string;
  schedule: string;
  location: string | null;
  maxStudents: number;
  isRecurring: boolean;
  mode: ClassMode;
  meetingUrl: string | null;
  instructorId: string;
  dojoId: string;
  instructor?: { name: string } | null;
}) {
  return {
    id: c.id,
    name: c.name,
    schedule: c.schedule,
    location: c.location,
    maxStudents: c.maxStudents,
    isRecurring: c.isRecurring,
    mode: c.mode,
    meetingUrl: c.meetingUrl,
    instructorId: c.instructorId,
    instructorName: c.instructor?.name || "Unknown",
    dojoId: c.dojoId,
  };
}

/** GET schedule for active dojo — any signed-in member */
export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (member instanceof NextResponse) return member;

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // PHYSICAL | ONLINE
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 200);

    const classes = await prisma.class.findMany({
      where: {
        dojoId: member.dojoId,
        ...(mode === "PHYSICAL" || mode === "ONLINE" ? { mode: mode as ClassMode } : {}),
      },
      include: {
        instructor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const physical = classes.filter((c) => c.mode === "PHYSICAL");
    const online = classes.filter((c) => c.mode === "ONLINE");

    return NextResponse.json({
      classes: classes.map(serializeClass),
      physical: physical.map(serializeClass),
      online: online.map(serializeClass),
      dojoId: member.dojoId,
      canManage: member.kind === "staff",
    });
  } catch (error) {
    console.error("Schedule GET error:", error);
    return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const body = await req.json();
    const { name, schedule, location, maxStudents, instructorId, isRecurring, mode, meetingUrl } =
      body;

    if (!name || !schedule) {
      return NextResponse.json({ error: "Name and schedule are required" }, { status: 400 });
    }

    const classMode: ClassMode = mode === "ONLINE" ? "ONLINE" : "PHYSICAL";
    if (classMode === "ONLINE" && !meetingUrl && !location) {
      return NextResponse.json(
        { error: "Online classes need a meeting URL or location note" },
        { status: 400 }
      );
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
        location: location || null,
        maxStudents: maxStudents || 999,
        isRecurring: !!isRecurring,
        mode: classMode,
        meetingUrl: meetingUrl || null,
        dojoId: staff.dojoId,
        instructorId: targetInstructorId,
      },
      include: { instructor: { select: { name: true } } },
    });

    return NextResponse.json({ success: true, class: serializeClass(newClass) });
  } catch (error) {
    console.error("Schedule POST error:", error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const body = await req.json();
    const { id, name, schedule, location, maxStudents, isRecurring, mode, meetingUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
    }

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing || !staff.dojoIds.includes(existing.dojoId)) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (schedule !== undefined) data.schedule = schedule;
    if (location !== undefined) data.location = location;
    if (maxStudents !== undefined) data.maxStudents = maxStudents;
    if (isRecurring !== undefined) data.isRecurring = !!isRecurring;
    if (mode === "ONLINE" || mode === "PHYSICAL") data.mode = mode;
    if (meetingUrl !== undefined) data.meetingUrl = meetingUrl || null;

    const updated = await prisma.class.update({
      where: { id },
      data,
      include: { instructor: { select: { name: true } } },
    });

    return NextResponse.json({ success: true, class: serializeClass(updated) });
  } catch (error) {
    console.error("Schedule PUT error:", error);
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Schedule DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
  }
}
