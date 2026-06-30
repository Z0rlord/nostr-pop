import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST /api/classes/current - Find the current active class based on time and location
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { latitude, longitude } = body;

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    // Get all classes
    const classes = await prisma.class.findMany({
      include: {
        instructor: {
          select: { name: true },
        },
      },
    });

    // Find classes that are currently active
    // A class is "active" if:
    // 1. It's within 30 minutes before start time to 90 minutes after start time
    // 2. Optional: Location is within reasonable distance if provided
    
    const activeClasses = classes.filter((cls) => {
      // Parse the schedule string (format: "March 24, 2025 6:00 PM" or similar)
      const scheduleDate = new Date(cls.schedule);
      
      // Check if class is today (for recurring classes, we'd need more logic)
      const isToday = scheduleDate.toDateString() === now.toDateString();
      
      if (!isToday && !cls.isRecurring) {
        return false;
      }

      // For recurring classes, check if the time matches
      if (cls.isRecurring) {
        // Simple time matching for recurring classes
        const classTime = scheduleDate.getHours() * 60 + scheduleDate.getMinutes();
        const timeDiff = Math.abs(currentTime - classTime);
        // Within 2 hours window
        if (timeDiff > 120) return false;
      } else {
        // One-time class - check exact date and time window
        const classStart = scheduleDate.getTime();
        const windowStart = classStart - 30 * 60 * 1000; // 30 min before
        const windowEnd = classStart + 90 * 60 * 1000; // 90 min after
        
        if (now.getTime() < windowStart || now.getTime() > windowEnd) {
          return false;
        }
      }

      // Location check if both class has location and student provides location
      if (cls.location && latitude && longitude) {
        // For now, simple string matching or skip if can't parse
        // Future: Geocode class location and calculate distance
        // Return true to allow check-in (location is a bonus check)
        return true;
      }

      return true;
    });

    if (activeClasses.length === 0) {
      return NextResponse.json(
        { error: "No active class found. Please check the schedule or ask your instructor." },
        { status: 404 }
      );
    }

    // Return the most likely class (first match, or could prioritize by time proximity)
    const bestMatch = activeClasses[0];

    return NextResponse.json({
      class: {
        id: bestMatch.id,
        name: bestMatch.name,
        schedule: bestMatch.schedule,
        location: bestMatch.location,
        instructorName: bestMatch.instructor.name,
      },
    });
  } catch (error: any) {
    console.error("Find current class error:", error);
    return NextResponse.json(
      { error: "Failed to find active class" },
      { status: 500 }
    );
  }
}
