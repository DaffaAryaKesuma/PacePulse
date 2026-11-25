import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  refreshStravaToken,
  fetchStravaActivities,
  fetchStravaActivity,
} from "@/lib/strava";
import { getGeminiFeedback } from "@/lib/gemini";
import {
  speedToPace,
  cadenceToSpm,
  determineTrainingPhase,
} from "@/lib/formatting";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Validate admin secret
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get fresh Strava access token
    const accessToken = await refreshStravaToken();

    // 2. Fetch last 10 activities from Strava
    const activities = await fetchStravaActivities(accessToken, 10, 1);

    // Filter only runs
    const runs = activities.filter(
      (a) => (a.sport_type || a.type) === "Run"
    );

    const results: Array<{ id: number; name: string; status: string }> = [];

    // Find or initialize a default athlete user for manual admin sync
    let targetUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          stravaAthleteId: BigInt("168998449"),
          username: "athlete",
          fullName: "Featured Athlete",
          stravaAccessToken: accessToken,
          stravaRefreshToken: process.env.STRAVA_REFRESH_TOKEN || "fallback",
          tokenExpiresAt: Math.floor(Date.now() / 1000) + 21600,
          goalDistance: "Half Marathon",
          goalTimeSec: 6300,
          currentPbSec: 7448,
          thresholdHr: 173,
          maxHr: 190,
          thresholdPaceSec: 280,
          trainingPhase: "Base",
          isPublic: true,
        },
      });
    }

    const athleteProfile = {
      goalDistance: targetUser.goalDistance,
      goalTimeSec: targetUser.goalTimeSec,
      currentPbSec: targetUser.currentPbSec,
      thresholdHr: targetUser.thresholdHr,
      maxHr: targetUser.maxHr,
      thresholdPaceSec: targetUser.thresholdPaceSec,
      trainingPhase: targetUser.trainingPhase,
    };

    // 3. Process each run
    for (const runSummary of runs) {
      try {
        // Fetch full activity details (includes splits)
        const activity = await fetchStravaActivity(
          runSummary.id,
          accessToken
        );

        const distanceKm = activity.distance / 1000;
        const avgPace = speedToPace(activity.average_speed);
        const cadenceSpm = cadenceToSpm(activity.average_cadence);
        const trainingPhase = targetUser.trainingPhase || determineTrainingPhase(
          activity.average_heartrate,
          activity.average_speed
        );

        // Get AI feedback
        let aiFeedback = "";
        try {
          aiFeedback = await getGeminiFeedback({
            name: activity.name,
            distanceKm,
            avgPace,
            avgHr: activity.average_heartrate ?? null,
            maxHr: activity.max_heartrate ?? null,
            cadenceSpm,
            elevationGain: activity.total_elevation_gain ?? null,
            splits: activity.splits_metric,
          }, athleteProfile);
        } catch (aiErr) {
          console.error(`[Sync] Gemini error for activity ${activity.id}:`, aiErr);
          aiFeedback = "AI analysis pending — rate limit or configuration issue.";
        }

        // Upsert to database
        await prisma.activity.upsert({
          where: { stravaId: BigInt(activity.id) },
          update: {
            name: activity.name,
            aiFeedback,
            trainingPhase,
            userId: targetUser.id,
          },
          create: {
            userId: targetUser.id,
            stravaId: BigInt(activity.id),
            name: activity.name,
            type: activity.sport_type || activity.type,
            startDate: new Date(activity.start_date),
            distanceMeters: activity.distance,
            movingTimeSec: activity.moving_time,
            elapsedTimeSec: activity.elapsed_time,
            averageSpeed: activity.average_speed,
            maxSpeed: activity.max_speed ?? null,
            averageHeartrate: activity.average_heartrate ?? null,
            maxHeartrate: activity.max_heartrate ?? null,
            averageCadence: activity.average_cadence ?? null,
            totalElevationGain: activity.total_elevation_gain ?? null,
            splitsJson: activity.splits_metric
              ? (activity.splits_metric as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            aiFeedback,
            trainingPhase,
          },
        });

        results.push({ id: activity.id, name: activity.name, status: "synced" });

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (err) {
        console.error(`[Sync] Error processing activity ${runSummary.id}:`, err);
        results.push({
          id: runSummary.id,
          name: runSummary.name,
          status: "error",
        });
      }
    }

    return NextResponse.json({
      message: `Synced ${results.filter((r) => r.status === "synced").length}/${runs.length} activities`,
      results,
    });
  } catch (error) {
    console.error("[POST /api/activities/sync-manual] Error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}
