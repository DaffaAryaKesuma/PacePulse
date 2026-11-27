import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { getWeekStart, formatDuration, speedToPace } from "./formatting";
import {
  calculateVdotPredictor,
  calculateAcwr,
  calculateShoeMileage,
  resolveActiveTrainingPhase,
  resolvePhysiologicalThresholds,
  type ResolvedTrainingPhase,
} from "./sports-analytics";
import type { ActivityData, WeeklyPlanDay } from "@/types";
import type { PlanGenerationContext } from "./gemini";

export async function buildUserPlanContext(user: User): Promise<{
  weekStart: Date;
  vdot: number | null;
  acwr: ReturnType<typeof calculateAcwr>;
  resolvedPhase: ResolvedTrainingPhase;
  planCtx: PlanGenerationContext;
}> {
  const weekStart = getWeekStart();

  const [dbActivities, dbGears] = await Promise.all([
    prisma.activity.findMany({
      where: { userId: user.id, type: { in: ["Run", "TrailRun", "VirtualRun"] } },
      orderBy: { startDate: "desc" },
      take: 80,
    }),
    prisma.gear.findMany({
      where: { userId: user.id },
      orderBy: [{ primary: "desc" }, { distanceKm: "desc" }],
    }),
  ]);

  const activities: ActivityData[] = dbActivities.map((a) => ({
    ...a,
    stravaId: a.stravaId.toString(),
    startDate: a.startDate.toISOString(),
    createdAt: a.createdAt.toISOString(),
    splitsJson: a.splitsJson as ActivityData["splitsJson"],
  }));

  const vdotResult = calculateVdotPredictor(activities);
  const acwr = calculateAcwr(activities);
  const resolvedPhase = resolveActiveTrainingPhase(user, activities, acwr);
  const shoes =
    dbGears.length > 0
      ? dbGears.map((g) => g.name)
      : calculateShoeMileage(activities).map((s) => s.gearName);

  const thresholds = resolvePhysiologicalThresholds(user, activities);
  const maxHr = thresholds.peakHr || 190;
  const lt2Hr = thresholds.lt2Hr || 173;
  const lt1Hr = thresholds.lt1Hr || Math.max(120, Math.round(lt2Hr * 0.84));

  const recentRuns = activities.slice(0, 7).map((a) => ({
    name: a.name,
    startDate: a.startDate.split("T")[0],
    distanceKm: Math.round((a.distanceMeters / 1000) * 10) / 10,
    avgPace: speedToPace(a.averageSpeed),
    avgHr: a.averageHeartrate ? Math.round(a.averageHeartrate) : null,
    easyRunDisciplineScore: a.easyRunDisciplineScore ?? null,
    trafficFrictionScore: a.trafficFrictionScore ?? null,
    temperatureC: a.temperatureC ?? null,
    contextTags: a.contextTags ?? [],
  }));

  const lastTwoHaveFatigueTag = recentRuns
    .slice(0, 2)
    .some(
      (r) =>
        r.contextTags.includes("heavy_legs") ||
        r.contextTags.includes("poor_sleep")
    );
  const deloadTriggered = acwr.ratio > 1.3 || lastTwoHaveFatigueTag;

  const baseChronic = acwr.chronicWeeklyAvgKm > 0 ? acwr.chronicWeeklyAvgKm : 20;
  const maxSafeWeeklyKm = deloadTriggered
    ? Math.max(10, Math.round(baseChronic * 0.8 * 10) / 10)
    : Math.max(12, Math.round(baseChronic * 1.1 * 10) / 10);

  const planCtx: PlanGenerationContext = {
    profile: {
      fullName: user.fullName,
      goalDistance: user.goalDistance,
      goalTimeSec: user.goalTimeSec,
      currentPbSec: user.currentPbSec,
      thresholdHr: lt2Hr,
      maxHr,
      thresholdPaceSec: user.thresholdPaceSec,
      trainingPhase: resolvedPhase.phase,
      preferredLanguage: user.preferredLanguage,
    },
    maxHr,
    lt1Hr,
    lt2Hr,
    targetRaceDistance: user.goalDistance || "General Fitness",
    targetRaceTime:
      !user.goalDistance || user.goalDistance === "General Fitness" || !user.goalTimeSec
        ? "Aerobic Base & Consistency"
        : formatDuration(user.goalTimeSec),
    vdot: vdotResult?.vdot ?? null,
    acwrRatio: acwr.ratio,
    acwrStatus: acwr.status,
    acuteKm: acwr.acuteKm,
    chronicWeeklyAvgKm: acwr.chronicWeeklyAvgKm,
    maxSafeWeeklyKm,
    deloadTriggered,
    shoes,
    recentRuns,
    language: user.preferredLanguage === "en" ? "en" : "id",
  };

  return {
    weekStart,
    vdot: vdotResult?.vdot ?? null,
    acwr,
    resolvedPhase,
    planCtx,
  };
}

export function normalizeStoredPlanJson(raw: unknown): {
  days: WeeklyPlanDay[];
  coachSummary: string | null;
  source: "gemini" | "engine";
} {
  if (Array.isArray(raw)) {
    return {
      days: raw as WeeklyPlanDay[],
      coachSummary: null,
      source: "engine",
    };
  }
  if (raw && typeof raw === "object" && "days" in raw) {
    const obj = raw as {
      days?: WeeklyPlanDay[];
      coachSummary?: string | null;
      source?: "gemini" | "engine";
    };
    return {
      days: Array.isArray(obj.days) ? obj.days : [],
      coachSummary: obj.coachSummary ?? null,
      source: obj.source === "gemini" ? "gemini" : "engine",
    };
  }
  return { days: [], coachSummary: null, source: "engine" };
}
