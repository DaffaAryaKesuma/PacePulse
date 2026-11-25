import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getValidUserStravaToken } from "@/lib/strava";
import { syncUserPersonalBests } from "@/lib/pb-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let accessToken: string | null = null;
    try {
      accessToken = await getValidUserStravaToken(user);
    } catch {
      // Proceed with DB-only PB scan if Strava token refresh fails
    }

    const pbs = await syncUserPersonalBests(user.id, accessToken);

    return NextResponse.json({
      success: true,
      personalBests: pbs.map((pb) => ({
        id: pb.id,
        distanceKey: pb.distanceKey,
        timeSeconds: pb.timeSeconds,
        paceSecPerKm: pb.paceSecPerKm,
        activityId: pb.activityId,
        activityName: pb.activityName,
        achievedAt: pb.achievedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[POST /api/activities/pb-refresh] Error:", err);
    return NextResponse.json(
      { error: "Failed to refresh personal bests" },
      { status: 500 }
    );
  }
}
