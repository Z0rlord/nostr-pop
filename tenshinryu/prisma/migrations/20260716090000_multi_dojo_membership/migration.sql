-- Multi-dojo membership + school codes + invite email uniqueness per dojo

-- Optional join code for student signup (never bare findFirst)
ALTER TABLE "Dojo" ADD COLUMN IF NOT EXISTS "code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Dojo_code_key" ON "Dojo"("code") WHERE "code" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "InstructorDojoMembership" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "dojoId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstructorDojoMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InstructorDojoMembership_instructorId_dojoId_key"
  ON "InstructorDojoMembership"("instructorId", "dojoId");
CREATE INDEX IF NOT EXISTS "InstructorDojoMembership_dojoId_idx"
  ON "InstructorDojoMembership"("dojoId");
CREATE INDEX IF NOT EXISTS "InstructorDojoMembership_instructorId_idx"
  ON "InstructorDojoMembership"("instructorId");

DO $$ BEGIN
  ALTER TABLE "InstructorDojoMembership"
    ADD CONSTRAINT "InstructorDojoMembership_instructorId_fkey"
    FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "InstructorDojoMembership"
    ADD CONSTRAINT "InstructorDojoMembership_dojoId_fkey"
    FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill memberships from existing Instructor rows
INSERT INTO "InstructorDojoMembership" ("id", "instructorId", "dojoId", "isAdmin", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text || i."id"), i."id", i."dojoId", i."isAdmin", CURRENT_TIMESTAMP
FROM "Instructor" i
WHERE NOT EXISTS (
  SELECT 1 FROM "InstructorDojoMembership" m
  WHERE m."instructorId" = i."id" AND m."dojoId" = i."dojoId"
);

-- Allow same email to be invited to multiple dojos (drop global unique if present)
ALTER TABLE "InstructorInvite" DROP CONSTRAINT IF EXISTS "InstructorInvite_email_key";
CREATE INDEX IF NOT EXISTS "InstructorInvite_email_dojoId_idx" ON "InstructorInvite"("email", "dojoId");
