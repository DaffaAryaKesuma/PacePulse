"use client";

import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  unit?: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: ReactNode;
  accentColor?: "emerald" | "orange" | "blue" | "purple";
}

export function KpiCard({
  title,
  value,
  unit,
  subtitle,
  trend,
  trendValue,
  icon,
  accentColor = "emerald",
}: KpiCardProps) {
  const accent = {
    emerald: {
      icon: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/30",
      value: "text-emerald-400",
      borderGlow: "hover:border-emerald-500/40 hover:shadow-emerald-950/30",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    },
    orange: {
      icon: "text-orange-400",
      iconBg: "bg-orange-500/10 border-orange-500/30",
      value: "text-orange-400",
      borderGlow: "hover:border-orange-500/40 hover:shadow-orange-950/30",
      badge: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    },
    blue: {
      icon: "text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/30",
      value: "text-blue-400",
      borderGlow: "hover:border-blue-500/40 hover:shadow-blue-950/30",
      badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    },
    purple: {
      icon: "text-purple-400",
      iconBg: "bg-purple-500/10 border-purple-500/30",
      value: "text-purple-400",
      borderGlow: "hover:border-purple-500/40 hover:shadow-purple-950/30",
      badge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    },
  }[accentColor];

  const TrendIcon =
    trend === "up"
      ? TrendingUp
      : trend === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
        ? "text-red-400"
        : "text-zinc-500";

  return (
    <div
      className={`group relative overflow-hidden bg-[#121215] border border-[#27272A] rounded-2xl p-3.5 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${accent.borderGlow}`}
    >
      {/* Subtle corner indicator */}
      <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-white/[0.03] to-transparent pointer-events-none" />

      <div className="flex items-start justify-between gap-2 mb-2.5 sm:mb-3">
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200 ${accent.iconBg}`}
        >
          <span className={accent.icon}>{icon}</span>
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono font-semibold whitespace-nowrap truncate max-w-[115px] sm:max-w-none ${trendColor} bg-zinc-900 border-[#27272A]`}
          >
            <TrendIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{trendValue}</span>
          </div>
        )}
      </div>

      <div className="mb-1 sm:mb-1.5 flex items-baseline gap-1 min-w-0">
        <span
          className={`text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-tight truncate ${accent.value}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs sm:text-sm text-zinc-500 font-mono font-semibold shrink-0">
            {unit}
          </span>
        )}
      </div>

      <p className="text-[10px] sm:text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">
        {title}
      </p>
      {subtitle && (
        <p className="text-[10px] sm:text-[11px] text-zinc-500 font-mono truncate">{subtitle}</p>
      )}
    </div>
  );
}
