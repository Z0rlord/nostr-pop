import { prisma } from "@/lib/prisma";
import { BadgeStatus } from "@prisma/client";

export enum BadgeType {
  WEEKLY_WARRIOR = 0,
  PERFECT_WEEK = 1,
  DEDICATED_STUDENT = 2,
  MILESTONE_50 = 3,
  MILESTONE_100 = 4,
  MILESTONE_250 = 5,
  MILESTONE_500 = 6,
  MILESTONE_1000 = 7,
}

export enum BeltRank {
  WHITE = 0,
  YELLOW = 1,
  ORANGE = 2,
  GREEN = 3,
  BLUE = 4,
  BROWN = 5,
  BLACK = 6,
}

const badgeTypeNames: Record<BadgeType, string> = {
  [BadgeType.WEEKLY_WARRIOR]: "Weekly Warrior",
  [BadgeType.PERFECT_WEEK]: "Perfect Week",
  [BadgeType.DEDICATED_STUDENT]: "Dedicated Student",
  [BadgeType.MILESTONE_50]: "50 Classes",
  [BadgeType.MILESTONE_100]: "100 Classes",
  [BadgeType.MILESTONE_250]: "250 Classes",
  [BadgeType.MILESTONE_500]: "500 Classes",
  [BadgeType.MILESTONE_1000]: "1000 Classes - Master",
};

const rankNames: Record<BeltRank, string> = {
  [BeltRank.WHITE]: "White",
  [BeltRank.YELLOW]: "Yellow",
  [BeltRank.ORANGE]: "Orange",
  [BeltRank.GREEN]: "Green",
  [BeltRank.BLUE]: "Blue",
  [BeltRank.BROWN]: "Brown",
  [BeltRank.BLACK]: "Black",
};

const rankColors: Record<BeltRank, string> = {
  [BeltRank.WHITE]: "#f5f5f4",
  [BeltRank.YELLOW]: "#fde047",
  [BeltRank.ORANGE]: "#fb923c",
  [BeltRank.GREEN]: "#4ade80",
  [BeltRank.BLUE]: "#60a5fa",
  [BeltRank.BROWN]: "#92400e",
  [BeltRank.BLACK]: "#1c1917",
};

function generateBadgeSVG(params: {
  badgeType: BadgeType;
  weekNumber: number;
  classesAttended: number;
  studentRank: BeltRank;
  isPrivate: boolean;
}): string {
  const kanjiMap: Record<BadgeType, string> = {
    [BadgeType.WEEKLY_WARRIOR]: "週間戦士",
    [BadgeType.PERFECT_WEEK]: "完璧週",
    [BadgeType.DEDICATED_STUDENT]: "熱心学生",
    [BadgeType.MILESTONE_50]: "50回達成",
    [BadgeType.MILESTONE_100]: "100回達成",
    [BadgeType.MILESTONE_250]: "250回達成",
    [BadgeType.MILESTONE_500]: "500回達成",
    [BadgeType.MILESTONE_1000]: "千回達成",
  };

  const kanji = params.isPrivate ? "認証済" : kanjiMap[params.badgeType];
  const english = params.isPrivate ? "Verified" : badgeTypeNames[params.badgeType];
  const rankColor = rankColors[params.studentRank];
  const subtitle = params.isPrivate
    ? ""
    : `WEEK ${params.weekNumber} - ${params.classesAttended} CLASSES`;
  const privacyIcon = params.isPrivate
    ? '<circle cx="350" cy="50" r="15" fill="#44403c"/><text x="350" y="55" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#fafaf9">L</text>'
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:${rankColor};stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:${rankColor};stop-opacity:0.8"/>
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="200" cy="200" r="190" fill="url(#bg)" stroke="#78716c" stroke-width="3"/>
    <circle cx="200" cy="200" r="170" fill="#fafaf9" stroke="#57534e" stroke-width="1" opacity="0.9"/>
    <text x="200" y="150" text-anchor="middle" font-family="serif" font-size="60" fill="#292524">${kanji}</text>
    <text x="200" y="200" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#78716c" letter-spacing="2">${english}</text>
    <line x1="140" y1="220" x2="260" y2="220" stroke="#d6d3d1" stroke-width="1"/>
    <text x="200" y="250" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#a8a29e">${subtitle}</text>
    <circle cx="200" cy="310" r="20" fill="none" stroke="#78716c" stroke-width="1"/>
    <text x="200" y="315" text-anchor="middle" font-family="serif" font-size="12" fill="#78716c">天</text>
    ${privacyIcon}
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function generateMetadata(params: {
  badgeType: BadgeType;
  weekNumber: number;
  year: number;
  classesAttended: number;
  currentStreak: number;
  studentRank: BeltRank;
  dojoName: string;
  isPrivate: boolean;
}) {
  const kanjiMap: Record<BadgeType, string> = {
    [BadgeType.WEEKLY_WARRIOR]: "週間戦士",
    [BadgeType.PERFECT_WEEK]: "完璧週",
    [BadgeType.DEDICATED_STUDENT]: "熱心学生",
    [BadgeType.MILESTONE_50]: "50回達成",
    [BadgeType.MILESTONE_100]: "100回達成",
    [BadgeType.MILESTONE_250]: "250回達成",
    [BadgeType.MILESTONE_500]: "500回達成",
    [BadgeType.MILESTONE_1000]: "千回達成",
  };

  return {
    name: `${kanjiMap[params.badgeType]} #${params.weekNumber}`,
    description: params.isPrivate
      ? "Verified Tenshinryu Training Attendance"
      : `${badgeTypeNames[params.badgeType]} awarded for training ${params.classesAttended} classes at ${params.dojoName}. Week ${params.weekNumber} of ${params.year}.`,
    image: generateBadgeSVG(params),
    attributes: [
      { trait_type: "Badge Type", value: badgeTypeNames[params.badgeType] },
      { trait_type: "Dojo", value: params.dojoName },
      { trait_type: "Rank", value: rankNames[params.studentRank] },
      { trait_type: "Week", value: params.weekNumber },
      { trait_type: "Classes", value: params.classesAttended },
      { trait_type: "Streak", value: params.currentStreak },
      { trait_type: "Year", value: params.year },
    ],
  };
}

export function getBadgeTypeName(type: BadgeType): string {
  return badgeTypeNames[type];
}

export function getBeltRankName(rank: BeltRank): string {
  return rankNames[rank];
}

export function getRankColor(rank: BeltRank): string {
  return rankColors[rank];
}

// Map Prisma BeltRank enum to numeric rank
function beltRankToNumber(rank: string): BeltRank {
  const map: Record<string, BeltRank> = {
    WHITE: BeltRank.WHITE,
    YELLOW: BeltRank.YELLOW,
    ORANGE: BeltRank.ORANGE,
    GREEN: BeltRank.GREEN,
    BLUE: BeltRank.BLUE,
    BROWN: BeltRank.BROWN,
    BLACK: BeltRank.BLACK,
    RED_BLACK: BeltRank.BLACK,
    RED_WHITE: BeltRank.BLACK,
    RED: BeltRank.BLACK,
  };
  return map[rank] ?? BeltRank.WHITE;
}

// Get current ISO week number
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Get week start and end dates
export function getWeekBounds(date: Date) {
  const day = date.getDay(); // 0 = Sunday
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Check if student qualifies for a weekly badge
export async function checkWeeklyBadge(studentId: string, dojoId: string) {
  const now = new Date();
  const week = getWeekNumber(now);
  const year = now.getFullYear();
  const { start, end } = getWeekBounds(now);

  // Check if badge already exists for this week
  const existing = await prisma.badge.findUnique({
    where: {
      studentId_weekNumber_year: {
        studentId,
        weekNumber: week,
        year,
      },
    },
  });

  if (existing) return null;

  // Count check-ins this week
  const checkIns = await prisma.checkIn.findMany({
    where: {
      studentId,
      checkedInAt: { gte: start, lte: end },
    },
    orderBy: { checkedInAt: "asc" },
  });

  if (checkIns.length === 0) return null;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { dojo: true },
  });

  if (!student) return null;

  // Determine badge type
  let badgeType = BadgeType.WEEKLY_WARRIOR;
  if (checkIns.length >= 7) {
    badgeType = BadgeType.PERFECT_WEEK;
  } else if (checkIns.length >= 5) {
    badgeType = BadgeType.DEDICATED_STUDENT;
  }

  // Calculate streak (consecutive weeks with badge)
  let streak = 0;
  for (let w = week - 1; w >= 1; w--) {
    const has = await prisma.badge.findFirst({
      where: { studentId, weekNumber: w, year },
    });
    if (has) streak++;
    else break;
  }

  const metadata = generateMetadata({
    badgeType,
    weekNumber: week,
    year,
    classesAttended: checkIns.length,
    currentStreak: streak,
    studentRank: beltRankToNumber(student.beltRank),
    dojoName: student.dojo.name,
    isPrivate: false,
  });

  const badge = await prisma.badge.create({
    data: {
      studentId,
      dojoId,
      badgeType,
      weekNumber: week,
      year,
      classesAttended: checkIns.length,
      currentStreak: streak,
      metadata: metadata as any,
      isPrivate: false,
      status: BadgeStatus.EARNED,
    },
  });

  // Link check-ins
  await prisma.badgeCheckIn.createMany({
    data: checkIns.map((ci) => ({
      badgeId: badge.id,
      checkInId: ci.id,
    })),
  });

  // Check milestones
  const totalCheckIns = await prisma.checkIn.count({ where: { studentId } });
  await checkMilestoneBadges(studentId, dojoId, totalCheckIns, student);

  return badge;
}

// Check for milestone badges
async function checkMilestoneBadges(
  studentId: string,
  dojoId: string,
  totalCheckIns: number,
  student: any
) {
  const milestones = [
    BadgeType.MILESTONE_50,
    BadgeType.MILESTONE_100,
    BadgeType.MILESTONE_250,
    BadgeType.MILESTONE_500,
    BadgeType.MILESTONE_1000,
  ];
  const milestoneCounts = [50, 100, 250, 500, 1000];

  for (let i = 0; i < milestones.length; i++) {
    const count = milestoneCounts[i];
    if (totalCheckIns >= count) {
      const existing = await prisma.badge.findFirst({
        where: { studentId, badgeType: milestones[i] },
      });
      if (!existing) {
        const now = new Date();
        const week = getWeekNumber(now);
        const metadata = generateMetadata({
          badgeType: milestones[i],
          weekNumber: week,
          year: now.getFullYear(),
          classesAttended: totalCheckIns,
          currentStreak: 0,
          studentRank: beltRankToNumber(student.beltRank),
          dojoName: student.dojo.name,
          isPrivate: false,
        });

        await prisma.badge.create({
          data: {
            studentId,
            dojoId,
            badgeType: milestones[i],
            weekNumber: week,
            year: now.getFullYear(),
            classesAttended: totalCheckIns,
            currentStreak: 0,
            metadata: metadata as any,
            isPrivate: false,
            status: BadgeStatus.EARNED,
          },
        });
      }
    }
  }
}

// Get student's badges
export async function getStudentBadges(studentId: string) {
  return prisma.badge.findMany({
    where: { studentId },
    orderBy: { earnedAt: "desc" },
    include: {
      dojo: { select: { name: true } },
      checkIns: { include: { checkIn: true } },
    },
  });
}

// Get badge stats
export async function getBadgeStats(studentId: string) {
  const [total, minted, pending, byType] = await Promise.all([
    prisma.badge.count({ where: { studentId } }),
    prisma.badge.count({ where: { studentId, status: BadgeStatus.MINTED } }),
    prisma.badge.count({
      where: {
        studentId,
        status: { in: [BadgeStatus.EARNED, BadgeStatus.QUEUED] },
      },
    }),
    prisma.badge.groupBy({
      by: ["badgeType"],
      where: { studentId },
      _count: { badgeType: true },
    }),
  ]);

  return {
    total,
    minted,
    pending,
    byType: byType.map((t) => ({
      type: t.badgeType,
      count: t._count.badgeType,
      name: badgeTypeNames[t.badgeType as BadgeType],
    })),
  };
}
