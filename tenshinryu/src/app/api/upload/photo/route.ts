import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File;
    const studentId = formData.get("studentId") as string;
    const type = formData.get("type") as string || "practice";

    console.log("[Photo Upload] Received:", { 
      studentId, 
      type,
      fileName: file?.name, 
      fileType: file?.type, 
      fileSize: file?.size 
    });

    if (!file || !studentId) {
      console.log("[Photo Upload] Missing file or studentId");
      return NextResponse.json(
        { error: "Missing file or studentId" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.log("[Photo Upload] Invalid file type:", file.type);
      return NextResponse.json(
        { error: "File must be an image. Received: " + file.type },
        { status: 400 }
      );
    }

    // Size limit: 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      console.log("[Photo Upload] File too large:", file.size);
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Create uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads", "photos");
    console.log("[Photo Upload] Uploads dir:", uploadsDir);
    
    try {
      await mkdir(uploadsDir, { recursive: true });
      console.log("[Photo Upload] Directory created/verified");
    } catch (dirError) {
      console.error("[Photo Upload] Failed to create directory:", dirError);
    }

    // Generate unique filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const validExts = ["jpg", "jpeg", "png", "webp", "gif"];
    const finalExt = validExts.includes(ext) ? ext : "jpg";
    
    const filename = `${studentId}-${type}-${Date.now()}.${finalExt}`;
    const filepath = join(uploadsDir, filename);

    console.log("[Photo Upload] Saving to:", filepath);

    // Save file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));
    
    console.log("[Photo Upload] File saved successfully");

    // Return public URL
    const photoUrl = `/uploads/photos/${filename}`;

    return NextResponse.json({
      success: true,
      photoUrl,
      filename,
    });
  } catch (error: any) {
    console.error("[Photo Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload photo: " + error.message },
      { status: 500 }
    );
  }
}
