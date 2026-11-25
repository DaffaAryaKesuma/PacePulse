import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "STRAVA_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/auth/strava/callback`;

  const stravaAuthUrl = new URL("https://www.strava.com/oauth/authorize");
  stravaAuthUrl.searchParams.set("client_id", clientId);
  stravaAuthUrl.searchParams.set("redirect_uri", redirectUri);
  stravaAuthUrl.searchParams.set("response_type", "code");
  stravaAuthUrl.searchParams.set("approval_prompt", "auto");
  stravaAuthUrl.searchParams.set("scope", "read,activity:read_all,profile:read_all");

  return NextResponse.redirect(stravaAuthUrl.toString());
}
