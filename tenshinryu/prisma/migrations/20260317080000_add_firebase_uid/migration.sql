-- AlterTable
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "firebaseUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Student_firebaseUid_key" ON "Student"("firebaseUid");
