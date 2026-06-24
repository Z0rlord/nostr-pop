import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/solo-practice/heatmap - Get anonymous practice location data
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    
    // Calculate date range
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Aggregate practice locations (anonymized - no student IDs)
    // Round coordinates to ~1km precision for privacy
    const practices = await prisma.soloPracticeLog.findMany({
      where: {
        date: {
          gte: since,
        },
        locationLat: {
          not: null,
        },
        locationLon: {
          not: null,
        },
      },
      select: {
        locationLat: true,
        locationLon: true,
        durationMinutes: true,
      },
    });

    // Round coordinates to 2 decimal places (~1km precision) for anonymity
    // and aggregate counts
    const locationMap = new Map<string, { lat: number; lon: number; count: number; minutes: number }>();

    for (const practice of practices) {
      if (!practice.locationLat || !practice.locationLon) continue;
      
      // Round to 2 decimal places for privacy (approx 1km precision)
      const lat = Math.round(practice.locationLat * 100) / 100;
      const lon = Math.round(practice.locationLon * 100) / 100;
      const key = `${lat},${lon}`;
      
      if (locationMap.has(key)) {
        const existing = locationMap.get(key)!;
        existing.count += 1;
        existing.minutes += practice.durationMinutes;
      } else {
        locationMap.set(key, {
          lat,
          lon,
          count: 1,
          minutes: practice.durationMinutes,
        });
      }
    }

    // Convert to array and add intensity based on count
    const heatmapData = Array.from(locationMap.values()).map((loc) => ({
      lat: loc.lat,
      lon: loc.lon,
      count: loc.count,
      minutes: loc.minutes,
      // Intensity for heatmap (0-1 scale, capped at 50 sessions)
      intensity: Math.min(loc.count / 50, 1),
    }));

    return NextResponse.json({
      success: true,
      data: heatmapData,
      totalLocations: heatmapData.length,
      totalSessions: heatmapData.reduce((sum, d) => sum + d.count, 0),
      totalMinutes: heatmapData.reduce((sum, d) => sum + d.minutes, 0),
      period: `${days} days`,
    });
  } catch (error: any) {
    console.error("[Heatmap] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}
