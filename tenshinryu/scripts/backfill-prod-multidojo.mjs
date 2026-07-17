#!/usr/bin/env node
/**
 * Production backfill: school codes + multi-dojo memberships for Kuwami Sensei.
 * Safe to re-run. Uses TENSHINRYU_DATABASE_URL only.
 *
 *   doppler run --project dojopop --config prd_zorie -- bash -c '
 *     export DATABASE_URL="$(doppler secrets get TENSHINRYU_DATABASE_URL --plain)"
 *     node scripts/backfill-prod-multidojo.mjs
 *   '
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CODE_BY_ID = {
  "tenshinryu-hq": "HQ",
  "tenshinryu-setagaya": "SETAGAYA",
  "tenshinryu-kawagoe": "KAWAGOE",
  "tenshinryu-shinjuku": "SHINJUKU",
  "tenshinryu-yokohama": "YOKOHAMA",
  "tenshinryu-shinyurigaoka": "SHINYURI",
  "tenshinryu-kawasaki": "KAWASAKI",
  "a329b2f2-6465-4369-99ab-90773f9d39a4": "KEIKOKAI",
};

const OWNER_EMAIL = "skskken@gmail.com";

async function main() {
  const url = process.env.DATABASE_URL || "";
  if (url.includes("tenshinryu_staging")) {
    console.error("Refusing: DATABASE_URL looks like staging. Use production URL.");
    process.exit(1);
  }

  const dojos = await prisma.dojo.findMany({ orderBy: { name: "asc" } });
  console.log(`Found ${dojos.length} dojos`);

  for (const d of dojos) {
    const code = CODE_BY_ID[d.id];
    if (d.id === "a329b2f2-6465-4369-99ab-90773f9d39a4") {
      await prisma.dojo.update({
        where: { id: d.id },
        data: {
          name: "Global Keikokai (ONLINE)",
          code: "KEIKOKAI",
          location: "Worldwide / Online",
          timezone: "UTC",
        },
      });
      console.log("  Global Keikokai ←", d.name);
      continue;
    }
    if (code && !d.code) {
      await prisma.dojo.update({ where: { id: d.id }, data: { code } });
      console.log("  code", code, "→", d.name);
    } else if (d.code) {
      console.log("  skip (has code)", d.code, d.name);
    } else {
      console.log("  no preset code for", d.id, d.name);
    }
  }

  // Ensure all instructors have at least primary membership
  const instructors = await prisma.instructor.findMany();
  for (const i of instructors) {
    await prisma.instructorDojoMembership.upsert({
      where: {
        instructorId_dojoId: { instructorId: i.id, dojoId: i.dojoId },
      },
      create: {
        instructorId: i.id,
        dojoId: i.dojoId,
        isAdmin: i.isAdmin,
      },
      update: { isAdmin: i.isAdmin },
    });
  }
  console.log(`Backfilled memberships for ${instructors.length} instructor(s)`);

  const owner = await prisma.instructor.findFirst({
    where: { email: { equals: OWNER_EMAIL, mode: "insensitive" } },
  });

  if (owner) {
    for (const d of dojos) {
      await prisma.instructorDojoMembership.upsert({
        where: {
          instructorId_dojoId: { instructorId: owner.id, dojoId: d.id },
        },
        create: {
          instructorId: owner.id,
          dojoId: d.id,
          isAdmin: true,
        },
        update: { isAdmin: true },
      });
    }
    console.log(`Owner ${OWNER_EMAIL}: admin on all ${dojos.length} schools`);
  } else {
    console.warn(`Owner ${OWNER_EMAIL} not found — skip multi-school grant`);
  }

  console.log("Production multi-dojo backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
