import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get lineage tree for a person (student or instructor)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const instructorId = searchParams.get("instructorId");
    
    if (!studentId && !instructorId) {
      return NextResponse.json(
        { error: "studentId or instructorId required" },
        { status: 400 }
      );
    }
    
    const personId = studentId || instructorId;
    const isInstructor = !!instructorId;
    
    // Get all lineages where this person is the student (their teachers)
    const teachers = await prisma.lineage.findMany({
      where: { studentId: personId },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });
    
    // Get all lineages where this person is the teacher (their students)
    const students = await prisma.lineage.findMany({
      where: { teacherId: personId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            beltRank: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });
    
    // Build family tree recursively (2 levels deep)
    const familyTree = {
      person: {
        id: personId,
        type: isInstructor ? "instructor" : "student",
      },
      teachers: teachers.map((t) => ({
        id: t.teacher.id,
        name: t.teacher.name,
        school: t.school,
        style: t.style,
        isActive: t.isActive,
        startDate: t.startDate,
        endDate: t.endDate,
        // Get their teachers (grandparents)
        teachers: [], // Could be populated with another query
      })),
      students: await Promise.all(
        students.map(async (s) => {
          // Get this student's students (grandchildren)
          const theirStudents = await prisma.lineage.findMany({
            where: { teacherId: s.student.id },
            include: {
              student: {
                select: { id: true, name: true, beltRank: true },
              },
            },
          });
          
          return {
            id: s.student.id,
            name: s.student.name,
            beltRank: s.student.beltRank,
            school: s.school,
            style: s.style,
            isActive: s.isActive,
            startDate: s.startDate,
            endDate: s.endDate,
            students: theirStudents.map((ts) => ({
              id: ts.student.id,
              name: ts.student.name,
              beltRank: ts.student.beltRank,
              school: ts.school,
              style: ts.style,
            })),
          };
        })
      ),
    };
    
    return NextResponse.json(familyTree);
  } catch (error: any) {
    console.error("Lineage tree error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get lineage tree" },
      { status: 500 }
    );
  }
}

// Create a new lineage relationship
export async function POST(req: NextRequest) {
  try {
    const { teacherId, studentId, school, style, notes } = await req.json();
    
    if (!teacherId || !studentId || !school) {
      return NextResponse.json(
        { error: "teacherId, studentId, and school are required" },
        { status: 400 }
      );
    }
    
    // Check if relationship already exists
    const existing = await prisma.lineage.findUnique({
      where: {
        teacherId_studentId_school: {
          teacherId,
          studentId,
          school,
        },
      },
    });
    
    if (existing) {
      // Update existing relationship
      const updated = await prisma.lineage.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          endDate: null,
          style: style || existing.style,
          notes: notes || existing.notes,
        },
      });
      return NextResponse.json(updated);
    }
    
    // Create new relationship
    const lineage = await prisma.lineage.create({
      data: {
        teacherId,
        studentId,
        school,
        style,
        notes,
        isActive: true,
      },
    });
    
    return NextResponse.json(lineage);
  } catch (error: any) {
    console.error("Create lineage error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create lineage" },
      { status: 500 }
    );
  }
}

// End a lineage relationship
export async function PUT(req: NextRequest) {
  try {
    const { lineageId, notes } = await req.json();
    
    const updated = await prisma.lineage.update({
      where: { id: lineageId },
      data: {
        isActive: false,
        endDate: new Date(),
        notes: notes,
      },
    });
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update lineage error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update lineage" },
      { status: 500 }
    );
  }
}
