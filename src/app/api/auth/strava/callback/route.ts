import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: {
    id: number;
    username: string | null;
    firstname: string;
    lastname: string;
    profile: string | null;
    profile_medium: string | null;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (error || !code) {
    console.error("[Strava Callback] OAuth error:", error);
    return NextResponse.redirect(`${appUrl}/?error=strava_denied`);
  }

  try {
    // 1. Exchange code for Strava tokens & athlete profile
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[Strava Callback] Token exchange failed:", tokenRes.status, errText);
      return NextResponse.redirect(`${appUrl}/?error=token_exchange_failed`);
    }

    const data = (await tokenRes.json()) as StravaTokenResponse;
    const athlete = data.athlete;
    const stravaAthleteId = BigInt(athlete.id);

    // 2. Generate clean username
    const baseUsername =
      athlete.username ||
      `${athlete.firstname.toLowerCase()}-${athlete.lastname ? athlete.lastname.toLowerCase() : ""}`.replace(/[^a-z0-9_-]/g, "") ||
      `runner-${athlete.id}`;

    const fullName = `${athlete.firstname} ${athlete.lastname || ""}`.trim();
    const avatarUrl =
      athlete.profile && !athlete.profile.includes("avatar/athlete/large.png")
        ? athlete.profile
        : athlete.profile_medium || null;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { stravaAthleteId },
    });

    const isMainAthlete = athlete.id === 168998449;

    let user;
    if (existingUser) {
      // Update tokens & avatar
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName,
          avatarUrl,
          stravaAccessToken: data.access_token,
          stravaRefreshToken: data.refresh_token,
          tokenExpiresAt: data.expires_at,
          // Ensure username exists
          username: existingUser.username || `${baseUsername}-${athlete.id}`,
        },
      });
    } else {
      // Create new User with default athlete parameters
      user = await prisma.user.create({
        data: {
          stravaAthleteId,
          username: `${baseUsername}-${String(athlete.id).slice(-4)}`,
          fullName,
          avatarUrl,
          stravaAccessToken: data.access_token,
          stravaRefreshToken: data.refresh_token,
          tokenExpiresAt: data.expires_at,
          // If athlete is 168998449 or first signup, set calibrated defaults:
          goalDistance: "Half Marathon",
          goalTimeSec: 6300, // 1:45:00
          currentPbSec: isMainAthlete ? 7448 : 7448, // 2:04:08
          thresholdHr: isMainAthlete ? 173 : 173,
          maxHr: 190,
          thresholdPaceSec: isMainAthlete ? 280 : 280, // 4:40/km
          trainingPhase: "Base",
          isPublic: true,
        },
      });
    }

    // 3. Create session JWT and save in HTTP-only cookie
    const sessionToken = await createSessionToken({
      userId: user.id,
      stravaAthleteId: user.stravaAthleteId.toString(),
      username: user.username,
    });

    await setSessionCookie(sessionToken);

    // 4. Redirect to dashboard
    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (err) {
    console.error("[Strava Callback] Unexpected error:", err);
    return NextResponse.redirect(`${appUrl}/?error=server_error`);
  }
}
