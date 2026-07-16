import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type StaffSession = {
  instructorId: string;
  email: string;
  name: string;
  /** Primary dojo on Instructor row (legacy). */
  primaryDojoId: string;
  /** Active dojo for this request (cookie or primary). */
  dojoId: string;
  /** All dojos this instructor can access. */
  dojoIds: string[];
  /** True if admin on the active dojo. */
  isAdmin: boolean;
  /** True if admin on any dojo. */
  isAdminAnywhere: boolean;
  role: "admin" | "instructor";
};

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Resolve staff session from cookies + InstructorDojoMembership (falls back to Instructor.dojoId).
 */
export async function requireStaff(
  req: NextRequest,
  opts?: { adminOnly?: boolean }
): Promise<StaffSession | NextResponse> {
  const sessionId = req.cookies.get("session")?.value;
  if (!sessionId) return unauthorized();

  const instructor = await prisma.instructor.findUnique({
    where: { id: sessionId },
    include: {
      memberships: true,
    },
  });

  if (!instructor) return unauthorized("Not a staff account");

  let memberships = instructor.memberships ?? [];

  // Back-compat: if memberships empty, treat primary dojo as sole membership
  if (memberships.length === 0) {
    memberships = [
      {
        id: "legacy",
        instructorId: instructor.id,
        dojoId: instructor.dojoId,
        isAdmin: instructor.isAdmin,
        createdAt: new Date(),
      },
    ];
  }

  const dojoIds = [...new Set(memberships.map((m) => m.dojoId))];
  const activeCookie = req.cookies.get("activeDojo")?.value;
  const dojoId =
    (activeCookie && dojoIds.includes(activeCookie) && activeCookie) ||
    (dojoIds.includes(instructor.dojoId) ? instructor.dojoId : dojoIds[0]);

  const activeMembership = memberships.find((m) => m.dojoId === dojoId);
  const isAdmin = !!(activeMembership?.isAdmin || (dojoId === instructor.dojoId && instructor.isAdmin));
  const isAdminAnywhere = memberships.some((m) => m.isAdmin) || instructor.isAdmin;

  if (opts?.adminOnly && !isAdmin) {
    return forbidden("Admin access required");
  }

  return {
    instructorId: instructor.id,
    email: instructor.email,
    name: instructor.name,
    primaryDojoId: instructor.dojoId,
    dojoId,
    dojoIds,
    isAdmin,
    isAdminAnywhere,
    role: isAdmin ? "admin" : "instructor",
  };
}

export async function isStaffForDojo(instructorId: string, dojoId: string): Promise<boolean> {
  const membership = await prisma.instructorDojoMembership.findUnique({
    where: { instructorId_dojoId: { instructorId, dojoId } },
  });
  if (membership) return true;

  const instructor = await prisma.instructor.findFirst({
    where: { id: instructorId, dojoId },
  });
  return !!instructor;
}

export async function ensureMembership(params: {
  instructorId: string;
  dojoId: string;
  isAdmin?: boolean;
}) {
  return prisma.instructorDojoMembership.upsert({
    where: {
      instructorId_dojoId: {
        instructorId: params.instructorId,
        dojoId: params.dojoId,
      },
    },
    create: {
      instructorId: params.instructorId,
      dojoId: params.dojoId,
      isAdmin: params.isAdmin ?? false,
    },
    update: {
      ...(params.isAdmin !== undefined ? { isAdmin: params.isAdmin } : {}),
    },
  });
}
