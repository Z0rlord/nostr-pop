import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { decodeNpubToHex, isValidNpub } from "@/lib/nostr";
import { findMemberByNpub } from "@/lib/membership";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 250 * 1024 * 1024;

function apiError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

async function assertActiveMember(npub: string): Promise<string> {
  if (!isValidNpub(npub)) {
    throw new Error("Valid npub required");
  }
  const pubkeyHex = decodeNpubToHex(npub);
  if (!pubkeyHex) {
    throw new Error("Invalid npub");
  }
  const member = await findMemberByNpub(npub);
  if (!member || member.status !== "active") {
    throw new Error("Active DojoPop membership required");
  }
  return pubkeyHex;
}

/** Server-side SHA-256 for browsers that cannot hash iOS MOV blobs reliably. */
export async function POST(req: NextRequest) {
  const npub = req.nextUrl.searchParams.get("npub")?.trim();
  if (!npub) {
    return apiError(400, "npub query parameter required");
  }

  try {
    await assertActiveMember(npub);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Membership check failed";
    return apiError(403, message);
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > MAX_BYTES) {
    return apiError(413, "Video file is too large");
  }

  const body = req.body;
  if (!body) {
    return apiError(400, "Missing request body");
  }

  const hasher = createHash("sha256");
  let read = 0;
  const reader = body.getReader();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value?.length) {
        read += value.length;
        if (read > MAX_BYTES) {
          return apiError(413, "Video file is too large");
        }
        hasher.update(value);
      }
    }
  } catch {
    return apiError(400, "Could not read uploaded video");
  }

  return NextResponse.json({ sha256: hasher.digest("hex"), bytes: read });
}
