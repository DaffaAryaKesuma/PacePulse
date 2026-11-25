import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { getGeminiFeedback } from "@/lib/gemini";
import { getValidUserStravaToken, fetchStravaActivity } from "@/lib/strava";
import {
  fetchRunEnvironment,
  computeTrafficFrictionScore,
  computeEasyRunDisciplineScore,
} from "@/lib/environment";
import { speedToPace, cadenceToSpm } from "@/lib/formatting";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

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
    const activity = await prisma.activity.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    let splitsJson = activity.splitsJson as unknown as Array<{
      split: number;
      average_speed: number;
      average_heartrate?: number;
      elevation_difference?: number;
      moving_time: number;
    }> | null;
    let gearName = activity.gearName;
    let temperatureC = activity.temperatureC;
    let humidityPct = activity.humidityPct;
    let aqi = activity.aqi;
    let trafficFrictionScore = activity.trafficFrictionScore;
    let easyRunDisciplineScore = activity.easyRunDisciplineScore;

    // Backfill splits, gear, and Open-Meteo weather/AQI if missing on older imported runs
    if (!splitsJson || temperatureC === null || aqi === null) {
      try {
        const accessToken = await getValidUserStravaToken(user);
        const detail = await fetchStravaActivity(activity.stravaId.toString(), accessToken);

        if (!splitsJson && detail.splits_metric) {
          splitsJson = detail.splits_metric;
        }
        if (!gearName && detail.gear?.name) {
          gearName = detail.gear.name;
        }
        trafficFrictionScore = computeTrafficFrictionScore(
          detail.elapsed_time,
          detail.moving_time,
          detail.splits_metric
        );
        easyRunDisciplineScore = computeEasyRunDisciplineScore(
          activity.trainingPhase,
          detail.average_heartrate ?? activity.averageHeartrate,
          user.thresholdHr,
          user.maxHr
        );

        if ((temperatureC === null || aqi === null) && detail.start_latlng && detail.start_latlng.length >= 2) {
          const env = await fetchRunEnvironment(
            detail.start_latlng[0],
            detail.start_latlng[1],
            detail.start_date
          );
          temperatureC = env.temperatureC ?? temperatureC;
          humidityPct = env.humidityPct ?? humidityPct;
          aqi = env.aqi ?? aqi;
        }
      } catch (backfillErr) {
        console.warn(`[Re-Analyze] Strava/Open-Meteo backfill skipped for ${activity.id}:`, backfillErr);
      }
    }

    const distanceKm = activity.distanceMeters / 1000;
    const avgPace = speedToPace(activity.averageSpeed);
    const cadenceSpm = cadenceToSpm(activity.averageCadence);

    const feedback = await getGeminiFeedback(
      {
        name: activity.name,
        distanceKm,
        avgPace,
        avgHr: activity.averageHeartrate,
        maxHr: activity.maxHeartrate,
        cadenceSpm,
        elevationGain: activity.totalElevationGain,
        splits: splitsJson || undefined,
        trainingPhase: activity.trainingPhase,
        temperatureC,
        humidityPct,
        aqi,
        trafficFrictionScore,
        easyRunDisciplineScore,
        contextTags: activity.contextTags,
      },
      {
        fullName: user.fullName,
        goalDistance: user.goalDistance,
        goalTimeSec: user.goalTimeSec,
        currentPbSec: user.currentPbSec,
        thresholdHr: user.thresholdHr,
        maxHr: user.maxHr,
        thresholdPaceSec: user.thresholdPaceSec,
        trainingPhase: user.trainingPhase,
        preferredLanguage: activeLanguage,
      }
    );

    const updated = await prisma.activity.update({
      where: { id: activity.id },
      data: {
        aiFeedback: feedback,
        splitsJson: splitsJson
          ? (splitsJson as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        gearName,
        temperatureC,
        humidityPct,
        aqi,
        trafficFrictionScore,
        easyRunDisciplineScore,
      },
    });

    return NextResponse.json({
      success: true,
      aiFeedback: updated.aiFeedback,
    });
  } catch (err) {
    console.error("[Re-Analyze] Error:", err);
    const raw = err instanceof Error ? err.message : String(err);
    const isIndonesian = user.preferredLanguage !== "en";

    let friendlyMessage = raw;
    if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED")) {
      friendlyMessage = isIndonesian
        ? "Kuota request Gemini AI Free Tier sementara habis (429). Tunggu beberapa saat atau coba lagi nanti."
        : "Gemini AI Free Tier quota exceeded (429). Please wait a moment or try again later.";
    } else if (raw.includes("503") || raw.includes("UNAVAILABLE")) {
      friendlyMessage = isIndonesian
        ? "Server Gemini AI sedang mengalami lonjakan trafik (503). Silakan coba lagi sebentar lagi."
        : "Gemini AI servers are experiencing high demand (503). Please try again shortly.";
    } else if (raw.toLowerCase().includes("timeout") || raw.toLowerCase().includes("aborted")) {
      friendlyMessage = isIndonesian
        ? "Koneksi ke Gemini AI melewati batas waktu. Silakan klik Analisis Ulang lagi."
        : "Request to Gemini AI timed out. Please click Re-Analyze again.";
    }

    return NextResponse.json(
      { error: "Failed to re-analyze activity", details: friendlyMessage },
      { status: 500 }
    );
  }
}
