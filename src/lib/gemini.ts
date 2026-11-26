// Gemini AI integration for running analysis with Sports Science Knowledge Base
import { getSportsScienceSystemContext } from "./sports-science-kb";
import { formatDuration } from "./formatting";
import type { WeeklyPlanDay } from "@/types";

interface SplitData {
  split: number;
  average_speed: number;
  average_heartrate?: number;
  elevation_difference?: number;
  moving_time: number;
}

interface RunningMetrics {
  name: string;
  distanceKm: number;
  avgPace: string;
  avgHr?: number | null;
  maxHr?: number | null;
  cadenceSpm?: number | null;
  elevationGain?: number | null;
  splits?: SplitData[];
  trainingPhase?: string;
  temperatureC?: number | null;
  humidityPct?: number | null;
  aqi?: number | null;
  trafficFrictionScore?: number | null;
  easyRunDisciplineScore?: number | null;
  contextTags?: string[];
}

export interface AthleteProfile {
  fullName?: string;
  goalDistance?: string | null;
  goalTimeSec?: number | null;
  currentPbSec?: number | null;
  thresholdHr?: number | null;
  maxHr?: number | null;
  thresholdPaceSec?: number | null;
  trainingPhase?: string;
  preferredLanguage?: string;
}

const DEFAULT_PROFILE: AthleteProfile = {
  fullName: "Athlete",
  goalDistance: null,
  goalTimeSec: null,
  currentPbSec: null,
  thresholdHr: 173,
  maxHr: 190,
  thresholdPaceSec: 280, // 4:40/km
  trainingPhase: "Base",
  preferredLanguage: "id",
};

function formatPaceSec(sec: number | null | undefined): string {
  if (!sec) return "N/A";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

/**
 * Builds dynamic system instruction based on the user's personal profile and sports science knowledge base
 */
function buildSystemPrompt(userProfile?: AthleteProfile, languageOverride?: "id" | "en"): string {
  const profile = { ...DEFAULT_PROFILE, ...userProfile };
  const lang: "id" | "en" =
    languageOverride ?? (profile.preferredLanguage === "en" ? "en" : "id");

  const primaryGoalText =
    !profile.goalDistance || profile.goalDistance === "General Fitness"
      ? "General Fitness / Aerobic Base & Consistency"
      : profile.goalTimeSec
      ? `${profile.goalDistance} in ${formatDuration(profile.goalTimeSec)}`
      : profile.goalDistance;

  const athleteContext = `
ATHLETE PROFILE:
- Name: ${profile.fullName || "Athlete"}
- Primary Goal: ${primaryGoalText}
- Current Best (PB): ${profile.currentPbSec ? formatDuration(profile.currentPbSec) : "Not specified"}
- Threshold HR (LT2): ${profile.thresholdHr ? `${profile.thresholdHr} bpm` : "Estimated 173 bpm"}
- Maximum HR: ${profile.maxHr ? `${profile.maxHr} bpm` : "190 bpm"}
- Threshold Pace: ${formatPaceSec(profile.thresholdPaceSec)}
- Current Focus Phase: ${profile.trainingPhase || "Base"}
`;

  const languageDirective =
    lang === "id"
      ? `LANGUAGE & STYLE DIRECTIVE:
Write the ENTIRE diagnosis, physiological evaluation, and next-session recommendation in natural, sharp **Bahasa Indonesia**, while keeping universal running/sports-science terms in English (e.g., pace, cadence, heart rate, cardiac drift, threshold, LT2, splits).
Use these exact 4 section headings:
1. **Ringkasan Sesi (Session Summary)** (2-3 kalimat: apa yang dicapai, kepatuhan terhadap zona target, serta konteks cuaca/AQI/friksi lalu lintas jika tersedia).
2. **Observasi Utama (Key Observations)** (2-3 poin: konsistensi pacing, HR drift/decoupling, cadence, dampak elevasi, serta **Ego-Run Check** bila ini sesi Easy/Recovery namun HR/pace terlalu tinggi atau ada faktor gaya hidup seperti kurang tidur/kafein/stres).
3. **Konteks Literatur Sains Olahraga (Sports Science Literature Context)** (WAJIB: kutip eksplisit 1-2 prinsip dari Knowledge Base di atas, misalnya Jack Daniels VDOT/10% rule, Seiler 80/20 polarized model, Pfitzinger cardiac drift, Marius Bakken sub-threshold, atau Malisoux shoe rotation).
4. **Rekomendasi Sesi Berikutnya (Next Session Recommendation)** (1-2 kalimat: resep latihan berikutnya dengan target pace/batas HR spesifik dan panduan pemulihan).`
      : `LANGUAGE & STYLE DIRECTIVE:
Write the ENTIRE diagnosis in crisp, professional **English**.
Your feedback MUST include these exact 4 section headings:
1. **Session Summary** (2-3 sentences: what was accomplished, target zone compliance, and weather/AQI/traffic friction context if available).
2. **Key Observations** (2-3 bullet points: pacing consistency, HR drift/decoupling, cadence, elevation impact, and an **Ego-Run Check** if an Easy/Recovery session was run too hard or impacted by lifestyle tags like poor sleep/caffeine/stress).
3. **Sports Science Literature Context** (CRITICAL: You MUST explicitly cite at least 1-2 scientific principles from the Knowledge Base above, e.g. Jack Daniels' VDOT/10% rule, Seiler's 80/20 polarized model, Pfitzinger's cardiac drift threshold, Marius Bakken's sub-threshold lactate control, or Malisoux shoe rotation).
4. **Next Session Recommendation** (1-2 sentences: exact next prescription with target pace/HR ceiling and recovery guidance).`;

  return `You are an elite, evidence-based sports science running coach.
${athleteContext}

${getSportsScienceSystemContext()}

COACHING DIRECTIVES:
Analyze the provided running telemetry session with scientific rigor.
${languageDirective}

Tone: Analytical, motivating, data-driven, concise. Keep total output under 260 words.`;
}

export async function callGeminiMultiTurnWithFallback(
  systemPrompt: string,
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              temperature: options?.temperature ?? 0.65,
              maxOutputTokens: options?.maxOutputTokens ?? 4096,
            },
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        lastError = new Error(`Gemini API error (${model}): ${response.status} ${text}`);
        if (response.status === 503 || response.status === 429 || response.status === 404) {
          console.warn(`[Gemini Coach] ${model} returned ${response.status}, trying next fallback model...`);
          continue;
        }
        throw lastError;
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) {
        return text.trim();
      }
      lastError = new Error(`Empty response from ${model}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Gemini Coach] ${model} failed: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error("All Gemini models failed");
}

export async function streamGeminiMultiTurnWithFallback(
  systemPrompt: string,
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<{ stream: ReadableStream<Uint8Array>; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              temperature: options?.temperature ?? 0.65,
              maxOutputTokens: options?.maxOutputTokens ?? 4096,
            },
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        lastError = new Error(`Gemini SSE error (${model}): ${response.status} ${text}`);
        if (response.status === 503 || response.status === 429 || response.status === 404) {
          console.warn(`[Gemini Coach SSE] ${model} returned ${response.status}, trying next fallback model...`);
          continue;
        }
        throw lastError;
      }

      if (response.body) {
        return { stream: response.body, model };
      }
      lastError = new Error(`Empty stream body from ${model}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Gemini Coach SSE] ${model} failed: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error("All Gemini streaming models failed");
}

async function callGeminiWithFallback(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; responseMimeType?: string }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const generationConfig: Record<string, unknown> = {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: 4096,
      };
      if (options?.responseMimeType) {
        generationConfig.responseMimeType = options.responseMimeType;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        lastError = new Error(`Gemini API error (${model}): ${response.status} ${text}`);
        // Retry on transient overload / rate limit / model unavailability
        if (response.status === 503 || response.status === 429 || response.status === 404) {
          console.warn(`[Gemini] ${model} returned ${response.status}, trying next fallback model...`);
          continue;
        }
        throw lastError;
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error(`No response text from Gemini (${model})`);
        continue;
      }

      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Gemini] ${model} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error("All Gemini fallback models failed");
}

/**
 * Sends running metrics to Gemini AI and returns coaching feedback
 */
export async function getGeminiFeedback(
  metrics: RunningMetrics,
  athleteProfile?: AthleteProfile,
  language?: "id" | "en"
): Promise<string> {
  const splitsText = metrics.splits && metrics.splits.length > 0
    ? metrics.splits
        .map(
          (s) =>
            `  KM ${s.split}: Pace ${speedToPaceInline(s.average_speed)}/km | HR ${s.average_heartrate ? Math.round(s.average_heartrate) + " bpm" : "N/A"} | Elev ${s.elevation_difference?.toFixed(1) ?? "0"}m`
        )
        .join("\n")
    : "No split data available";

  const envLines: string[] = [];
  if (typeof metrics.temperatureC === "number") {
    envLines.push(`- Temperature: ${metrics.temperatureC}°C${typeof metrics.humidityPct === "number" ? `, Humidity: ${metrics.humidityPct}%` : ""}`);
  }
  if (typeof metrics.aqi === "number") {
    envLines.push(`- Air Quality (US AQI): ${metrics.aqi}`);
  }
  if (typeof metrics.trafficFrictionScore === "number") {
    envLines.push(`- Traffic/Route Friction Score: ${metrics.trafficFrictionScore}/100 (0=sterile track, >50=heavy traffic/stops)`);
  }
  if (typeof metrics.easyRunDisciplineScore === "number") {
    envLines.push(`- Easy Run Aerobic Discipline Score: ${metrics.easyRunDisciplineScore}/100 (low score indicates Ego-Run above aerobic cap)`);
  }
  if (metrics.contextTags && metrics.contextTags.length > 0) {
    envLines.push(`- Athlete Lifestyle Context Tags: ${metrics.contextTags.join(", ")}`);
  }

  const envBlock = envLines.length > 0
    ? `\n**Environmental, Route & Lifestyle Context:**\n${envLines.join("\n")}\n`
    : "";

  const userPrompt = `Analyze this running session:

**Activity Name:** ${metrics.name}
**Session Phase:** ${metrics.trainingPhase || athleteProfile?.trainingPhase || "Base"}
**Distance:** ${metrics.distanceKm.toFixed(2)} km
**Average Pace:** ${metrics.avgPace}/km
**Average HR:** ${metrics.avgHr ? Math.round(metrics.avgHr) + " bpm" : "N/A"}
**Max HR:** ${metrics.maxHr ? Math.round(metrics.maxHr) + " bpm" : "N/A"}
**Cadence:** ${metrics.cadenceSpm ? metrics.cadenceSpm + " spm" : "N/A"}
**Total Elevation Gain:** ${metrics.elevationGain ? metrics.elevationGain.toFixed(0) + " m" : "N/A"}${envBlock}

**Splits per km:**
${splitsText}`;

  const systemPrompt = buildSystemPrompt(athleteProfile, language);
  return callGeminiWithFallback(systemPrompt, userPrompt, { temperature: 0.7 });
}

function extractJsonArray(raw: string): WeeklyPlanDay[] {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (Array.isArray(parsed)) {
    return parsed as WeeklyPlanDay[];
  }
  if (parsed && typeof parsed === "object" && "days" in parsed && Array.isArray((parsed as { days: unknown }).days)) {
    return (parsed as { days: WeeklyPlanDay[] }).days;
  }
  throw new Error("Invalid WeeklyPlan JSON format from Gemini");
}

export interface RecentRunSummary {
  name: string;
  startDate: string;
  distanceKm: number;
  avgPace: string;
  avgHr: number | null;
  easyRunDisciplineScore: number | null;
  trafficFrictionScore: number | null;
  temperatureC: number | null;
  contextTags: string[];
}

export interface PlanGenerationContext {
  profile: AthleteProfile;
  maxHr: number;
  lt1Hr: number;
  lt2Hr: number;
  targetRaceDistance: string;
  targetRaceTime: string;
  vdot: number | null;
  acwrRatio: number;
  acwrStatus: string;
  acuteKm: number;
  chronicWeeklyAvgKm: number;
  maxSafeWeeklyKm: number;
  deloadTriggered: boolean;
  shoes: string[];
  recentRuns: RecentRunSummary[];
  language: "id" | "en";
}

export interface GeneratedWeeklyPlanResult {
  coachSummary: string;
  source: "gemini" | "engine";
  days: WeeklyPlanDay[];
}

function extractPlanPayload(raw: string): {
  coachSummary: string | null;
  days: WeeklyPlanDay[];
} {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (Array.isArray(parsed)) {
    return { coachSummary: null, days: parsed as WeeklyPlanDay[] };
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    "days" in parsed &&
    Array.isArray((parsed as { days: unknown }).days)
  ) {
    const obj = parsed as { coachSummary?: unknown; days: WeeklyPlanDay[] };
    return {
      coachSummary: typeof obj.coachSummary === "string" ? obj.coachSummary : null,
      days: obj.days,
    };
  }
  throw new Error("Invalid WeeklyPlan JSON format from Gemini");
}

function enforcePlanGuardrails(
  days: WeeklyPlanDay[],
  ctx: PlanGenerationContext
): WeeklyPlanDay[] {
  const isId = ctx.language === "id";
  const result = days.map((d) => ({ ...d }));

  // 1. Deload guardrail: no "hard" intervals/tempo when deloadTriggered
  if (ctx.deloadTriggered) {
    for (let i = 0; i < result.length; i++) {
      if (result[i].intensity === "hard") {
        result[i] = {
          ...result[i],
          sessionType: isId ? "Easy Recovery Run" : "Easy Recovery Run",
          hrCap: `≤ ${ctx.lt1Hr} bpm`,
          intensity: "easy",
          literatureCitation: "Pete Pfitzinger's Faster Road Racing",
        };
      }
    }
  }

  // 2. Never stack two heavy (hard/long) sessions on consecutive days
  for (let i = 1; i < result.length; i++) {
    const prevHeavy =
      result[i - 1].intensity === "hard" || result[i - 1].intensity === "long";
    const currHeavy =
      result[i].intensity === "hard" || result[i].intensity === "long";
    if (prevHeavy && currHeavy) {
      result[i] = {
        ...result[i],
        sessionType: "Easy Run",
        hrCap: `≤ ${ctx.lt1Hr} bpm`,
        intensity: "easy",
        literatureCitation: "Stephen Seiler (Polarized 80/20 Model)",
      };
    }
  }

  // 3. Enforce 10% Jack Daniels progression cap (maxSafeWeeklyKm)
  const totalKm = result.reduce((sum, d) => sum + (Number(d.distanceKm) || 0), 0);
  if (totalKm > ctx.maxSafeWeeklyKm && totalKm > 0) {
    const scale = ctx.maxSafeWeeklyKm / totalKm;
    for (let i = 0; i < result.length; i++) {
      if (result[i].distanceKm > 0) {
        result[i].distanceKm = Math.max(
          2,
          Math.round(result[i].distanceKm * scale * 10) / 10
        );
      }
    }
  }

  // 4. Ensure every day has a literatureCitation
  for (let i = 0; i < result.length; i++) {
    if (!result[i].literatureCitation) {
      result[i].literatureCitation =
        result[i].intensity === "hard"
          ? "Marius Bakken (Norwegian Sub-LT2 Model)"
          : result[i].intensity === "long"
            ? "Pete Pfitzinger's Faster Road Racing"
            : result[i].intensity === "rest"
              ? "Stephen Seiler (Polarized 80/20 Model)"
              : "Jack Daniels' Running Formula";
    }
  }

  return result;
}

function buildDefaultCoachSummary(
  ctx: PlanGenerationContext,
  days: WeeklyPlanDay[]
): string {
  const isId = ctx.language === "id";
  const plannedKm =
    Math.round(days.reduce((s, d) => s + (d.distanceKm || 0), 0) * 10) / 10;

  if (isId) {
    return ctx.deloadTriggered
      ? `Mode Deload/Pemulihan aktif (ACWR ${ctx.acwrRatio} atau indikasi kelelahan/kurang tidur pada 2 sesi terakhir). Volume minggu ini diturunkan menjadi ${plannedKm} km (batas aman ≤ ${ctx.maxSafeWeeklyKm} km vs rata-rata 28 hari ${ctx.chronicWeeklyAvgKm} km/mgg) tanpa sesi interval berat.`
      : `Volume minggu ini ditargetkan ${plannedKm} km (mematuhi batas aman +10% Jack Daniels ≤ ${ctx.maxSafeWeeklyKm} km dari rata-rata 28 hari ${ctx.chronicWeeklyAvgKm} km/mgg, ACWR ${ctx.acwrRatio}). Minimal 80% jarak dijaga di bawah LT1 (≤ ${ctx.lt1Hr} bpm) sesuai model 80/20 Seiler.`;
  }

  return ctx.deloadTriggered
    ? `Deload/Recovery mode triggered (ACWR ${ctx.acwrRatio} or fatigue/poor-sleep tags in last 2 sessions). Weekly volume is reduced to ${plannedKm} km (safe cap ≤ ${ctx.maxSafeWeeklyKm} km vs 28-day avg ${ctx.chronicWeeklyAvgKm} km/wk) with heavy intervals removed.`
    : `Weekly volume is set to ${plannedKm} km (respecting Jack Daniels' 10% cap ≤ ${ctx.maxSafeWeeklyKm} km from 28-day avg ${ctx.chronicWeeklyAvgKm} km/wk, ACWR ${ctx.acwrRatio}). At least 80% of mileage stays below LT1 (≤ ${ctx.lt1Hr} bpm) per Seiler's 80/20 model.`;
}

export async function generateWeeklyPlanWithGemini(
  ctx: PlanGenerationContext
): Promise<GeneratedWeeklyPlanResult> {
  const langLabel = ctx.language === "id" ? "Bahasa Indonesia" : "English";
  const shoeList =
    ctx.shoes.length > 0 ? ctx.shoes.join(", ") : "ASICS Novablast 5, ASICS Magic Speed 4";

  const recentRunsText =
    ctx.recentRuns.length > 0
      ? ctx.recentRuns
          .map(
            (r) =>
              `- ${r.startDate} "${r.name}": ${r.distanceKm}km @ ${r.avgPace}/km, HR ${r.avgHr ?? "N/A"}bpm, EasyDisc ${r.easyRunDisciplineScore ?? "N/A"}, Friction ${r.trafficFrictionScore ?? "N/A"}, Temp ${r.temperatureC ?? "N/A"}°C, Tags: [${r.contextTags.join(", ")}]`
          )
          .join("\n")
      : "No recent runs recorded.";

  const systemPrompt = `You are an elite endurance running coach.
${getSportsScienceSystemContext()}

ATHLETE PHYSIOLOGY & WORKLOAD CONTEXT:
- Target Goal: ${ctx.targetRaceDistance} (${ctx.targetRaceTime}) | Phase: ${ctx.profile.trainingPhase || "Base"}
- Goal Calibration: Tailor workout structure to "${ctx.targetRaceDistance}" (5K = VO2max/economy + aerobic base; 10K = lactate threshold + cruise intervals; Half Marathon = sub-LT2 tempo + progressive long run; Marathon = aerobic durability + marathon-pace long run; General Fitness = 80/20 aerobic base, strides & recovery without aggressive race peaking).
- HR Zones: Max HR = ${ctx.maxHr} bpm | LT1 (Zone 2 aerobic cap) = ${ctx.lt1Hr} bpm | LT2 (Lactate Threshold) = ${ctx.lt2Hr} bpm
- VDOT: ${ctx.vdot ?? "Unknown (use conservative aerobic fitness)"}
- Workload: ACWR = ${ctx.acwrRatio} (${ctx.acwrStatus}) | Acute 7d = ${ctx.acuteKm} km | Chronic 28d avg = ${ctx.chronicWeeklyAvgKm} km/wk
- STRICT MAX SAFE VOLUME CAP: ${ctx.maxSafeWeeklyKm} km/week (${ctx.deloadTriggered ? "DELOAD TRIGGERED: -20% volume & NO heavy intervals" : "Jack Daniels 10% progression cap"})
- Available Shoes (Gear): ${shoeList}

LAST 7 RUNS:
${recentRunsText}

GUARDRAILS:
1. Total weekly distanceKm MUST NOT exceed ${ctx.maxSafeWeeklyKm} km.
2. ${ctx.deloadTriggered ? "DELOAD ACTIVE: Do NOT schedule any 'hard' Intervals/Tempo sessions. Use Easy/Recovery/Rest only." : "Follow Stephen Seiler's 80/20 polarized model (>=80% below LT1 <= " + ctx.lt1Hr + " bpm). Never stack two 'hard' or 'long' sessions on consecutive days."}
3. Output ONLY a valid JSON object: { "coachSummary": string, "days": [7 objects Monday..Sunday] }.
4. Write "coachSummary", "day", "sessionType", and "rationale" in ${langLabel}.
5. Each day object MUST have exact keys:
   - "day", "sessionType", "distanceKm" (number), "targetPace", "hrCap", "shoe", "rationale", "literatureCitation" (one of: "Jack Daniels' Running Formula", "Stephen Seiler (Polarized 80/20 Model)", "Pete Pfitzinger's Faster Road Racing", "Marius Bakken (Norwegian Sub-LT2 Model)", "Malisoux et al. (2015, Scand. J. Med. Sci. Sports)"), "intensity" ("rest"|"easy"|"moderate"|"hard"|"long").`;

  const userPrompt = `Generate a personalized 7-day running plan (Monday to Sunday) respecting all physiological guardrails.`;

  try {
    const raw = await callGeminiWithFallback(systemPrompt, userPrompt, {
      temperature: 0.4,
      responseMimeType: "application/json",
    });
    const parsed = extractPlanPayload(raw);
    const safeDays = enforcePlanGuardrails(parsed.days, ctx);
    return {
      coachSummary: parsed.coachSummary || buildDefaultCoachSummary(ctx, safeDays),
      source: "gemini",
      days: safeDays,
    };
  } catch (err) {
    console.warn("[Gemini Plan] All AI models unavailable, using deterministic Sports Science fallback:", err);
    return buildDeterministicWeeklyPlan(ctx);
  }
}

export async function rescheduleWeeklyPlanWithGemini(
  ctx: PlanGenerationContext,
  currentDays: WeeklyPlanDay[],
  reason: string,
  todayIndexMonday0: number
): Promise<GeneratedWeeklyPlanResult> {
  const langLabel = ctx.language === "id" ? "Bahasa Indonesia" : "English";

  const systemPrompt = `You are an elite adaptive running coach.
${getSportsScienceSystemContext()}

ADAPTIVE RESCHEDULING RULES:
1. Days before index ${todayIndexMonday0} (0=Monday..6=Sunday) are in the past — keep them unchanged.
2. Adapt ONLY today (index ${todayIndexMonday0}) and remaining days based on: "${reason}".
3. NEVER stack two "hard" or "long" sessions on consecutive days. Total weekly volume MUST stay <= ${ctx.maxSafeWeeklyKm} km (ACWR ${ctx.acwrRatio}).
4. Output ONLY a valid JSON object: { "coachSummary": string, "days": [7 objects] } with "literatureCitation" on every day.
5. Write "coachSummary", "day", "sessionType", and "rationale" in ${langLabel}.`;

  const userPrompt = `Constraint: "${reason}" | Today Index: ${todayIndexMonday0}
Current Plan: ${JSON.stringify(currentDays)}`;

  try {
    const raw = await callGeminiWithFallback(systemPrompt, userPrompt, {
      temperature: 0.4,
      responseMimeType: "application/json",
    });
    const parsed = extractPlanPayload(raw);
    const safeDays = enforcePlanGuardrails(parsed.days, ctx);
    return {
      coachSummary: parsed.coachSummary || buildDefaultCoachSummary(ctx, safeDays),
      source: "gemini",
      days: safeDays,
    };
  } catch (err) {
    console.warn("[Gemini Reschedule] All AI models unavailable, using deterministic adaptive fallback:", err);
    return buildDeterministicReschedule(ctx, currentDays, reason, todayIndexMonday0);
  }
}

function buildDeterministicWeeklyPlan(
  ctx: PlanGenerationContext
): GeneratedWeeklyPlanResult {
  const isId = ctx.language === "id";
  const days = isId
    ? ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const vdot = ctx.vdot || 40;
  const easySec = Math.max(270, Math.min(460, Math.round(520 - vdot * 3.1)));
  const threshSec = Math.max(210, Math.min(390, Math.round(440 - vdot * 3.1)));
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const easyPace = `${fmt(easySec)} - ${fmt(easySec + 25)}/km`;
  const threshPace = `${fmt(threshSec)} - ${fmt(threshSec + 15)}/km`;
  const longPace = `${fmt(easySec + 10)} - ${fmt(easySec + 35)}/km`;

  const dailyShoe =
    ctx.shoes.find((s) => s.toLowerCase().includes("novablast")) ||
    ctx.shoes[0] ||
    "ASICS Novablast 5";
  const speedShoe =
    ctx.shoes.find((s) => s.toLowerCase().includes("magic") || s.toLowerCase().includes("speed")) ||
    ctx.shoes[1] ||
    dailyShoe;

  // Allocate safe volume within maxSafeWeeklyKm (80/20 polarized) calibrated to targetRaceDistance
  const budget = ctx.maxSafeWeeklyKm;
  const goalKey = ctx.targetRaceDistance;
  const isGeneralFitness = goalKey === "General Fitness" || !goalKey;
  const longRatio =
    goalKey === "Marathon" ? 0.4 : goalKey === "Half Marathon" ? 0.36 : goalKey === "10K" ? 0.32 : goalKey === "5K" ? 0.28 : 0.3;
  const longDist = Math.max(4, Math.round(budget * longRatio * 10) / 10);
  const qualityDist = ctx.deloadTriggered
    ? Math.max(3, Math.round(budget * 0.22 * 10) / 10)
    : Math.max(3.5, Math.round(budget * 0.2 * 10) / 10);
  const easyDist = Math.max(3, Math.round(((budget - longDist - qualityDist) / 2) * 10) / 10);

  const vo2Pace = `${fmt(Math.max(190, threshSec - 20))} - ${fmt(Math.max(205, threshSec - 8))}/km`;
  const qualitySession = isGeneralFitness
    ? {
        sessionType: "Easy + Strides",
        targetPace: easyPace,
        hrCap: `≤ ${ctx.lt1Hr} bpm`,
        shoe: dailyShoe,
        rationale: isId
          ? "Membangun fondasi aerobik & efisiensi lari dengan 4x20 detik strides ringan tanpa stres laktat."
          : "Builds aerobic base and running economy with 4x20s light strides without lactate stress.",
        literatureCitation: "Stephen Seiler (Polarized 80/20 Model)",
        intensity: "easy" as const,
      }
    : goalKey === "5K"
    ? {
        sessionType: "VO2max Intervals",
        targetPace: vo2Pace,
        hrCap: `≤ ${ctx.maxHr - 8} bpm`,
        shoe: speedShoe,
        rationale: isId
          ? "Interval VO2max (400m-800m) untuk meningkatkan kapasitas aerobik puncak dan kecepatan 5K."
          : "VO2max intervals (400m-800m) to boost peak aerobic power and 5K speed.",
        literatureCitation: "Jack Daniels' Running Formula (I-Pace)",
        intensity: "hard" as const,
      }
    : goalKey === "Marathon"
    ? {
        sessionType: "Tempo / MP Run",
        targetPace: threshPace,
        hrCap: `≤ ${ctx.lt2Hr} bpm`,
        shoe: speedShoe,
        rationale: isId
          ? "Sesi tempo terstruktur untuk efisiensi glikogen dan ketahanan pace maraton."
          : "Structured tempo session for glycogen efficiency and marathon-pace durability.",
        literatureCitation: "Pete Pfitzinger's Advanced Marathoning",
        intensity: "hard" as const,
      }
    : {
        sessionType: "Cruise Intervals",
        targetPace: threshPace,
        hrCap: `≤ ${ctx.lt2Hr} bpm`,
        shoe: speedShoe,
        rationale: isId
          ? `Sesi sub-threshold untuk meningkatkan klirens laktat spesifik target ${goalKey}.`
          : `Sub-threshold cruise intervals to elevate lactate clearance for ${goalKey}.`,
        literatureCitation: "Marius Bakken (Norwegian Sub-LT2 Model)",
        intensity: "hard" as const,
      };

  const rawDays: WeeklyPlanDay[] = [
    {
      day: days[0],
      sessionType: "Rest",
      distanceKm: 0,
      targetPace: "-",
      hrCap: "-",
      shoe: "-",
      rationale: isId
        ? `Pemulihan total awal pekan untuk menjaga ACWR (${ctx.acwrRatio}) tetap aman.`
        : `Full recovery day to keep ACWR (${ctx.acwrRatio}) in a safe zone.`,
      literatureCitation: "Pete Pfitzinger's Faster Road Racing",
      intensity: "rest",
    },
    ctx.deloadTriggered
      ? {
          day: days[1],
          sessionType: "Easy Run",
          distanceKm: qualityDist,
          targetPace: easyPace,
          hrCap: `≤ ${ctx.lt1Hr} bpm`,
          shoe: dailyShoe,
          rationale: isId
            ? "Deload aktif: interval diganti lari aerobik ringan untuk memulihkan sistem saraf."
            : "Deload active: intervals replaced with easy aerobic run to restore freshness.",
          literatureCitation: "Stephen Seiler (Polarized 80/20 Model)",
          intensity: "easy",
        }
      : {
          day: days[1],
          ...qualitySession,
          distanceKm: qualityDist,
        },
    {
      day: days[2],
      sessionType: "Rest",
      distanceKm: 0,
      targetPace: "-",
      hrCap: "-",
      shoe: "-",
      rationale: isId
        ? "Jeda istirahat penuh agar adaptasi otot dan pemulihan glikogen optimal."
        : "Full rest day for muscular repair and glycogen restoration.",
      literatureCitation: "Stephen Seiler (Polarized 80/20 Model)",
      intensity: "rest",
    },
    {
      day: days[3],
      sessionType: "Easy Run",
      distanceKm: easyDist,
      targetPace: easyPace,
      hrCap: `≤ ${ctx.lt1Hr} bpm`,
      shoe: dailyShoe,
      rationale: isId
        ? "Lari Zona 2 membangun kepadatan mitokondria dan kapilarisasi aerobik."
        : "Zone 2 aerobic run building mitochondrial density and capillarization.",
      literatureCitation: "Jack Daniels' Running Formula",
      intensity: "easy",
    },
    {
      day: days[4],
      sessionType: "Rest",
      distanceKm: 0,
      targetPace: "-",
      hrCap: "-",
      shoe: "-",
      rationale: isId
        ? "Rotasi istirahat menjaga kesegaran kaki sebelum volume akhir pekan."
        : "Strategic rest preserving leg freshness ahead of weekend volume.",
      literatureCitation: "Malisoux et al. (2015, Scand. J. Med. Sci. Sports)",
      intensity: "rest",
    },
    {
      day: days[5],
      sessionType: "Easy Run",
      distanceKm: easyDist,
      targetPace: easyPace,
      hrCap: `≤ ${ctx.lt1Hr} bpm`,
      shoe: dailyShoe,
      rationale: isId
        ? "Menjaga kontinuitas aerobik dengan rotasi sepatu bantalan harian."
        : "Maintains aerobic consistency with daily cushioned shoe rotation.",
      literatureCitation: "Malisoux et al. (2015, Scand. J. Med. Sci. Sports)",
      intensity: "easy",
    },
    {
      day: days[6],
      sessionType: "Long Run",
      distanceKm: longDist,
      targetPace: longPace,
      hrCap: `≤ ${ctx.lt1Hr} bpm`,
      shoe: dailyShoe,
      rationale: isId
        ? "Membangun daya tahan aerobik sambil menjaga cardiac drift di bawah 5%."
        : "Builds aerobic endurance while keeping cardiac drift below 5%.",
      literatureCitation: "Pete Pfitzinger's Faster Road Racing",
      intensity: "long",
    },
  ];

  const safeDays = enforcePlanGuardrails(rawDays, ctx);
  return {
    coachSummary: buildDefaultCoachSummary(ctx, safeDays),
    source: "engine",
    days: safeDays,
  };
}

function buildDeterministicReschedule(
  ctx: PlanGenerationContext,
  currentDays: WeeklyPlanDay[],
  reason: string,
  todayIndexMonday0: number
): GeneratedWeeklyPlanResult {
  const isId = ctx.language === "id";
  const updated = currentDays.map((d) => ({ ...d }));
  if (todayIndexMonday0 >= 0 && todayIndexMonday0 < updated.length) {
    const today = updated[todayIndexMonday0];
    const wasHardOrLong = today.intensity === "hard" || today.intensity === "long";

    updated[todayIndexMonday0] = {
      ...today,
      sessionType: "Rest",
      distanceKm: 0,
      targetPace: "-",
      hrCap: "-",
      shoe: "-",
      rationale: isId
        ? `Dialihkan ke istirahat karena: ${reason}.`
        : `Adjusted to rest due to: ${reason}.`,
      literatureCitation: "Pete Pfitzinger's Faster Road Racing",
      intensity: "rest",
    };

    if (wasHardOrLong && !ctx.deloadTriggered) {
      for (let i = todayIndexMonday0 + 1; i < updated.length; i++) {
        if (updated[i].intensity === "rest") {
          const prevHeavy =
            i > 0 && (updated[i - 1].intensity === "hard" || updated[i - 1].intensity === "long");
          const nextHeavy =
            i + 1 < updated.length &&
            (updated[i + 1].intensity === "hard" || updated[i + 1].intensity === "long");
          if (!prevHeavy && !nextHeavy) {
            updated[i] = {
              ...today,
              day: updated[i].day,
              rationale: isId
                ? `Dipindahkan dari ${today.day} tanpa menumpuk sesi berat berurutan.`
                : `Rescheduled from ${today.day} without stacking consecutive hard sessions.`,
            };
            break;
          }
        }
      }
    }
  }

  const safeDays = enforcePlanGuardrails(updated, ctx);
  return {
    coachSummary: buildDefaultCoachSummary(ctx, safeDays),
    source: "engine",
    days: safeDays,
  };
}

export async function translateCoachingText(
  text: string,
  targetLanguage: "id" | "en"
): Promise<string> {
  const targetName = targetLanguage === "id" ? "Bahasa Indonesia" : "English";
  const systemPrompt = `You are a sports science translator. Translate the running coach analysis into natural, accurate ${targetName}.
Keep universal running terms (pace, cadence, heart rate, HR, LT1, LT2, cardiac drift, VDOT, ACWR, splits) intact, and preserve the numbered 4-section structure. Output ONLY the translated text.`;

  try {
    return await callGeminiWithFallback(systemPrompt, text, { temperature: 0.2 });
  } catch {
    // Graceful heading translation fallback if Gemini is overloaded
    if (targetLanguage === "id") {
      return text
        .replace(/Session Summary/gi, "Ringkasan Sesi (Session Summary)")
        .replace(/Key Observations/gi, "Observasi Utama (Key Observations)")
        .replace(/Sports Science Literature Context/gi, "Konteks Literatur Sains Olahraga")
        .replace(/Next Session Recommendation/gi, "Rekomendasi Sesi Berikutnya");
    }
    return text
      .replace(/Ringkasan Sesi \(Session Summary\)|Ringkasan Sesi/gi, "Session Summary")
      .replace(/Observasi Utama \(Key Observations\)|Observasi Utama/gi, "Key Observations")
      .replace(/Konteks Literatur Sains Olahraga \(Sports Science Literature Context\)|Konteks Literatur Sains Olahraga/gi, "Sports Science Literature Context")
      .replace(/Rekomendasi Sesi Berikutnya \(Next Session Recommendation\)|Rekomendasi Sesi Berikutnya/gi, "Next Session Recommendation");
  }
}

function speedToPaceInline(speedMs: number): string {
  if (!speedMs || speedMs <= 0) return "--:--";
  const paceSecPerKm = 1000 / speedMs;
  const minutes = Math.floor(paceSecPerKm / 60);
  const seconds = Math.round(paceSecPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export type { RunningMetrics };
