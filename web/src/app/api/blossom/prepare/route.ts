import { NextRequest, NextResponse } from "next/server";
import { decodeNpubToHex, isValidNpub } from "@/lib/nostr";
import { findMemberByNpub } from "@/lib/membership";
import { preparePracticeVideo } from "@/lib/video-prepare";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 250 * 1024 * 1024;

async function assertActiveMember(npub: string): Promise<void> {
  if (!isValidNpub(npub)) throw new Error("Valid npub required");
  const member = await findMemberByNpub(npub);
  if (!member || member.status !== "active") {
    throw new Error("Active DojoPop membership required");
  }
}

export async function POST(req: NextRequest) {
  const npub = req.nextUrl.searchParams.get("npub")?.trim();
  if (!npub) {
    return NextResponse.json({ error: "npub required" }, { status: 400 });
  }

  try {
    await assertActiveMember(npub);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Membership check failed";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing video file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Video file is too large" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const prepared = await preparePracticeVideo(
      buffer,
      file.name || "practice.mp4",
      file.type || "video/mp4"
    );
    return NextResponse.json(prepared);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not prepare video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
