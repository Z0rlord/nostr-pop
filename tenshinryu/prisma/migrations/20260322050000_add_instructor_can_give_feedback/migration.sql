-- Add canGiveFeedback column to Instructor table
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "canGiveFeedback" BOOLEAN DEFAULT true;

-- Update existing instructors to have canGiveFeedback = true
UPDATE "Instructor" SET "canGiveFeedback" = true WHERE "canGiveFeedback" IS NULL;
