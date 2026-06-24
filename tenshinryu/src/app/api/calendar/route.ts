import { NextRequest, NextResponse } from "next/server";

// Mock schedule data until Google Calendar is configured
const MOCK_EVENTS = [
  {
    id: "class_001",
    title: "Kihon Fundamentals",
    schedule: "Mondays & Wednesdays, 7:00 PM JST",
    location: "Online - YouTube Live",
    instructor: "Tenshin Sensei",
  },
  {
    id: "class_002",
    title: "Giho Techniques",
    schedule: "Tuesdays & Thursdays, 7:00 PM JST",
    location: "Online - Zoom (ROYAL members)",
    instructor: "Tenshin Sensei",
  },
  {
    id: "class_003",
    title: "Keikoho Practice",
    schedule: "Saturdays, 10:00 AM JST",
    location: "Online - YouTube Live",
    instructor: "Senior Instructor",
  },
  {
    id: "class_004",
    title: "Philosophy & History",
    schedule: "Last Sunday of month, 8:00 PM JST",
    location: "Online - Zoom (All members)",
    instructor: "Tenshin Sensei",
  },
];

// GET classes schedule
export async function GET(req: NextRequest) {
  try {
    // TODO: Connect Google Calendar API
    // 1. Set GOOGLE_CALENDAR_CREDENTIALS in .env (service account JSON)
    // 2. Set GOOGLE_CALENDAR_ID (the calendar ID to read from)
    // 3. Uncomment the googleapis import and use getCalendarClient()
    
    // For now, return mock data
    return NextResponse.json({
      source: "mock",
      note: "Connect Google Calendar for live schedule",
      events: MOCK_EVENTS,
    });

  } catch (error: any) {
    console.error("[Calendar] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
