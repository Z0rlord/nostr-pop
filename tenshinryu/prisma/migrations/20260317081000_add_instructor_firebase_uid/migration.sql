-- AlterTable
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "firebaseUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Instructor_firebaseUid_key" ON "Instructor"("firebaseUid");
