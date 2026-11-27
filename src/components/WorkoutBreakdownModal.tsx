"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Copy,
  Check,
  Bot,
  Clock,
  Heart,
  Footprints,
  BookOpen,
  Target,
  Sparkles,
  Flame,
  Wind,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  estimateWorkoutDurationMinutes,
  formatWorkoutSummaryText,
  sanitizeOrBuildBreakdown,
} from "@/lib/workout-breakdown";
import type { WeeklyPlanDay, WorkoutStepType } from "@/types";

interface WorkoutBreakdownModalProps {
  day: WeeklyPlanDay | null;
  onClose: () => void;
}

const STEP_STYLE: Record<
  WorkoutStepType,
  { badge: string; dot: string; labelId: string; labelEn: string }
> = {
  warmup: {
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    dot: "bg-blue-400",
    labelId: "WARM-UP",
    labelEn: "WARM-UP",
  },
  main: {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
    dot: "bg-emerald-500",
    labelId: "MAIN SET",
    labelEn: "MAIN SET",
  },
  recovery: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
    labelId: "RECOVERY",
    labelEn: "RECOVERY",
  },
  cooldown: {
    badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
    dot: "bg-zinc-400",
    labelId: "COOL-DOWN",
    labelEn: "COOL-DOWN",
  },
};

function renderStepIcon(type: WorkoutStepType) {
  switch (type) {
    case "warmup":
      return <Wind className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    case "main":
      return <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    case "recovery":
      return <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case "cooldown":
      return <Wind className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
  }
}

export default function WorkoutBreakdownModal({
  day,
  onClose,
}: WorkoutBreakdownModalProps) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!day) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [day, onClose]);

  useEffect(() => {
    setCopied(false);
  }, [day]);

  if (!day) return null;

  const breakdown = sanitizeOrBuildBreakdown(day, language);
  const estMinutes = estimateWorkoutDurationMinutes(day.distanceKm, day.targetPace);
  const isId = language === "id";

  const handleCopy = async () => {
    try {
      const summary = formatWorkoutSummaryText(day, breakdown, language);
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleAskCoach = () => {
    const prompt = isId
      ? `Tolong evaluasi dan bantu saya mempersiapkan sesi latihan berikut:\n• Hari: ${day.day} (${day.sessionType})\n• Total Jarak: ${day.distanceKm > 0 ? `${day.distanceKm} km` : "Rest"}\n• Target Pace: ${day.targetPace} | Batas HR: ${day.hrCap}\n• Tujuan: ${breakdown.objective}\nApa hal teknis yang perlu saya perhatikan atau sesuaikan jika kondisi badan terasa lelah?`
      : `Please help me prepare for and fine-tune this planned workout:\n• Day: ${day.day} (${day.sessionType})\n• Total Distance: ${day.distanceKm > 0 ? `${day.distanceKm} km` : "Rest"}\n• Target Pace: ${day.targetPace} | HR Cap: ${day.hrCap}\n• Objective: ${breakdown.objective}\nWhat pacing or recovery adjustments should I keep in mind?`;
    onClose();
    router.push(`/coach?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-breakdown-title"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl text-zinc-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-5 py-4 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {day.day}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                {day.sessionType}
              </span>
              {day.literatureCitation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400">
                  <BookOpen className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="truncate">{day.literatureCitation}</span>
                </span>
              )}
            </div>

            <h2
              id="workout-breakdown-title"
              className="text-xl sm:text-2xl font-black tracking-tight text-white tabular-nums flex flex-wrap items-baseline gap-x-3 gap-y-1"
            >
              <span>{day.distanceKm > 0 ? `${day.distanceKm} km` : "Rest Day"}</span>
              {estMinutes && (
                <span className="text-xs font-semibold text-zinc-400">
                  {t.planPage.breakdownEstDuration}: ~{estMinutes}{" "}
                  {isId ? "mnt" : "min"}
                </span>
              )}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 tabular-nums pt-0.5">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{day.targetPace}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>
                  {t.planPage.hrCapLabel} {day.hrCap}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{day.shoe}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Physiological Objective */}
          <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3.5 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 shrink-0" />
              <span>{t.planPage.breakdownObjective}</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {breakdown.objective}
            </p>
          </div>

          {/* Workout Segment Structure */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              {t.planPage.breakdownSegments}
            </h3>

            <div className="space-y-2.5">
              {breakdown.steps.map((step, idx) => {
                const style = STEP_STYLE[step.type] ?? STEP_STYLE.main;
                return (
                  <div
                    key={`${step.label}-${idx}`}
                    className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-3.5 flex flex-col gap-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
                        />
                        {renderStepIcon(step.type)}
                        <span className="text-sm font-bold text-white truncate">
                          {step.label}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
                      >
                        {isId ? style.labelId : style.labelEn}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs tabular-nums">
                      <div className="rounded-lg bg-zinc-950 border border-zinc-800/80 px-2.5 py-1.5">
                        <div className="text-[10px] uppercase text-zinc-500">
                          {isId ? "Jarak / Durasi" : "Distance / Duration"}
                        </div>
                        <div className="font-bold text-white mt-0.5">
                          {step.distanceOrDuration}
                        </div>
                      </div>
                      <div className="rounded-lg bg-zinc-950 border border-zinc-800/80 px-2.5 py-1.5">
                        <div className="text-[10px] uppercase text-zinc-500">
                          Target Pace
                        </div>
                        <div className="font-bold text-emerald-400 mt-0.5">
                          {step.targetPace}
                        </div>
                      </div>
                      <div className="rounded-lg bg-zinc-950 border border-zinc-800/80 px-2.5 py-1.5">
                        <div className="text-[10px] uppercase text-zinc-500">
                          Target HR
                        </div>
                        <div className="font-bold text-orange-400 mt-0.5">
                          {step.targetHr}
                        </div>
                      </div>
                    </div>

                    {step.notes && (
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {step.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Field Execution Tips */}
          {breakdown.executionTips.length > 0 && (
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-3.5 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{t.planPage.breakdownTips}</span>
              </div>
              <ul className="space-y-1.5">
                {breakdown.executionTips.map((tip, i) => (
                  <li
                    key={i}
                    className="text-xs text-zinc-400 leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-emerald-500 font-bold mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 px-5 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-emerald-400">{t.planPage.breakdownCopiedBtn}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{t.planPage.breakdownCopyBtn}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleAskCoach}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-colors"
          >
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span>{t.planPage.breakdownAskCoachBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
