"use client";

import { useState, useEffect } from "react";
import { getStudentBadges, getBadgeStats } from "@/lib/badges";
import { BadgeType, getBadgeTypeName, getBeltRankName, getRankColor } from "@/lib/badges";

interface BadgesViewProps {
  studentId: string;
}

interface Badge {
  id: string;
  badgeType: number;
  weekNumber: number;
  year: number;
  classesAttended: number;
  currentStreak: number;
  status: "EARNED" | "QUEUED" | "MINTING" | "MINTED" | "FAILED";
  tokenId: string | null;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{ trait_type: string; value: string | number }>;
  };
  isPrivate: boolean;
  earnedAt: string;
  dojo: { name: string };
}

interface BadgeStats {
  total: number;
  minted: number;
  pending: number;
  byType: Array<{ type: number; count: number; name: string }>;
}

export default function BadgesView({ studentId }: BadgesViewProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    loadBadges();
  }, [studentId]);

  async function loadBadges() {
    try {
      setLoading(true);
      const [badgesData, statsData] = await Promise.all([
        fetch(`/api/student/badges`).then((r) => r.json()),
        fetch(`/api/student/badges/stats`).then((r) => r.json()),
      ]);
      setBadges(badgesData.badges || []);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load badges:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <div className="animate-pulse">Loading badges...</div>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">🏅</div>
        <h3 className="text-xl font-bold text-foreground mb-2">No Badges Yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Start training to earn your first badge! Check in to classes and build your streak.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-card rounded-xl border-2 border-border text-center">
            <div className="text-3xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
          </div>
          <div className="p-4 bg-card rounded-xl border-2 border-border text-center">
            <div className="text-3xl font-bold text-green-500">{stats.minted}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Minted</div>
          </div>
          <div className="p-4 bg-card rounded-xl border-2 border-border text-center">
            <div className="text-3xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending</div>
          </div>
          <div className="p-4 bg-card rounded-xl border-2 border-border text-center">
            <div className="text-3xl font-bold text-accent">
              {badges[0]?.currentStreak || 0}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Streak</div>
          </div>
        </div>
      )}

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {badges.map((badge) => (
          <button
            key={badge.id}
            onClick={() => setSelectedBadge(badge)}
            className="group relative aspect-square bg-card rounded-xl border-2 border-border overflow-hidden hover:border-accent transition-all"
          >
            <img
              src={badge.metadata?.image}
              alt={badge.metadata?.name || getBadgeTypeName(badge.badgeType)}
              className="w-full h-full object-contain p-4"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-sm font-bold truncate">
                {badge.metadata?.name || getBadgeTypeName(badge.badgeType)}
              </div>
              <div className="text-xs text-white/70">
                Week {badge.weekNumber}, {badge.year}
              </div>
            </div>
            {/* Status Indicator */}
            <div
              className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                badge.status === "MINTED"
                  ? "bg-green-500"
                  : badge.status === "QUEUED"
                  ? "bg-yellow-500"
                  : "bg-gray-400"
              }`}
              title={badge.status}
            />
          </button>
        ))}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-card rounded-xl border-2 border-border max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-square bg-muted rounded-lg mb-4 overflow-hidden">
              <img
                src={selectedBadge.metadata?.image}
                alt={selectedBadge.metadata?.name}
                className="w-full h-full object-contain p-4"
              />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              {selectedBadge.metadata?.name || getBadgeTypeName(selectedBadge.badgeType)}
            </h3>
            <p className="text-muted-foreground mb-4">
              {selectedBadge.metadata?.description}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dojo:</span>
                <span className="text-foreground">{selectedBadge.dojo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Week:</span>
                <span className="text-foreground">
                  {selectedBadge.weekNumber}, {selectedBadge.year}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Classes:</span>
                <span className="text-foreground">{selectedBadge.classesAttended}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span
                  className={`font-medium ${
                    selectedBadge.status === "MINTED"
                      ? "text-green-500"
                      : selectedBadge.status === "QUEUED"
                      ? "text-yellow-500"
                      : "text-gray-400"
                  }`}
                >
                  {selectedBadge.status}
                </span>
              </div>
              {selectedBadge.tokenId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token ID:</span>
                  <span className="text-foreground font-mono text-xs">
                    {selectedBadge.tokenId.slice(0, 8)}...
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full mt-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
