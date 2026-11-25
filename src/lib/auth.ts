import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import type { User } from "@prisma/client";

const COOKIE_NAME = "pacepulse_session";
const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "pacepulse_default_session_secret_at_least_32_characters_long_12345"
);

export interface SessionPayload {
  userId: string;
  stravaAthleteId: string;
  username?: string | null;
}

/**
 * Creates an encrypted session JWT
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SESSION_SECRET);
}

/**
 * Verifies a session JWT
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently authenticated User from request cookies
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    return user;
  } catch (err) {
    console.error("[Auth] getSessionUser error:", err);
    return null;
  }
}

/**
 * Sets the session cookie on response
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Deletes the session cookie (logout)
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
