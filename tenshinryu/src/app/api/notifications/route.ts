import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const { Resend } = require("resend") as typeof import("resend");
  return new Resend(key);
}

// Twilio disabled for now - add later when needed
const twilioClient = null;

interface NotificationPayload {
  studentId: string;
  classId: string;
  type: "reminder" | "location_change" | "cancellation";
  minutesBefore?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: NotificationPayload = await req.json();
    const { studentId, classId, type, minutesBefore = 60 } = body;

    // Get student and class details
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { dojo: true },
    });

    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { instructor: true },
    });

    if (!student || !cls) {
      return NextResponse.json(
        { error: "Student or class not found" },
        { status: 404 }
      );
    }

    const notificationsSent = [];

    // Build message based on type
    let message = "";
    let subject = "";

    switch (type) {
      case "reminder":
        subject = `Class Reminder: ${cls.name} in ${minutesBefore} minutes`;
        message = `Hi ${student.name}! Reminder: ${cls.name} with ${cls.instructor.name} starts in ${minutesBefore} minutes`;
        if (cls.location) {
          message += ` at ${cls.location}`;
        }
        message += `. See you there! 🥋`;
        break;
      case "location_change":
        subject = `Location Update: ${cls.name}`;
        message = `Hi ${student.name}! ${cls.name} location has changed to: ${cls.location}. See you there! 🥋`;
        break;
      case "cancellation":
        subject = `Class Cancelled: ${cls.name}`;
        message = `Hi ${student.name}! ${cls.name} has been cancelled for today. Sorry for the inconvenience. 🥋`;
        break;
    }

    // Send Email
    if (student.email && process.env.RESEND_API_KEY) {
      try {
        const resend = getResend();
        if (!resend) throw new Error("Resend not configured");
        await resend.emails.send({
          from: "Tenshinryu <onboarding@resend.dev>",
          to: student.email,
          subject,
          text: message,
          html: `
            <div style="font-family: monospace; max-width: 600px; margin: 0 auto; border: 2px solid #0B0B0C; padding: 24px;">
              <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 16px; text-transform: uppercase;">${subject}</h1>
              <p style="font-size: 16px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
              <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid #0B0B0C;">
                <p style="font-size: 12px; color: #666;">Tenshinryu - Traditional Japanese Martial Arts</p>
              </div>
            </div>
          `,
        });
        notificationsSent.push("email");
      } catch (err) {
        console.error("Email send failed:", err);
      }
    }

    // Send SMS
    if (student.phone && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: student.phone,
        });
        notificationsSent.push("sms");
      } catch (err) {
        console.error("SMS send failed:", err);
      }
    }

    // Log notification
    await prisma.notificationLog.create({
      data: {
        studentId,
        classId,
        type,
        channel: notificationsSent.join(","),
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      notificationsSent,
      message: `Notification sent via: ${notificationsSent.join(" & ") || "none"}`,
    });
  } catch (error: any) {
    console.error("Notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}

// Bulk notification endpoint
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { classId, type, minutesBefore = 60 } = body;

    const cls = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!cls) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Get all students in the dojo
    const students = await prisma.student.findMany({
      where: { dojoId: cls.dojoId },
    });

    const results = [];
    for (const student of students) {
      // Call the single notification logic for each student
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          classId,
          type,
          minutesBefore,
        }),
      });
      results.push(await response.json());
    }

    return NextResponse.json({
      success: true,
      sent: results.length,
      results,
    });
  } catch (error: any) {
    console.error("Bulk notification error:", error);
    return NextResponse.json(
      { error: "Failed to send bulk notifications" },
      { status: 500 }
    );
  }
}
