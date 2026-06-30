import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getResendClient } from "@/lib/resend";

export type InviteRole = "instructor" | "owner";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tenshinryu.xyz";
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Tenshinryu <onboarding@resend.dev>";

export function inviteAcceptPath(role: InviteRole, token: string): string {
  const segment = role === "owner" ? "owner" : "instructor";
  return `${APP_URL}/invite/${segment}?token=${token}`;
}

export async function createDojoInvite(params: {
  email: string;
  name?: string | null;
  dojoId: string;
  invitedBy: string;
  inviteRole: InviteRole;
  expiresInDays?: number;
}) {
  const email = params.email.toLowerCase().trim();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays ?? 14));
  const token = randomUUID();

  const invite = await prisma.instructorInvite.create({
    data: {
      email,
      name: params.name || null,
      token,
      invitedBy: params.invitedBy,
      dojoId: params.dojoId,
      inviteRole: params.inviteRole,
      expiresAt,
    },
  });

  const inviteUrl = inviteAcceptPath(params.inviteRole, token);
  return { invite, inviteUrl };
}

export async function sendInviteEmail(params: {
  to: string;
  name?: string | null;
  dojoName: string;
  inviteUrl: string;
  inviteRole: InviteRole;
  expiresAt: Date;
  reminder?: boolean;
}) {
  const resend = getResendClient();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — invite created but email not sent");
    return false;
  }

  const isOwner = params.inviteRole === "owner";
  const roleLabel = isOwner ? "school owner" : "instructor";
  const subject = params.reminder
    ? `Reminder: Set up your Tenshinryu ${roleLabel} account`
    : `You're invited to lead ${params.dojoName} on Tenshinryu KIWAMI`;

  const html = `
    <div style="font-family: Lato, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #191919;">
      <p style="font-size: 11px; letter-spacing: 0.12em; color: #7f7f7f; margin: 0 0 8px;">JAPANESE TRADITION · TENSHINRYU</p>
      <h1 style="font-size: 22px; font-weight: 400; margin: 0 0 16px; color: #191919;">
        ${params.reminder ? "Reminder: " : ""}Your ${isOwner ? "owner" : "instructor"} invitation
      </h1>
      <p style="line-height: 1.6; color: #444;">Hi ${params.name || "there"},</p>
      <p style="line-height: 1.6; color: #444;">
        You've been invited to join <strong>${params.dojoName}</strong> as the
        <strong>${roleLabel}</strong> on Tenshinryu ONLINE KIWAMI.
      </p>
      <p style="line-height: 1.6; color: #444;">
        Click below to create your password and access your dashboard.
        You can also sign in later with Google using this same email.
      </p>
      <p style="margin: 28px 0;">
        <a href="${params.inviteUrl}"
           style="display: inline-block; background: #a83f3f; color: #fff; padding: 14px 28px;
                  text-decoration: none; border-radius: 5px; font-weight: 700;">
          Set up my account
        </a>
      </p>
      <p style="font-size: 13px; color: #7f7f7f; word-break: break-all;">
        Or copy this link:<br>${params.inviteUrl}
      </p>
      <p style="font-size: 13px; color: #7f7f7f;">
        Expires ${params.expiresAt.toLocaleDateString(undefined, { dateStyle: "long" })}.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #999;">
        If you didn't expect this email, you can ignore it.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html,
  });

  return true;
}

export async function assertCanInviteEmail(email: string) {
  const normalized = email.toLowerCase().trim();

  const existingInstructor = await prisma.instructor.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
  if (existingInstructor) {
    throw new Error("This email is already registered");
  }

  const pending = await prisma.instructorInvite.findFirst({
    where: { email: normalized, status: "pending" },
  });
  if (pending) {
    throw new Error("A pending invite already exists for this email");
  }

  return normalized;
}
