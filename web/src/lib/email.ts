import { Resend } from "resend";

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function onboardingFrom(): string {
  return (
    process.env.RESEND_FROM?.trim() || "DojoPop <onboarding@dojopop.live>"
  );
}

function onboardingInbox(): string {
  return (
    process.env.SCHOOL_ONBOARDING_TO?.trim() || "admin@dojopop.live"
  );
}

export type SchoolOnboardingInput = {
  schoolName: string;
  discipline: string;
  city: string;
  instructorName: string;
  email: string;
  npub?: string;
  message?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function adminHtml(input: SchoolOnboardingInput): string {
  const rows = [
    ["School", input.schoolName],
    ["Art / discipline", input.discipline],
    ["City", input.city],
    ["Instructor", input.instructorName],
    ["Email", input.email],
    ...(input.npub ? [["Nostr npub", input.npub] as const] : []),
    ...(input.message ? [["Notes", input.message] as const] : []),
  ];

  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;color:#666;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 12px">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111">
<p>New school onboarding request from <strong>${escapeHtml(input.instructorName)}</strong>.</p>
<table style="border-collapse:collapse;border:1px solid #ddd">${body}</table>
<p style="color:#666;font-size:14px">Reply to ${escapeHtml(input.email)} to continue setup.</p>
</body></html>`;
}

function confirmationHtml(input: SchoolOnboardingInput): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.5">
<p>Hi ${escapeHtml(input.instructorName)},</p>
<p>We received your request to onboard <strong>${escapeHtml(input.schoolName)}</strong> (${escapeHtml(input.discipline)}, ${escapeHtml(input.city)}) on DojoPop.</p>
<p>We'll reply within a few days with your school space, join QR, and next steps for logging class attendance.</p>
<p style="color:#666;font-size:14px">— DojoPop</p>
</body></html>`;
}

export async function sendSchoolOnboardingEmails(
  input: SchoolOnboardingInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = resendClient();
  if (!resend) {
    return { ok: false, error: "Email is not configured" };
  }

  const from = onboardingFrom();
  const inbox = onboardingInbox();
  const subject = `School onboarding: ${input.schoolName} (${input.city})`;

  const [adminResult, confirmResult] = await Promise.all([
    resend.emails.send({
      from,
      to: [inbox],
      replyTo: input.email,
      subject,
      html: adminHtml(input),
    }),
    resend.emails.send({
      from,
      to: [input.email],
      subject: "We received your DojoPop school request",
      html: confirmationHtml(input),
    }),
  ]);

  if (adminResult.error) {
    console.error("resend admin email error", adminResult.error);
    return { ok: false, error: adminResult.error.message };
  }
  if (confirmResult.error) {
    console.error("resend confirmation email error", confirmResult.error);
    return { ok: false, error: confirmResult.error.message };
  }

  return { ok: true };
}
