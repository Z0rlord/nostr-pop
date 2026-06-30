-- Owner vs instructor invite role
ALTER TABLE "InstructorInvite" ADD COLUMN IF NOT EXISTS "inviteRole" TEXT NOT NULL DEFAULT 'instructor';
