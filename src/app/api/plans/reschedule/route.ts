import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { buildUserPlanContext, normalizeStoredPlanJson } from "@/lib/plan-context";
import {
  generateWeeklyPlanWithGemini,
  rescheduleWeeklyPlanWithGemini,
} from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { reason?: string; language?: unknown };
    const reason = body.reason?.trim();
    if (!reason) {
      return NextResponse.json(
        { error: "Reschedule reason is required" },
        { status: 400 }
      );
    }

    const { weekStart, vdot, acwr, resolvedPhase, planCtx } = await buildUserPlanContext(user);
    if (body.language === "id" || body.language === "en") {
      planCtx.language = body.language;
    }

    const existing = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId: user.id,
          weekStart,
        },
      },
    });

    const baseDays = existing
      ? normalizeStoredPlanJson(existing.planJson).days
      : (await generateWeeklyPlanWithGemini(planCtx)).days;

    // JS getDay(): 0=Sun..6=Sat -> convert to 0=Mon..6=Sun
    const jsDay = new Date().getDay();
    const todayIndexMonday0 = jsDay === 0 ? 6 : jsDay - 1;

    const result = await rescheduleWeeklyPlanWithGemini(
      planCtx,
      baseDays,
      reason,
      todayIndexMonday0
    );

    const payload = {
      coachSummary: result.coachSummary,
      source: result.source,
      days: result.days,
    };

    const saved = await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: {
          userId: user.id,
          weekStart,
        },
      },
      update: {
        planJson: payload as unknown as Prisma.InputJsonValue,
        rescheduleNote: reason,
      },
      create: {
        userId: user.id,
        weekStart,
        planJson: payload as unknown as Prisma.InputJsonValue,
        rescheduleNote: reason,
      },
    });

    return NextResponse.json({
      plan: {
        id: saved.id,
        weekStart: saved.weekStart.toISOString(),
        days: result.days,
        coachSummary: result.coachSummary,
        source: result.source,
        rescheduleNote: saved.rescheduleNote,
        updatedAt: saved.updatedAt.toISOString(),
      },
      vdot,
      acwr,
      resolvedPhase,
    });
  } catch (err) {
    console.error("[POST /api/plans/reschedule] Error:", err);
    return NextResponse.json(
      { error: "Failed to reschedule weekly plan", details: String(err) },
      { status: 500 }
    );
  }
}
