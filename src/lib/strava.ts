// Strava API utilities with Multi-User token management
import { prisma } from "./prisma";
import type { User } from "@prisma/client";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
}

interface StravaBestEffort {
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  start_date?: string;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  total_elevation_gain?: number;
  start_latlng?: [number, number] | null;
  workout_type?: number | null;
  gear_id?: string | null;
  gear?: { id: string; name: string } | null;
  splits_metric?: SplitMetric[];
  best_efforts?: StravaBestEffort[];
}

interface StravaShoe {
  id: string;
  name: string;
  distance: number; // in meters
  primary?: boolean;
}

interface StravaAthleteProfile {
  id: number;
  shoes?: StravaShoe[];
}

interface SplitMetric {
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
  moving_time: number;
  split: number;
  average_speed: number;
  average_heartrate?: number;
  pace_zone?: number;
}

/**
 * Gets a valid Strava access token for a specific User, automatically refreshing if needed
 */
export async function getValidUserStravaToken(user: User): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);

  // If token is still valid for at least 2 minutes, return it
  if (user.tokenExpiresAt > nowSec + 120 && user.stravaAccessToken) {
    return user.stravaAccessToken;
  }

  // Otherwise, refresh the token using user's refresh token
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: user.stravaRefreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh Strava token for user ${user.id}: ${res.status} ${text}`);
  }

  const data = (await res.json()) as TokenResponse;

  // Persist fresh tokens to database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      tokenExpiresAt: data.expires_at,
    },
  });

  return data.access_token;
}

/**
 * Exchanges Strava refresh token for a fresh access token (fallback single-tenant)
 */
export async function refreshStravaToken(): Promise<string> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh Strava token: ${res.status} ${text}`);
  }

  const data = (await res.json()) as TokenResponse;
  return data.access_token;
}

/**
 * Fetches a single Strava activity by ID
 */
export async function fetchStravaActivity(
  activityId: string | number,
  accessToken: string
): Promise<StravaActivity> {
  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to fetch Strava activity ${activityId}: ${res.status} ${text}`
    );
  }

  return (await res.json()) as StravaActivity;
}

/**
 * Fetches the athlete's recent activities
 */
export async function fetchStravaActivities(
  accessToken: string,
  perPage = 10,
  page = 1
): Promise<StravaActivity[]> {
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch Strava activities: ${res.status} ${text}`);
  }

  return (await res.json()) as StravaActivity[];
}

/**
 * Fetches the authenticated athlete profile (including shoes/gear master data)
 */
export async function fetchStravaAthlete(
  accessToken: string
): Promise<StravaAthleteProfile> {
  const res = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch Strava athlete profile: ${res.status} ${text}`);
  }

  return (await res.json()) as StravaAthleteProfile;
}

export type { StravaActivity, SplitMetric, StravaBestEffort, StravaShoe, StravaAthleteProfile };
