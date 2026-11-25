"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Footprints,
  Mountain,
  Clock,
  Bot,
  Zap,
  Sparkles,
  Award,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import type { ActivityData } from "@/types";
import {
  speedToPace,
  metersToKm,
  formatDuration,
  cadenceToSpm,
  formatDate,
} from "@/lib/formatting";

interface ActivityCardProps {
  activity: ActivityData;
  canReanalyze?: boolean;
}

function PhaseTag({ phase }: { phase: string }) {
  const styles: Record<string, string> = {
    Recovery: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    Base: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    Build: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    Peak: "bg-red-500/10 text-red-400 border-red-500/30",
    Race: "bg-red-500/10 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
        styles[phase] ?? styles.Base
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {phase} Phase
    </span>
  );
}

export function ActivityCard({ activity, canReanalyze }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(activity.aiFeedback);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

  const distanceKm = parseFloat(metersToKm(activity.distanceMeters));
  const avgPace = speedToPace(activity.averageSpeed);
  const cadenceSpm = cadenceToSpm(activity.averageCadence);
  const duration = formatDuration(activity.movingTimeSec);

  const isSpeedSession =
    activity.trainingPhase === "Build" ||
    activity.trainingPhase === "Peak" ||
    activity.trainingPhase === "Race" ||
    (activity.averageSpeed > 0 && 1000 / activity.averageSpeed < 290); // < 4:50/km
  const shoeName = isSpeedSession ? "Magic Speed 4" : "Novablast 5";
  const shoeTagColor = isSpeedSession
    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

  const handleReanalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (reanalyzing) return;
    setReanalyzing(true);
    setReanalyzeError(null);

    try {
      const res = await fetch(`/api/activities/${activity.id}/reanalyze`, {
        method: "POST",
      });

      const data = (await res.json()) as { aiFeedback?: string; error?: string; details?: string };
      if (res.ok && data.aiFeedback) {
        setFeedback(data.aiFeedback);
        setExpanded(true);
      } else {
        setReanalyzeError(data.details || data.error || "Gagal menganalisis ulang dengan Gemini AI.");
        setExpanded(true);
      }
    } catch (err) {
      console.error("Re-analyze error:", err);
      setReanalyzeError("Network error saat menghubungi server analisis AI.");
      setExpanded(true);
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-[#121215] border border-[#27272A] rounded-2xl transition-all duration-300 hover:border-zinc-600 shadow-xl">
      {/* Top Header */}
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              <PhaseTag phase={activity.trainingPhase} />
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono border ${shoeTagColor}`}
              >
                👟 {shoeName}
              </span>
              <span className="text-[11px] sm:text-xs text-zinc-500 font-mono">
                {formatDate(activity.startDate)}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white font-mono wrap-break-word">
              {activity.name}
            </h3>
          </div>

          <div className="flex items-center sm:items-end justify-between sm:justify-start sm:flex-col gap-2 shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
                {distanceKm.toFixed(2)}
                <span className="text-xs sm:text-sm font-semibold text-zinc-500 ml-1">km</span>
              </div>
              <div className="text-[11px] sm:text-xs font-mono text-zinc-500">
                Moving Time: {duration}
              </div>
            </div>

            {canReanalyze && (
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                title="Re-run sports science evaluation with latest athlete benchmarks"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:border-emerald-500 text-[11px] font-mono transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${reanalyzing ? "animate-spin text-emerald-400" : ""}`} />
                <span>{reanalyzing ? "Analyzing..." : "Re-Analyze"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-3 border-y border-[#27272A]/70">
          <div className="bg-[#18181B]/60 p-2.5 sm:p-3 rounded-xl border border-[#27272A]/60 flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] text-zinc-500 font-mono uppercase tracking-wider truncate">
                Average Pace
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-white">
                {avgPace}
                <span className="text-[11px] sm:text-xs font-normal text-zinc-500">/km</span>
              </div>
            </div>
          </div>

          <div className="bg-[#18181B]/60 p-2.5 sm:p-3 rounded-xl border border-[#27272A]/60 flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] text-zinc-500 font-mono uppercase tracking-wider truncate">
                Avg Heart Rate
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-white">
                {activity.averageHeartrate
                  ? Math.round(activity.averageHeartrate)
                  : "—"}
                <span className="text-[11px] sm:text-xs font-normal text-zinc-500"> bpm</span>
              </div>
            </div>
          </div>

          <div className="bg-[#18181B]/60 p-2.5 sm:p-3 rounded-xl border border-[#27272A]/60 flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Footprints className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] text-zinc-500 font-mono uppercase tracking-wider truncate">
                Cadence
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-white">
                {cadenceSpm ?? "—"}
                <span className="text-[11px] sm:text-xs font-normal text-zinc-500"> spm</span>
              </div>
            </div>
          </div>

          <div className="bg-[#18181B]/60 p-2.5 sm:p-3 rounded-xl border border-[#27272A]/60 flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Mountain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] text-zinc-500 font-mono uppercase tracking-wider truncate">
                Elevation Gain
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-white">
                {activity.totalElevationGain !== null
                  ? activity.totalElevationGain.toFixed(0)
                  : "—"}
                <span className="text-[11px] sm:text-xs font-normal text-zinc-500"> m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Split Consistency Bar Preview (if splits exist) */}
        {activity.splitsJson && Array.isArray(activity.splitsJson) && activity.splitsJson.length > 0 && (
          <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-zinc-500">
            <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Split Pacer Distribution:
            </span>
            <div className="flex items-end gap-1 overflow-x-auto pb-0.5">
              {(activity.splitsJson as Array<{ split: number; average_speed: number }>).slice(0, 16).map((s) => {
                const paceSec = 1000 / s.average_speed;
                const isFast = paceSec < 280; // sub-4:40
                const isMid = paceSec >= 280 && paceSec < 330;
                const barColor = isFast
                  ? "bg-orange-400"
                  : isMid
                    ? "bg-emerald-400"
                    : "bg-blue-400";
                return (
                  <div
                    key={s.split}
                    title={`KM ${s.split}: ${speedToPace(s.average_speed)}/km`}
                    className={`w-2 rounded-t-sm transition-all hover:scale-125 ${barColor}`}
                    style={{
                      height: `${Math.max(8, Math.min(22, 28 - (paceSec - 250) * 0.1))}px`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* AI Feedback Accordion Toggle */}
      {feedback && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-linear-to-r from-[#18181B] via-[#151518] to-[#18181B] border-t border-[#27272A] text-xs font-mono hover:bg-zinc-800/80 transition-all duration-200 text-left"
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px] sm:text-xs truncate">
                <span className="truncate">Gemini 3.8 Flash Sports Science Evaluation</span>
                <BookOpen className="w-3 h-3 text-zinc-400 shrink-0 hidden sm:inline" />
              </span>
              <Sparkles className="w-3 h-3 text-orange-400 animate-pulse shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-zinc-400 shrink-0">
              <span className="text-[11px] hidden sm:inline">
                {expanded ? "Collapse Analysis" : "Expand Sports Science & Splits"}
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-emerald-400" />
              )}
            </div>
          </button>

          {expanded && (
            <div className="p-4 sm:p-6 border-t border-[#27272A] bg-[#0E0E11] space-y-5 sm:space-y-6">
              {/* Split Kilometer Telemetry Table */}
              {activity.splitsJson && Array.isArray(activity.splitsJson) && activity.splitsJson.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      Kilometer Split Telemetry
                    </h4>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      Metric Splits
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#27272A] bg-[#121215]">
                    <table className="w-full text-xs font-mono whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-[#27272A] bg-[#18181B] text-zinc-500 text-[11px]">
                          <th className="text-left py-2 px-2.5 sm:px-3">KM</th>
                          <th className="text-left py-2 px-2.5 sm:px-3">Pace</th>
                          <th className="text-left py-2 px-2.5 sm:px-3">Heart Rate</th>
                          <th className="text-left py-2 px-2.5 sm:px-3">Elevation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activity.splitsJson as Array<{
                          split: number;
                          average_speed: number;
                          average_heartrate?: number;
                          elevation_difference?: number;
                        }>).map((split) => {
                          const splitPace = speedToPace(split.average_speed);
                          return (
                            <tr
                              key={split.split}
                              className="border-b border-[#1E1E22] hover:bg-zinc-900/60 transition-colors"
                            >
                              <td className="py-2 px-2.5 sm:px-3 text-zinc-400 font-bold">
                                #{split.split}
                              </td>
                              <td className="py-2 px-2.5 sm:px-3 text-emerald-400 font-bold">
                                {splitPace}/km
                              </td>
                              <td
                                className={`py-2 px-2.5 sm:px-3 font-semibold ${
                                  split.average_heartrate &&
                                  split.average_heartrate >= 173
                                    ? "text-orange-400"
                                    : "text-zinc-300"
                                }`}
                              >
                                {split.average_heartrate
                                  ? `${Math.round(split.average_heartrate)} bpm`
                                  : "—"}
                              </td>
                              <td
                                className={`py-2 px-2.5 sm:px-3 ${
                                  (split.elevation_difference ?? 0) > 0
                                    ? "text-orange-400"
                                    : "text-blue-400"
                                }`}
                              >
                                {split.elevation_difference !== undefined
                                  ? `${split.elevation_difference > 0 ? "+" : ""}${split.elevation_difference.toFixed(0)}m`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* AI Coach Detailed Feedback */}
              <div className="bg-[#121215] rounded-xl p-4 sm:p-5 border border-[#27272A]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Sports Science Coaching Diagnosis
                  </h4>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Bot className="w-3 h-3" /> Gemini 3.8 Flash
                  </div>
                </div>
                {reanalyzeError && (
                  <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono wrap-break-word">
                    <strong>Re-Analyze Error:</strong> {reanalyzeError}
                  </div>
                )}
                <div className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap wrap-break-word">
                  {feedback}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
