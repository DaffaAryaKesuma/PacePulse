import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getValidUserStravaToken, fetchStravaActivity } from "@/lib/strava";
import { getGeminiFeedback } from "@/lib/gemini";
import { syncUserPersonalBests } from "@/lib/pb-sync";
import {
  fetchRunEnvironment,
  computeTrafficFrictionScore,
  computeEasyRunDisciplineScore,
} from "@/lib/environment";
import {
  speedToPace,
  metersToKm,
  formatDuration,
  cadenceToSpm,
  determineTrainingPhase,
} from "@/lib/formatting";
import type { StravaWebhookEvent } from "@/types";

export const dynamic = "force-dynamic";

// --- GET: Strava Webhook Subscription Handshake ---
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.STRAVA_VERIFY_TOKEN &&
    challenge
  ) {
    return NextResponse.json({ "hub.challenge": challenge }, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// --- POST: Multi-User Strava Webhook Event Handler ---
export async function POST(request: NextRequest) {
  let body: StravaWebhookEvent;

  try {
    body = (await request.json()) as StravaWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acknowledge immediately (<2 seconds SLA required by Strava)
  const response = NextResponse.json({ received: true }, { status: 200 });

  // Process activity creation events asynchronously (kept alive on serverless via waitUntil)
  if (
    body.object_type === "activity" &&
    body.aspect_type === "create" &&
    body.object_id &&
    body.owner_id
  ) {
    waitUntil(
      processMultiUserActivity(body.owner_id, body.object_id).catch((err: unknown) => {
        console.error("[Strava Webhook] Asynchronous processing error:", err);
      })
    );
  }

  return response;
}

async function processMultiUserActivity(ownerId: number, activityId: number): Promise<void> {
  console.log(`[Strava Webhook] Event received for Athlete ${ownerId}, Activity ${activityId}`);

  // 1. Identify User in database by Strava Athlete ID
  const user = await prisma.user.findUnique({
    where: { stravaAthleteId: BigInt(ownerId) },
  });

  if (!user) {
    console.log(`[Strava Webhook] Athlete ${ownerId} is not registered on PacePulse. Skipping.`);
    return;
  }

  // 2. Obtain valid Strava access token (auto-refreshes if needed)
  const accessToken = await getValidUserStravaToken(user);

  // 3. Fetch full Strava activity details
  const activity = await fetchStravaActivity(activityId, accessToken);

  const activityType = activity.sport_type || activity.type;
  if (activityType !== "Run") {
    console.log(`[Strava Webhook] Skipping non-run activity: ${activityType}`);
    return;
  }

  // 4. Calculate metrics
  const distanceKm = activity.distance / 1000;
  const avgPace = speedToPace(activity.average_speed);
  const cadenceSpm = cadenceToSpm(activity.average_cadence);
  const trainingPhase = determineTrainingPhase(
    activity.average_heartrate,
    activity.average_speed
  );

  const resolvedPhase =
    user.trainingPhase && user.trainingPhase !== "auto"
      ? user.trainingPhase
      : trainingPhase;
  const gearName = activity.gear?.name ?? null;
  const trafficFrictionScore = computeTrafficFrictionScore(
    activity.elapsed_time,
    activity.moving_time,
    activity.splits_metric
  );
  const easyRunDisciplineScore = computeEasyRunDisciplineScore(
    resolvedPhase,
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

  // 5. Evaluate session with Gemini AI using Sports Science Knowledge Base and user's profile
  let aiFeedback = "";
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
        trainingPhase: resolvedPhase,
        temperatureC: env.temperatureC,
        humidityPct: env.humidityPct,
        aqi: env.aqi,
        trafficFrictionScore,
        easyRunDisciplineScore,
        contextTags: [],
      },
      {
        fullName: user.fullName,
        goalDistance: user.goalDistance,
        goalTimeSec: user.goalTimeSec,
        currentPbSec: user.currentPbSec,
        thresholdHr: user.thresholdHr,
        maxHr: user.maxHr,
        thresholdPaceSec: user.thresholdPaceSec,
        trainingPhase: resolvedPhase,
        preferredLanguage: user.preferredLanguage,
      }
    );
  } catch (err) {
    console.error("[Strava Webhook] Gemini AI coaching evaluation error:", err);
    aiFeedback = "AI sports science analysis pending generation.";
  }

  // 6. Upsert Activity record tied to this User
  await prisma.activity.upsert({
    where: { stravaId: BigInt(activity.id) },
    update: {
      name: activity.name,
      aiFeedback,
      trainingPhase: resolvedPhase,
      workoutType: activity.workout_type ?? null,
      gearName,
      temperatureC: env.temperatureC,
      humidityPct: env.humidityPct,
      aqi: env.aqi,
      trafficFrictionScore,
      easyRunDisciplineScore,
      userId: user.id,
    },
    create: {
      stravaId: BigInt(activity.id),
      name: activity.name,
      type: activityType,
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
      trainingPhase: resolvedPhase,
      workoutType: activity.workout_type ?? null,
      gearName,
      temperatureC: env.temperatureC,
      humidityPct: env.humidityPct,
      aqi: env.aqi,
      trafficFrictionScore,
      easyRunDisciplineScore,
      userId: user.id,
    },
  });

  console.log(`[Strava Webhook] Activity ${activity.id} saved for User ${user.fullName} (${user.id})`);

  // Sync Personal Bests in case this run set a new PB
  try {
    await syncUserPersonalBests(user.id, accessToken);
  } catch (pbErr) {
    console.warn("[Strava Webhook] Personal Best sync warning:", pbErr);
  }
}
