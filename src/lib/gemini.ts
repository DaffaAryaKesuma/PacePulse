// Gemini AI integration for running analysis

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

const ATHLETE_PROFILE = `
Athlete Profile:
- PB 10K: 51:44 | Debut HM: 02:04:08 | Target: Sub-1:45:00 HM (Pace 4:58/km)
- Threshold HR: 173 bpm | Threshold Pace: 4:40/km
- Training shoes: ASICS Novablast 5 (easy/long), ASICS Magic Speed 4 (tempo/race)
- Methodology: Norwegian-lite / Threshold Lab (double threshold emphasis)
`;

const SYSTEM_PROMPT = `You are an elite AI running coach specializing in evidence-based threshold training methodology (Norwegian-lite / Threshold Lab approach). 
${ATHLETE_PROFILE}
Analyze the provided run data with precision. Your response must be structured in 4 short sections:
1. **Session Summary** (2-3 sentences: what was accomplished, training zone hit)
2. **Key Observations** (2-3 bullet points: HR trends, pacing consistency, cadence, elevation impact)
3. **Training Phase Assessment** (1-2 sentences: current adaptations, fatigue markers)
4. **Next Session Recommendation** (1-2 sentences: specific next workout with pace/HR targets)

Be data-driven, specific, and concise. Total response under 250 words.`;

/**
 * Sends running metrics to Gemini AI and returns coaching feedback
 */
export async function getGeminiFeedback(
  metrics: RunningMetrics
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const splitsText = metrics.splits
    ? metrics.splits
        .map(
          (s) =>
            `  KM ${s.split}: Pace ${speedToPaceInline(s.average_speed)}/km | HR ${s.average_heartrate ? Math.round(s.average_heartrate) + " bpm" : "N/A"} | Elev ${s.elevation_difference?.toFixed(1) ?? "0"}m`
        )
        .join("\n")
    : "No split data available";

  const userPrompt = `Analyze this running session:

**Activity:** ${metrics.name}
**Distance:** ${metrics.distanceKm.toFixed(2)} km
**Avg Pace:** ${metrics.avgPace}/km
**Avg HR:** ${metrics.avgHr ? Math.round(metrics.avgHr) + " bpm" : "N/A"}
**Max HR:** ${metrics.maxHr ? Math.round(metrics.maxHr) + " bpm" : "N/A"}
**Cadence:** ${metrics.cadenceSpm ? metrics.cadenceSpm + " spm" : "N/A"}
**Elevation Gain:** ${metrics.elevationGain ? metrics.elevationGain.toFixed(0) + " m" : "N/A"}

**Splits per km:**
${splitsText}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
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
