import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      goalDistance?: string;
      goalTimeSec?: number;
      currentPbSec?: number | null;
      thresholdHr?: number | null;
      maxHr?: number;
      thresholdPaceSec?: number | null;
      trainingPhase?: string;
      discordWebhookUrl?: string | null;
      isPublic?: boolean;
      username?: string;
    };

    const dataToUpdate: Record<string, unknown> = {};

    if (body.goalDistance !== undefined) dataToUpdate.goalDistance = body.goalDistance;
    if (typeof body.goalTimeSec === "number") dataToUpdate.goalTimeSec = body.goalTimeSec;
    if (body.currentPbSec !== undefined) dataToUpdate.currentPbSec = body.currentPbSec;
    if (body.thresholdHr !== undefined) dataToUpdate.thresholdHr = body.thresholdHr;
    if (typeof body.maxHr === "number") dataToUpdate.maxHr = body.maxHr;
    if (body.thresholdPaceSec !== undefined) dataToUpdate.thresholdPaceSec = body.thresholdPaceSec;
    if (body.trainingPhase !== undefined) dataToUpdate.trainingPhase = body.trainingPhase;
    if (body.discordWebhookUrl !== undefined) dataToUpdate.discordWebhookUrl = body.discordWebhookUrl;
    if (typeof body.isPublic === "boolean") dataToUpdate.isPublic = body.isPublic;

    // Handle username update with validation & uniqueness
    if (body.username && body.username.trim() !== user.username) {
      const sanitized = body.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (sanitized.length < 3) {
        return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({
        where: { username: sanitized },
      });

      if (existing && existing.id !== user.id) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }

      dataToUpdate.username = sanitized;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        username: updated.username,
        fullName: updated.fullName,
        goalDistance: updated.goalDistance,
        goalTimeSec: updated.goalTimeSec,
        currentPbSec: updated.currentPbSec,
        thresholdHr: updated.thresholdHr,
        maxHr: updated.maxHr,
        thresholdPaceSec: updated.thresholdPaceSec,
        trainingPhase: updated.trainingPhase,
        discordWebhookUrl: updated.discordWebhookUrl,
        isPublic: updated.isPublic,
      },
    });
  } catch (err) {
    console.error("[User Settings] Error:", err);
    return NextResponse.json(
      { error: "Failed to update settings", details: String(err) },
      { status: 500 }
    );
  }
}
