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
      goalDistance?: string | null;
      goalTimeSec?: number | null;
      currentPbSec?: number | null;
      thresholdHr?: number | null;
      maxHr?: number | null;
      restingHr?: number | null;
      manualLt1Hr?: number | null;
      manualLt2Hr?: number | null;
      manualThresholdPace?: number | null;
      thresholdPaceSec?: number | null;
      trainingPhase?: string;
      targetRaceDate?: string | null;
      isPublic?: boolean;
      preferredLanguage?: string;
      retiredGearNames?: string[];
      availableRunDays?: string[];
      preferredLongRunDay?: string | null;
      username?: string;
    };

    const dataToUpdate: Record<string, unknown> = {};

    if (body.goalDistance !== undefined) dataToUpdate.goalDistance = body.goalDistance;
    if (body.goalTimeSec !== undefined) dataToUpdate.goalTimeSec = body.goalTimeSec;
    if (body.currentPbSec !== undefined) dataToUpdate.currentPbSec = body.currentPbSec;
    if (body.thresholdHr !== undefined) dataToUpdate.thresholdHr = body.thresholdHr;
    if (body.maxHr !== undefined) dataToUpdate.maxHr = body.maxHr;
    if (body.restingHr !== undefined) dataToUpdate.restingHr = body.restingHr;
    if (body.manualLt1Hr !== undefined) dataToUpdate.manualLt1Hr = body.manualLt1Hr;
    if (body.manualLt2Hr !== undefined) dataToUpdate.manualLt2Hr = body.manualLt2Hr;
    if (body.manualThresholdPace !== undefined) dataToUpdate.manualThresholdPace = body.manualThresholdPace;
    if (body.thresholdPaceSec !== undefined) dataToUpdate.thresholdPaceSec = body.thresholdPaceSec;
    if (body.trainingPhase !== undefined) dataToUpdate.trainingPhase = body.trainingPhase;
    if (body.targetRaceDate !== undefined) {
      dataToUpdate.targetRaceDate = body.targetRaceDate
        ? new Date(body.targetRaceDate)
        : null;
    }
    if (typeof body.isPublic === "boolean") dataToUpdate.isPublic = body.isPublic;
    if (body.preferredLanguage === "id" || body.preferredLanguage === "en") {
      dataToUpdate.preferredLanguage = body.preferredLanguage;
    }
    if (Array.isArray(body.retiredGearNames)) {
      const cleanedMap = new Map<string, string>();
      for (const item of body.retiredGearNames) {
        if (typeof item === "string") {
          const trimmed = item.trim();
          if (trimmed) cleanedMap.set(trimmed.toLowerCase(), trimmed);
        }
      }
      dataToUpdate.retiredGearNames = Array.from(cleanedMap.values());
    }
    if (Array.isArray(body.availableRunDays)) {
      const validDays = Array.from(
        new Set(body.availableRunDays.filter((d): d is string => typeof d === "string" && d.trim().length > 0))
      );
      if (validDays.length < 2) {
        return NextResponse.json(
          { error: "Pilih minimal 2 hari lari aktif dalam seminggu." },
          { status: 400 }
        );
      }
      dataToUpdate.availableRunDays = validDays;
    }
    if (body.preferredLongRunDay !== undefined) {
      const longDay = body.preferredLongRunDay?.trim() || null;
      dataToUpdate.preferredLongRunDay = longDay;
      if (longDay && Array.isArray(dataToUpdate.availableRunDays)) {
        const list = dataToUpdate.availableRunDays as string[];
        if (!list.includes(longDay)) list.push(longDay);
      }
    }

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
        restingHr: updated.restingHr,
        manualLt1Hr: updated.manualLt1Hr,
        manualLt2Hr: updated.manualLt2Hr,
        manualThresholdPace: updated.manualThresholdPace,
        thresholdPaceSec: updated.thresholdPaceSec,
        trainingPhase: updated.trainingPhase,
        targetRaceDate: updated.targetRaceDate ? updated.targetRaceDate.toISOString() : null,
        isPublic: updated.isPublic,
        preferredLanguage: updated.preferredLanguage,
        retiredGearNames: updated.retiredGearNames ?? [],
        availableRunDays: updated.availableRunDays ?? ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
        preferredLongRunDay: updated.preferredLongRunDay ?? null,
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
