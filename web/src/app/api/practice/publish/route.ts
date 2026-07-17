import { NextResponse } from "next/server";
import { verifyEvent, type Event } from "nostr-tools";
import { assertActiveMemberPubkey, UploadAuthError } from "@/lib/blossom-auth";
import { isPracticeSessionEvent } from "@/lib/practice-events";
import {
  assertCanUploadPracticeVideo,
  PracticeUploadLimitError,
} from "@/lib/practice-upload-limit";
import { mirrorPracticeToNostube } from "@/lib/nostube-mirror";
import { publishEventToRelay } from "@/lib/relay-publish";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { event?: Event };
    const event = body.event;
    if (!event) {
      return NextResponse.json({ error: "Missing event" }, { status: 400 });
    }
    if (!verifyEvent(event)) {
      return NextResponse.json({ error: "Invalid event signature" }, { status: 400 });
    }
    if (event.kind !== 22) {
      return NextResponse.json({ error: "Practice videos must be kind 22" }, { status: 400 });
    }

    await assertActiveMemberPubkey(event.pubkey);
    await assertCanUploadPracticeVideo(event.pubkey);

    if (!isPracticeSessionEvent(event)) {
      return NextResponse.json(
        {
          error:
            "Event does not match DojoPop practice rules (title Day N, ≤90s, #dojopop #proofofpractice)",
        },
        { status: 400 }
      );
    }

    await publishEventToRelay(event);

    void mirrorPracticeToNostube(event).catch((err) => {
      console.error("nostu.be mirror failed:", err);
    });

    return NextResponse.json({ ok: true, id: event.id });
  } catch (e) {
    if (e instanceof PracticeUploadLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    if (e instanceof UploadAuthError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
