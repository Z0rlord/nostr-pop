import { NextRequest, NextResponse } from "next/server";
import { NIP05_NAMES, NIP05_RELAYS } from "@/lib/nip05";

export const runtime = "nodejs";

function nip05Response(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/** NIP-05 identity document for dojopop.live */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim().toLowerCase();

  if (name) {
    const pubkey = NIP05_NAMES[name];
    if (!pubkey) {
      return nip05Response({ error: "Not found" }, 404);
    }
    return nip05Response({ names: { [name]: pubkey } });
  }

  return nip05Response({
    names: NIP05_NAMES,
    relays: NIP05_RELAYS,
  });
}
