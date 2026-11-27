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
  let bodyAvailableRunDays: string[] | undefined;
  let bodyPreferredLongRunDay: string | null | undefined;
  try {
    const body = (await request.json()) as {
      language?: unknown;
      availableRunDays?: unknown;
      preferredLongRunDay?: unknown;
    };
    if (body.language === "id" || body.language === "en") {
      bodyLanguage = body.language;
    }
    if (Array.isArray(body.availableRunDays)) {
      const valid = Array.from(
        new Set(
          body.availableRunDays.filter(
            (d): d is string => typeof d === "string" && d.trim().length > 0
          )
        )
      );
      if (valid.length >= 2) {
        bodyAvailableRunDays = valid;
      }
    }
    if (body.preferredLongRunDay === null || typeof body.preferredLongRunDay === "string") {
      bodyPreferredLongRunDay = body.preferredLongRunDay ? body.preferredLongRunDay.trim() : null;
    }
  } catch {
    // Empty body is fine
  }

  try {
    // Persist updated schedule preferences if sent with generate request
    if (bodyAvailableRunDays !== undefined || bodyPreferredLongRunDay !== undefined) {
      const nextDays = bodyAvailableRunDays ?? user.availableRunDays ?? [
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
        "Minggu",
      ];
      if (bodyPreferredLongRunDay && !nextDays.includes(bodyPreferredLongRunDay)) {
        nextDays.push(bodyPreferredLongRunDay);
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          availableRunDays: nextDays,
          ...(bodyPreferredLongRunDay !== undefined
            ? { preferredLongRunDay: bodyPreferredLongRunDay }
            : {}),
        },
      });
      user.availableRunDays = nextDays;
      if (bodyPreferredLongRunDay !== undefined) {
        user.preferredLongRunDay = bodyPreferredLongRunDay;
      }
    }

    const { weekStart, vdot, acwr, resolvedPhase, planCtx } = await buildUserPlanContext(user);
    if (bodyLanguage) {
      planCtx.language = bodyLanguage;
    }
    if (bodyAvailableRunDays) {
      planCtx.availableRunDays = bodyAvailableRunDays;
    }
    if (bodyPreferredLongRunDay !== undefined) {
      planCtx.preferredLongRunDay = bodyPreferredLongRunDay;
      const currentDays = planCtx.availableRunDays ?? [];
      if (bodyPreferredLongRunDay && !currentDays.includes(bodyPreferredLongRunDay)) {
        planCtx.availableRunDays = [...currentDays, bodyPreferredLongRunDay];
      }
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
