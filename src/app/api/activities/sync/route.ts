import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import {
  getValidUserStravaToken,
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

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please login with Strava." }, { status: 401 });
  }

  try {
    // 1. Get fresh token for this user
    const accessToken = await getValidUserStravaToken(user);

    // 2. Fetch last 10 activities from Strava
    const stravaList = await fetchStravaActivities(accessToken, 10, 1);
    const runs = stravaList.filter((a) => (a.sport_type || a.type) === "Run");

    const syncedResults: Array<{ id: number; name: string; status: string }> = [];

    // 3. Process each run
    for (const runSummary of runs) {
      try {
        const activity = await fetchStravaActivity(runSummary.id, accessToken);

        const distanceKm = activity.distance / 1000;
        const avgPace = speedToPace(activity.average_speed);
        const cadenceSpm = cadenceToSpm(activity.average_cadence);
        const trainingPhase = user.trainingPhase || determineTrainingPhase(
          activity.average_heartrate,
          activity.average_speed
        );

        // Check if already in DB and has valid aiFeedback (retry if previously pending/failed)
        const existing = await prisma.activity.findUnique({
          where: { stravaId: BigInt(activity.id) },
        });

        const isPendingOrEmpty =
          !existing?.aiFeedback ||
          existing.aiFeedback === "AI analysis pending." ||
          existing.aiFeedback === "AI sports science analysis pending generation.";

        let aiFeedback = existing?.aiFeedback || "";
        let calledGemini = false;
        if (isPendingOrEmpty) {
          calledGemini = true;
          try {
            aiFeedback = await getGeminiFeedback(
              {
                name: activity.name,
                distanceKm,
                avgPace,
                avgHr: activity.average_heartrate ?? null,
                maxHr: activity.max_heartrate ?? null,
                cadenceSpm,
                elevationGain: activity.total_elevation_gain ?? null,
                splits: activity.splits_metric,
              },
              {
                fullName: user.fullName,
                goalDistance: user.goalDistance,
                goalTimeSec: user.goalTimeSec,
                currentPbSec: user.currentPbSec,
                thresholdHr: user.thresholdHr,
                maxHr: user.maxHr,
                thresholdPaceSec: user.thresholdPaceSec,
                trainingPhase,
              }
            );
          } catch (aiErr) {
            console.error(`[User Sync] Gemini error for ${activity.id}:`, aiErr);
            aiFeedback = "AI analysis pending.";
          }
        }

        // Upsert activity tied to user
        await prisma.activity.upsert({
          where: { stravaId: BigInt(activity.id) },
          update: {
            name: activity.name,
            aiFeedback,
            trainingPhase,
            userId: user.id,
          },
          create: {
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
            userId: user.id,
          },
        });

        syncedResults.push({ id: activity.id, name: activity.name, status: "synced" });
        await new Promise((r) => setTimeout(r, calledGemini ? 1500 : 200));
      } catch (err) {
        console.error(`[User Sync] Error syncing activity ${runSummary.id}:`, err);
        syncedResults.push({ id: runSummary.id, name: runSummary.name, status: "error" });
      }
    }

    return NextResponse.json({
      message: `Successfully synchronized ${syncedResults.filter((r) => r.status === "synced").length}/${runs.length} runs from Strava!`,
      syncedCount: syncedResults.filter((r) => r.status === "synced").length,
    });
  } catch (err) {
    console.error("[User Sync] Error:", err);
    return NextResponse.json({ error: "Failed to sync runs from Strava.", details: String(err) }, { status: 500 });
  }
}
