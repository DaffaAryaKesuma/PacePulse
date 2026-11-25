import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      stravaAthleteId: user.stravaAthleteId.toString(),
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      goalDistance: user.goalDistance,
      goalTimeSec: user.goalTimeSec,
      currentPbSec: user.currentPbSec,
      thresholdHr: user.thresholdHr,
      maxHr: user.maxHr,
      thresholdPaceSec: user.thresholdPaceSec,
      trainingPhase: user.trainingPhase,
      targetRaceDate: user.targetRaceDate ? user.targetRaceDate.toISOString() : null,
      discordWebhookUrl: user.discordWebhookUrl ? "configured" : null,
      hasDiscordWebhook: Boolean(user.discordWebhookUrl),
      isPublic: user.isPublic,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
