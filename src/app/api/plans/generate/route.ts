import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { buildUserPlanContext } from "@/lib/plan-context";
import { generateWeeklyPlanWithGemini } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bodyLanguage: "id" | "en" | undefined;
  try {
    const body = (await request.json()) as { language?: unknown };
    if (body.language === "id" || body.language === "en") {
      bodyLanguage = body.language;
    }
  } catch {
    // Empty body is fine
  }

  try {
    const { weekStart, vdot, acwr, resolvedPhase, planCtx } = await buildUserPlanContext(user);
    if (bodyLanguage) {
      planCtx.language = bodyLanguage;
    }
    const result = await generateWeeklyPlanWithGemini(planCtx);

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
        rescheduleNote: null,
      },
      create: {
        userId: user.id,
        weekStart,
        planJson: payload as unknown as Prisma.InputJsonValue,
        rescheduleNote: null,
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
    console.error("[POST /api/plans/generate] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate weekly plan", details: String(err) },
      { status: 500 }
    );
  }
}
