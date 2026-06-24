import { NextRequest, NextResponse } from "next/server";
import { sendSchoolOnboardingEmails } from "@/lib/email";
import { isValidEmail, isValidNpub } from "@/lib/nostr";

type Body = {
  schoolName?: string;
  discipline?: string;
  city?: string;
  instructorName?: string;
  email?: string;
  npub?: string;
  message?: string;
  website?: string;
};

function required(value: string | undefined, label: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.length > 200) return `${label} is too long`;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (body.website?.trim()) {
      return NextResponse.json({ ok: true });
    }

    const schoolName = body.schoolName?.trim() ?? "";
    const discipline = body.discipline?.trim() ?? "";
    const city = body.city?.trim() ?? "";
    const instructorName = body.instructorName?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const npub = body.npub?.trim();
    const message = body.message?.trim();

    for (const err of [
      required(schoolName, "School name"),
      required(discipline, "Art / discipline"),
      required(city, "City"),
      required(instructorName, "Your name"),
      required(email, "Email"),
    ]) {
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (npub && !isValidNpub(npub)) {
      return NextResponse.json({ error: "Invalid npub" }, { status: 400 });
    }
    if (message && message.length > 2000) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }

    const result = await sendSchoolOnboardingEmails({
      schoolName,
      discipline,
      city,
      instructorName,
      email,
      npub: npub || undefined,
      message: message || undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("school onboard error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 500 }
    );
  }
}
