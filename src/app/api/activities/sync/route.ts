import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import {
  getValidUserStravaToken,
  fetchStravaAthlete,
  fetchStravaActivities,
  fetchStravaActivity,
  type StravaActivity,
} from "@/lib/strava";
import { getGeminiFeedback } from "@/lib/gemini";
import { syncUserPersonalBests } from "@/lib/pb-sync";
import {
  fetchRunEnvironment,
  computeTrafficFrictionScore,
  computeEasyRunDisciplineScore,
} from "@/lib/environment";
import {
  speedToPace,
  cadenceToSpm,
  determineTrainingPhase,
} from "@/lib/formatting";

export const dynamic = "force-dynamic";

const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);

function isPendingOrEmpty(text: string | null | undefined): boolean {
  if (!text) return true;
  const norm = text.trim().toLowerCase();
  return (
    norm === "" ||
    norm.startsWith("ai analysis pending") ||
    norm.startsWith("ai sports science analysis pending")
  );
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please login with Strava." },
      { status: 401 }
    );
  }

  let bodyLanguage: "id" | "en" | undefined;
  try {
    const body = (await request.json()) as { language?: unknown };
    if (body.language === "id" || body.language === "en") {
      bodyLanguage = body.language;
    }
  } catch {
    // Empty body is fine
  }
  const activeLanguage: "id" | "en" =
    bodyLanguage ?? (user.preferredLanguage === "en" ? "en" : "id");

  try {
    // 1. Fresh Strava access token
    const accessToken = await getValidUserStravaToken(user);

    // 2. Fetch master gear/shoes from GET /api/v3/athlete
    const gearMap: Record<string, string> = {};
    let totalGear = 0;
    try {
      const athleteProfile = await fetchStravaAthlete(accessToken);
      const shoes = athleteProfile.shoes ?? [];
      totalGear = shoes.length;

      await Promise.all(
        shoes
          .filter((s) => s.id && s.name)
          .map((shoe) => {
            gearMap[shoe.id] = shoe.name;
            return prisma.gear.upsert({
              where: { stravaGearId: shoe.id },
              update: {
                name: shoe.name,
                distanceKm: Math.round((shoe.distance / 1000) * 10) / 10,
                primary: Boolean(shoe.primary),
                userId: user.id,
              },
              create: {
                stravaGearId: shoe.id,
                name: shoe.name,
                distanceKm: Math.round((shoe.distance / 1000) * 10) / 10,
                primary: Boolean(shoe.primary),
                userId: user.id,
              },
            });
          })
      );
    } catch (gearErr) {
      console.warn("[User Sync] Could not fetch Strava athlete shoes:", gearErr);
    }

    // 3. Full pagination loop (per_page=200) until Strava returns empty array
    const allRuns: StravaActivity[] = [];
    let page = 1;
    while (page <= 25) {
      const batch = await fetchStravaActivities(accessToken, 200, page);
      if (!batch || batch.length === 0) break;

      for (const act of batch) {
        const sport = act.sport_type || act.type;
        if (RUN_TYPES.has(sport)) {
          allRuns.push(act);
        }
      }

      if (batch.length < 200) break;
      page += 1;
    }

    allRuns.sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );

    const totalFetched = allRuns.length;

    // 4. Fetch existing activities in one query
    const existingRows = await prisma.activity.findMany({
      where: { userId: user.id },
      select: {
        stravaId: true,
        aiFeedback: true,
        gearName: true,
        contextTags: true,
      },
    });

    const existingMap = new Map<
      string,
      {
        aiFeedback: string | null;
        gearName: string | null;
        contextTags: string[];
      }
    >();
    for (const row of existingRows) {
      existingMap.set(row.stravaId.toString(), {
        aiFeedback: row.aiFeedback,
        gearName: row.gearName,
        contextTags: row.contextTags,
      });
    }

    // 5. Fast single-query bulk insert for newly imported runs + gear backfill for existing runs
    const newRunsData: Prisma.ActivityCreateManyInput[] = [];
    const gearBackfills: Array<{ stravaId: bigint; gearName: string }> = [];

    for (const run of allRuns) {
      const idKey = run.id.toString();
      const existing = existingMap.get(idKey);
      const sport = run.sport_type || run.type || "Run";
      const trainingPhase =
        user.trainingPhase && user.trainingPhase !== "auto"
          ? user.trainingPhase
          : determineTrainingPhase(run.average_heartrate, run.average_speed);

      const resolvedGear =
        (run.gear_id ? gearMap[run.gear_id] : null) ??
        existing?.gearName ??
        null;

      if (!existing) {
        newRunsData.push({
          stravaId: BigInt(run.id),
          name: run.name,
          type: sport,
          startDate: new Date(run.start_date),
          distanceMeters: run.distance,
          movingTimeSec: run.moving_time,
          elapsedTimeSec: run.elapsed_time,
          averageSpeed: run.average_speed,
          maxSpeed: run.max_speed ?? null,
          averageHeartrate: run.average_heartrate ?? null,
          maxHeartrate: run.max_heartrate ?? null,
          averageCadence: run.average_cadence ?? null,
          totalElevationGain: run.total_elevation_gain ?? null,
          splitsJson: Prisma.JsonNull,
          aiFeedback: "AI analysis pending.",
          trainingPhase,
          workoutType: run.workout_type ?? null,
          gearName: resolvedGear,
          trafficFrictionScore: computeTrafficFrictionScore(
            run.elapsed_time,
            run.moving_time,
            null
          ),
          easyRunDisciplineScore: computeEasyRunDisciplineScore(
            trainingPhase,
            run.average_heartrate,
            user.thresholdHr,
            user.maxHr
          ),
          userId: user.id,
        });
      } else if (!existing.gearName && resolvedGear) {
        gearBackfills.push({
          stravaId: BigInt(run.id),
          gearName: resolvedGear,
        });
      }
    }

    const newlyImported = newRunsData.length;

    if (newRunsData.length > 0) {
      await prisma.activity.createMany({
        data: newRunsData,
        skipDuplicates: true,
      });
    }

    if (gearBackfills.length > 0) {
      const CHUNK = 20;
      for (let i = 0; i < gearBackfills.length; i += CHUNK) {
        await Promise.all(
          gearBackfills.slice(i, i + CHUNK).map((b) =>
            prisma.activity.update({
              where: { stravaId: b.stravaId },
              data: { gearName: b.gearName },
            })
          )
        );
      }
    }

    // 6. Enrich details (splits_metric + weather/AQI + Gemini AI) for up to 3 newest un-analyzed runs
    const runsToEnrich = allRuns
      .filter((run) => {
        const existing = existingMap.get(run.id.toString());
        return !existing || isPendingOrEmpty(existing.aiFeedback);
      })
      .slice(0, 3);

    let aiUnavailable = false;
    for (const runSummary of runsToEnrich) {
      try {
        const activity = await fetchStravaActivity(runSummary.id, accessToken);
        const existing = existingMap.get(runSummary.id.toString());

        const distanceKm = activity.distance / 1000;
        const avgPace = speedToPace(activity.average_speed);
        const cadenceSpm = cadenceToSpm(activity.average_cadence);
        const trainingPhase =
          user.trainingPhase && user.trainingPhase !== "auto"
            ? user.trainingPhase
            : determineTrainingPhase(activity.average_heartrate, activity.average_speed);

        const gearName =
          activity.gear?.name ??
          (activity.gear_id ? gearMap[activity.gear_id] : null) ??
          existing?.gearName ??
          null;

        const trafficFrictionScore = computeTrafficFrictionScore(
          activity.elapsed_time,
          activity.moving_time,
          activity.splits_metric
        );

        const easyRunDisciplineScore = computeEasyRunDisciplineScore(
          trainingPhase,
          activity.average_heartrate,
          user.thresholdHr,
          user.maxHr
        );

        const env =
          activity.start_latlng && activity.start_latlng.length >= 2
            ? await fetchRunEnvironment(
                activity.start_latlng[0],
                activity.start_latlng[1],
                activity.start_date
              )
            : { temperatureC: null, humidityPct: null, aqi: null };

        let aiFeedback = "AI analysis pending.";
        if (!aiUnavailable) {
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
                trainingPhase,
                temperatureC: env.temperatureC,
                humidityPct: env.humidityPct,
                aqi: env.aqi,
                trafficFrictionScore,
                easyRunDisciplineScore,
                contextTags: existing?.contextTags ?? [],
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
                preferredLanguage: activeLanguage,
              }
            );
          } catch (aiErr) {
            console.error(`[User Sync] Gemini error for ${activity.id}:`, aiErr);
            aiUnavailable = true;
          }
        }

        await prisma.activity.update({
          where: { stravaId: BigInt(activity.id) },
          data: {
            splitsJson: activity.splits_metric
              ? (activity.splits_metric as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            gearName,
            temperatureC: env.temperatureC,
            humidityPct: env.humidityPct,
            aqi: env.aqi,
            trafficFrictionScore,
            easyRunDisciplineScore,
            aiFeedback,
          },
        });
      } catch (enrichErr) {
        console.warn(`[User Sync] Enrichment failed for ${runSummary.id}:`, enrichErr);
      }
    }

    // 7. Sync All-Time Personal Bests & auto-update user.currentPbSec
    try {
      await syncUserPersonalBests(user.id, accessToken);
    } catch (pbErr) {
      console.warn("[User Sync] Personal Best sync warning:", pbErr);
    }

    const isId = activeLanguage !== "en";
    const message = isId
      ? `Sinkronisasi selesai: ${totalFetched} lari diambil (${newlyImported} baru), ${totalGear} sepatu.`
      : `Sync complete: ${totalFetched} runs fetched (${newlyImported} newly imported), ${totalGear} gear.`;

    return NextResponse.json({
      message,
      totalFetched,
      newlyImported,
      totalGear,
    });
  } catch (err) {
    console.error("[User Sync] Error:", err);
    return NextResponse.json(
      { error: "Failed to sync runs from Strava.", details: String(err) },
      { status: 500 }
    );
  }
}
