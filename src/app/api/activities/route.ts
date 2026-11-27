import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeekStart } from "@/lib/formatting";
import { getSessionUser } from "@/lib/auth";
import type { ActivityData, WeeklySummary, WeeklyTrendPoint } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUsername = searchParams.get("username");
    const requestedUserId = searchParams.get("userId");
    const limitParam = parseInt(searchParams.get("limit") || "", 10);
    const activityLimit = !Number.isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 500;

    // 1. Resolve target User
    let targetUser = null;

    if (requestedUsername) {
      targetUser = await prisma.user.findUnique({
        where: { username: requestedUsername },
      });
    } else if (requestedUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: requestedUserId },
      });
    } else {
      // Try to get session user
      targetUser = await getSessionUser();

      // If not logged in, fallback to first public user or main athlete for showcase
      if (!targetUser) {
        targetUser = await prisma.user.findFirst({
          where: { isPublic: true },
          orderBy: { createdAt: "asc" },
        });
      }
    }

    if (!targetUser) {
      return NextResponse.json({
        activities: [],
        weeklySummary: {
          totalDistanceKm: 0,
          avgHeartrate: null,
          sessionCount: 0,
          weekStart: getWeekStart().toISOString(),
        },
        weeklyTrend: [],
        athlete: null,
      });
    }

    // 2. Fetch run activities, total count, master gear & personal bests for this user
    const [activities, totalActivities, gears, personalBests] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId: targetUser.id,
          type: { in: ["Run", "TrailRun", "VirtualRun"] },
        },
        orderBy: { startDate: "desc" },
        take: activityLimit,
      }),
      prisma.activity.count({
        where: {
          userId: targetUser.id,
          type: { in: ["Run", "TrailRun", "VirtualRun"] },
        },
      }),
      prisma.gear.findMany({
        where: { userId: targetUser.id },
        orderBy: [{ primary: "desc" }, { distanceKm: "desc" }],
      }),
      prisma.personalBest.findMany({
        where: { userId: targetUser.id },
      }),
    ]);

    // 3. Weekly summary (current week)
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

    // 4. Weekly trend (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const trendActivities = activities.filter(
      (a) => new Date(a.startDate) >= eightWeeksAgo
    );

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
      if (a.averageSpeed > 0) {
        const paceSec = 1000 / a.averageSpeed;
        if (paceSec <= 900) {
          existing.paceValues.push(paceSec);
        }
      }
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

    // Serialize BigInt and Dates
    const serializedActivities: ActivityData[] = activities.map((a) => ({
      ...a,
      stravaId: a.stravaId.toString(),
      startDate: a.startDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
      splitsJson: a.splitsJson as ActivityData["splitsJson"],
    }));

    return NextResponse.json({
      activities: serializedActivities,
      totalActivities,
      weeklySummary,
      weeklyTrend,
      gears: gears.map((g) => ({
        id: g.id,
        stravaGearId: g.stravaGearId,
        name: g.name,
        distanceKm: g.distanceKm,
        primary: g.primary,
      })),
      personalBests: personalBests.map((pb) => ({
        id: pb.id,
        distanceKey: pb.distanceKey,
        timeSeconds: pb.timeSeconds,
        paceSecPerKm: pb.paceSecPerKm,
        activityId: pb.activityId,
        activityName: pb.activityName,
        achievedAt: pb.achievedAt.toISOString(),
      })),
      athlete: {
        id: targetUser.id,
        username: targetUser.username,
        fullName: targetUser.fullName,
        avatarUrl: targetUser.avatarUrl,
        goalDistance: targetUser.goalDistance,
        goalTimeSec: targetUser.goalTimeSec,
        currentPbSec: targetUser.currentPbSec,
        thresholdHr: targetUser.thresholdHr,
        maxHr: targetUser.maxHr,
        restingHr: targetUser.restingHr,
        manualLt1Hr: targetUser.manualLt1Hr,
        manualLt2Hr: targetUser.manualLt2Hr,
        manualThresholdPace: targetUser.manualThresholdPace,
        thresholdPaceSec: targetUser.thresholdPaceSec,
        trainingPhase: targetUser.trainingPhase,
        targetRaceDate: targetUser.targetRaceDate ? targetUser.targetRaceDate.toISOString() : null,
        isPublic: targetUser.isPublic,
        preferredLanguage: targetUser.preferredLanguage,
        retiredGearNames: targetUser.retiredGearNames ?? [],
      },
    });
  } catch (error) {
    console.error("[GET /api/activities] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
