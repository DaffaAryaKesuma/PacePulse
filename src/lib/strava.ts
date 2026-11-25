// Strava API utilities

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
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
  splits_metric?: SplitMetric[];
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
 * Exchanges Strava refresh token for a fresh access token
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

export type { StravaActivity, SplitMetric };
