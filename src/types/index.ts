// Shared TypeScript types for PacePulse

export interface AthleteInfo {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  goalDistance: string | null;
  goalTimeSec: number | null;
  currentPbSec: number | null;
  thresholdHr: number | null;
  maxHr: number | null;
  restingHr?: number | null;
  manualLt1Hr?: number | null;
  manualLt2Hr?: number | null;
  manualThresholdPace?: number | null;
  thresholdPaceSec: number | null;
  trainingPhase: string;
  targetRaceDate?: string | null;
  isPublic: boolean;
  preferredLanguage?: string;
  retiredGearNames?: string[];
  availableRunDays?: string[];
  preferredLongRunDay?: string | null;
}

export type LifestyleTag = "poor_sleep" | "high_caffeine" | "heavy_legs" | "work_stress";

export interface ActivityData {
  id: string;
  stravaId: string; // BigInt serialized as string
  name: string;
  type: string;
  startDate: string;
  distanceMeters: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  averageSpeed: number;
  maxSpeed: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  averageCadence: number | null;
  totalElevationGain: number | null;
  splitsJson: SplitData[] | null;
  aiFeedback: string | null;
  trainingPhase: string;
  workoutType?: number | null;
  gearName?: string | null;
  temperatureC?: number | null;
  humidityPct?: number | null;
  aqi?: number | null;
  trafficFrictionScore?: number | null;
  easyRunDisciplineScore?: number | null;
  contextTags?: string[];
  createdAt: string;
  userId?: string;
}

export interface SplitData {
  split: number;
  distance: number;
  average_speed: number;
  average_heartrate?: number;
  elevation_difference?: number;
  moving_time: number;
  pace_zone?: number;
}

export interface WeeklySummary {
  totalDistanceKm: number;
  avgHeartrate: number | null;
  sessionCount: number;
  weekStart: string;
}

export interface GearInfo {
  id: string;
  stravaGearId: string;
  name: string;
  distanceKm: number;
  primary: boolean;
}

export interface PersonalBestInfo {
  id: string;
  distanceKey: string;
  timeSeconds: number;
  paceSecPerKm: number;
  activityId: string | null;
  activityName: string;
  achievedAt: string;
}

export interface DashboardData {
  activities: ActivityData[];
  totalActivities?: number;
  weeklySummary: WeeklySummary;
  weeklyTrend: WeeklyTrendPoint[];
  athlete?: AthleteInfo | null;
  gears?: GearInfo[];
  personalBests?: PersonalBestInfo[];
}

export interface WeeklyTrendPoint {
  week: string;
  distanceKm: number;
  avgHr: number | null;
  avgPaceSec: number | null;
  sessions: number;
}

export interface StravaWebhookEvent {
  object_type: string;
  object_id: number;
  aspect_type: string;
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, unknown>;
}

export type WorkoutStepType = "warmup" | "main" | "recovery" | "cooldown";

export interface WorkoutBreakdownStep {
  type: WorkoutStepType;
  label: string;
  distanceOrDuration: string;
  targetPace: string;
  targetHr: string;
  notes: string;
}

export interface WorkoutBreakdown {
  objective: string;
  steps: WorkoutBreakdownStep[];
  executionTips: string[];
}

export interface WeeklyPlanDay {
  day: string;
  sessionType: string;
  distanceKm: number;
  targetPace: string;
  hrCap: string;
  shoe: string;
  rationale: string;
  literatureCitation?: string;
  intensity: "rest" | "easy" | "moderate" | "hard" | "long";
  breakdown?: WorkoutBreakdown | null;
}

export interface WeeklyPlanData {
  id: string;
  weekStart: string;
  days: WeeklyPlanDay[];
  coachSummary?: string | null;
  source?: "gemini" | "engine";
  rescheduleNote: string | null;
  updatedAt: string;
}
