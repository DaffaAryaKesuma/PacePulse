"use client";

import { Target, Zap, ShieldCheck, Flame, Gauge, Share2, Check } from "lucide-react";
import { useState } from "react";
import type { AthleteInfo, PersonalBestInfo } from "@/types";
import { predictTimeSecForDistance, type ResolvedTrainingPhase } from "@/lib/sports-analytics";
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
}

export function AthleteHeader({
  trainingPhase: phaseProp,
  resolvedPhase,
  hrCap: hrCapProp,
  isDemo,
  athlete,
  vdot,
  personalBests,
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

  // Dynamic readiness: target time vs current PB / VDOT estimate for that distance
  const progressPercent = (() => {
    if (isGeneralFitness) return 100;
    if (!hasRaceGoal || !goalTimeSec) return 0;
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
    <div className="mb-6 sm:mb-8 space-y-4">
      {/* Top Telemetry Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-[#27272A]/70">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {athlete?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={athlete.avatarUrl}
                alt={athleteName}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-emerald-500/40 object-cover shadow-lg shadow-emerald-950/50"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-linear-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              </div>
            )}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="text-lg sm:text-2xl font-black tracking-wider text-white font-mono wrap-break-word">
                {athleteName.toUpperCase()}
              </h1>
              {athlete?.username && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#18181B] text-zinc-400 border border-[#27272A]">
                  @{athlete.username}
                </span>
              )}
              {isDemo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 animate-pulse">
                  {t.header.demoTelemetry}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-500 tracking-wider font-mono">
              {t.header.subtitle}
            </p>
          </div>
        </div>

        {/* Phase Pill & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          <div
            title={
              resolvedPhase
                ? language === "id"
                  ? resolvedPhase.reasonId
                  : resolvedPhase.reasonEn
                : undefined
            }
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border text-[11px] sm:text-xs font-mono font-bold tracking-wider uppercase transition-all duration-300 shadow-sm ${currentTheme.bg} ${currentTheme.border} ${currentTheme.text} ${currentTheme.glow}`}
          >
            <span className={`w-2 h-2 rounded-full ${currentTheme.badge} animate-pulse shrink-0`} />
            <span>
              {resolvedPhase?.isAuto ? "🤖 AUTO: " : ""}
              {resolvedPhase
                ? language === "id"
                  ? resolvedPhase.labelId
                  : resolvedPhase.labelEn
                : `${activePhase} ${t.header.phaseSuffix}`}{" "}
              • {t.header.capLabel} ≤ {hrCap} BPM
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121215] border border-[#27272A] text-xs font-mono text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>LT2: {thresholdHr} BPM</span>
          </div>

          {athlete?.username && athlete.isPublic && (
            <button
              onClick={handleCopyLink}
              title="Copy link to public athlete profile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-zinc-300 hover:text-white hover:border-emerald-500 text-xs font-mono transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copied ? t.header.linkCopied : t.header.publicLink}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Cockpit Banner: Target Goal Progression */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-[#121215] via-[#151518] to-[#121215] border border-[#27272A] p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
          {/* Target Progress Bar & Goal */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-zinc-400">
                    {t.header.primaryMilestone}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-white font-mono flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {isGeneralFitness ? (
                      <>
                        <span>{t.header.generalFitnessTitle}</span>
                        <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal whitespace-nowrap">
                          {t.header.generalFitnessBadge}
                        </span>
                      </>
                    ) : hasRaceGoal && goalTimeSec ? (
                      <>
                        <span>{goalDistance?.toUpperCase()} • SUB-{formatDuration(goalTimeSec)}</span>
                        <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-normal whitespace-nowrap">
                          {t.header.paceLabel} {targetPaceStr}
                        </span>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("pacepulse:open-settings"))}
                        className="text-sm sm:text-base text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors"
                      >
                        {t.header.noGoalSet}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {!isGeneralFitness && hasRaceGoal && (
                <div className="text-left sm:text-right">
                  <span className="text-xl sm:text-2xl font-black font-mono text-orange-400">
                    {progressPercent}%
                  </span>
                  <span className="text-xs text-zinc-500 ml-1 font-mono uppercase">{t.header.readiness}</span>
                </div>
              )}
            </div>

            {/* Stepped Telemetry Progress Track */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-[#18181B] rounded-full p-0.5 border border-[#27272A] overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-linear-to-r from-emerald-500 via-orange-400 to-orange-500 transition-all duration-1000 shadow-md shadow-orange-500/20"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 text-[10px] sm:text-[11px] font-mono text-zinc-500">
                <span>
                  {t.header.currentPb}{" "}
                  <strong className="text-zinc-300 font-bold">
                    {currentBestOrVdotSec ? formatDuration(currentBestOrVdotSec) : "—"}
                  </strong>
                </span>
                <span className="hidden sm:inline text-emerald-400 font-bold">
                  {t.header.progressModelActive}
                </span>
                <span>
                  {t.header.targetLabel}{" "}
                  <strong className="text-orange-400 font-bold">
                    {isGeneralFitness
                      ? t.header.generalFitnessBadge
                      : hasRaceGoal && goalTimeSec
                      ? `${formatDuration(goalTimeSec)} (${targetPaceStr})`
                      : "—"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Heart Rate Zones Reference Strip calibrated to user Max & Threshold HR */}
            <div className="pt-2 border-t border-[#27272A]/50 flex flex-wrap items-center gap-2 text-[10px] font-mono">
              <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-400" /> {t.header.hrZones}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {t.header.z1} &lt;{Math.round(maxHr * 0.70)}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {t.header.z2} {Math.round(maxHr * 0.70)}-{thresholdHr - 11}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {t.header.z3} {thresholdHr - 10}-{thresholdHr - 1}
              </span>
              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                {t.header.z4} {thresholdHr}-{Math.round(maxHr * 0.94)}
              </span>
              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                {t.header.z5} &gt;{Math.round(maxHr * 0.94)}
              </span>
            </div>
          </div>

          {/* Right Column: Shoe Rotation telemetry */}
          <div className="lg:col-span-4 bg-[#18181B]/80 rounded-xl p-3.5 sm:p-4 border border-[#27272A] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> {t.header.shoeRotation}
              </span>
              <span className="text-[10px] text-zinc-600">Malisoux et al. 2015</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    ASICS Novablast 5
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {t.header.shoeBaseDesc}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400">
                    {t.header.shoeBaseTag}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                    ASICS Magic Speed 4
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {t.header.shoeSpeedDesc}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-orange-400">
                    {t.header.shoeSpeedTag}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
