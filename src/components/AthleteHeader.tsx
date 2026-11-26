"use client";

import { Target, Zap, ShieldCheck, Flame, Gauge, Share2, Check } from "lucide-react";
import { useState } from "react";
import type { AthleteInfo, PersonalBestInfo } from "@/types";
import {
  predictTimeSecForDistance,
  type RaceReadinessResult,
  type ResolvedTrainingPhase,
} from "@/lib/sports-analytics";
import { formatDuration } from "@/lib/formatting";
import { useLanguage } from "@/components/LanguageProvider";

interface AthleteHeaderProps {
  trainingPhase?: string;
  resolvedPhase?: ResolvedTrainingPhase | null;
  hrCap?: number;
  isDemo?: boolean;
  athlete?: AthleteInfo | null;
  isOwner?: boolean;
  vdot?: number | null;
  personalBests?: PersonalBestInfo[];
  readiness?: RaceReadinessResult | null;
  compact?: boolean;
}

export function AthleteHeader({
  trainingPhase: phaseProp,
  resolvedPhase,
  hrCap: hrCapProp,
  isDemo,
  athlete,
  vdot,
  personalBests,
  readiness,
  compact = false,
}: AthleteHeaderProps) {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Dynamic parameters
  const activePhase =
    resolvedPhase?.phase ||
    (athlete?.trainingPhase && athlete.trainingPhase !== "auto"
      ? athlete.trainingPhase
      : phaseProp) ||
    "Base";
  const athleteName = athlete?.fullName || "Endurance Athlete";
  const goalDistance = athlete?.goalDistance ?? null;
  const goalTimeSec = athlete?.goalTimeSec ?? null;
  const isGeneralFitness = goalDistance === "General Fitness";
  const hasRaceGoal = Boolean(goalDistance && !isGeneralFitness && goalTimeSec && goalTimeSec > 0);
  const thresholdHr = athlete?.thresholdHr || 173;
  const maxHr = athlete?.maxHr || 190;
  const hrCap = hrCapProp || (thresholdHr > 0 ? thresholdHr - 11 : 162);

  // Calculate goal pacing
  const distanceKmMap: Record<string, number> = {
    "5K": 5.0,
    "10K": 10.0,
    "Half Marathon": 21.0975,
    "Marathon": 42.195,
  };
  const distancePbKeyMap: Record<string, string> = {
    "5K": "5K",
    "10K": "10K",
    "Half Marathon": "HM",
    "Marathon": "FM",
  };
  const distKm = goalDistance ? distanceKmMap[goalDistance] || 21.0975 : 0;
  const targetPaceSecPerKm = hasRaceGoal && distKm > 0 && goalTimeSec ? Math.round(goalTimeSec / distKm) : 0;
  const targetPaceMin = Math.floor(targetPaceSecPerKm / 60);
  const targetPaceSec = Math.round(targetPaceSecPerKm % 60);
  const targetPaceStr =
    targetPaceSecPerKm > 0
      ? `${targetPaceMin}:${targetPaceSec.toString().padStart(2, "0")}/km`
      : "—";

  // Resolve current PB or VDOT-estimated time for the user's selected distance
  const matchingPb = goalDistance
    ? personalBests?.find((pb) => pb.distanceKey === distancePbKeyMap[goalDistance])
    : undefined;
  const vdotPredictedSec =
    vdot && vdot > 0 && distKm > 0 ? predictTimeSecForDistance(vdot, distKm * 1000) : null;
  const currentBestOrVdotSec =
    matchingPb?.timeSeconds ?? athlete?.currentPbSec ?? vdotPredictedSec ?? null;

  // Dynamic readiness: prefer Multi-Factor Sports Science Readiness Index when available
  const progressPercent = (() => {
    if (isGeneralFitness) return 100;
    if (!hasRaceGoal || !goalTimeSec) return 0;
    if (readiness) return readiness.totalReadiness;
    if (!currentBestOrVdotSec || currentBestOrVdotSec <= 0) return 50;
    if (currentBestOrVdotSec <= goalTimeSec) return 100;
    return Math.max(10, Math.min(99, Math.round((goalTimeSec / currentBestOrVdotSec) * 100)));
  })();

  const phaseColors: Record<
    string,
    { text: string; bg: string; border: string; glow: string; badge: string }
  > = {
    Recovery: {
      text: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      glow: "shadow-blue-500/20",
      badge: "bg-blue-500",
    },
    Base: {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      glow: "shadow-emerald-500/20",
      badge: "bg-emerald-500",
    },
    Build: {
      text: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      glow: "shadow-orange-500/20",
      badge: "bg-orange-500",
    },
    Peak: {
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      glow: "shadow-red-500/20",
      badge: "bg-red-500",
    },
    Taper: {
      text: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      glow: "shadow-purple-500/20",
      badge: "bg-purple-500",
    },
    Race: {
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      glow: "shadow-red-500/20",
      badge: "bg-red-500",
    },
  };

  const currentTheme = phaseColors[activePhase] ?? phaseColors.Base;

  const handleCopyLink = () => {
    if (typeof window !== "undefined" && athlete?.username) {
      const url = `${window.location.origin}/u/${athlete.username}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Telemetry Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {athlete?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={athlete.avatarUrl}
                alt={athleteName}
                className="w-10 h-10 rounded-xl border border-white/10 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-500" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100 wrap-break-word">
                {athleteName}
              </h2>
              {athlete?.username && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800/80 text-zinc-300 border border-white/10">
                  @{athlete.username}
                </span>
              )}
              {isDemo && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800/80 text-zinc-200 border border-white/10">
                  {t.header.demoTelemetry}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {t.header.subtitle}
            </p>
          </div>
        </div>

        {/* Phase Pill & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div
            title={
              resolvedPhase
                ? language === "id"
                  ? resolvedPhase.reasonId
                  : resolvedPhase.reasonEn
                : undefined
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-white/10 text-[11px] font-medium text-zinc-200 tabular-nums"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>
              {resolvedPhase?.isAuto ? "Auto: " : ""}
              {resolvedPhase
                ? language === "id"
                  ? resolvedPhase.labelId
                  : resolvedPhase.labelEn
                : `${activePhase} ${t.header.phaseSuffix}`}{" "}
              • {t.header.capLabel} ≤ {hrCap} BPM
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-white/10 text-[11px] font-medium text-zinc-300 tabular-nums">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>LT2: {thresholdHr} BPM</span>
          </div>

          {athlete?.username && athlete.isPublic && (
            <button
              onClick={handleCopyLink}
              title="Copy link to public athlete profile"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111114] border border-white/10 text-zinc-300 hover:text-zinc-100 hover:border-white/20 text-[11px] font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copied ? t.header.linkCopied : t.header.publicLink}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Cockpit Banner: Target Goal Progression */}
      <div className="bg-[#111114] border border-white/10 rounded-xl p-5">
        <div className={`grid grid-cols-1 ${compact ? "" : "lg:grid-cols-12"} gap-6 items-start`}>
          {/* Target Progress Bar & Goal */}
          <div className={`${compact ? "" : "lg:col-span-8"} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                    {t.header.primaryMilestone}
                  </div>
                  <div className="text-base font-bold tracking-tight text-zinc-100 flex flex-wrap items-center gap-2 tabular-nums">
                    {isGeneralFitness ? (
                      <>
                        <span>{t.header.generalFitnessTitle}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 border border-white/10 font-medium whitespace-nowrap">
                          {t.header.generalFitnessBadge}
                        </span>
                      </>
                    ) : hasRaceGoal && goalTimeSec ? (
                      <>
                        <span>{goalDistance?.toUpperCase()} • SUB-{formatDuration(goalTimeSec)}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 border border-white/10 font-medium whitespace-nowrap">
                          {t.header.paceLabel} {targetPaceStr}
                        </span>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("pacepulse:open-settings"))}
                        className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors"
                      >
                        {t.header.noGoalSet}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Circular Progress Ring (Single Emerald Accent) */}
              {!isGeneralFitness && hasRaceGoal && (
                <div
                  className="flex flex-col items-start sm:items-end gap-1.5 shrink-0"
                  title={t.header.readinessBreakdownHint}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                        <circle
                          cx="24"
                          cy="24"
                          r="19"
                          fill="none"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="19"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 19}
                          strokeDashoffset={
                            2 * Math.PI * 19 * (1 - Math.min(100, Math.max(0, progressPercent)) / 100)
                          }
                        />
                      </svg>
                      <span className="absolute text-xs font-bold text-zinc-100 tabular-nums">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                        {t.header.readiness}
                      </div>
                      <div className="text-xs font-medium text-zinc-300 tabular-nums">
                        Sports Science
                      </div>
                    </div>
                  </div>
                  {readiness && (
                    <div className="text-[11px] font-medium text-zinc-400 tabular-nums">
                      VDOT <span className="text-zinc-200">{readiness.vdotScore}%</span> •{" "}
                      {t.header.volShort} <span className="text-zinc-200">{readiness.volumeScore}%</span> •{" "}
                      {t.header.longRunShort} <span className="text-zinc-200">{readiness.enduranceScore}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Progress Track */}
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 text-xs text-zinc-400 tabular-nums">
                <span>
                  {t.header.currentPb}{" "}
                  <strong className="text-zinc-200 font-semibold">
                    {currentBestOrVdotSec ? formatDuration(currentBestOrVdotSec) : "—"}
                  </strong>
                </span>
                <span className="hidden sm:inline text-emerald-400 font-medium">
                  {t.header.progressModelActive}
                </span>
                <span>
                  {t.header.targetLabel}{" "}
                  <strong className="text-zinc-100 font-semibold">
                    {isGeneralFitness
                      ? t.header.generalFitnessBadge
                      : hasRaceGoal && goalTimeSec
                      ? `${formatDuration(goalTimeSec)} (${targetPaceStr})`
                      : "—"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Heart Rate Zones Reference Strip */}
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 text-[11px] tabular-nums">
              <span className="text-zinc-400 uppercase tracking-wider flex items-center gap-1 font-medium">
                <Gauge className="w-3.5 h-3.5 text-emerald-500" /> {t.header.hrZones}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 border border-white/10">
                {t.header.z1} &lt;{Math.round(maxHr * 0.70)}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 border border-white/10">
                {t.header.z2} {Math.round(maxHr * 0.70)}-{thresholdHr - 11}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 border border-white/10">
                {t.header.z3} {thresholdHr - 10}-{thresholdHr - 1}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 border border-white/10">
                {t.header.z4} {thresholdHr}-{Math.round(maxHr * 0.94)}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 border border-white/10">
                {t.header.z5} &gt;{Math.round(maxHr * 0.94)}
              </span>
            </div>
          </div>

          {/* Right Column: Shoe Rotation (hairline divided, no nested card) */}
          <div className={`${compact ? "pt-4 border-t border-white/5" : "lg:col-span-4 lg:border-l lg:border-white/5 lg:pl-6"} space-y-2.5`}>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-emerald-500" /> {t.header.shoeRotation}
              </span>
              <span className="text-[11px] text-zinc-500">Malisoux et al. 2015</span>
            </div>

            <div className="divide-y divide-white/5">
              <div className="py-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    ASICS Novablast 5
                  </div>
                  <div className="text-xs text-zinc-400">
                    {t.header.shoeBaseDesc}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/10 text-[11px] font-medium text-zinc-200 shrink-0">
                  {t.header.shoeBaseTag}
                </span>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    ASICS Magic Speed 4
                  </div>
                  <div className="text-xs text-zinc-400">
                    {t.header.shoeSpeedDesc}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/10 text-[11px] font-medium text-zinc-200 shrink-0">
                  {t.header.shoeSpeedTag}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
