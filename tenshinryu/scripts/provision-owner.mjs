#!/usr/bin/env node
/**
 * Provision a school owner directly (skip invite link).
 * Creates Instructor + Firebase email/password user.
 *
 * Usage:
 *   doppler run --project dojopop --config prd_zorie -- bash -c '
 *     export DATABASE_URL="$(doppler secrets get TENSHINRYU_DATABASE_URL --plain)"
 *     node scripts/provision-owner.mjs --email skskken@gmail.com --name "Masakumo Kuwami"
 *   '
 *
 * Optional: --password "YourTempPass123!" --dojo-id <uuid> --force
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { email: "", name: "", dojoId: "", password: "", force: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email") out.email = args[++i] || "";
    if (args[i] === "--name") out.name = args[++i] || "";
    if (args[i] === "--dojo-id") out.dojoId = args[++i] || "";
    if (args[i] === "--password") out.password = args[++i] || "";
    if (args[i] === "--force") out.force = true;
  }
  return out;
}

function tempPassword() {
  const raw = randomBytes(9).toString("base64url");
  return `Kiwami-${raw}!`;
}

function getFirebaseAdmin() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON required");
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
  return getAuth();
}

async function upsertFirebaseUser(email, password, displayName) {
  const auth = getFirebaseAdmin();
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, {
      password,
      displayName: displayName || existing.displayName,
      emailVerified: true,
    });
    return existing.uid;
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    const created = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    return created.uid;
  }
}

async function main() {
  const { email, name, dojoId: argDojoId, password: argPassword, force } = parseArgs();
  if (!email) {
    console.error(
      "Usage: provision-owner.mjs --email <email> [--name \"Name\"] [--dojo-id <uuid>] [--password <pass>] [--force]"
    );
    process.exit(1);
  }

  const normalized = email.toLowerCase().trim();
  const password = argPassword || tempPassword();
  const displayName = name || normalized.split("@")[0];

  const dojo =
    (argDojoId && (await prisma.dojo.findUnique({ where: { id: argDojoId } }))) ||
    (await prisma.dojo.findFirst({
      where: { name: { contains: "International", mode: "insensitive" } },
    })) ||
    (await prisma.dojo.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!dojo) {
    console.error("No dojo found.");
    process.exit(1);
  }

  const existing = await prisma.instructor.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });

  if (existing && !force) {
    console.error("Instructor already exists:", existing.id, existing.name);
    console.error("Use --force to reset password and ensure isAdmin.");
    process.exit(1);
  }

  const firebaseUid = await upsertFirebaseUser(normalized, password, displayName);
  const hashedPassword = await bcrypt.hash(password, 10);

  let instructor;
  if (existing) {
    instructor = await prisma.instructor.update({
      where: { id: existing.id },
      data: {
        name: displayName,
        password: hashedPassword,
        isAdmin: true,
        firebaseUid,
        dojoId: dojo.id,
      },
    });
  } else {
    instructor = await prisma.instructor.create({
      data: {
        email: normalized,
        name: displayName,
        password: hashedPassword,
        isAdmin: true,
        firebaseUid,
        dojoId: dojo.id,
      },
    });
  }

  await prisma.instructorInvite.updateMany({
    where: { email: normalized, status: "pending" },
    data: { status: "accepted", acceptedAt: new Date() },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tenshinryu.xyz";
  console.log("");
  console.log("Owner provisioned successfully");
  console.log("Dojo:", dojo.name, `(${dojo.id})`);
  console.log("Name:", instructor.name);
  console.log("Email:", normalized);
  console.log("Login URL:", `${appUrl}/login`);
  console.log("");
  console.log("Temporary password (share securely, ask them to change after first login):");
  console.log(password);
  console.log("");
  console.log("They can sign in with Email + password or Continue with Google (same Gmail).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
