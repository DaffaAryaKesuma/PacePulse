import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { streamGeminiMultiTurnWithFallback } from "@/lib/gemini";
import { getSportsScienceSystemContext } from "@/lib/sports-science-kb";
import {
  calculateAcwr,
  calculateVdotPredictor,
  resolveActiveTrainingPhase,
} from "@/lib/sports-analytics";
import { formatDuration, metersToKm, speedToPace } from "@/lib/formatting";
import type { ActivityData, SplitData } from "@/types";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

function toActivityData(a: {
  id: string;
  stravaId: bigint;
  name: string;
  type: string;
  startDate: Date;
  distanceMeters: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  averageSpeed: number;
  maxSpeed: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  averageCadence: number | null;
  totalElevationGain: number | null;
  splitsJson: unknown;
  aiFeedback: string | null;
  trainingPhase: string;
  gearName: string | null;
  temperatureC: number | null;
  humidityPct: number | null;
  aqi: number | null;
  trafficFrictionScore: number | null;
  easyRunDisciplineScore: number | null;
  contextTags: string[];
  createdAt: Date;
  userId: string;
}): ActivityData {
  return {
    id: a.id,
    stravaId: a.stravaId.toString(),
    name: a.name,
    type: a.type,
    startDate: a.startDate.toISOString(),
    distanceMeters: a.distanceMeters,
    movingTimeSec: a.movingTimeSec,
    elapsedTimeSec: a.elapsedTimeSec,
    averageSpeed: a.averageSpeed,
    maxSpeed: a.maxSpeed,
    averageHeartrate: a.averageHeartrate,
    maxHeartrate: a.maxHeartrate,
    averageCadence: a.averageCadence,
    totalElevationGain: a.totalElevationGain,
    splitsJson: (a.splitsJson as SplitData[] | null) ?? null,
    aiFeedback: a.aiFeedback,
    trainingPhase: a.trainingPhase,
    gearName: a.gearName,
    temperatureC: a.temperatureC,
    humidityPct: a.humidityPct,
    aqi: a.aqi,
    trafficFrictionScore: a.trafficFrictionScore,
    easyRunDisciplineScore: a.easyRunDisciplineScore,
    contextTags: a.contextTags ?? [],
    createdAt: a.createdAt.toISOString(),
    userId: a.userId,
  };
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const activityId = searchParams.get("activityId");

    const [conversations, activeConversation, focusedActivity] = await Promise.all([
      prisma.coachConversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 30,
        include: {
          activity: {
            select: {
              id: true,
              name: true,
              startDate: true,
              distanceMeters: true,
            },
          },
        },
      }),
      conversationId
        ? prisma.coachConversation.findFirst({
            where: { id: conversationId, userId: user.id },
            include: {
              messages: {
                orderBy: { createdAt: "asc" },
              },
              activity: {
                select: {
                  id: true,
                  name: true,
                  startDate: true,
                  distanceMeters: true,
                  averageSpeed: true,
                  averageHeartrate: true,
                  trainingPhase: true,
                },
              },
            },
          })
        : Promise.resolve(null),
      activityId
        ? prisma.activity.findFirst({
            where: { id: activityId, userId: user.id },
            select: {
              id: true,
              name: true,
              startDate: true,
              distanceMeters: true,
              movingTimeSec: true,
              averageSpeed: true,
              averageHeartrate: true,
              trainingPhase: true,
            },
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        preferredLanguage: user.preferredLanguage,
        goalDistance: user.goalDistance,
        goalTimeSec: user.goalTimeSec,
        trainingPhase: user.trainingPhase,
      },
      conversations,
      activeConversation,
      focusedActivity,
    });
  } catch (err) {
    console.error("[GET /api/coach/chat] Error:", err);
    return NextResponse.json(
      { error: "Failed to load coach conversations" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    await prisma.coachConversation.deleteMany({
      where: { id: conversationId, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/coach/chat] Error:", err);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      message?: string;
      conversationId?: string | null;
      activityId?: string | null;
    };

    const userText = body.message?.trim();
    if (!userText) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    // 1. Fetch all user-specific context & existing conversation in a single parallel Promise.all
    const [
      recentRawActivities,
      activePlan,
      personalBests,
      gears,
      focusedRawActivity,
      existingConversation,
    ] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId: user.id,
          type: { in: ["Run", "TrailRun", "VirtualRun"] },
        },
        orderBy: { startDate: "desc" },
        take: 30,
      }),
      prisma.weeklyPlan.findFirst({
        where: { userId: user.id },
        orderBy: { weekStart: "desc" },
      }),
      prisma.personalBest.findMany({
        where: { userId: user.id },
        orderBy: { distanceKey: "asc" },
      }),
      prisma.gear.findMany({
        where: { userId: user.id },
        orderBy: [{ primary: "desc" }, { distanceKm: "desc" }],
      }),
      body.activityId
        ? prisma.activity.findFirst({
            where: { id: body.activityId, userId: user.id },
          })
        : Promise.resolve(null),
      body.conversationId
        ? prisma.coachConversation.findFirst({
            where: { id: body.conversationId, userId: user.id },
            include: {
              messages: {
                orderBy: { createdAt: "asc" },
                take: 20,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const activityPool = recentRawActivities.map(toActivityData);
    const acwr = calculateAcwr(activityPool);
    const vdotResult = calculateVdotPredictor(activityPool);
    const resolvedPhase = resolveActiveTrainingPhase(user, activityPool, acwr);

    // Safe physiological defaults if user hasn't filled every biometric field
    const maxHr = user.maxHr || 190;
    const lt2Hr = user.thresholdHr ?? Math.round(maxHr * 0.89);
    const lt1Hr = Math.max(120, lt2Hr - 11);
    const estRestingHr = Math.max(42, Math.min(72, Math.round(maxHr * 0.28)));
    const lang = user.preferredLanguage === "en" ? "en" : "id";

    const hrZonesSummary = [
      `Z1 Recovery: < ${Math.round(maxHr * 0.7)} bpm`,
      `Z2 Aerobic (Sub-LT1): ${Math.round(maxHr * 0.7)}-${lt1Hr} bpm`,
      `Z3 Tempo (Grey Zone): ${lt1Hr + 1}-${lt2Hr - 1} bpm`,
      `Z4 Threshold (LT2): ${lt2Hr}-${Math.round(maxHr * 0.94)} bpm`,
      `Z5 VO2Max: > ${Math.round(maxHr * 0.94)} bpm`,
    ].join(" | ");

    const goalText =
      !user.goalDistance || user.goalDistance === "General Fitness"
        ? "General Fitness / Aerobic Base & Consistency"
        : user.goalTimeSec
          ? `${user.goalDistance} in ${formatDuration(user.goalTimeSec)}`
          : user.goalDistance;

    const pbSummary =
      personalBests.length > 0
        ? personalBests
            .map(
              (pb) =>
                `${pb.distanceKey}: ${formatDuration(pb.timeSeconds)} (${Math.floor(pb.paceSecPerKm / 60)}:${(pb.paceSecPerKm % 60).toString().padStart(2, "0")}/km)`
            )
            .join(" | ")
        : "No official Personal Bests synced yet";

    const gearSummary =
      gears.length > 0
        ? gears.map((g) => `${g.name} (${g.distanceKm.toFixed(1)} km)`).join(", ")
        : "No Strava gear synced";

    const last8RunsSummary =
      activityPool.slice(0, 8).length > 0
        ? activityPool
            .slice(0, 8)
            .map(
              (a) =>
                `- ${a.startDate.slice(0, 10)} "${a.name}": ${metersToKm(a.distanceMeters)} km @ ${speedToPace(a.averageSpeed)}/km, Avg HR ${a.averageHeartrate ? Math.round(a.averageHeartrate) : "N/A"} bpm, Phase ${a.trainingPhase}, EasyDisc ${a.easyRunDisciplineScore ?? "N/A"}, Temp ${a.temperatureC ?? "N/A"}°C, Tags [${(a.contextTags ?? []).join(", ")}]`
            )
            .join("\n")
        : "No runs recorded yet.";

    const focusedActivitySection = focusedRawActivity
      ? (() => {
          const splits = Array.isArray(focusedRawActivity.splitsJson)
            ? (focusedRawActivity.splitsJson as unknown as SplitData[])
                .slice(0, 25)
                .map(
                  (s) =>
                    `KM ${s.split}: ${speedToPace(s.average_speed)}/km, HR ${s.average_heartrate ? Math.round(s.average_heartrate) : "N/A"} bpm, Elev ${s.elevation_difference ?? 0}m`
                )
                .join(" | ")
            : "No split telemetry";
          return `
FOCUSED ACTIVITY FOR DEEP-DIVE DISCUSSION:
- Name: ${focusedRawActivity.name} (${focusedRawActivity.startDate.toISOString().slice(0, 10)})
- Distance: ${metersToKm(focusedRawActivity.distanceMeters)} km | Duration: ${formatDuration(focusedRawActivity.movingTimeSec)} | Avg Pace: ${speedToPace(focusedRawActivity.averageSpeed)}/km
- Avg HR: ${focusedRawActivity.averageHeartrate ? Math.round(focusedRawActivity.averageHeartrate) : "N/A"} bpm | Max HR: ${focusedRawActivity.maxHeartrate ? Math.round(focusedRawActivity.maxHeartrate) : "N/A"} bpm
- Elevation Gain: ${focusedRawActivity.totalElevationGain?.toFixed(0) ?? "N/A"} m | Shoe: ${focusedRawActivity.gearName ?? "N/A"}
- Environment: Temp ${focusedRawActivity.temperatureC ?? "N/A"}°C, Humidity ${focusedRawActivity.humidityPct ?? "N/A"}%, AQI ${focusedRawActivity.aqi ?? "N/A"}, Traffic Friction ${focusedRawActivity.trafficFrictionScore ?? "N/A"}
- Easy-Run Discipline Score: ${focusedRawActivity.easyRunDisciplineScore ?? "N/A"} | Context Tags: [${(focusedRawActivity.contextTags ?? []).join(", ")}]
- Kilometer Splits: ${splits}
- Existing AI Evaluation: ${focusedRawActivity.aiFeedback ?? "Not analyzed yet"}
`;
        })()
      : "";

    const activePlanSummary = activePlan
      ? `Active Weekly Plan (Week of ${activePlan.weekStart.toISOString().slice(0, 10)}): ${JSON.stringify(activePlan.planJson).slice(0, 1800)}`
      : "No active WeeklyPlan generated yet.";

    const systemPrompt = `You are PacePulse AI Sports Science Coach — an elite, objective, evidence-based endurance running coach.
Respond strictly in **${lang === "id" ? "Bahasa Indonesia" : "English"}** (keeping universal running/sports-science terms like pace, VDOT, ACWR, LT1, LT2, cadence, cardiac drift clear).

${getSportsScienceSystemContext()}

ATHLETE TELEMETRY & PHYSIOLOGY (100% PERSONALIZED FOR THIS USER):
- Athlete: ${user.fullName}
- Target Goal: ${goalText}${user.targetRaceDate ? ` (Race Date: ${user.targetRaceDate.toISOString().slice(0, 10)})` : ""}
- Active Periodization Phase: ${resolvedPhase.labelEn} (${resolvedPhase.isAuto ? "Auto-resolved" : "Manual"}) — ${lang === "id" ? resolvedPhase.reasonId : resolvedPhase.reasonEn}
- Biometrics: Max HR = ${maxHr} bpm | Est. Resting HR = ${estRestingHr} bpm | LT1 (Z2 Cap) = ${lt1Hr} bpm | LT2 (Threshold) = ${lt2Hr} bpm${user.thresholdPaceSec ? ` | Threshold Pace = ${Math.floor(user.thresholdPaceSec / 60)}:${(user.thresholdPaceSec % 60).toString().padStart(2, "0")}/km` : ""}
- HR Zones: ${hrZonesSummary}
- VDOT: ${vdotResult?.vdot ?? "Unknown"} | ACWR: ${acwr.ratio} (${acwr.status}) | Acute 7d: ${acwr.acuteKm} km | Chronic 28d avg: ${acwr.chronicWeeklyAvgKm} km/wk
- Personal Bests: ${pbSummary}
- Shoe Rotation (Gear): ${gearSummary}

${activePlanSummary}

RECENT 8 RUNS:
${last8RunsSummary}
${focusedActivitySection}

COACHING RULES:
1. Ground every answer in the athlete's ACTUAL telemetry above and cite relevant sports science principles (Stephen Seiler 80/20 Polarized Training, Jack Daniels VDOT & 10% Rule, Pete Pfitzinger Cardiac Drift, Marius Bakken Sub-LT2, Malisoux Shoe Rotation).
2. Be objective, honest, and actionable — flag Grey Zone / Ego-Run tendencies or high ACWR (> 1.3) when present in their data.
3. Format responses cleanly in Markdown (headings, bold metrics, bullet points, or compact Markdown tables when comparing splits/zones/paces).`;

    // 2. Resolve or create CoachConversation (owned by user.id)
    const conversation =
      existingConversation ??
      (await prisma.coachConversation.create({
        data: {
          userId: user.id,
          activityId: focusedRawActivity?.id ?? null,
          title: focusedRawActivity
            ? focusedRawActivity.name
            : userText.slice(0, 56) + (userText.length > 56 ? "..." : ""),
        },
        include: {
          messages: true,
        },
      }));

    // 3. Persist User Message & start Gemini SSE Stream
    const savedUserMsg = await prisma.coachMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: userText,
      },
    });

    const historyContents = conversation.messages.slice(-12).map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
    }));
    historyContents.push({
      role: "user",
      parts: [{ text: userText }],
    });

    const { stream: geminiStream } = await streamGeminiMultiTurnWithFallback(
      systemPrompt,
      historyContents
    );

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const sseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const sendEvent = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        sendEvent({
          type: "meta",
          conversationId: conversation.id,
          title: conversation.title,
          userMessage: savedUserMsg,
        });

        let fullReply = "";
        let sseBuffer = "";
        const reader = geminiStream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split(/\r?\n/);
            sseBuffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const jsonStr = trimmed.slice(5).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr) as {
                  candidates?: Array<{
                    content?: { parts?: Array<{ text?: string }> };
                  }>;
                };
                const parts = parsed.candidates?.[0]?.content?.parts ?? [];
                for (const part of parts) {
                  if (part.text) {
                    fullReply += part.text;
                    sendEvent({ type: "chunk", text: part.text });
                  }
                }
              } catch {
                // Ignore partial JSON lines
              }
            }
          }

          // onFinal: persist complete assistant reply to CoachMessage
          const finalText = fullReply.trim();
          if (finalText) {
            const [savedAssistantMsg] = await Promise.all([
              prisma.coachMessage.create({
                data: {
                  conversationId: conversation.id,
                  role: "assistant",
                  content: finalText,
                },
              }),
              prisma.coachConversation.update({
                where: { id: conversation.id },
                data: { updatedAt: new Date() },
              }),
            ]);
            sendEvent({ type: "done", assistantMessage: savedAssistantMsg });
          } else {
            sendEvent({
              type: "error",
              error: "Empty response from AI Coach",
            });
          }
        } catch (streamErr) {
          console.error("[POST /api/coach/chat] Stream error:", streamErr);
          sendEvent({
            type: "error",
            error: streamErr instanceof Error ? streamErr.message : "Streaming error",
          });
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[POST /api/coach/chat] Error:", err);
    return NextResponse.json(
      {
        error: "Failed to generate AI Coach response",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
