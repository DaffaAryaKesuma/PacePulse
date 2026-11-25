import { prisma } from "./prisma";
import { fetchStravaActivity } from "./strava";

export type PbDistanceKey = "1K" | "5K" | "10K" | "HM" | "FM";

interface PbCandidate {
  distanceKey: PbDistanceKey;
  timeSeconds: number;
  paceSecPerKm: number;
  activityId: string;
  activityName: string;
  achievedAt: Date;
}

const TARGET_METERS: Record<PbDistanceKey, number> = {
  "1K": 1000,
  "5K": 5000,
  "10K": 10000,
  "HM": 21097.5,
  "FM": 42195,
};

const MIN_QUALIFYING_METERS: Record<PbDistanceKey, number> = {
  "1K": 1000,
  "5K": 5000,
  "10K": 10000,
  "HM": 21000,
  "FM": 42000,
};

function mapBestEffortName(name: string): PbDistanceKey | null {
  const n = name.trim().toLowerCase();
  if (n === "1k" || n === "1 km") return "1K";
  if (n === "5k" || n === "5 km") return "5K";
  if (n === "10k" || n === "10 km") return "10K";
  if (n === "half-marathon" || n === "half marathon") return "HM";
  if (n === "marathon") return "FM";
  return null;
}

function mapGoalDistanceToKey(goalDistance: string | null | undefined): PbDistanceKey | null {
  const g = (goalDistance || "").trim().toLowerCase();
  if (g === "5k") return "5K";
  if (g === "10k") return "10K";
  if (g === "half marathon" || g === "hm") return "HM";
  if (g === "marathon" || g === "fm") return "FM";
  return null;
}

/**
 * Scans all user running activities + Strava best_efforts on up to 8 fastest
 * qualifying runs to upsert All-Time Personal Bests and auto-sync user.currentPbSec.
 */
export async function syncUserPersonalBests(
  userId: string,
  accessToken?: string | null
) {
  const [user, activities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, goalDistance: true, currentPbSec: true },
    }),
    prisma.activity.findMany({
      where: {
        userId,
        type: { in: ["Run", "TrailRun", "VirtualRun"] },
        distanceMeters: { gte: 1000 },
        movingTimeSec: { gte: 120 },
      },
      orderBy: { averageSpeed: "desc" },
    }),
  ]);

  if (!user || activities.length === 0) {
    return [];
  }

  const bestByKey = new Map<PbDistanceKey, PbCandidate>();

  const considerCandidate = (candidate: PbCandidate) => {
    if (candidate.timeSeconds <= 0 || candidate.paceSecPerKm <= 0) return;
    const prev = bestByKey.get(candidate.distanceKey);
    if (!prev || candidate.timeSeconds < prev.timeSeconds) {
      bestByKey.set(candidate.distanceKey, candidate);
    }
  };

  // 1. Scan all activities in DB for whole-run candidates
  const keys: PbDistanceKey[] = ["1K", "5K", "10K", "HM", "FM"];
  for (const act of activities) {
    for (const key of keys) {
      if (act.distanceMeters >= MIN_QUALIFYING_METERS[key]) {
        const targetM = TARGET_METERS[key];
        const scaledTime = Math.round(act.movingTimeSec * (targetM / act.distanceMeters));
        const paceSecPerKm = Math.round(scaledTime / (targetM / 1000));
        considerCandidate({
          distanceKey: key,
          timeSeconds: scaledTime,
          paceSecPerKm,
          activityId: act.id,
          activityName: act.name,
          achievedAt: act.startDate,
        });
      }
    }
  }

  // 2. Inspect Strava best_efforts on up to 8 fastest qualifying runs (>= 5K)
  if (accessToken) {
    const fastestQualifying = activities
      .filter((a) => a.distanceMeters >= 5000)
      .slice(0, 8);

    const detailResults = await Promise.allSettled(
      fastestQualifying.map((act) =>
        fetchStravaActivity(act.stravaId.toString(), accessToken).then((detail) => ({
          act,
          detail,
        }))
      )
    );

    for (const res of detailResults) {
      if (res.status !== "fulfilled") continue;
      const { act, detail } = res.value;
      const efforts = detail.best_efforts ?? [];
      for (const effort of efforts) {
        const key = mapBestEffortName(effort.name);
        if (!key) continue;
        const sec = effort.moving_time > 0 ? effort.moving_time : effort.elapsed_time;
        if (!sec || sec <= 0) continue;
        const targetKm = TARGET_METERS[key] / 1000;
        const paceSecPerKm = Math.round(sec / targetKm);
        considerCandidate({
          distanceKey: key,
          timeSeconds: sec,
          paceSecPerKm,
          activityId: act.id,
          activityName: act.name,
          achievedAt: act.startDate,
        });
      }
    }
  }

  // 3. Upsert into PersonalBest table
  const savedPbs = await Promise.all(
    Array.from(bestByKey.values()).map((pb) =>
      prisma.personalBest.upsert({
        where: {
          userId_distanceKey: {
            userId,
            distanceKey: pb.distanceKey,
          },
        },
        update: {
          timeSeconds: pb.timeSeconds,
          paceSecPerKm: pb.paceSecPerKm,
          activityId: pb.activityId,
          activityName: pb.activityName,
          achievedAt: pb.achievedAt,
        },
        create: {
          userId,
          distanceKey: pb.distanceKey,
          timeSeconds: pb.timeSeconds,
          paceSecPerKm: pb.paceSecPerKm,
          activityId: pb.activityId,
          activityName: pb.activityName,
          achievedAt: pb.achievedAt,
        },
      })
    )
  );

  // 4. Auto-update user.currentPbSec if matching goalDistance PB is faster (or unset)
  const targetKey = mapGoalDistanceToKey(user.goalDistance);
  if (targetKey) {
    const targetPb = bestByKey.get(targetKey);
    if (
      targetPb &&
      (!user.currentPbSec || targetPb.timeSeconds < user.currentPbSec)
    ) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentPbSec: targetPb.timeSeconds },
      });
    }
  }

  return savedPbs;
}
