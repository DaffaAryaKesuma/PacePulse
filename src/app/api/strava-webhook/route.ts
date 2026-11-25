import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { refreshStravaToken, fetchStravaActivity } from "@/lib/strava";
import { getGeminiFeedback } from "@/lib/gemini";
import { sendDiscordNotification } from "@/lib/discord";
import {
  speedToPace,
  metersToKm,
  formatDuration,
  cadenceToSpm,
  determineTrainingPhase,
} from "@/lib/formatting";
import type { StravaWebhookEvent } from "@/types";

export const dynamic = "force-dynamic";

// --- GET: Strava Webhook Verification ---
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

// --- POST: Strava Webhook Event Handler ---
export async function POST(request: NextRequest) {
  let body: StravaWebhookEvent;

  try {
    body = (await request.json()) as StravaWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Respond immediately to Strava (must be < 2 seconds)
  const responsePromise = NextResponse.json({ received: true }, { status: 200 });

  // Process event asynchronously
  if (
    body.object_type === "activity" &&
    body.aspect_type === "create" &&
    body.object_id
  ) {
    // Use waitUntil if available (Vercel Edge), otherwise fire-and-forget
    const processingPromise = processNewActivity(body.object_id).catch(
      (err: unknown) => {
        console.error("[Strava Webhook] Processing error:", err);
      }
    );

    // For Vercel serverless, attach to response lifecycle
    if (typeof (responsePromise as unknown as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil === "function") {
      (responsePromise as unknown as { waitUntil: (p: Promise<unknown>) => void }).waitUntil(processingPromise);
    }
  }

  return responsePromise;
}

async function processNewActivity(objectId: number): Promise<void> {
  console.log(`[Strava Webhook] Processing activity ${objectId}`);

  // 1. Get fresh Strava access token
  const accessToken = await refreshStravaToken();

  // 2. Fetch full activity details
  const activity = await fetchStravaActivity(objectId, accessToken);

  // Filter: only process runs
  const activityType = activity.sport_type || activity.type;
  if (activityType !== "Run") {
    console.log(`[Strava Webhook] Skipping non-run activity: ${activityType}`);
    return;
  }

  // 3. Prepare metrics for AI analysis
  const distanceKm = activity.distance / 1000;
  const avgPace = speedToPace(activity.average_speed);
  const cadenceSpm = cadenceToSpm(activity.average_cadence);
  const trainingPhase = determineTrainingPhase(
    activity.average_heartrate,
    activity.average_speed
  );

  // 4. Get Gemini AI feedback
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
    });
  } catch (err) {
    console.error("[Strava Webhook] Gemini AI error:", err);
    aiFeedback =
      "AI analysis unavailable for this session. Check your GEMINI_API_KEY configuration.";
  }

  // 5. Upsert activity to database
  await prisma.activity.upsert({
    where: { stravaId: BigInt(activity.id) },
    update: {
      name: activity.name,
      aiFeedback,
      trainingPhase,
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
      trainingPhase,
    },
  });

  console.log(`[Strava Webhook] Saved activity ${activity.id} to DB`);

  // 6. Send Discord notification
  try {
    await sendDiscordNotification({
      activityName: activity.name,
      distanceKm: metersToKm(activity.distance),
      avgPace,
      avgHr: activity.average_heartrate ?? null,
      maxHr: activity.max_heartrate ?? null,
      cadenceSpm,
      elevationGain: activity.total_elevation_gain ?? null,
      duration: formatDuration(activity.moving_time),
      trainingPhase,
      aiFeedback,
      startDate: new Date(activity.start_date),
    });
    console.log(`[Strava Webhook] Discord notification sent`);
  } catch (err) {
    console.error("[Strava Webhook] Discord notification error:", err);
    // Don't throw — notification failure shouldn't block the main flow
  }
}
