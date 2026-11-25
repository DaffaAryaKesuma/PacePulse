"use client";

import { Target, Zap, ShieldCheck, Flame, Gauge, Settings, Share2, Check, User as UserIcon } from "lucide-react";
import { useState } from "react";
import type { AthleteInfo } from "@/types";
import { formatDuration } from "@/lib/formatting";

interface AthleteHeaderProps {
  trainingPhase?: string;
  hrCap?: number;
  isDemo?: boolean;
  athlete?: AthleteInfo | null;
  onOpenSettings?: () => void;
  isOwner?: boolean;
}

export function AthleteHeader({
  trainingPhase: phaseProp,
  hrCap: hrCapProp,
  isDemo,
  athlete,
  onOpenSettings,
  isOwner,
}: AthleteHeaderProps) {
  const [copied, setCopied] = useState(false);

  // Dynamic parameters
  const activePhase = athlete?.trainingPhase || phaseProp || "Base";
  const athleteName = athlete?.fullName || "Endurance Athlete";
  const goalDistance = athlete?.goalDistance || "Half Marathon";
  const goalTimeSec = athlete?.goalTimeSec || 6300; // 1:45:00
  const pbSec = athlete?.currentPbSec || 7448; // 2:04:08
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
  const distKm = distanceKmMap[goalDistance] || 21.0975;
  const targetPaceSecPerKm = Math.round(goalTimeSec / distKm);
  const targetPaceMin = Math.floor(targetPaceSecPerKm / 60);
  const targetPaceSec = Math.round(targetPaceSecPerKm % 60);
  const targetPaceStr = `${targetPaceMin}:${targetPaceSec.toString().padStart(2, "0")}/km`;

  // Dynamic progress calculation: based on PB vs Goal
  // Baseline is 15% slower than PB or standard
  const worstBaseline = Math.round(pbSec * 1.15);
  const progressPercent = Math.max(
    10,
    Math.min(
      95,
      Math.round(((worstBaseline - pbSec) / (worstBaseline - goalTimeSec)) * 100)
    )
  );

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
    <div className="mb-8 space-y-4">
      {/* Top Telemetry Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#27272A]/70">
        <div className="flex items-center gap-3">
          <div className="relative">
            {athlete?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={athlete.avatarUrl}
                alt={athleteName}
                className="w-12 h-12 rounded-xl border border-emerald-500/40 object-cover shadow-lg shadow-emerald-950/50"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
            )}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white font-mono">
                {athleteName.toUpperCase()}
              </h1>
              {athlete?.username && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#18181B] text-zinc-400 border border-[#27272A]">
                  @{athlete.username}
                </span>
              )}
              {isDemo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 animate-pulse">
                  DEMO TELEMETRY
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 tracking-wider font-mono">
              SPORTS SCIENCE KNOWLEDGE BASE • JACK DANIELS & NORWEGIAN PROTOCOLS
            </p>
          </div>
        </div>

        {/* Phase Pill & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold tracking-wider uppercase transition-all duration-300 shadow-sm ${currentTheme.bg} ${currentTheme.border} ${currentTheme.text} ${currentTheme.glow}`}
          >
            <span className={`w-2 h-2 rounded-full ${currentTheme.badge} animate-pulse`} />
            {activePhase} Phase • Cap ≤ {hrCap} BPM
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121215] border border-[#27272A] text-xs font-mono text-zinc-400">
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
              <span>{copied ? "Link Copied!" : "Public Link"}</span>
            </button>
          )}

          {isOwner && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 text-xs font-mono font-bold transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Athlete Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Cockpit Banner: Target Goal Progression */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#121215] via-[#151518] to-[#121215] border border-[#27272A] p-6 shadow-2xl">
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Target Progress Bar & Goal */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                  <Target className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                    Primary Macro Milestone
                  </div>
                  <div className="text-lg font-bold text-white font-mono flex items-center gap-2">
                    {goalDistance.toUpperCase()} • SUB-{formatDuration(goalTimeSec)}
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-normal">
                      PACE {targetPaceStr}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black font-mono text-orange-400">
                  {progressPercent}%
                </span>
                <span className="text-xs text-zinc-500 ml-1 font-mono uppercase">Readiness</span>
              </div>
            </div>

            {/* Stepped Telemetry Progress Track */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-[#18181B] rounded-full p-0.5 border border-[#27272A] overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-orange-400 to-orange-500 transition-all duration-1000 shadow-md shadow-orange-500/20"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono text-zinc-500">
                <span>
                  Current PB: <strong className="text-zinc-300 font-bold">{formatDuration(pbSec)}</strong>
                </span>
                <span className="text-emerald-400 font-bold">
                  Progress Model Active
                </span>
                <span>
                  Target: <strong className="text-orange-400 font-bold">{formatDuration(goalTimeSec)}</strong> ({targetPaceStr})
                </span>
              </div>
            </div>

            {/* Heart Rate Zones Reference Strip calibrated to user Max & Threshold HR */}
            <div className="pt-2 border-t border-[#27272A]/50 flex flex-wrap items-center gap-2 text-[10px] font-mono">
              <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-400" /> HR Zones:
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Z1 Recovery &lt;{Math.round(maxHr * 0.70)}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Z2 Aerobic {Math.round(maxHr * 0.70)}-{thresholdHr - 11}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Z3 Tempo {thresholdHr - 10}-{thresholdHr - 1}
              </span>
              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                Z4 Threshold {thresholdHr}-{Math.round(maxHr * 0.94)}
              </span>
              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                Z5 VO2 &gt;{Math.round(maxHr * 0.94)}
              </span>
            </div>
          </div>

          {/* Right Column: Shoe Rotation telemetry */}
          <div className="lg:col-span-4 bg-[#18181B]/80 rounded-xl p-4 border border-[#27272A] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Shoe Rotation
              </span>
              <span className="text-[10px] text-zinc-600">Malisoux et al. 2015</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ASICS Novablast 5
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Base Aerobic & Long Runs
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-emerald-400">
                  Daily Cushion
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  ASICS Magic Speed 4
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Threshold & Track Intervals
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-orange-400">
                  Carbon Rocker
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
