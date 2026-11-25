import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeekStart } from "@/lib/formatting";
import type { ActivityData, WeeklySummary, WeeklyTrendPoint } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch all run activities, ordered by most recent
    const activities = await prisma.activity.findMany({
      where: { type: "Run" },
      orderBy: { startDate: "desc" },
      take: 50,
    });

    // Weekly summary (current week)
    const weekStart = getWeekStart();
    const thisWeekActivities = activities.filter(
      (a) => new Date(a.startDate) >= weekStart
    );

    const totalDistanceKm =
      thisWeekActivities.reduce((sum, a) => sum + a.distanceMeters, 0) / 1000;

    const activitiesWithHr = thisWeekActivities.filter(
      (a) => a.averageHeartrate !== null
    );
    const avgHeartrate =
      activitiesWithHr.length > 0
        ? activitiesWithHr.reduce(
            (sum, a) => sum + (a.averageHeartrate ?? 0),
            0
          ) / activitiesWithHr.length
        : null;

    const weeklySummary: WeeklySummary = {
      totalDistanceKm,
      avgHeartrate,
      sessionCount: thisWeekActivities.length,
      weekStart: weekStart.toISOString(),
    };

    // Weekly trend (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const trendActivities = activities.filter(
      (a) => new Date(a.startDate) >= eightWeeksAgo
    );

    // Group by week
    const weekMap = new Map<
      string,
      {
        distanceKm: number;
        hrValues: number[];
        paceValues: number[];
        sessions: number;
      }
    >();

    trendActivities.forEach((a) => {
      const ws = getWeekStart(new Date(a.startDate));
      const key = ws.toISOString().split("T")[0];
      const existing = weekMap.get(key) ?? {
        distanceKm: 0,
        hrValues: [],
        paceValues: [],
        sessions: 0,
      };

      existing.distanceKm += a.distanceMeters / 1000;
      if (a.averageHeartrate) existing.hrValues.push(a.averageHeartrate);
      if (a.averageSpeed > 0) existing.paceValues.push(1000 / a.averageSpeed);
      existing.sessions += 1;
      weekMap.set(key, existing);
    });

    const weeklyTrend: WeeklyTrendPoint[] = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        distanceKm: parseFloat(data.distanceKm.toFixed(2)),
        avgHr:
          data.hrValues.length > 0
            ? Math.round(
                data.hrValues.reduce((s, v) => s + v, 0) / data.hrValues.length
              )
            : null,
        avgPaceSec:
          data.paceValues.length > 0
            ? Math.round(
                data.paceValues.reduce((s, v) => s + v, 0) /
                  data.paceValues.length
              )
            : null,
        sessions: data.sessions,
      }));

    // Serialize BigInt as string
    const serializedActivities: ActivityData[] = activities.map((a) => ({
      ...a,
      stravaId: a.stravaId.toString(),
      startDate: a.startDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
      splitsJson: a.splitsJson as ActivityData["splitsJson"],
    }));

    return NextResponse.json({
      activities: serializedActivities,
      weeklySummary,
      weeklyTrend,
    });
  } catch (error) {
    console.error("[GET /api/activities] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
