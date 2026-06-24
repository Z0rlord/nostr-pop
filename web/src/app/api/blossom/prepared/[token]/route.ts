import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { isValidNpub } from "@/lib/nostr";
import { findMemberByNpub } from "@/lib/membership";
import { getPreparedVideoFile } from "@/lib/video-prepare";

export const runtime = "nodejs";

async function assertActiveMember(npub: string): Promise<void> {
  if (!isValidNpub(npub)) throw new Error("Valid npub required");
  const member = await findMemberByNpub(npub);
  if (!member || member.status !== "active") {
    throw new Error("Active DojoPop membership required");
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
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

  const prepared = getPreparedVideoFile(params.token);
  if (!prepared) {
    return NextResponse.json({ error: "Prepared video expired or not found" }, { status: 404 });
  }

  const fileStat = await stat(prepared.filePath).catch(() => null);
  if (!fileStat) {
    return NextResponse.json({ error: "Prepared video expired or not found" }, { status: 404 });
  }

  const stream = createReadStream(prepared.filePath);
  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": prepared.meta.mime,
      "Content-Length": String(fileStat.size),
      "Content-Disposition": `attachment; filename="${prepared.meta.filename}"`,
      "X-Dojopop-Sha256": prepared.meta.sha256,
    },
  });
}
