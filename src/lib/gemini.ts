// Gemini AI integration for running analysis with Sports Science Knowledge Base
import { getSportsScienceSystemContext } from "./sports-science-kb";
import { formatDuration } from "./formatting";

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
}

export interface AthleteProfile {
  fullName?: string;
  goalDistance?: string;
  goalTimeSec?: number;
  currentPbSec?: number | null;
  thresholdHr?: number | null;
  maxHr?: number | null;
  thresholdPaceSec?: number | null;
  trainingPhase?: string;
}

const DEFAULT_PROFILE: AthleteProfile = {
  fullName: "Athlete",
  goalDistance: "Half Marathon",
  goalTimeSec: 6300, // 1:45:00
  currentPbSec: 7448, // 2:04:08
  thresholdHr: 173,
  maxHr: 190,
  thresholdPaceSec: 280, // 4:40/km
  trainingPhase: "Base",
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
function buildSystemPrompt(userProfile?: AthleteProfile): string {
  const profile = { ...DEFAULT_PROFILE, ...userProfile };

  const athleteContext = `
ATHLETE PROFILE:
- Name: ${profile.fullName || "Athlete"}
- Primary Goal: ${profile.goalDistance} in ${formatDuration(profile.goalTimeSec || 6300)}
- Current Best (PB): ${profile.currentPbSec ? formatDuration(profile.currentPbSec) : "Not specified"}
- Threshold HR (LT2): ${profile.thresholdHr ? `${profile.thresholdHr} bpm` : "Estimated 173 bpm"}
- Maximum HR: ${profile.maxHr ? `${profile.maxHr} bpm` : "190 bpm"}
- Threshold Pace: ${formatPaceSec(profile.thresholdPaceSec)}
- Current Focus Phase: ${profile.trainingPhase || "Base"}
`;

  return `You are an elite, evidence-based sports science running coach.
${athleteContext}

${getSportsScienceSystemContext()}

COACHING DIRECTIVES:
Analyze the provided running telemetry session with scientific rigor. Your feedback MUST include:
1. **Session Summary** (2-3 sentences: what was accomplished, target zone compliance).
2. **Key Observations** (2-3 bullet points: pacing consistency, HR drift/decoupling, cadence, elevation impact).
3. **Sports Science Literature Context** (CRITICAL: You MUST explicitly cite at least 1-2 scientific principles from the Knowledge Base above, e.g. Jack Daniels' VDOT/10% rule, Seiler's 80/20 polarized model, Pfitzinger's cardiac drift threshold, or Marius Bakken's sub-threshold lactate control).
4. **Next Session Recommendation** (1-2 sentences: exact next prescription with target pace/HR ceiling and recovery guidance).

Tone: Analytical, motivating, data-driven, concise. Keep total output under 260 words.`;
}

/**
 * Sends running metrics to Gemini AI and returns coaching feedback
 */
export async function getGeminiFeedback(
  metrics: RunningMetrics,
  athleteProfile?: AthleteProfile
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const splitsText = metrics.splits && metrics.splits.length > 0
    ? metrics.splits
        .map(
          (s) =>
            `  KM ${s.split}: Pace ${speedToPaceInline(s.average_speed)}/km | HR ${s.average_heartrate ? Math.round(s.average_heartrate) + " bpm" : "N/A"} | Elev ${s.elevation_difference?.toFixed(1) ?? "0"}m`
        )
        .join("\n")
    : "No split data available";

  const userPrompt = `Analyze this running session:

**Activity Name:** ${metrics.name}
**Distance:** ${metrics.distanceKm.toFixed(2)} km
**Average Pace:** ${metrics.avgPace}/km
**Average HR:** ${metrics.avgHr ? Math.round(metrics.avgHr) + " bpm" : "N/A"}
**Max HR:** ${metrics.maxHr ? Math.round(metrics.maxHr) + " bpm" : "N/A"}
**Cadence:** ${metrics.cadenceSpm ? metrics.cadenceSpm + " spm" : "N/A"}
**Total Elevation Gain:** ${metrics.elevationGain ? metrics.elevationGain.toFixed(0) + " m" : "N/A"}

**Splits per km:**
${splitsText}`;

  const systemPrompt = buildSystemPrompt(athleteProfile);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 550,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response text from Gemini");
  }

  return text;
}

function speedToPaceInline(speedMs: number): string {
  if (!speedMs || speedMs <= 0) return "--:--";
  const paceSecPerKm = 1000 / speedMs;
  const minutes = Math.floor(paceSecPerKm / 60);
  const seconds = Math.round(paceSecPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export type { RunningMetrics };
