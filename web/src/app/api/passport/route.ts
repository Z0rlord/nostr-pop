import { NextRequest, NextResponse } from "next/server";
import { listAffiliatedCatalog } from "@/lib/affiliated-schools-server";
import { findMemberByNpub } from "@/lib/membership";
import { decodeNpubToHex, isValidNpub } from "@/lib/nostr";
import { buildPassportDisplay } from "@/lib/passport-display";
import {
  getPassportOverride,
  upsertPassportOverride,
  type PassportOverrideInput,
} from "@/lib/passport-overrides";
import { findSchoolAffiliations } from "@/lib/passport-school";
import {
  assertPracticeIdentityAuth,
  PracticeAuthError,
} from "@/lib/practice-identity-auth";

export const runtime = "nodejs";

/** Public passport metadata by npub (school roster + membership + self-reported overrides). */
export async function GET(req: NextRequest) {
  const npub = req.nextUrl.searchParams.get("npub")?.trim();
  if (!npub || !isValidNpub(npub)) {
    return NextResponse.json({ error: "Valid npub required" }, { status: 400 });
  }

  const pubkeyHex = decodeNpubToHex(npub);
  if (!pubkeyHex) {
    return NextResponse.json({ error: "Invalid npub" }, { status: 400 });
  }

  const [affiliations, member, overrides, catalog] = await Promise.all([
    findSchoolAffiliations(npub),
    findMemberByNpub(npub),
    getPassportOverride(pubkeyHex),
    listAffiliatedCatalog(),
  ]);

  const display = buildPassportDisplay(affiliations, overrides, catalog);

  return NextResponse.json({
    npub,
    affiliations,
    overrides,
    display,
    memberSince: member?.createdAt ?? null,
    memberStatus: member?.status ?? null,
    memberActive: member?.status === "active",
    paidUntil: member?.paidUntil ?? null,
  });
}

function parseOverrideBody(body: unknown): PassportOverrideInput {
  const data = (body ?? {}) as Record<string, unknown>;
  const str = (key: string): string | null | undefined => {
    if (data[key] === null) return null;
    if (typeof data[key] !== "string") return undefined;
    return data[key];
  };
  return {
    affiliatedSchoolId: str("affiliatedSchoolId"),
    displaySchool: str("displaySchool"),
    rank: str("rank"),
    discipline: str("discipline"),
    location: str("location"),
  };
}

/** Update self-reported passport fields for the signed-in user. */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const npub = typeof body.npub === "string" ? body.npub.trim() : "";
    if (!npub || !isValidNpub(npub)) {
      return NextResponse.json({ error: "Valid npub required" }, { status: 400 });
    }

    const pubkeyHex = decodeNpubToHex(npub);
    if (!pubkeyHex) {
      return NextResponse.json({ error: "Invalid npub" }, { status: 400 });
    }

    assertPracticeIdentityAuth(req, pubkeyHex);

    const affiliations = await findSchoolAffiliations(npub);
    const onRoster = affiliations.length > 0;
    const input = parseOverrideBody(body);

    if (onRoster) {
      input.affiliatedSchoolId = null;
      input.displaySchool = null;
    }

    const catalog = await listAffiliatedCatalog();
    if (input.affiliatedSchoolId) {
      const known = catalog.some((s) => s.id === input.affiliatedSchoolId);
      if (!known) {
        return NextResponse.json({ error: "Unknown school" }, { status: 400 });
      }
      input.displaySchool = null;
    }

    const overrides = await upsertPassportOverride(pubkeyHex, input);
    const display = buildPassportDisplay(affiliations, overrides, catalog);

    return NextResponse.json({
      ok: true,
      overrides,
      display,
    });
  } catch (e) {
    if (e instanceof PracticeAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
