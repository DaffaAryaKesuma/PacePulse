import type { ActivityData } from "@/types";
import { formatDuration } from "./formatting";

export interface VdotPrediction {
  vdot: number;
  sourceActivityName: string;
  sourceDate: string;
  predictions: {
    fiveK: string;
    tenK: string;
    halfMarathon: string;
    marathon: string;
  };
}

export interface AcwrMetrics {
  ratio: number;
  acuteKm: number;
  chronicWeeklyAvgKm: number;
  status: "undertraining" | "sweet_spot" | "caution" | "high_risk";
}

export interface ShoeMileageItem {
  gearName: string;
  totalKm: number;
  sessionCount: number;
  maxKm: number;
  percentage: number;
  status: "ok" | "warning" | "replace";
}

function estimateVdotFromRun(distanceMeters: number, movingTimeSec: number): number {
  const tMin = movingTimeSec / 60;
  if (tMin <= 0 || distanceMeters <= 0) return 0;
  const v = distanceMeters / tMin; // meters per minute
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pctMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * tMin) +
    0.2989558 * Math.exp(-0.1932605 * tMin);
  if (pctMax <= 0) return 0;
  return vo2 / pctMax;
}

export function predictTimeSecForDistance(vdot: number, distanceMeters: number): number {
  let lowMin = 10;
  let highMin = 480;

  for (let i = 0; i < 32; i++) {
    const midMin = (lowMin + highMin) / 2;
    const estVdot = estimateVdotFromRun(distanceMeters, midMin * 60);
    if (estVdot > vdot) {
      // Running too fast, need more time
      lowMin = midMin;
    } else {
      highMin = midMin;
    }
  }

  return Math.round(((lowMin + highMin) / 2) * 60);
}

/**
 * Estimates Jack Daniels VDOT from the best qualifying run in the last 30 days
 * (falls back to all-time best qualifying run if none in the last 30 days).
 */
export function calculateVdotPredictor(activities: ActivityData[]): VdotPrediction | null {
  const qualifying = activities.filter(
    (a) => a.distanceMeters >= 3000 && a.movingTimeSec >= 600
  );
  if (qualifying.length === 0) return null;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = qualifying.filter(
    (a) => new Date(a.startDate).getTime() >= thirtyDaysAgo
  );
  const pool = recent.length > 0 ? recent : qualifying;

  let bestVdot = 0;
  let bestActivity: ActivityData | null = null;

  for (const act of pool) {
    const vdot = estimateVdotFromRun(act.distanceMeters, act.movingTimeSec);
    if (vdot > bestVdot && vdot < 85) {
      bestVdot = vdot;
      bestActivity = act;
    }
  }

  if (!bestActivity || bestVdot <= 0) return null;

  const roundedVdot = Math.round(bestVdot * 10) / 10;

  return {
    vdot: roundedVdot,
    sourceActivityName: bestActivity.name,
    sourceDate: bestActivity.startDate,
    predictions: {
      fiveK: formatDuration(predictTimeSecForDistance(bestVdot, 5000)),
      tenK: formatDuration(predictTimeSecForDistance(bestVdot, 10000)),
      halfMarathon: formatDuration(predictTimeSecForDistance(bestVdot, 21097.5)),
      marathon: formatDuration(predictTimeSecForDistance(bestVdot, 42195)),
    },
  };
}

/**
 * Calculates Acute (7-day) to Chronic (28-day weekly average) Workload Ratio.
 */
export function calculateAcwr(activities: ActivityData[]): AcwrMetrics {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twentyEightDaysAgo = now - 28 * 24 * 60 * 60 * 1000;

  let acuteMeters = 0;
  let chronicMeters = 0;
  let earliestTs = now;

  for (const act of activities) {
    const ts = new Date(act.startDate).getTime();
    if (ts <= now && ts < earliestTs) {
      earliestTs = ts;
    }
    if (ts >= twentyEightDaysAgo && ts <= now) {
      chronicMeters += act.distanceMeters;
      if (ts >= sevenDaysAgo) {
        acuteMeters += act.distanceMeters;
      }
    }
  }

  const daysTracked = Math.max(7, (now - earliestTs) / (24 * 60 * 60 * 1000));
  const divisorWeeks = Math.min(4, Math.max(1, daysTracked / 7));

  const acuteKm = Math.round((acuteMeters / 1000) * 10) / 10;
  const chronicWeeklyAvgKm = Math.round((chronicMeters / 1000 / divisorWeeks) * 10) / 10;
  const ratio =
    chronicWeeklyAvgKm > 0
      ? Math.round((acuteKm / chronicWeeklyAvgKm) * 100) / 100
      : 0;

  let status: AcwrMetrics["status"] = "undertraining";
  if (ratio > 1.5) {
    status = "high_risk";
  } else if (ratio > 1.3) {
    status = "caution";
  } else if (ratio >= 0.8) {
    status = "sweet_spot";
  }

  return {
    ratio,
    acuteKm,
    chronicWeeklyAvgKm,
    status,
  };
}

/**
 * Aggregates mileage per shoe (gearName) against a 700 km retirement threshold.
 */
export function calculateShoeMileage(
  activities: ActivityData[],
  defaultMaxKm = 700
): ShoeMileageItem[] {
  const map = new Map<string, { meters: number; count: number }>();

  for (const act of activities) {
    const name = act.gearName?.trim();
    if (!name) continue;
    const prev = map.get(name) ?? { meters: 0, count: 0 };
    prev.meters += act.distanceMeters;
    prev.count += 1;
    map.set(name, prev);
  }

  return Array.from(map.entries())
    .map(([gearName, data]) => {
      const totalKm = Math.round((data.meters / 1000) * 10) / 10;
      const percentage = Math.round((totalKm / defaultMaxKm) * 100);
      let status: ShoeMileageItem["status"] = "ok";
      if (percentage >= 100) status = "replace";
      else if (percentage >= 85) status = "warning";

      return {
        gearName,
        totalKm,
        sessionCount: data.count,
        maxKm: defaultMaxKm,
        percentage,
        status,
      };
    })
    .sort((a, b) => b.totalKm - a.totalKm);
}

export type RaceDistanceKey = "5K" | "10K" | "Half Marathon" | "Marathon";
export type ElevationProfile = "flat" | "rolling";

export interface RaceSplitSegment {
  segmentLabel: string;
  segmentKm: number;
  targetPace: string;
  cumulativeTime: string;
  strategyNote: "control" | "steady" | "push" | "uphill_safe";
}

export interface FuelingScheduleItem {
  minuteMark: number;
  fluidMl: number;
  carbsGrams: number;
  itemType: "water" | "gel_water" | "electrolyte";
}

export interface RaceDayStrategy {
  distanceKey: RaceDistanceKey;
  distanceKm: number;
  elevationProfile: ElevationProfile;
  vdotUsed: number;
  projectedFinishTime: string;
  avgTargetPace: string;
  carbsPerHour: number;
  totalCarbsGrams: number;
  splits: RaceSplitSegment[];
  fuelingSchedule: FuelingScheduleItem[];
}

function formatPacePerKm(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  if (s === 60) return `${m + 1}:00/km`;
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export function buildRaceDayStrategy(
  vdot: number | null,
  distanceKey: RaceDistanceKey,
  elevationProfile: ElevationProfile
): RaceDayStrategy {
  const effectiveVdot = vdot && vdot > 25 ? vdot : 42;
  const distMap: Record<RaceDistanceKey, number> = {
    "5K": 5.0,
    "10K": 10.0,
    "Half Marathon": 21.0975,
    "Marathon": 42.195,
  };

  const distanceKm = distMap[distanceKey];
  const baseFinishSec = predictTimeSecForDistance(effectiveVdot, distanceKm * 1000);
  // Rolling hills add ~2.5% time overhead
  const totalSec =
    elevationProfile === "rolling" ? Math.round(baseFinishSec * 1.025) : baseFinishSec;
  const avgSecPerKm = totalSec / distanceKm;

  // Build 5km segments (or 1km segments for 5K so table is useful)
  const stepKm = distanceKey === "5K" ? 1 : 5;
  const segments: Array<{ label: string; km: number }> = [];
  let remaining = distanceKm;
  let startKm = 0;
  while (remaining > 0.01) {
    const segKm = Math.min(stepKm, remaining);
    const endKm = Math.round((startKm + segKm) * 10) / 10;
    segments.push({ label: `${startKm}–${endKm} km`, km: segKm });
    startKm = endKm;
    remaining = Math.round((remaining - segKm) * 1000) / 1000;
  }

  let cumulativeSec = 0;
  const splits: RaceSplitSegment[] = segments.map((seg, idx) => {
    const progress = (idx + 1) / segments.length;
    let factor = 1.0;
    let strategyNote: RaceSplitSegment["strategyNote"] = "steady";

    if (elevationProfile === "flat") {
      // Subtle negative split: start +1.5% conservative, finish -1.5% faster
      if (progress <= 0.35) {
        factor = 1.015;
        strategyNote = "control";
      } else if (progress >= 0.7) {
        factor = 0.985;
        strategyNote = "push";
      }
    } else {
      // Rolling hills: conservative early/mid climbs, strong late rhythm
      if (progress <= 0.35) {
        factor = 1.02;
        strategyNote = "uphill_safe";
      } else if (progress >= 0.75) {
        factor = 0.98;
        strategyNote = "push";
      } else {
        factor = 1.005;
        strategyNote = "uphill_safe";
      }
    }

    const segPaceSec = avgSecPerKm * factor;
    cumulativeSec += Math.round(segPaceSec * seg.km);

    return {
      segmentLabel: seg.label,
      segmentKm: Math.round(seg.km * 10) / 10,
      targetPace: formatPacePerKm(segPaceSec),
      cumulativeTime: formatDuration(cumulativeSec),
      strategyNote,
    };
  });

  // Fueling & Hydration Schedule
  const totalMinutes = Math.round(totalSec / 60);
  const carbsPerHour =
    distanceKey === "5K"
      ? 0
      : distanceKey === "10K"
        ? totalMinutes >= 50 ? 25 : 0
        : distanceKey === "Half Marathon"
          ? 50
          : 70;

  const fuelingSchedule: FuelingScheduleItem[] = [];
  if (distanceKey === "5K") {
    fuelingSchedule.push({
      minuteMark: 0,
      fluidMl: 150,
      carbsGrams: 0,
      itemType: "water",
    });
  } else {
    const intervalMin = distanceKey === "Marathon" ? 25 : 25;
    for (let m = 20; m < totalMinutes - 8; m += intervalMin) {
      const isGel = carbsPerHour > 0 && m >= 25;
      const gelCarbs = isGel ? Math.round((carbsPerHour * intervalMin) / 60) : 0;
      fuelingSchedule.push({
        minuteMark: m,
        fluidMl: elevationProfile === "rolling" ? 200 : 175,
        carbsGrams: gelCarbs,
        itemType: isGel ? "gel_water" : "electrolyte",
      });
    }
  }

  const totalCarbsGrams = fuelingSchedule.reduce((s, item) => s + item.carbsGrams, 0);

  return {
    distanceKey,
    distanceKm: Math.round(distanceKm * 10) / 10,
    elevationProfile,
    vdotUsed: Math.round(effectiveVdot * 10) / 10,
    projectedFinishTime: formatDuration(totalSec),
    avgTargetPace: formatPacePerKm(avgSecPerKm),
    carbsPerHour,
    totalCarbsGrams,
    splits,
    fuelingSchedule,
  };
}

export type TrainingPhaseKey = "Recovery" | "Base" | "Build" | "Peak" | "Taper";

export interface ResolvedTrainingPhase {
  phase: TrainingPhaseKey;
  labelId: string;
  labelEn: string;
  isAuto: boolean;
  reasonId: string;
  reasonEn: string;
  weeksToRace: number | null;
}

export interface PhysiologicalThresholds {
  lt1Hr: number | null;
  lt2Hr: number | null;
  thresholdPace: number | null;
  peakHr: number | null;
  sourceLabel: string;
  isCalibrated: boolean;
}

/**
 * 3-Tier Physiological Threshold Calibration (LT1 & LT2):
 * - Tier 1: Manual Override (`manualLt2Hr`, `manualLt1Hr`, `manualThresholdPace`)
 * - Tier 2: Auto-Calibrate from Race / Time Trial in last 90 days (4800-16000m with HR)
 * - Tier 3: Baseline Estimation without faking RHR:
 *    - 3A: Karvonen HRR (when peakHr + restingHr exist)
 *    - 3B: % Peak HR (when peakHr exists without restingHr)
 *    - 3C: Empty Account (returns null thresholds)
 */
export function resolvePhysiologicalThresholds(
  user: {
    maxHr?: number | null;
    restingHr?: number | null;
    manualLt1Hr?: number | null;
    manualLt2Hr?: number | null;
    manualThresholdPace?: number | null;
    thresholdHr?: number | null;
    thresholdPaceSec?: number | null;
  },
  activities: ActivityData[]
): PhysiologicalThresholds {
  const maxActivityHr = activities.reduce<number | null>((max, a) => {
    if (typeof a.maxHeartrate === "number" && a.maxHeartrate > 0) {
      return max === null ? Math.round(a.maxHeartrate) : Math.max(max, Math.round(a.maxHeartrate));
    }
    return max;
  }, null);
  const peakHr = user.maxHr && user.maxHr > 0 ? user.maxHr : maxActivityHr;

  const vdotPred = calculateVdotPredictor(activities);
  const vdotThresholdPace =
    vdotPred && vdotPred.vdot > 0
      ? Math.round(predictTimeSecForDistance(vdotPred.vdot, 10000) / 10) + 5
      : null;
  const fallbackThresholdPace = user.thresholdPaceSec ?? vdotThresholdPace;

  // Tier 1: Manual Override
  if (
    (typeof user.manualLt2Hr === "number" && user.manualLt2Hr > 0) ||
    (typeof user.manualLt1Hr === "number" && user.manualLt1Hr > 0) ||
    (typeof user.manualThresholdPace === "number" && user.manualThresholdPace > 0)
  ) {
    const lt2Hr =
      user.manualLt2Hr && user.manualLt2Hr > 0
        ? user.manualLt2Hr
        : user.manualLt1Hr && user.manualLt1Hr > 0
          ? Math.round(user.manualLt1Hr / 0.84)
          : user.thresholdHr ?? (peakHr ? Math.round(peakHr * 0.88) : null);
    const lt1Hr =
      user.manualLt1Hr && user.manualLt1Hr > 0
        ? user.manualLt1Hr
        : lt2Hr
          ? Math.round(lt2Hr * 0.84)
          : null;
    const thresholdPace =
      user.manualThresholdPace && user.manualThresholdPace > 0
        ? user.manualThresholdPace
        : fallbackThresholdPace;

    return {
      lt1Hr,
      lt2Hr,
      thresholdPace,
      peakHr,
      sourceLabel: "Manual Override",
      isCalibrated: true,
    };
  }

  // Tier 2: Auto-Calibrate from Race / Time Trial in Last 90 Days
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const raceKeywordRegex = /\b(time trial|tt|race|5k|10k)\b/i;

  const raceCandidates = activities
    .filter((a) => {
      const ts = new Date(a.startDate).getTime();
      if (ts < ninetyDaysAgo) return false;
      if (a.distanceMeters < 4800 || a.distanceMeters > 16000) return false;
      if (!a.averageHeartrate || a.averageHeartrate <= 0 || !a.averageSpeed || a.averageSpeed <= 0) {
        return false;
      }
      if (peakHr && a.averageHeartrate < peakHr * 0.82) return false;
      return a.workoutType === 1 || raceKeywordRegex.test(a.name);
    })
    .sort(
      (a, b) =>
        estimateVdotFromRun(b.distanceMeters, b.movingTimeSec) -
        estimateVdotFromRun(a.distanceMeters, a.movingTimeSec)
    );

  if (raceCandidates.length > 0) {
    const best = raceCandidates[0];
    const avgHr = best.averageHeartrate!;
    const avgPaceSec = Math.round(1000 / best.averageSpeed);

    const is5kBand = best.distanceMeters <= 6500;
    const lt2Hr = Math.round(avgHr * (is5kBand ? 0.965 : 0.985));
    const thresholdPace = avgPaceSec + (is5kBand ? 13 : 5);
    const lt1Hr = Math.round(lt2Hr * 0.84);

    return {
      lt1Hr,
      lt2Hr,
      thresholdPace,
      peakHr,
      sourceLabel: `Calibrated from ${best.name}`,
      isCalibrated: true,
    };
  }

  // Tier 3A: Karvonen HRR (when peakHr + restingHr both exist)
  if (peakHr && user.restingHr && user.restingHr > 0 && peakHr > user.restingHr) {
    const hrr = peakHr - user.restingHr;
    return {
      lt1Hr: Math.round(0.72 * hrr + user.restingHr),
      lt2Hr: Math.round(0.86 * hrr + user.restingHr),
      thresholdPace: fallbackThresholdPace,
      peakHr,
      sourceLabel: "Estimasi Karvonen (HRR)",
      isCalibrated: false,
    };
  }

  // Tier 3B: % Peak HR (when peakHr exists without restingHr — never fake RHR=60)
  if (peakHr) {
    return {
      lt1Hr: Math.round(peakHr * 0.77),
      lt2Hr: Math.round(peakHr * 0.88),
      thresholdPace: fallbackThresholdPace,
      peakHr,
      sourceLabel: "Estimasi Awal (Peak HR)",
      isCalibrated: false,
    };
  }

  // Tier 3C: Empty Account (no HR data yet)
  return {
    lt1Hr: null,
    lt2Hr: null,
    thresholdPace: user.thresholdPaceSec ?? null,
    peakHr: null,
    sourceLabel: "Menunggu 1 aktivitas dengan sensor HR",
    isCalibrated: false,
  };
}

export interface RaceReadinessInput {
  currentVdot: number | null;
  goalDistance: string | null | undefined;
  goalTimeSec: number | null | undefined;
  avgWeeklyKm28d: number;
  longestRun30dKm: number;
  acwr: number;
}

export interface RaceReadinessResult {
  totalReadiness: number;
  vdotScore: number;
  volumeScore: number;
  enduranceScore: number;
}

/**
 * Computes Multi-Factor Sports Science Readiness Index (0-100%):
 * - 60% VDOT Fitness Gap (currentVdot vs targetVdot for goalDistance & goalTimeSec)
 * - 25% 28-Day Aerobic Volume Base (avgWeeklyKm28d vs race-distance weekly standard)
 * - 15% Long Run & ACWR Stability (longestRun30dKm vs 80% target race distance, minus ACWR > 1.35 fatigue penalty)
 */
export function calculateRaceReadiness({
  currentVdot,
  goalDistance,
  goalTimeSec,
  avgWeeklyKm28d,
  longestRun30dKm,
  acwr,
}: RaceReadinessInput): RaceReadinessResult {
  const raceSpecs: Record<
    string,
    { distMeters: number; requiredWeeklyKm: number; requiredLongRunKm: number }
  > = {
    "5K": { distMeters: 5000, requiredWeeklyKm: 20, requiredLongRunKm: 5 },
    "10K": { distMeters: 10000, requiredWeeklyKm: 30, requiredLongRunKm: 9 },
    "Half Marathon": {
      distMeters: 21097.5,
      requiredWeeklyKm: 40,
      requiredLongRunKm: 17,
    },
    Marathon: { distMeters: 42195, requiredWeeklyKm: 55, requiredLongRunKm: 32 },
  };

  const spec = goalDistance ? raceSpecs[goalDistance] : undefined;
  if (!spec || !goalTimeSec || goalTimeSec <= 0) {
    return {
      totalReadiness: 0,
      vdotScore: 0,
      volumeScore: 0,
      enduranceScore: 0,
    };
  }

  // 1. VDOT Fitness Gap (60%)
  const targetVdot = estimateVdotFromRun(spec.distMeters, goalTimeSec);
  const vdotScore =
    currentVdot && currentVdot > 0 && targetVdot > 0
      ? Math.min(100, Math.max(0, Math.round((currentVdot / targetVdot) * 100)))
      : 0;

  // 2. 28-Day Aerobic Volume Base (25%)
  const volumeScore = Math.min(
    100,
    Math.max(0, Math.round((avgWeeklyKm28d / spec.requiredWeeklyKm) * 100))
  );

  // 3. Long Run & ACWR Stability (15%)
  const rawEndurance = Math.min(
    100,
    Math.max(0, Math.round((longestRun30dKm / spec.requiredLongRunKm) * 100))
  );
  const acwrPenalty = acwr > 1.35 ? Math.min(20, Math.round((acwr - 1.35) * 40)) : 0;
  const enduranceScore = Math.max(0, rawEndurance - acwrPenalty);

  const totalReadiness = Math.min(
    100,
    Math.max(
      0,
      Math.round(vdotScore * 0.6 + volumeScore * 0.25 + enduranceScore * 0.15)
    )
  );

  return {
    totalReadiness,
    vdotScore,
    volumeScore,
    enduranceScore,
  };
}

export function resolveActiveTrainingPhase(
  user: {
    trainingPhase?: string | null;
    targetRaceDate?: string | Date | null;
  } | null | undefined,
  activities: ActivityData[],
  acwr: AcwrMetrics
): ResolvedTrainingPhase {
  const rawPhase = user?.trainingPhase?.trim() || "auto";

  // 1. Manual override
  if (rawPhase !== "auto") {
    const normalized: TrainingPhaseKey =
      rawPhase === "Recovery" ||
      rawPhase === "Base" ||
      rawPhase === "Build" ||
      rawPhase === "Peak" ||
      rawPhase === "Taper"
        ? rawPhase
        : "Base";
    const labelMap: Record<TrainingPhaseKey, { id: string; en: string }> = {
      Recovery: { id: "Recovery (Pemulihan)", en: "Recovery" },
      Base: { id: "Base Building", en: "Base Building" },
      Build: { id: "Threshold / Build", en: "Threshold / Build" },
      Peak: { id: "Peak", en: "Peak" },
      Taper: { id: "Taper", en: "Taper" },
    };
    return {
      phase: normalized,
      labelId: labelMap[normalized].id,
      labelEn: labelMap[normalized].en,
      isAuto: false,
      reasonId: "Dipilih secara manual di Pengaturan Atlet.",
      reasonEn: "Manually selected in Athlete Settings.",
      weeksToRace: null,
    };
  }

  // 2. Auto with future Target Race Date
  if (user?.targetRaceDate) {
    const raceMs = new Date(user.targetRaceDate).getTime();
    const nowMs = Date.now();
    if (!Number.isNaN(raceMs) && raceMs > nowMs) {
      const weeksToRace = Math.ceil((raceMs - nowMs) / (7 * 24 * 60 * 60 * 1000));
      if (weeksToRace <= 2) {
        return {
          phase: "Taper",
          labelId: "Taper",
          labelEn: "Taper",
          isAuto: true,
          reasonId: `${weeksToRace} minggu menuju hari H lomba — pengurangan volume untuk kesegaran puncak.`,
          reasonEn: `${weeksToRace} weeks to race day — tapering volume for peak freshness.`,
          weeksToRace,
        };
      }
      if (weeksToRace <= 5) {
        return {
          phase: "Peak",
          labelId: "Peak",
          labelEn: "Peak",
          isAuto: true,
          reasonId: `${weeksToRace} minggu menuju lomba — fokus ketajaman pace lomba & spesifisitas.`,
          reasonEn: `${weeksToRace} weeks to race day — race-pace sharpening & specificity.`,
          weeksToRace,
        };
      }
      if (weeksToRace <= 12) {
        return {
          phase: "Build",
          labelId: "Threshold / Build",
          labelEn: "Threshold / Build",
          isAuto: true,
          reasonId: `${weeksToRace} minggu menuju lomba — penguatan ambang laktat (LT2) & cruise intervals.`,
          reasonEn: `${weeksToRace} weeks to race day — building lactate threshold (LT2) & cruise intervals.`,
          weeksToRace,
        };
      }
      return {
        phase: "Base",
        labelId: "Base Building",
        labelEn: "Base Building",
        isAuto: true,
        reasonId: `${weeksToRace} minggu menuju lomba — membangun fondasi aerobik Zona 2.`,
        reasonEn: `${weeksToRace} weeks to race day — building Zone 2 aerobic foundation.`,
        weeksToRace,
      };
    }
  }

  // 3. Auto without race date: evaluate recent 10 days + ACWR
  const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const recent10 = activities.filter(
    (a) => new Date(a.startDate).getTime() >= tenDaysAgo
  );

  const hadLongOrHardEffort = recent10.some(
    (a) =>
      a.distanceMeters >= 18000 ||
      a.trainingPhase === "Build" ||
      a.trainingPhase === "Peak" ||
      a.trainingPhase === "Race"
  );

  if (hadLongOrHardEffort || acwr.ratio > 1.3) {
    return {
      phase: "Recovery",
      labelId: "Base / Recovery",
      labelEn: "Base / Recovery",
      isAuto: true,
      reasonId:
        acwr.ratio > 1.3
          ? `ACWR ${acwr.ratio} di atas zona aman — fokus pemulihan & lari ringan.`
          : "Baru menyelesaikan sesi ≥18 km atau intensitas tinggi dalam 10 hari terakhir — fase pemulihan.",
      reasonEn:
        acwr.ratio > 1.3
          ? `ACWR ${acwr.ratio} is elevated — prioritizing recovery & easy aerobic runs.`
          : "Recent ≥18 km or high-intensity effort in the last 10 days — prioritizing recovery.",
      weeksToRace: null,
    };
  }

  if (acwr.ratio >= 0.8 && acwr.ratio <= 1.3 && acwr.chronicWeeklyAvgKm >= 15) {
    return {
      phase: "Build",
      labelId: "Threshold / Build",
      labelEn: "Threshold / Build",
      isAuto: true,
      reasonId: `Volume 4 minggu stabil (${acwr.chronicWeeklyAvgKm} km/mgg) & ACWR ${acwr.ratio} optimal — siap progresi Threshold.`,
      reasonEn: `Stable 4-week volume (${acwr.chronicWeeklyAvgKm} km/wk) & optimal ACWR ${acwr.ratio} — ready for Threshold progression.`,
      weeksToRace: null,
    };
  }

  return {
    phase: "Base",
    labelId: "Base Building",
    labelEn: "Base Building",
    isAuto: true,
    reasonId: "Membangun konsistensi volume aerobik Zona 2 secara bertahap.",
    reasonEn: "Gradually building consistent Zone 2 aerobic volume.",
    weeksToRace: null,
  };
}
