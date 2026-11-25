import type { DashboardData, ActivityData } from "@/types";

export const DEMO_ACTIVITIES: ActivityData[] = [
  {
    id: "act-1",
    stravaId: "12839481920",
    name: "⚡ Double Threshold: 5x1km @ 4:35/km (AM Session)",
    type: "Run",
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    distanceMeters: 10240,
    movingTimeSec: 2840,
    elapsedTimeSec: 3100,
    averageSpeed: 3.605, // ~4:37/km
    maxSpeed: 4.35,
    averageHeartrate: 168,
    maxHeartrate: 176,
    averageCadence: 88, // 176 spm
    totalElevationGain: 34,
    trainingPhase: "Build",
    splitsJson: [
      { split: 1, distance: 1000, average_speed: 3.33, average_heartrate: 142, elevation_difference: 2, moving_time: 300 }, // Warmup 5:00
      { split: 2, distance: 1000, average_speed: 3.66, average_heartrate: 167, elevation_difference: -1, moving_time: 273 }, // Rep 1 4:33
      { split: 3, distance: 1000, average_speed: 3.68, average_heartrate: 169, elevation_difference: 4, moving_time: 271 }, // Rep 2 4:31
      { split: 4, distance: 1000, average_speed: 3.64, average_heartrate: 171, elevation_difference: 0, moving_time: 274 }, // Rep 3 4:34
      { split: 5, distance: 1000, average_speed: 3.65, average_heartrate: 172, elevation_difference: -2, moving_time: 273 }, // Rep 4 4:33
      { split: 6, distance: 1000, average_speed: 3.69, average_heartrate: 174, elevation_difference: 1, moving_time: 271 }, // Rep 5 4:31
      { split: 7, distance: 1000, average_speed: 3.12, average_heartrate: 148, elevation_difference: 3, moving_time: 320 }, // Float
      { split: 8, distance: 1000, average_speed: 3.66, average_heartrate: 173, elevation_difference: -4, moving_time: 273 }, // Extra block
      { split: 9, distance: 1000, average_speed: 3.18, average_heartrate: 152, elevation_difference: 2, moving_time: 314 }, // Cooldown
      { split: 10, distance: 1000, average_speed: 3.05, average_heartrate: 140, elevation_difference: 0, moving_time: 328 }, // Cooldown
    ],
    aiFeedback: `### 1. Session Summary
Exceptional execution of the Norwegian-lite sub-threshold session. Completed 5x1km repetitions averaging 4:33/km while keeping lactate buildup tightly controlled under your 173 bpm LT2 ceiling. Magic Speed 4 provided crisp energy return with cadence dialed at 176 spm.

### 2. Key Observations
• **Threshold Discipline:** HR peaked at 174 bpm on repetition 5, exactly at your LT2 boundary without tipping into anaerobic acidosis.
• **Cadence & Mechanics:** Consistent 176 spm across all hard intervals; ground contact time was minimal with zero pacing fade across reps.
• **Cardiovascular Drift:** Minimal 2.8% cardiac drift between Rep 1 and Rep 5, proving strong aerobic base conditioning.

### 3. Training Phase Assessment (Build Phase)
Lactate clearance capacity is visibly improving compared to your 51:44 10K baseline. Your current sustainable threshold pace is tracking towards 4:38/km, well within the safety margin required for the Sub-1:45:00 Half Marathon target.

### 4. Next Session Recommendation
Prescription: 8km Easy Aerobic Recovery Run (Cap HR ≤ 142 bpm, pace ~5:50-6:10/km). Switch to ASICS Novablast 5 to minimize muscular impact before the weekend long progression.`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "act-2",
    stravaId: "12832918231",
    name: "🏃 Sunday Aerobic Long Run: Sub-Z2 Efficiency",
    type: "Run",
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    distanceMeters: 16400,
    movingTimeSec: 5310,
    elapsedTimeSec: 5490,
    averageSpeed: 3.088, // ~5:24/km
    maxSpeed: 3.85,
    averageHeartrate: 144,
    maxHeartrate: 153,
    averageCadence: 86, // 172 spm
    totalElevationGain: 88,
    trainingPhase: "Base",
    splitsJson: [
      { split: 1, distance: 1000, average_speed: 2.95, average_heartrate: 133, elevation_difference: 5, moving_time: 338 },
      { split: 2, distance: 1000, average_speed: 3.05, average_heartrate: 138, elevation_difference: -2, moving_time: 327 },
      { split: 3, distance: 1000, average_speed: 3.08, average_heartrate: 141, elevation_difference: 8, moving_time: 324 },
      { split: 4, distance: 1000, average_speed: 3.10, average_heartrate: 143, elevation_difference: -3, moving_time: 322 },
      { split: 5, distance: 1000, average_speed: 3.12, average_heartrate: 144, elevation_difference: 4, moving_time: 320 },
      { split: 6, distance: 1000, average_speed: 3.08, average_heartrate: 144, elevation_difference: 1, moving_time: 324 },
      { split: 7, distance: 1000, average_speed: 3.11, average_heartrate: 145, elevation_difference: -4, moving_time: 321 },
      { split: 8, distance: 1000, average_speed: 3.10, average_heartrate: 146, elevation_difference: 6, moving_time: 322 },
      { split: 9, distance: 1000, average_speed: 3.15, average_heartrate: 147, elevation_difference: -5, moving_time: 317 },
      { split: 10, distance: 1000, average_speed: 3.12, average_heartrate: 146, elevation_difference: 2, moving_time: 320 },
      { split: 11, distance: 1000, average_speed: 3.09, average_heartrate: 147, elevation_difference: 3, moving_time: 323 },
      { split: 12, distance: 1000, average_speed: 3.11, average_heartrate: 148, elevation_difference: -2, moving_time: 321 },
      { split: 13, distance: 1000, average_speed: 3.08, average_heartrate: 149, elevation_difference: 4, moving_time: 324 },
      { split: 14, distance: 1000, average_speed: 3.06, average_heartrate: 151, elevation_difference: -1, moving_time: 326 },
      { split: 15, distance: 1000, average_speed: 3.02, average_heartrate: 152, elevation_difference: 8, moving_time: 331 },
      { split: 16, distance: 1000, average_speed: 2.98, average_heartrate: 150, elevation_difference: 2, moving_time: 335 },
    ],
    aiFeedback: `### 1. Session Summary
Masterclass in Zone 2 aerobic pacing discipline. 16.4 km completed at 5:24/km with average HR locked at 144 bpm (well below your 162 bpm aerobic cap). Optimal mitochondrial density stimulation without accumulated neurological fatigue.

### 2. Key Observations
• **Pacing Homogeneity:** 14 out of 16 splits were within ±4 seconds of the target 5:23/km cruise pace.
• **Decoupling Ratio:** Aerobic decoupling measured at 3.1%, indicating robust fat-oxidation metabolic pathways.
• **Equipment Match:** Novablast 5 provided plush cushioning for the 88m total elevation profile.

### 3. Training Phase Assessment (Base Building)
Aerobic floor is hardening rapidly. Your pace at 145 bpm has dropped from 5:48/km 6 weeks ago to 5:24/km today—a massive 24s/km aerobic efficiency jump.

### 4. Next Session Recommendation
Rest day / active mobility tomorrow. Followed by Midweek Controlled Fartlek (6x2min @ 4:40/km with 90s easy float).`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "act-3",
    stravaId: "12821948210",
    name: "🌿 Easy Active Recovery + 4x100m Strides",
    type: "Run",
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    distanceMeters: 6200,
    movingTimeSec: 2160,
    elapsedTimeSec: 2300,
    averageSpeed: 2.87, // ~5:48/km
    maxSpeed: 4.85,
    averageHeartrate: 136,
    maxHeartrate: 158,
    averageCadence: 85, // 170 spm
    totalElevationGain: 18,
    trainingPhase: "Recovery",
    splitsJson: [
      { split: 1, distance: 1000, average_speed: 2.78, average_heartrate: 128, elevation_difference: 1, moving_time: 360 },
      { split: 2, distance: 1000, average_speed: 2.85, average_heartrate: 134, elevation_difference: 0, moving_time: 350 },
      { split: 3, distance: 1000, average_speed: 2.88, average_heartrate: 137, elevation_difference: -2, moving_time: 347 },
      { split: 4, distance: 1000, average_speed: 2.89, average_heartrate: 138, elevation_difference: 3, moving_time: 346 },
      { split: 5, distance: 1000, average_speed: 2.91, average_heartrate: 139, elevation_difference: 0, moving_time: 343 },
      { split: 6, distance: 1000, average_speed: 3.12, average_heartrate: 146, elevation_difference: 1, moving_time: 320 },
    ],
    aiFeedback: `### 1. Session Summary
Textbook recovery flush. Kept HR pinned at 136 bpm (Zone 1) with 4 neuromuscular strides in the final kilometer to maintain neuromuscular pop without metabolic penalty.

### 2. Key Observations
• **Recovery Compliance:** 94% of moving time spent strictly under 140 bpm.
• **Neuromuscular Stride Peak:** Peak speed touched 3:26/km on the strides with good hip extension.

### 3. Training Phase Assessment (Recovery)
Parasympathetic dominance restored. HRV readiness metrics indicate athlete is fully primed for high-quality threshold work.`,
    createdAt: new Date().toISOString(),
  },
];

export const DEMO_DASHBOARD_DATA: DashboardData = {
  activities: DEMO_ACTIVITIES,
  weeklySummary: {
    totalDistanceKm: 42.8,
    avgHeartrate: 148,
    sessionCount: 4,
    weekStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  weeklyTrend: [
    { week: "2026-10-06", distanceKm: 28.5, avgHr: 156, avgPaceSec: 345, sessions: 3 },
    { week: "2026-10-13", distanceKm: 32.2, avgHr: 154, avgPaceSec: 338, sessions: 3 },
    { week: "2026-10-20", distanceKm: 35.0, avgHr: 152, avgPaceSec: 334, sessions: 4 },
    { week: "2026-10-27", distanceKm: 31.8, avgHr: 150, avgPaceSec: 330, sessions: 3 },
    { week: "2026-11-03", distanceKm: 38.4, avgHr: 149, avgPaceSec: 326, sessions: 4 },
    { week: "2026-11-10", distanceKm: 40.2, avgHr: 148, avgPaceSec: 322, sessions: 4 },
    { week: "2026-11-17", distanceKm: 42.8, avgHr: 147, avgPaceSec: 318, sessions: 4 },
    { week: "2026-11-24", distanceKm: 44.5, avgHr: 146, avgPaceSec: 314, sessions: 4 },
  ],
};
