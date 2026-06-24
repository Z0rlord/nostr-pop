#!/usr/bin/env node
/**
 * Send a school-owner onboarding invite by email.
 *
 * Usage:
 *   doppler run -- node scripts/invite-owner.mjs --email leader@example.com --name "Sensei Name"
 *   doppler run -- node scripts/invite-owner.mjs --email leader@example.com --dojo-id <uuid>
 *
 * Requires: DATABASE_URL, RESEND_API_KEY (optional but needed for email)
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { Resend } from "resend";

const prisma = new PrismaClient();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tenshinryu.xyz";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { email: "", name: "", dojoId: "" };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email") out.email = args[++i] || "";
    if (args[i] === "--name") out.name = args[++i] || "";
    if (args[i] === "--dojo-id") out.dojoId = args[++i] || "";
  }
  return out;
}

async function main() {
  const { email, name, dojoId: argDojoId } = parseArgs();
  if (!email) {
    console.error("Usage: invite-owner.mjs --email <email> [--name \"Full Name\"] [--dojo-id <uuid>]");
    process.exit(1);
  }

  const normalized = email.toLowerCase().trim();
  const dojo =
    (argDojoId && (await prisma.dojo.findUnique({ where: { id: argDojoId } }))) ||
    (await prisma.dojo.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!dojo) {
    console.error("No dojo found. Create one first or pass --dojo-id.");
    process.exit(1);
  }

  const existing = await prisma.instructor.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
  if (existing) {
    console.error("Email already registered as instructor:", normalized);
    process.exit(1);
  }

  const pending = await prisma.instructorInvite.findFirst({
    where: { email: normalized, status: "pending" },
  });
  if (pending) {
    console.error("Pending invite already exists. Link:");
    console.error(`${APP_URL}/invite/owner?token=${pending.token}`);
    process.exit(1);
  }

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const invite = await prisma.instructorInvite.create({
    data: {
      email: normalized,
      name: name || null,
      token,
      invitedBy: "cli",
      dojoId: dojo.id,
      inviteRole: "owner",
      expiresAt,
    },
  });

  const inviteUrl = `${APP_URL}/invite/owner?token=${token}`;
  console.log("Dojo:", dojo.name);
  console.log("Invite URL:", inviteUrl);
  console.log("Expires:", expiresAt.toISOString());

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set — invite created but email not sent.");
    return;
  }

  const resend = new Resend(resendKey);
  const from = process.env.RESEND_FROM_EMAIL || "Tenshinryu <onboarding@resend.dev>";
  await resend.emails.send({
    from,
    to: normalized,
    subject: `You're invited to lead ${dojo.name} on Tenshinryu KIWAMI`,
    html: `<p>Hi ${name || "there"},</p>
<p>Set up your owner account for <strong>${dojo.name}</strong>:</p>
<p><a href="${inviteUrl}">Set up my account</a></p>
<p>Expires ${expiresAt.toLocaleDateString()}.</p>`,
  });

  console.log("Email sent to", normalized);
  console.log("Invite id:", invite.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
