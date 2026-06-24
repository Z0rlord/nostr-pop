-- Add Tenshinryu-specific fields to support both apps

-- Add Stage enum values if not exists
DO $$
BEGIN
  CREATE TYPE "Stage" AS ENUM (
    'STAGE_1', 'STAGE_2', 'STAGE_3', 'STAGE_4', 'STAGE_5',
    'STAGE_6', 'STAGE_7', 'STAGE_8', 'STAGE_9', 'STAGE_10',
    'SHODAN', 'NIDAN', 'SANDAN', 'YONDAN', 'GODAN'
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Add MembershipTier enum if not exists
DO $$
BEGIN
  CREATE TYPE "MembershipTier" AS ENUM ('NONE', 'YOUTUBE', 'GOLD', 'ROYAL');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Add Tenshinryu fields to Student table (nullable, for compatibility)
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "currentStage" "Stage";
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "stageProgress" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "totalProgress" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "membershipTier" "MembershipTier" DEFAULT 'NONE';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "membershipExpires" TIMESTAMP(3);

-- Add canGiveFeedback to Instructor
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "canGiveFeedback" BOOLEAN DEFAULT true;
UPDATE "Instructor" SET "canGiveFeedback" = true WHERE "canGiveFeedback" IS NULL;

-- Add VideoReview table for Tenshinryu
CREATE TABLE IF NOT EXISTS "VideoReview" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "videoUrl" TEXT NOT NULL,
  "technique" TEXT,
  "feedback" TEXT,
  "isApproved" BOOLEAN DEFAULT false,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  
  CONSTRAINT "VideoReview_pkey" PRIMARY KEY ("id")
);

-- Add ZoomLesson table for Tenshinryu
CREATE TABLE IF NOT EXISTS "ZoomLesson" (
  "id" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "zoomLink" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER DEFAULT 60,
  "maxParticipants" INTEGER DEFAULT 20,
  "isRecorded" BOOLEAN DEFAULT false,
  "recordingUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "ZoomLesson_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "VideoReview_studentId_idx" ON "VideoReview"("studentId");
CREATE INDEX IF NOT EXISTS "VideoReview_instructorId_idx" ON "VideoReview"("instructorId");
CREATE INDEX IF NOT EXISTS "ZoomLesson_instructorId_idx" ON "ZoomLesson"("instructorId");
CREATE INDEX IF NOT EXISTS "ZoomLesson_scheduledAt_idx" ON "ZoomLesson"("scheduledAt");
