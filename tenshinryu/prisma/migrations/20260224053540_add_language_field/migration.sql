-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "password" TEXT;
