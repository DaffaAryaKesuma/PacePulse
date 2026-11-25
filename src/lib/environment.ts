import type { SplitMetric } from "./strava";

export interface RunEnvironmentData {
  temperatureC: number | null;
  humidityPct: number | null;
  aqi: number | null;
}

/**
 * Fetches hourly weather (temperature_2m, relative_humidity_2m) and US AQI
 * from Open-Meteo (free, no API key required) for the run's start coordinates and time.
 */
export async function fetchRunEnvironment(
  lat: number | null | undefined,
  lng: number | null | undefined,
  startDateIso: string
): Promise<RunEnvironmentData> {
  if (typeof lat !== "number" || typeof lng !== "number" || !startDateIso) {
    return { temperatureC: null, humidityPct: null, aqi: null };
  }

  const startDate = new Date(startDateIso);
  if (Number.isNaN(startDate.getTime())) {
    return { temperatureC: null, humidityPct: null, aqi: null };
  }

  const dateStr = startDate.toISOString().split("T")[0];
  const targetMs = startDate.getTime();

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m&start_date=${dateStr}&end_date=${dateStr}&timezone=UTC`;
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi&start_date=${dateStr}&end_date=${dateStr}&timezone=UTC`;

  const [weatherRes, aqiRes] = await Promise.allSettled([
    fetch(weatherUrl, { signal: AbortSignal.timeout(6000) }),
    fetch(aqiUrl, { signal: AbortSignal.timeout(6000) }),
  ]);

  let temperatureC: number | null = null;
  let humidityPct: number | null = null;
  let aqi: number | null = null;

  const findClosestHourIndex = (times: string[]): number => {
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      // Append Z because timezone=UTC
      const ms = new Date(times[i].endsWith("Z") ? times[i] : `${times[i]}Z`).getTime();
      const diff = Math.abs(ms - targetMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  if (weatherRes.status === "fulfilled" && weatherRes.value.ok) {
    try {
      const json = (await weatherRes.value.json()) as {
        hourly?: {
          time?: string[];
          temperature_2m?: Array<number | null>;
          relative_humidity_2m?: Array<number | null>;
        };
      };
      const times = json.hourly?.time;
      if (times && times.length > 0) {
        const idx = findClosestHourIndex(times);
        const temp = json.hourly?.temperature_2m?.[idx];
        const hum = json.hourly?.relative_humidity_2m?.[idx];
        if (typeof temp === "number") temperatureC = Math.round(temp * 10) / 10;
        if (typeof hum === "number") humidityPct = Math.round(hum);
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (aqiRes.status === "fulfilled" && aqiRes.value.ok) {
    try {
      const json = (await aqiRes.value.json()) as {
        hourly?: {
          time?: string[];
          us_aqi?: Array<number | null>;
        };
      };
      const times = json.hourly?.time;
      if (times && times.length > 0) {
        const idx = findClosestHourIndex(times);
        const val = json.hourly?.us_aqi?.[idx];
        if (typeof val === "number") aqi = Math.round(val);
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { temperatureC, humidityPct, aqi };
}

/**
 * Computes Traffic Friction Score (0 - 100) from elapsed vs moving time ratio
 * and split speed variability.
 * 0 = sterile track/route with zero stops, >50 = heavy traffic / frequent stops.
 */
export function computeTrafficFrictionScore(
  elapsedTimeSec: number,
  movingTimeSec: number,
  splits?: SplitMetric[] | null
): number {
  if (!elapsedTimeSec || elapsedTimeSec <= 0) return 0;

  const stoppedSec = Math.max(0, elapsedTimeSec - movingTimeSec);
  const stopRatio = stoppedSec / elapsedTimeSec;

  // Base friction from stop ratio (e.g. 16% stopped => ~51)
  const stopScore = Math.min(85, stopRatio * 320);

  // Split variability bonus (up to 15 pts)
  let variabilityScore = 0;
  if (splits && splits.length >= 3) {
    const speeds = splits.map((s) => s.average_speed).filter((s) => s > 0);
    if (speeds.length >= 3) {
      const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const variance =
        speeds.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / speeds.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
      variabilityScore = Math.min(15, cv * 60);
    }
  }

  return Math.round(Math.min(100, Math.max(0, stopScore + variabilityScore)));
}

/**
 * Evaluates Easy/Recovery Run aerobic zone discipline (0 - 100).
 * Returns null for quality/threshold/race sessions so workouts aren't penalized as ego-runs.
 */
export function computeEasyRunDisciplineScore(
  trainingPhase: string,
  avgHr: number | null | undefined,
  thresholdHr: number | null | undefined,
  maxHr: number | null | undefined
): number | null {
  if (!avgHr || avgHr <= 0) return null;
  if (trainingPhase === "Build" || trainingPhase === "Peak" || trainingPhase === "Race") {
    return null;
  }

  const aerobicCap = thresholdHr && thresholdHr > 0
    ? thresholdHr - 11
    : Math.round((maxHr && maxHr > 0 ? maxHr : 190) * 0.78);

  if (avgHr <= aerobicCap) {
    return 100;
  }

  const overBpm = avgHr - aerobicCap;
  return Math.max(10, Math.round(100 - overBpm * 4.5));
}
