-- CreateEnum
CREATE TYPE "TokenTransactionType" AS ENUM ('CHECK_IN', 'STREAK_BONUS', 'BELT_PROMOTION', 'VIDEO_UPLOAD', 'REFERRAL', 'LEADERBOARD_PRIZE', 'REDEMPTION', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LeaderboardStatus" AS ENUM ('ACTIVE', 'ENDED', 'PRIZES_DISTRIBUTED');

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "tokensAwarded" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "dojoBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSpent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "tokensAwarded" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TokenTransaction" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TokenTransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "id" TEXT NOT NULL,
    "dojoId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "LeaderboardStatus" NOT NULL DEFAULT 'ACTIVE',
    "prizePool" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "leaderboardId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rank" INTEGER,
    "checkIns" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "videos" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "prizeAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_leaderboardId_studentId_key" ON "LeaderboardEntry"("leaderboardId", "studentId");

-- AddForeignKey
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_leaderboardId_fkey" FOREIGN KEY ("leaderboardId") REFERENCES "Leaderboard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
