-- CreateEnum
CREATE TYPE "ClassMode" AS ENUM ('PHYSICAL', 'ONLINE');

-- AlterTable
ALTER TABLE "Class" ADD COLUMN "mode" "ClassMode" NOT NULL DEFAULT 'PHYSICAL';
ALTER TABLE "Class" ADD COLUMN "meetingUrl" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Class_dojoId_idx" ON "Class"("dojoId");

-- CreateTable
CREATE TABLE "BulletinPost" (
    "id" TEXT NOT NULL,
    "dojoId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL DEFAULT 'student',
    "authorName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulletinPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinReply" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL DEFAULT 'student',
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isStaffReply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulletinReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL,
    "dojoId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isBreaking" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulletinPost_dojoId_createdAt_idx" ON "BulletinPost"("dojoId", "createdAt");
CREATE INDEX "BulletinPost_dojoId_isPinned_idx" ON "BulletinPost"("dojoId", "isPinned");
CREATE INDEX "BulletinPost_authorId_idx" ON "BulletinPost"("authorId");
CREATE INDEX "BulletinReply_postId_createdAt_idx" ON "BulletinReply"("postId", "createdAt");
CREATE INDEX "BulletinReply_authorId_idx" ON "BulletinReply"("authorId");
CREATE INDEX "NewsItem_dojoId_publishedAt_idx" ON "NewsItem"("dojoId", "publishedAt");
CREATE INDEX "NewsItem_dojoId_isBreaking_idx" ON "NewsItem"("dojoId", "isBreaking");

-- AddForeignKey
ALTER TABLE "BulletinPost" ADD CONSTRAINT "BulletinPost_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BulletinReply" ADD CONSTRAINT "BulletinReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BulletinPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsItem" ADD CONSTRAINT "NewsItem_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
