// Formatting utilities for running metrics

/**
 * Converts speed (m/s) to pace (min/km) string in "M:SS" format
 */
export function speedToPace(speedMs: number): string {
  if (!speedMs || speedMs <= 0) return "--:--";
  const paceSecPerKm = 1000 / speedMs;
  const minutes = Math.floor(paceSecPerKm / 60);
  const seconds = Math.round(paceSecPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Converts distance in meters to kilometers with 2 decimal places
 */
export function metersToKm(meters: number): string {
  return (meters / 1000).toFixed(2);
}

/**
 * Formats seconds to "H:MM:SS" or "MM:SS" string
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Converts cadence (revolutions/min) to steps per minute (SPM) for running
 * Strava reports cadence as average foot strikes per minute, so multiply by 2
 */
export function cadenceToSpm(cadence: number | null | undefined): number | null {
  if (!cadence) return null;
  return Math.round(cadence * 2);
}

/**
 * Determines training phase based on heart rate and pace
 */
export function determineTrainingPhase(
  avgHr: number | null | undefined,
  avgSpeedMs: number
): string {
  const thresholdHr = 173;
  const pacePerKm = 1000 / avgSpeedMs;

  if (!avgHr) {
    // Classify by pace alone
    if (pacePerKm > 360) return "Recovery"; // slower than 6:00/km
    if (pacePerKm > 300) return "Base"; // 5:00–6:00/km
    return "Build";
  }

  const hrPercent = (avgHr / thresholdHr) * 100;

  if (hrPercent < 76) return "Recovery"; // < 76% threshold
  if (hrPercent < 86) return "Base"; // 76–85% threshold (aerobic)
  if (hrPercent < 94) return "Build"; // 86–93% threshold (tempo)
  return "Race"; // ≥ 94% threshold
}

/**
 * Formats a date to a friendly string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Returns start of current ISO week (Monday)
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Projected Half Marathon time based on current threshold pace
 * Uses Riegel formula: T2 = T1 * (D2/D1)^1.06
 */
export function projectHalfMarathonTime(
  recentPaceSecPerKm: number,
  recentDistanceKm: number
): string {
  if (recentDistanceKm < 1) return "N/A";
  // Adjust pace for HM distance using Riegel
  const hmDistance = 21.0975;
  const adjustedPace =
    recentPaceSecPerKm * Math.pow(hmDistance / recentDistanceKm, 0.06);
  const totalSec = adjustedPace * hmDistance;
  return formatDuration(Math.round(totalSec));
}
