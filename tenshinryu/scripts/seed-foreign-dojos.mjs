#!/usr/bin/env node
/**
 * Upsert foreign-country schools + grant Kuwami Sensei admin on each.
 * Creates pending owner invites when a leader email is listed on the
 * international site (does not provision passwords).
 *
 * Staging (default when DATABASE_URL contains staging):
 *   doppler run --project dojopop --config prd_zorie -- bash -c '
 *     export DATABASE_URL="$(doppler secrets get TENSHINRYU_STAGING_DATABASE_URL --plain)"
 *     export NEXT_PUBLIC_APP_URL=https://staging.tenshinryu.xyz
 *     node scripts/seed-foreign-dojos.mjs
 *   '
 *
 * Production (requires --prod):
 *   doppler run --project dojopop --config prd_zorie -- bash -c '
 *     export DATABASE_URL="$(doppler secrets get TENSHINRYU_DATABASE_URL --plain)"
 *     export NEXT_PUBLIC_APP_URL=https://tenshinryu.xyz
 *     node scripts/seed-foreign-dojos.mjs --prod
 *   '
 *
 * Optional: --send-email  (needs RESEND_API_KEY)
 *           --skip-invites
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { FOREIGN_SCHOOLS } from "./foreign-schools.mjs";

const prisma = new PrismaClient();
const OWNER_EMAIL = "skskken@gmail.com";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    prod: args.includes("--prod"),
    sendEmail: args.includes("--send-email"),
    skipInvites: args.includes("--skip-invites"),
  };
}

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.DATABASE_URL?.includes("staging")
      ? "https://staging.tenshinryu.xyz"
      : "https://tenshinryu.xyz")
  );
}

async function upsertSchool(school) {
  await prisma.dojo.upsert({
    where: { id: school.id },
    create: {
      id: school.id,
      name: school.name,
      location: school.location,
      timezone: school.timezone,
      code: school.code,
    },
    update: {
      name: school.name,
      location: school.location,
      timezone: school.timezone,
      code: school.code,
    },
  });
}

async function grantOwnerAll(dojoIds) {
  const owner = await prisma.instructor.findFirst({
    where: { email: { equals: OWNER_EMAIL, mode: "insensitive" } },
  });
  if (!owner) {
    console.warn(`Owner ${OWNER_EMAIL} not found — skip multi-school grant`);
    return null;
  }
  for (const dojoId of dojoIds) {
    await prisma.instructorDojoMembership.upsert({
      where: {
        instructorId_dojoId: { instructorId: owner.id, dojoId },
      },
      create: {
        instructorId: owner.id,
        dojoId,
        isAdmin: true,
      },
      update: { isAdmin: true },
    });
  }
  return owner;
}

async function ensureOwnerInvite(school, leader, { sendEmail }) {
  const email = leader.email.toLowerCase().trim();
  const base = appUrl();

  const existingInstructor = await prisma.instructor.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { memberships: true },
  });
  if (existingInstructor) {
    const already =
      existingInstructor.dojoId === school.id ||
      existingInstructor.memberships.some((m) => m.dojoId === school.id);
    if (already) {
      return { status: "already_member", email, school: school.code };
    }
    // Existing instructor elsewhere — still invite to this school as owner
  }

  const pending = await prisma.instructorInvite.findFirst({
    where: { email, dojoId: school.id, status: "pending" },
  });
  if (pending) {
    return {
      status: "pending_exists",
      email,
      school: school.code,
      url: `${base}/invite/owner?token=${pending.token}`,
      expiresAt: pending.expiresAt,
    };
  }

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.instructorInvite.create({
    data: {
      email,
      name: leader.name || null,
      token,
      invitedBy: "seed-foreign-dojos",
      dojoId: school.id,
      inviteRole: "owner",
      expiresAt,
    },
  });

  const url = `${base}/invite/owner?token=${token}`;

  if (sendEmail) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn(`RESEND_API_KEY missing — invite created but not emailed: ${email}`);
    } else {
      const resend = new Resend(resendKey);
      const from =
        process.env.RESEND_FROM_EMAIL || "Tenshinryu <onboarding@resend.dev>";
      await resend.emails.send({
        from,
        to: email,
        subject: `You're invited to lead ${school.name} on Tenshinryu KIWAMI`,
        html: `<p>Hi ${leader.name || "there"},</p>
<p>You are invited as school owner for <strong>${school.name}</strong> (${school.code}).</p>
<p><a href="${url}">Set up your account</a></p>
<p>This link expires ${expiresAt.toLocaleDateString()}.</p>
<p>You will only administer this school — not Japan branches or other foreign schools.</p>`,
      });
    }
  }

  return {
    status: "created",
    email,
    school: school.code,
    name: leader.name,
    url,
    expiresAt,
    emailed: !!(sendEmail && process.env.RESEND_API_KEY),
  };
}

async function main() {
  const { prod, sendEmail, skipInvites } = parseArgs();
  const url = process.env.DATABASE_URL || "";
  const looksStaging = url.includes("staging") || url.includes("tenshinryu_staging");
  const looksProd =
    url.includes("/tenshinryu?") ||
    (url.includes("tenshinryu") && !looksStaging);

  if (prod) {
    if (looksStaging) {
      console.error("Refusing --prod with a staging DATABASE_URL.");
      process.exit(1);
    }
  } else if (looksProd && !looksStaging) {
    console.error(
      "DATABASE_URL looks like production. Re-run with --prod after verifying staging."
    );
    process.exit(1);
  }

  console.log(`Seeding ${FOREIGN_SCHOOLS.length} foreign schools…`);
  console.log(`App URL: ${appUrl()}`);
  console.log(`Send email: ${sendEmail ? "yes" : "no (print invite URLs only)"}`);

  const inviteResults = [];
  const pendingNoEmail = [];

  for (const school of FOREIGN_SCHOOLS) {
    await upsertSchool(school);
    console.log(`  ${school.code} — ${school.name}`);

    const withEmail = school.leaders.filter((l) => l.email);
    if (withEmail.length === 0) {
      pendingNoEmail.push({
        id: school.id,
        code: school.code,
        name: school.name,
        leaders: school.leaders.map((l) => l.name).filter(Boolean),
      });
    }

    if (!skipInvites) {
      for (const leader of withEmail) {
        const result = await ensureOwnerInvite(school, leader, { sendEmail });
        inviteResults.push(result);
      }
    }
  }

  const owner = await grantOwnerAll(FOREIGN_SCHOOLS.map((s) => s.id));
  if (owner) {
    console.log(`\nGranted ${OWNER_EMAIL} admin on all ${FOREIGN_SCHOOLS.length} foreign schools`);
  }

  console.log("\n=== Owner invites (email known) ===");
  for (const r of inviteResults) {
    if (r.status === "created" || r.status === "pending_exists") {
      console.log(`  [${r.status}] ${r.school} ${r.email}`);
      console.log(`         ${r.url}`);
    } else {
      console.log(`  [${r.status}] ${r.school} ${r.email}`);
    }
  }

  console.log("\n=== Schools needing invite later (no email on site) ===");
  for (const s of pendingNoEmail) {
    const leaders = s.leaders.length ? s.leaders.join(", ") : "(unknown)";
    console.log(`  ${s.code} — ${s.name} — leaders: ${leaders}`);
    console.log(
      `         Invite via: node scripts/invite-owner.mjs --email <email> --name "..." --dojo-id ${s.id}`
    );
  }

  // Fix dojo-id hint for FIT etc (codes don't always match id suffix)
  console.log("\nDone. Leaders with emails get /invite/owner links; others stay invite-ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
