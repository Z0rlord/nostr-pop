import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// This endpoint is called by a cron job to send class reminders
// It should be called every 15 minutes

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = [];

    // Get all classes scheduled in the next 2 hours
    // For now, we'll use a simple approach - check classes that have
    // reminders scheduled within the next window
    
    // Get all active students with upcoming classes
    const students = await prisma.student.findMany({
      where: { isActive: true },
      include: {
        dojo: {
          include: {
            classes: true,
          },
        },
      },
    });

    for (const student of students) {
      for (const cls of student.dojo.classes) {
        // Check if we should send a reminder (1 hour before)
        // Parse schedule to determine next occurrence
        const shouldRemind = checkIfReminderNeeded(cls.schedule, now, 60);
        
        if (shouldRemind) {
          // Check if already sent today
          const alreadySent = await prisma.notificationLog.findFirst({
            where: {
              studentId: student.id,
              classId: cls.id,
              type: "reminder",
              sentAt: {
                gte: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Last 2 hours
              },
            },
          });

          if (!alreadySent) {
            // Send notification
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  studentId: student.id,
                  classId: cls.id,
                  type: "reminder",
                  minutesBefore: 60,
                }),
              }
            );

            results.push({
              student: student.name,
              class: cls.name,
              status: response.ok ? "sent" : "failed",
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error("Cron reminder error:", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  }
}

// Helper to check if a reminder should be sent based on schedule
function checkIfReminderNeeded(schedule: string, now: Date, minutesBefore: number): boolean {
  // Simple schedule parsing - assumes format like "Mon/Wed/Fri 18:00-19:30"
  // In production, you'd want more robust parsing
  
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDay = days[now.getDay()];
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  
  // Check if today is in the schedule
  if (!schedule.includes(currentDay)) {
    return false;
  }
  
  // Extract time from schedule (e.g., "18:00")
  const timeMatch = schedule.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return false;
  
  const classHour = parseInt(timeMatch[1]);
  const classMin = parseInt(timeMatch[2]);
  
  // Calculate class time in minutes from midnight
  const classTime = classHour * 60 + classMin;
  const currentTime = currentHour * 60 + currentMin;
  
  // Check if we're within the reminder window (e.g., 55-65 minutes before)
  const reminderTime = classTime - minutesBefore;
  const windowStart = reminderTime - 5;
  const windowEnd = reminderTime + 5;
  
  return currentTime >= windowStart && currentTime <= windowEnd;
}
