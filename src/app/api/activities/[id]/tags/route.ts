import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_TAGS = new Set([
  "poor_sleep",
  "high_caffeine",
  "heavy_legs",
  "work_stress",
]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as { contextTags?: unknown };
    if (!Array.isArray(body.contextTags)) {
      return NextResponse.json(
        { error: "contextTags must be an array" },
        { status: 400 }
      );
    }

    const sanitizedTags = Array.from(
      new Set(
        body.contextTags.filter(
          (t): t is string => typeof t === "string" && ALLOWED_TAGS.has(t)
        )
      )
    );

    const existing = await prisma.activity.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const updated = await prisma.activity.update({
      where: { id: existing.id },
      data: { contextTags: sanitizedTags },
      select: { id: true, contextTags: true },
    });

    return NextResponse.json({
      success: true,
      contextTags: updated.contextTags,
    });
  } catch (err) {
    console.error("[PATCH /api/activities/[id]/tags] Error:", err);
    return NextResponse.json(
      { error: "Failed to update context tags", details: String(err) },
      { status: 500 }
    );
  }
}
