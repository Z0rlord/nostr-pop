import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File;
    const studentId = formData.get("studentId") as string;
    const type = formData.get("type") as string || "voice-note"; // voice-note or journal

    console.log("[Voice Upload] Received:", { 
      studentId, 
      type,
      fileName: file?.name, 
      fileType: file?.type, 
      fileSize: file?.size 
    });

    if (!file || !studentId) {
      console.log("[Voice Upload] Missing file or studentId");
      return NextResponse.json(
        { error: "Missing file or studentId" },
        { status: 400 }
      );
    }

    // Accept audio formats
    const validAudioTypes = [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/aac",
    ];

    if (!validAudioTypes.some(t => file.type.includes(t) || file.type === t)) {
      console.log("[Voice Upload] Invalid file type:", file.type);
      return NextResponse.json(
        { error: "File must be an audio file. Received: " + file.type },
        { status: 400 }
      );
    }

    // Create uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads", "voice-notes");
    console.log("[Voice Upload] Uploads dir:", uploadsDir);
    
    try {
      await mkdir(uploadsDir, { recursive: true });
      console.log("[Voice Upload] Directory created/verified");
    } catch (dirError) {
      console.error("[Voice Upload] Failed to create directory:", dirError);
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "webm";
    const filename = `${studentId}-${type}-${Date.now()}.${ext}`;
    const filepath = join(uploadsDir, filename);

    console.log("[Voice Upload] Saving to:", filepath);

    // Save file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));
    
    console.log("[Voice Upload] File saved successfully");

    // Calculate duration (would need ffprobe or similar for actual duration)
    // For now, return the file path
    const voiceNoteUrl = `/uploads/voice-notes/${filename}`;

    return NextResponse.json({
      success: true,
      voiceNoteUrl,
      filename,
    });
  } catch (error: any) {
    console.error("[Voice Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload voice note: " + error.message },
      { status: 500 }
    );
  }
}
