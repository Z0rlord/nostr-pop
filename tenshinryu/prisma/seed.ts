import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.SEED_OWNER_EMAIL || "zbarber@gmail.com").toLowerCase();
  const ownerName = process.env.SEED_OWNER_NAME || "Dojo Owner";

  console.log("Seeding Tenshinryu database...");

  let dojo = await prisma.dojo.findFirst({ where: { name: "Tenshinryu International" } });
  if (!dojo) {
    dojo = await prisma.dojo.create({
      data: {
        name: "Tenshinryu International",
        location: "Global / Online",
        timezone: "Asia/Tokyo",
      },
    });
    console.log("Created dojo:", dojo.name);
  }

  let owner = await prisma.instructor.findFirst({
    where: { email: { equals: ownerEmail, mode: "insensitive" } },
  });
  if (!owner) {
    owner = await prisma.instructor.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        password: crypto.createHash("sha256").update(crypto.randomUUID()).digest("hex"),
        isAdmin: true,
        dojoId: dojo.id,
      },
    });
    console.log("Created owner instructor:", owner.email);
  } else if (!owner.isAdmin) {
    await prisma.instructor.update({
      where: { id: owner.id },
      data: { isAdmin: true },
    });
    console.log("Promoted existing instructor to admin:", owner.email);
  }

  const classCount = await prisma.class.count({ where: { dojoId: dojo.id } });
  if (classCount === 0) {
    await prisma.class.create({
      data: {
        name: "KIWAMI Online Practice",
        schedule: "Live streams — see YouTube",
        maxStudents: 999,
        dojoId: dojo.id,
        instructorId: owner.id,
        location: "Online",
        isRecurring: true,
      },
    });
    console.log("Created default class");
  }

  console.log("Seed complete. Owner signs in with Google using:", ownerEmail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
