import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { buildUserPlanContext, normalizeStoredPlanJson } from "@/lib/plan-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { weekStart, vdot, acwr, resolvedPhase } = await buildUserPlanContext(user);

    const existing = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId: user.id,
          weekStart,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({
        plan: null,
        vdot,
        acwr,
        resolvedPhase,
        goalDistance: user.goalDistance ?? null,
        goalTimeSec: user.goalTimeSec ?? null,
      });
    }

    const normalized = normalizeStoredPlanJson(existing.planJson);

    return NextResponse.json({
      plan: {
        id: existing.id,
        weekStart: existing.weekStart.toISOString(),
        days: normalized.days,
        coachSummary: normalized.coachSummary,
        source: normalized.source,
        rescheduleNote: existing.rescheduleNote,
        updatedAt: existing.updatedAt.toISOString(),
      },
      vdot,
      acwr,
      resolvedPhase,
      goalDistance: user.goalDistance ?? null,
      goalTimeSec: user.goalTimeSec ?? null,
    });
  } catch (err) {
    console.error("[GET /api/plans/current] Error:", err);
    return NextResponse.json(
      { error: "Failed to load current weekly plan" },
      { status: 500 }
    );
  }
}
