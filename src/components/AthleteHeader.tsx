"use client";

import { Target, Zap, ShieldCheck, Flame, Gauge } from "lucide-react";

interface AthleteHeaderProps {
  trainingPhase: string;
  hrCap: number;
  isDemo?: boolean;
}

export function AthleteHeader({ trainingPhase, hrCap, isDemo }: AthleteHeaderProps) {
  // Target: Sub-1:45:00 HM = 6300 seconds (Pace 4:58/km)
  // Debut: 2:04:08 = 7448 seconds (Pace 5:53/km)
  // Current estimated level: ~1:49:30 = 6570 seconds (Pace 5:11/km)
  const targetSec = 6300;
  const debutSec = 7448;
  const currentEstSec = 6650;
  const progressPercent = Math.round(
    ((debutSec - currentEstSec) / (debutSec - targetSec)) * 100
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
    Race: {
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      glow: "shadow-red-500/20",
      badge: "bg-red-500",
    },
  };

  const currentTheme = phaseColors[trainingPhase] ?? phaseColors.Base;

  return (
    <div className="mb-8 space-y-4">
      {/* Top Telemetry Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#27272A]/70">
        {/* Branding & Sub-tag */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-wider text-white font-mono">
                PACE<span className="text-emerald-400">PULSE</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest font-bold bg-[#18181B] text-zinc-400 border border-[#27272A]">
                PRO v1.2
              </span>
              {isDemo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 animate-pulse">
                  DEMO TELEMETRY
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 tracking-wider font-mono">
              NORWEGIAN-LITE DOUBLE THRESHOLD TELEMETRY & AI COACH
            </p>
          </div>
        </div>

        {/* Phase Pill & Methodology Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold tracking-wider uppercase transition-all duration-300 shadow-sm ${currentTheme.bg} ${currentTheme.border} ${currentTheme.text} ${currentTheme.glow}`}
          >
            <span className={`w-2 h-2 rounded-full ${currentTheme.badge} animate-pulse`} />
            {trainingPhase} Phase • Cap ≤ {hrCap} BPM
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121215] border border-[#27272A] text-xs font-mono text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>LT2: 173 BPM</span>
          </div>
        </div>
      </div>

      {/* Main Cockpit Banner: Target Sub-1:45:00 Half Marathon */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#121215] via-[#151518] to-[#121215] border border-[#27272A] p-6 shadow-2xl">
        {/* Subtle Ambient Background Glows */}
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
                    SUB-1:45:00 HALF MARATHON
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-normal">
                      PACE 4:58/KM
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black font-mono text-orange-400">
                  {progressPercent}%
                </span>
                <span className="text-xs text-zinc-500 ml-1 font-mono uppercase">Achieved</span>
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
                <span className="flex items-center gap-1">
                  Debut: <strong className="text-zinc-300 font-bold">2:04:08</strong> (5:53/km)
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  Current: <strong className="font-bold">~1:49:30</strong> (5:11/km)
                </span>
                <span className="flex items-center gap-1 text-orange-400">
                  Target: <strong className="font-bold">1:45:00</strong> (4:58/km)
                </span>
              </div>
            </div>

            {/* Heart Rate Zones Reference Strip */}
            <div className="pt-2 border-t border-[#27272A]/50 flex flex-wrap items-center gap-2 text-[10px] font-mono">
              <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-400" /> HR Zones:
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Z1 Recovery &lt;135
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Z2 Aerobic 135-162
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Z3 Tempo 163-172
              </span>
              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                Z4 Threshold 173-181
              </span>
              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                Z5 VO2 &gt;182
              </span>
            </div>
          </div>

          {/* Right Column: Shoe Rotation telemetry */}
          <div className="lg:col-span-4 bg-[#18181B]/80 rounded-xl p-4 border border-[#27272A] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Shoe Rotation
              </span>
              <span className="text-[10px] text-zinc-600">Dual Setup</span>
            </div>

            {/* Shoe 1: Novablast 5 */}
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
                  312 km
                </div>
                <div className="text-[9px] text-zinc-600 font-mono">Logged</div>
              </div>
            </div>

            {/* Shoe 2: Magic Speed 4 */}
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
                  128 km
                </div>
                <div className="text-[9px] text-zinc-600 font-mono">Carbon Plate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
