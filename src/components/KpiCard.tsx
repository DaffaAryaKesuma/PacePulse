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
  const isPrimary = accentColor === "emerald";

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
        ? "text-zinc-400"
        : "text-zinc-500";

  return (
    <div className="h-full flex flex-col justify-between bg-[#111114] border border-white/10 rounded-xl p-4 transition-colors hover:border-white/20">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0 text-zinc-300">
          {icon}
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/10 bg-zinc-800/80 text-[11px] font-medium whitespace-nowrap truncate max-w-28.75 sm:max-w-none ${trendColor}`}
          >
            <TrendIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{trendValue}</span>
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-baseline gap-1.5 min-w-0">
          <span
            className={`text-2xl font-bold tracking-tight tabular-nums truncate ${
              isPrimary ? "text-emerald-400" : "text-zinc-100"
            }`}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs font-medium text-zinc-400 shrink-0">
              {unit}
            </span>
          )}
        </div>

        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 truncate">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-zinc-500 mt-1 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
