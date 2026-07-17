#!/usr/bin/env node
/**
 * Seed staging DB with Tenshinryu schools + Kuwami Sensei as owner of all.
 * Does NOT touch production. Run with TENSHINRYU_STAGING_DATABASE_URL.
 *
 *   doppler run --project dojopop --config prd_zorie -- bash -c '
 *     export DATABASE_URL="$(doppler secrets get TENSHINRYU_STAGING_DATABASE_URL --plain)"
 *     node scripts/seed-staging-multidojo.mjs
 *   '
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { FOREIGN_SCHOOLS } from "./foreign-schools.mjs";

const prisma = new PrismaClient();

const JAPAN_AND_GLOBAL = [
  { id: "tenshinryu-hq", name: "Tenshinryu Headquarters (緑スポーツセンター)", code: "HQ", location: "Tokyo", timezone: "Asia/Tokyo" },
  { id: "tenshinryu-setagaya", name: "Setagaya Branch (経堂南/桜丘)", code: "SETAGAYA", location: "Setagaya", timezone: "Asia/Tokyo" },
  { id: "tenshinryu-kawagoe", name: "Kawagoe Branch (六塚会館)", code: "KAWAGOE", location: "Kawagoe", timezone: "Asia/Tokyo" },
  { id: "tenshinryu-shinjuku", name: "Shinjuku Branch (コズミックスポーツセンター)", code: "SHINJUKU", location: "Shinjuku", timezone: "Asia/Tokyo" },
  { id: "tenshinryu-yokohama", name: "Yokohama Branch (神奈川/神之木)", code: "YOKOHAMA", location: "Yokohama", timezone: "Asia/Tokyo" },
  { id: "tenshinryu-shinyurigaoka", name: "Shinyurigaoka Branch (日吉分館)", code: "SHINYURI", location: "Shinyurigaoka", timezone: "Asia/Tokyo" },
  { id: "tenshinryu-kawasaki", name: "Kawasaki Branch (柿生武道館)", code: "KAWASAKI", location: "Kawasaki", timezone: "Asia/Tokyo" },
  {
    id: "a329b2f2-6465-4369-99ab-90773f9d39a4",
    name: "Global Keikokai (ONLINE)",
    code: "KEIKOKAI",
    location: "Worldwide / Online",
    timezone: "UTC",
  },
];

const SCHOOLS = [
  ...JAPAN_AND_GLOBAL,
  ...FOREIGN_SCHOOLS.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    location: s.location,
    timezone: s.timezone,
  })),
];

const OWNER_EMAIL = "skskken@gmail.com";
const OWNER_NAME = "Masakumo Kuwami";
const OWNER_PASSWORD = "Kiwami";

async function main() {
  if (process.env.APP_ENV === "production" && !process.env.FORCE_STAGING_SEED) {
    // Soft guard: staging sync sets APP_ENV=staging
  }
  const url = process.env.DATABASE_URL || "";
  if (url.includes("/tenshinryu?") && !url.includes("tenshinryu_staging") && !process.env.FORCE_STAGING_SEED) {
    console.error("Refusing to seed production DB. Use TENSHINRYU_STAGING_DATABASE_URL.");
    process.exit(1);
  }

  for (const s of SCHOOLS) {
    const timezone = s.timezone || "Asia/Tokyo";
    await prisma.dojo.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        name: s.name,
        location: s.location,
        timezone,
        code: s.code,
      },
      update: {
        name: s.name,
        location: s.location,
        timezone,
        code: s.code,
      },
    });
    console.log("Dojo:", s.code, s.name);
  }

  const hashed = await bcrypt.hash(OWNER_PASSWORD, 10);
  const primaryId = SCHOOLS[0].id;

  let owner = await prisma.instructor.findFirst({
    where: { email: { equals: OWNER_EMAIL, mode: "insensitive" } },
  });

  if (!owner) {
    owner = await prisma.instructor.create({
      data: {
        id: randomUUID(),
        email: OWNER_EMAIL,
        name: OWNER_NAME,
        password: hashed,
        dojoId: primaryId,
        isAdmin: true,
      },
    });
  } else {
    owner = await prisma.instructor.update({
      where: { id: owner.id },
      data: {
        name: OWNER_NAME,
        password: hashed,
        isAdmin: true,
        dojoId: primaryId,
      },
    });
  }

  for (const s of SCHOOLS) {
    await prisma.instructorDojoMembership.upsert({
      where: {
        instructorId_dojoId: { instructorId: owner.id, dojoId: s.id },
      },
      create: {
        instructorId: owner.id,
        dojoId: s.id,
        isAdmin: true,
      },
      update: { isAdmin: true },
    });
  }

  console.log("");
  console.log("Owner:", OWNER_EMAIL, "password:", OWNER_PASSWORD);
  console.log("Memberships:", SCHOOLS.length, "schools (all admin)");
  console.log("Login: https://staging.tenshinryu.xyz/login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
