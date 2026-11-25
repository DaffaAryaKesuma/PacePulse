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
      icon: "text-[#C8F902]",
      iconBg: "bg-[#C8F902]/10 border-[#C8F902]/30",
      value: "text-[#C8F902]",
      borderGlow: "hover:border-[#C8F902]/45 hover:shadow-[0_10px_30px_-10px_rgba(200,249,2,0.16)]",
      badge: "bg-[#C8F902]/10 text-[#C8F902] border-[#C8F902]/30",
    },
    orange: {
      icon: "text-[#FF5A1F]",
      iconBg: "bg-[#FF5A1F]/10 border-[#FF5A1F]/30",
      value: "text-[#FF5A1F]",
      borderGlow: "hover:border-[#FF5A1F]/45 hover:shadow-[0_10px_30px_-10px_rgba(255,90,31,0.18)]",
      badge: "bg-[#FF5A1F]/10 text-[#FF5A1F] border-[#FF5A1F]/30",
    },
    blue: {
      icon: "text-[#38BDF8]",
      iconBg: "bg-[#38BDF8]/10 border-[#38BDF8]/30",
      value: "text-[#38BDF8]",
      borderGlow: "hover:border-[#38BDF8]/45 hover:shadow-[0_10px_30px_-10px_rgba(56,189,248,0.18)]",
      badge: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30",
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
      ? "text-[#C8F902]"
      : trend === "down"
        ? "text-red-400"
        : "text-slate-400";

  return (
    <div
      className={`group relative overflow-hidden bg-[#131A26] border border-[#1E293B] rounded-2xl p-3.5 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 shadow-xl ${accent.borderGlow}`}
    >
      {/* Subtle athletic corner sheen */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-[#C8F902]/6 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between gap-2 mb-2.5 sm:mb-3">
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200 ${accent.iconBg}`}
        >
          <span className={accent.icon}>{icon}</span>
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-semibold whitespace-nowrap truncate max-w-28.75 sm:max-w-none ${trendColor} bg-[#0B0F17] border-[#1E293B]`}
          >
            <TrendIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{trendValue}</span>
          </div>
        )}
      </div>

      <div className="mb-1 sm:mb-1.5 flex items-baseline gap-1 min-w-0">
        <span
          className={`font-display italic text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight tabular-nums truncate ${accent.value}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs sm:text-sm text-slate-400 font-semibold shrink-0">
            {unit}
          </span>
        )}
      </div>

      <p className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">
        {title}
      </p>
      {subtitle && (
        <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{subtitle}</p>
      )}
    </div>
  );
}
