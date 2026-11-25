import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getValidUserStravaToken, fetchStravaActivity } from "@/lib/strava";
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

  // Process activity creation events asynchronously
  if (
    body.object_type === "activity" &&
    body.aspect_type === "create" &&
    body.object_id &&
    body.owner_id
  ) {
    processMultiUserActivity(body.owner_id, body.object_id).catch((err: unknown) => {
      console.error("[Strava Webhook] Asynchronous processing error:", err);
    });
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
      },
      {
        fullName: user.fullName,
        goalDistance: user.goalDistance,
        goalTimeSec: user.goalTimeSec,
        currentPbSec: user.currentPbSec,
        thresholdHr: user.thresholdHr,
        maxHr: user.maxHr,
        thresholdPaceSec: user.thresholdPaceSec,
        trainingPhase: user.trainingPhase || trainingPhase,
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
      trainingPhase: user.trainingPhase || trainingPhase,
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
      trainingPhase: user.trainingPhase || trainingPhase,
      userId: user.id,
    },
  });

  console.log(`[Strava Webhook] Activity ${activity.id} saved for User ${user.fullName} (${user.id})`);

  // 7. Dispatch Discord Webhook notification if user has configured one or if main athlete
  const targetDiscordWebhook =
    user.discordWebhookUrl ||
    (user.stravaAthleteId === BigInt(168998449) ? process.env.DISCORD_WEBHOOK_URL : null);

  if (targetDiscordWebhook) {
    try {
      await sendDiscordNotification(
        {
          athleteName: user.fullName,
          activityName: activity.name,
          distanceKm: metersToKm(activity.distance),
          avgPace,
          avgHr: activity.average_heartrate ?? null,
          maxHr: activity.max_heartrate ?? null,
          cadenceSpm,
          elevationGain: activity.total_elevation_gain ?? null,
          duration: formatDuration(activity.moving_time),
          trainingPhase: user.trainingPhase || trainingPhase,
          aiFeedback,
          startDate: new Date(activity.start_date),
        },
        targetDiscordWebhook
      );
      console.log(`[Strava Webhook] Discord notification dispatched to athlete's webhook.`);
    } catch (discordErr) {
      console.error("[Strava Webhook] Discord dispatch error:", discordErr);
    }
  }
}
