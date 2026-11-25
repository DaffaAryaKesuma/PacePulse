// Shared TypeScript types for PacePulse

export interface AthleteInfo {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  goalDistance: string;
  goalTimeSec: number;
  currentPbSec: number | null;
  thresholdHr: number | null;
  maxHr: number;
  thresholdPaceSec: number | null;
  trainingPhase: string;
  isPublic: boolean;
  discordWebhookUrl?: string | null;
}

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

export interface DashboardData {
  activities: ActivityData[];
  weeklySummary: WeeklySummary;
  weeklyTrend: WeeklyTrendPoint[];
  athlete?: AthleteInfo | null;
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
