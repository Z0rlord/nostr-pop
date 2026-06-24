import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET attendance analytics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");

    // Build date filter using checkedInAt
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.checkedInAt = {};
      if (startDate) dateFilter.checkedInAt.gte = new Date(startDate);
      if (endDate) dateFilter.checkedInAt.lte = new Date(endDate);
    }

    // Build class filter
    if (classId) {
      dateFilter.classId = classId;
    }

    // Build student filter
    if (studentId) {
      dateFilter.studentId = studentId;
    }

    // Fetch all check-ins with related data
    const checkIns = await prisma.checkIn.findMany({
      where: dateFilter,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            beltRank: true,
            avatar: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            schedule: true,
          },
        },
      },
      orderBy: {
        checkedInAt: "desc",
      },
    });

    // Fetch all students for analytics
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        beltRank: true,
        avatar: true,
        joinedAt: true,
      },
    });

    // Fetch all classes
    const classes = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        schedule: true,
        location: true,
      },
    });

    // Calculate analytics
    const analytics = {
      summary: calculateSummary(checkIns, students, classes),
      byClass: calculateByClass(checkIns, classes),
      byStudent: calculateByStudent(checkIns, students),
      byDate: calculateByDate(checkIns),
      recentCheckIns: checkIns.slice(0, 50).map(c => ({
        id: c.id,
        studentId: c.studentId,
        studentName: c.student?.name || "Unknown",
        className: c.class?.name || "Unknown",
        timestamp: c.checkedInAt,
        method: c.method,
      })),
    };

    return NextResponse.json({ success: true, analytics });
  } catch (error: any) {
    console.error("Attendance analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance analytics", details: error.message },
      { status: 500 }
    );
  }
}

function calculateSummary(checkIns: any[], students: any[], classes: any[]) {
  const totalCheckIns = checkIns.length;
  
  const uniqueStudents = new Set(checkIns.map(c => c.studentId)).size;
  const uniqueClasses = new Set(checkIns.map(c => c.classId).filter(Boolean)).size;

  // Find most attended class
  const classAttendance: Record<string, number> = {};
  checkIns.forEach(c => {
    if (c.classId) {
      classAttendance[c.classId] = (classAttendance[c.classId] || 0) + 1;
    }
  });
  const mostAttendedClassId = Object.entries(classAttendance)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const mostAttendedClass = classes.find(c => c.id === mostAttendedClassId);

  // Find top student
  const studentAttendance: Record<string, number> = {};
  checkIns.forEach(c => {
    studentAttendance[c.studentId] = (studentAttendance[c.studentId] || 0) + 1;
  });
  const topStudentId = Object.entries(studentAttendance)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const topStudent = students.find(s => s.id === topStudentId);

  // Calculate average tokens awarded
  const totalTokens = checkIns.reduce((sum, c) => sum + (c.tokensAwarded || 0), 0);

  return {
    totalCheckIns,
    uniqueStudents,
    uniqueClasses,
    totalStudents: students.length,
    totalClasses: classes.length,
    mostAttendedClass: mostAttendedClass?.name || null,
    topStudent: topStudent?.name || null,
    averageTokensPerCheckIn: totalCheckIns > 0 ? Math.round(totalTokens / totalCheckIns) : 0,
    totalTokensAwarded: totalTokens,
  };
}

function calculateByClass(checkIns: any[], classes: any[]) {
  const classMap: Record<string, { name: string; count: number; totalTokens: number }> = {};
  
  classes.forEach(c => {
    classMap[c.id] = { name: c.name, count: 0, totalTokens: 0 };
  });

  checkIns.forEach(c => {
    if (c.classId && classMap[c.classId]) {
      classMap[c.classId].count++;
      classMap[c.classId].totalTokens += c.tokensAwarded || 0;
    }
  });

  return Object.entries(classMap)
    .map(([id, data]) => ({ id, ...data }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

function calculateByStudent(checkIns: any[], students: any[]) {
  const studentMap: Record<string, { 
    id: string;
    name: string; 
    beltRank: string;
    avatar: string | null;
    count: number;
    totalTokens: number;
    lastCheckIn: Date | null;
    streak: number;
  }> = {};
  
  students.forEach(s => {
    studentMap[s.id] = { 
      id: s.id,
      name: s.name, 
      beltRank: s.beltRank,
      avatar: s.avatar,
      count: 0,
      totalTokens: 0,
      lastCheckIn: null,
      streak: 0,
    };
  });

  // Sort check-ins by date for streak calculation
  const sortedCheckIns = [...checkIns].sort((a, b) => 
    new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime()
  );

  sortedCheckIns.forEach(c => {
    if (studentMap[c.studentId]) {
      studentMap[c.studentId].count++;
      studentMap[c.studentId].totalTokens += c.tokensAwarded || 0;
      const checkInDate = new Date(c.checkedInAt);
      if (!studentMap[c.studentId].lastCheckIn || checkInDate > studentMap[c.studentId].lastCheckIn!) {
        studentMap[c.studentId].lastCheckIn = checkInDate;
      }
    }
  });

  // Calculate current streak for each student
  students.forEach(s => {
    const studentCheckIns = sortedCheckIns
      .filter(c => c.studentId === s.id)
      .map(c => new Date(c.checkedInAt).toDateString());
    
    const uniqueDates = [...new Set(studentCheckIns)];
    studentMap[s.id].streak = calculateStreak(uniqueDates);
  });

  return Object.values(studentMap)
    .sort((a, b) => b.count - a.count);
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  
  const sortedDates = dates
    .map(d => new Date(d).getTime())
    .sort((a, b) => b - a);
  
  let streak = 1;
  const oneDay = 24 * 60 * 60 * 1000;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = sortedDates[i - 1] - sortedDates[i];
    if (diff <= oneDay * 1.5) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function calculateByDate(checkIns: any[]) {
  const dateMap: Record<string, { count: number; tokens: number }> = {};
  
  checkIns.forEach(c => {
    const date = new Date(c.checkedInAt).toISOString().split("T")[0];
    if (!dateMap[date]) {
      dateMap[date] = { count: 0, tokens: 0 };
    }
    dateMap[date].count++;
    dateMap[date].tokens += c.tokensAwarded || 0;
  });

  return Object.entries(dateMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
