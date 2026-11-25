import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getGeminiFeedback } from "@/lib/gemini";
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
        splits: (activity.splitsJson as unknown as Array<{
          split: number;
          average_speed: number;
          average_heartrate?: number;
          elevation_difference?: number;
          moving_time: number;
        }>) || undefined,
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
      }
    );

    const updated = await prisma.activity.update({
      where: { id: activity.id },
      data: { aiFeedback: feedback },
    });

    return NextResponse.json({
      success: true,
      aiFeedback: updated.aiFeedback,
    });
  } catch (err) {
    console.error("[Re-Analyze] Error:", err);
    return NextResponse.json(
      { error: "Failed to re-analyze activity", details: String(err) },
      { status: 500 }
    );
  }
}
