import type {
  WeeklyPlanDay,
  WorkoutBreakdown,
  WorkoutBreakdownStep,
  WorkoutStepType,
} from "@/types";

const VALID_STEP_TYPES = new Set<WorkoutStepType>([
  "warmup",
  "main",
  "recovery",
  "cooldown",
]);

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

/**
 * Parses the midpoint pace in seconds/km from strings like "6:50 - 7:15/km" or "5:30/km".
 */
export function parsePaceSeconds(targetPace: string): number | null {
  if (!targetPace || targetPace === "-") return null;
  const matches = Array.from(targetPace.matchAll(/(\d{1,2}):(\d{2})/g));
  if (matches.length === 0) return null;
  const secs = matches.map((m) => Number(m[1]) * 60 + Number(m[2]));
  const avg = secs.reduce((a, b) => a + b, 0) / secs.length;
  return Number.isFinite(avg) && avg > 0 ? avg : null;
}

/**
 * Estimates workout duration in minutes from distanceKm and targetPace.
 */
export function estimateWorkoutDurationMinutes(
  distanceKm: number,
  targetPace: string
): number | null {
  if (!distanceKm || distanceKm <= 0) return null;
  const paceSec = parsePaceSeconds(targetPace) ?? 390; // default ~6:30/km
  return Math.max(10, Math.round((distanceKm * paceSec) / 60));
}

function formatPaceFromSec(sec: number): string {
  const clamped = Math.max(180, Math.min(540, Math.round(sec)));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

/**
 * Builds a structured, mathematically consistent fallback breakdown for any WeeklyPlanDay
 * (used for legacy plans without breakdown, deterministic fallback plans, or post-guardrail sync).
 */
export function buildFallbackWorkoutBreakdown(
  day: WeeklyPlanDay,
  language: "id" | "en" = "id"
): WorkoutBreakdown {
  const isId = language === "id";
  const totalKm = Math.max(0, round1(Number(day.distanceKm) || 0));
  const estMin = estimateWorkoutDurationMinutes(totalKm, day.targetPace);
  const citation = day.literatureCitation || "Jack Daniels' Running Formula";

  if (day.intensity === "rest" || totalKm <= 0) {
    return {
      objective: isId
        ? `Pemulihan sistem saraf dan jaringan otot tanpa beban benturan (${citation}).`
        : `Neuromuscular and musculoskeletal recovery without impact load (${citation}).`,
      steps: [
        {
          type: "recovery",
          label: isId ? "Protokol Pemulihan & Mobilitas" : "Recovery & Mobility Protocol",
          distanceOrDuration: isId ? "15 – 20 menit" : "15 – 20 min",
          targetPace: "-",
          targetHr: isId ? "Istirahat / < 100 bpm" : "Rest / < 100 bpm",
          notes: isId
            ? "Foam rolling betis, hamstring, dan paha depan; lakukan dynamic hip mobility ringan serta jalan santai."
            : "Light foam rolling for calves, hamstrings, and quads; gentle hip mobility and casual walking.",
        },
      ],
      executionTips: isId
        ? [
            "Prioritaskan tidur berkualitas 7.5–9 jam untuk mengoptimalkan sintesis protein dan pemulihan glikogen.",
            "Jaga hidrasi minimal 2–2.5L air sepanjang hari serta asupan protein yang cukup.",
          ]
        : [
            "Prioritize 7.5–9 hours of quality sleep to optimize glycogen restoration and tissue repair.",
            "Maintain steady hydration (2–2.5L water) and adequate protein intake throughout the day.",
          ],
    };
  }

  const paceSec = parsePaceSeconds(day.targetPace);
  const easyWarmupPace = paceSec
    ? `${formatPaceFromSec(paceSec + (day.intensity === "hard" ? 75 : 20))} – ${formatPaceFromSec(paceSec + (day.intensity === "hard" ? 95 : 40))}`
    : day.targetPace;

  const isIntervalLike =
    day.intensity === "hard" &&
    /interval|vo2|cruise|fartlek|track/i.test(day.sessionType);

  if (day.intensity === "hard") {
    const warmupKm = totalKm >= 6 ? 1.5 : 1.0;
    const cooldownKm = totalKm >= 6 ? 1.0 : 0.5;
    const mainKm = Math.max(1.0, round1(totalKm - warmupKm - cooldownKm));

    let mainLabel = isId ? `Main Set: ${day.sessionType}` : `Main Set: ${day.sessionType}`;
    let mainDistStr = `${mainKm} km`;
    const steps: WorkoutBreakdownStep[] = [
      {
        type: "warmup",
        label: "Warm-up",
        distanceOrDuration: `${warmupKm} km`,
        targetPace: easyWarmupPace,
        targetHr: isId ? "≤ Zona 2 (Aerobic)" : "≤ Zone 2 (Aerobic)",
        notes: isId
          ? "Joging santai lalu tambahkan 3×15 dtk strides progresif di akhir pemanasan."
          : "Easy jog followed by 3×15s progressive strides at the end of warm-up.",
      },
    ];

    if (isIntervalLike) {
      const repDistM = mainKm >= 4.0 ? 1000 : 800;
      const reps = Math.max(2, Math.round((mainKm * 1000) / repDistM));
      const actualMainKm = round1((reps * repDistM) / 1000);
      const adjustedCooldown = Math.max(0.5, round1(totalKm - warmupKm - actualMainKm));
      mainLabel = `Main Set: ${reps} × ${repDistM}m`;
      mainDistStr = `${reps} × ${repDistM} m (${actualMainKm} km)`;

      steps.push({
        type: "main",
        label: mainLabel,
        distanceOrDuration: mainDistStr,
        targetPace: day.targetPace,
        targetHr: day.hrCap,
        notes: isId
          ? "Jaga ritme stabil dari repetisi pertama hingga terakhir; hindari start terlalu cepat."
          : "Maintain even splits from the first rep to the last; avoid starting too fast.",
      });
      steps.push({
        type: "recovery",
        label: isId ? "Recovery Antar Repetisi" : "Inter-Rep Recovery",
        distanceOrDuration: isId ? "90 dtk jog (~200 m)" : "90s jog (~200 m)",
        targetPace: easyWarmupPace,
        targetHr: isId ? "Turun ke ≤ Zona 2" : "Drop to ≤ Zone 2",
        notes: isId
          ? "Joging sangat pelan atau jalan cepat agar detak jantung turun sebelum repetisi berikutnya."
          : "Very slow jog or brisk walk to let heart rate recover before the next rep.",
      });
      steps.push({
        type: "cooldown",
        label: "Cool-down",
        distanceOrDuration: `${adjustedCooldown} km`,
        targetPace: easyWarmupPace,
        targetHr: isId ? "≤ Zona 1–2" : "≤ Zone 1–2",
        notes: isId
          ? "Turunkan tempo bertahap dan akhiri dengan peregangan dinamis ringan."
          : "Gradually ease the pace down and finish with light dynamic stretching.",
      });
    } else {
      steps.push({
        type: "main",
        label: mainLabel,
        distanceOrDuration: mainDistStr,
        targetPace: day.targetPace,
        targetHr: day.hrCap,
        notes: isId
          ? "Pertahankan usaha terkontrol di ambang laktat (comfortably hard), napas teratur."
          : "Hold a controlled comfortably-hard effort at lactate threshold with steady breathing.",
      });
      steps.push({
        type: "cooldown",
        label: "Cool-down",
        distanceOrDuration: `${cooldownKm} km`,
        targetPace: easyWarmupPace,
        targetHr: isId ? "≤ Zona 1–2" : "≤ Zone 1–2",
        notes: isId
          ? "Joging rileks untuk membantu klirens laktat pasca-sesi."
          : "Relaxed jog to assist post-session lactate clearance.",
      });
    }

    const tips = isId
      ? [
          `Gunakan ${day.shoe !== "-" ? day.shoe : "sepatu latihan responsif"} untuk efisiensi kontak tanah saat fase cepat.`,
          "Pantau batas detak jantung pada jam tangan; jika melewati ambang batas karena panas, perlambat pace 5–10 dtk/km.",
        ]
      : [
          `Wear ${day.shoe !== "-" ? day.shoe : "responsive training shoes"} for efficient ground contact during faster segments.`,
          "Watch your HR cap on your GPS watch; if heat pushes HR above target, ease pace by 5–10 sec/km.",
        ];
    if (estMin && estMin > 60) {
      tips.push(
        isId
          ? `Durasi estimasi ~${estMin} menit: siapkan 300–500 ml air/elektrolit atau 1 energy gel jika dibutuhkan.`
          : `Estimated duration ~${estMin} min: carry 300–500 ml water/electrolytes or 1 energy gel if needed.`
      );
    }

    return {
      objective: `${day.rationale} (${citation})`,
      steps,
      executionTips: tips,
    };
  }

  // Long Run / Easy / Moderate
  const warmupKm = totalKm >= 8 ? 1.5 : totalKm >= 4 ? 1.0 : 0.5;
  const cooldownKm = totalKm >= 6 ? 1.0 : 0.5;
  const mainKm = Math.max(0.5, round1(totalKm - warmupKm - cooldownKm));

  const steps: WorkoutBreakdownStep[] = [
    {
      type: "warmup",
      label: "Warm-up",
      distanceOrDuration: `${warmupKm} km`,
      targetPace: easyWarmupPace,
      targetHr: day.hrCap,
      notes: isId
        ? "Mulai dengan ritme sangat santai agar sendi, tendon, dan sistem kardiovaskular beradaptasi bertahap."
        : "Start conservatively to allow joints, tendons, and cardiovascular system to warm up gradually.",
    },
    {
      type: "main",
      label:
        day.intensity === "long"
          ? isId
            ? "Main Set: Aerobic Long Run"
            : "Main Set: Aerobic Long Run"
          : isId
            ? `Main Set: ${day.sessionType}`
            : `Main Set: ${day.sessionType}`,
      distanceOrDuration: `${mainKm} km`,
      targetPace: day.targetPace,
      targetHr: day.hrCap,
      notes:
        day.intensity === "long"
          ? isId
            ? "Jaga pace percakapan (conversational pace) dan pantau cardiac drift agar tetap stabil di paruh kedua."
            : "Hold conversational pace and monitor cardiac drift to keep effort steady in the second half."
          : isId
            ? "Berlari rileks dengan kadensi ringan; prioritaskan batas HR di atas ego pace."
            : "Run relaxed with light cadence; prioritize the HR ceiling over pace ego.",
    },
    {
      type: "cooldown",
      label: "Cool-down",
      distanceOrDuration: `${cooldownKm} km`,
      targetPace: easyWarmupPace,
      targetHr: isId ? "≤ Zona 1–2" : "≤ Zone 1–2",
      notes: /strides/i.test(day.sessionType)
        ? isId
          ? "Sertakan 4×20 dtk strides ringan dengan jeda jalan 40 dtk, lalu jalan pendinginan."
          : "Include 4×20s light strides with 40s walk rest, then finish with an easy cool-down."
        : isId
          ? "Turunkan tempo perlahan di kilometer terakhir dan lanjutkan dengan jalan kaki 3–5 menit."
          : "Ease down gently over the final kilometer and finish with 3–5 minutes of walking.",
    },
  ];

  const tips = isId
    ? [
        `Rekomendasi sepatu: ${day.shoe !== "-" ? day.shoe : "sepatu bantalan harian"} untuk perlindungan benturan maksimal.`,
        "Gunakan prinsip 80/20: sesi ini harus terasa ringan agar tubuh siap menyerap sesi kualitas berikutnya.",
      ]
    : [
        `Recommended shoe: ${day.shoe !== "-" ? day.shoe : "daily cushioned trainer"} for optimal impact protection.`,
        "Follow the 80/20 rule: keep this effort genuinely aerobic so you stay fresh for your next quality session.",
      ];

  if (estMin && estMin > 60) {
    tips.push(
      isId
        ? `Durasi estimasi ~${estMin} menit (> 60 mnt): konsumsi 1 energy gel tiap 35–45 menit + minum air/elektrolit 150–200 ml setiap 20 menit.`
        : `Estimated duration ~${estMin} min (> 60 min): take 1 energy gel every 35–45 min + sip 150–200 ml water/electrolytes every 20 min.`
    );
  }

  return {
    objective: `${day.rationale} (${citation})`,
    steps,
    executionTips: tips,
  };
}

/**
 * Sanitizes an incoming breakdown from Gemini or falls back cleanly if invalid/missing.
 */
export function sanitizeOrBuildBreakdown(
  day: WeeklyPlanDay,
  language: "id" | "en" = "id"
): WorkoutBreakdown {
  const raw = day.breakdown;
  if (
    !raw ||
    typeof raw !== "object" ||
    !Array.isArray(raw.steps) ||
    raw.steps.length === 0
  ) {
    return buildFallbackWorkoutBreakdown(day, language);
  }

  const cleanSteps: WorkoutBreakdownStep[] = raw.steps
    .filter((s) => s && typeof s === "object" && typeof s.label === "string")
    .map((s) => ({
      type: VALID_STEP_TYPES.has(s.type) ? s.type : "main",
      label: String(s.label).trim() || "Segment",
      distanceOrDuration: String(s.distanceOrDuration ?? "-").trim() || "-",
      targetPace: String(s.targetPace ?? day.targetPace ?? "-").trim() || "-",
      targetHr: String(s.targetHr ?? day.hrCap ?? "-").trim() || "-",
      notes: String(s.notes ?? "").trim(),
    }));

  if (cleanSteps.length === 0) {
    return buildFallbackWorkoutBreakdown(day, language);
  }

  const cleanTips = Array.isArray(raw.executionTips)
    ? raw.executionTips.map((t) => String(t).trim()).filter(Boolean).slice(0, 4)
    : [];

  const fallback = buildFallbackWorkoutBreakdown(day, language);

  return {
    objective:
      typeof raw.objective === "string" && raw.objective.trim()
        ? raw.objective.trim()
        : fallback.objective,
    steps: cleanSteps,
    executionTips: cleanTips.length > 0 ? cleanTips : fallback.executionTips,
  };
}

/**
 * Formats a clean plain-text workout summary for clipboard export (watch / notes).
 */
export function formatWorkoutSummaryText(
  day: WeeklyPlanDay,
  breakdown: WorkoutBreakdown,
  language: "id" | "en" = "id"
): string {
  const isId = language === "id";
  const estMin = estimateWorkoutDurationMinutes(day.distanceKm, day.targetPace);
  const headerLines = [
    `PacePulse — ${day.day}: ${day.sessionType}`,
    `${isId ? "Total Jarak" : "Total Distance"}: ${day.distanceKm > 0 ? `${day.distanceKm} km` : "Rest"}${estMin ? ` (~${estMin} ${isId ? "mnt" : "min"})` : ""}`,
    `${isId ? "Target Pace" : "Target Pace"}: ${day.targetPace} | ${isId ? "Batas HR" : "HR Cap"}: ${day.hrCap}`,
    `${isId ? "Sepatu" : "Shoe"}: ${day.shoe}`,
    `${isId ? "Tujuan" : "Objective"}: ${breakdown.objective}`,
    "",
    isId ? "STRUKTUR SEGMEN:" : "WORKOUT SEGMENTS:",
    ...breakdown.steps.map(
      (s, i) =>
        `${i + 1}. [${s.type.toUpperCase()}] ${s.label} — ${s.distanceOrDuration} | Pace: ${s.targetPace} | HR: ${s.targetHr}${s.notes ? `\n   ${s.notes}` : ""}`
    ),
  ];

  if (breakdown.executionTips.length > 0) {
    headerLines.push(
      "",
      isId ? "TIPS EKSEKUSI:" : "EXECUTION TIPS:",
      ...breakdown.executionTips.map((t) => `- ${t}`)
    );
  }

  return headerLines.join("\n");
}
