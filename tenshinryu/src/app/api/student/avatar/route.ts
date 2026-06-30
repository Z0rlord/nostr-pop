import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";

// Disable body size limit - we handle it manually
export const dynamic = 'force-dynamic';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("avatar") as File;
    const studentId = formData.get("studentId") as string;

    console.log("[Avatar Upload] Received:", { studentId, fileName: file?.name, fileType: file?.type, fileSize: file?.size });

    if (!file || !studentId) {
      console.log("[Avatar Upload] Missing file or studentId");
      return NextResponse.json(
        { error: "Missing file or studentId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.log("[Avatar Upload] Invalid file type:", file.type);
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create uploads directory if it doesn't exist
    const cwd = process.cwd();
    console.log("[Avatar Upload] CWD:", cwd);
    const uploadsDir = join(cwd, "public", "uploads", "avatars");
    console.log("[Avatar Upload] Uploads dir:", uploadsDir);
    
    try {
      await mkdir(uploadsDir, { recursive: true });
      console.log("[Avatar Upload] Directory created/verified");
    } catch (dirError) {
      console.error("[Avatar Upload] Failed to create directory:", dirError);
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${studentId}-${Date.now()}.${ext}`;
    const filepath = join(uploadsDir, filename);

    console.log("[Avatar Upload] Saving to:", filepath);

    // Save file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));
    
    console.log("[Avatar Upload] File saved successfully");

    // Return public URL
    const avatarUrl = `/uploads/avatars/${filename}`;

    return NextResponse.json({
      success: true,
      avatar: avatarUrl,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error: any) {
    console.error("[Avatar Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar: " + error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
