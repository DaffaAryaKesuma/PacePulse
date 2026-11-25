"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3, LineChart as LineIcon, Activity, Flame } from "lucide-react";
import type { WeeklyTrendPoint } from "@/types";
import { useLanguage } from "@/components/LanguageProvider";

interface TelemetryChartsProps {
  weeklyTrend: WeeklyTrendPoint[];
}

function formatWeekLabel(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPace(secPerKm: number | null): string {
  if (!secPerKm) return "--:--";
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#131A26]/95 backdrop-blur-md border border-[#1E293B] rounded-xl p-3 shadow-2xl text-xs tabular-nums">
      <p className="text-slate-300 font-bold mb-2 pb-1 border-b border-[#1E293B] flex items-center justify-between">
        <span>Week of {label}</span>
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shadow-sm"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-zinc-400">{p.name}:</span>
          </div>
          <span className="font-bold font-sans" style={{ color: p.color }}>
            {p.name === "Avg Pace"
              ? `${formatPace(p.value)}/km`
              : p.name === "Distance"
                ? `${p.value.toFixed(1)} km`
                : p.name === "Avg HR"
                  ? `${p.value} bpm`
                  : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function TelemetryCharts({ weeklyTrend }: TelemetryChartsProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"both" | "volume" | "trend">("both");

  const chartData = weeklyTrend.map((w) => ({
    week: formatWeekLabel(w.week),
    Distance: parseFloat(w.distanceKm.toFixed(1)),
    "Avg HR": w.avgHr,
    "Avg Pace": w.avgPaceSec && w.avgPaceSec <= 900 ? w.avgPaceSec : null,
    Sessions: w.sessions,
  }));

  const validPaces = chartData
    .map((d) => d["Avg Pace"])
    .filter((p): p is number => typeof p === "number" && p > 0);
  const paceDomain: [number, number] | ["auto", "auto"] =
    validPaces.length > 0
      ? [Math.max(120, Math.min(...validPaces) - 30), Math.max(...validPaces) + 30]
      : ["auto", "auto"];

  return (
    <div className="space-y-4 mb-8">
      {/* Charts Section Header with Tab Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display italic text-lg sm:text-xl font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C8F902] shrink-0" />
            <span>{t.charts.title}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {t.charts.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#131A26] p-1 rounded-xl border border-[#1E293B] text-[11px] sm:text-xs w-full sm:w-auto self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("both")}
            className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === "both"
                ? "bg-[#1E293B] text-white font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="lg:hidden">{t.charts.bothShort}</span>
            <span className="hidden lg:inline">{t.charts.bothLong}</span>
          </button>
          <button
            onClick={() => setActiveTab("volume")}
            className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === "volume"
                ? "bg-[#1E293B] text-[#C8F902] font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.charts.volumeOnly}
          </button>
          <button
            onClick={() => setActiveTab("trend")}
            className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === "trend"
                ? "bg-[#1E293B] text-[#FF5A1F] font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.charts.paceVsHr}
          </button>
        </div>
      </div>

      <div
        className={`grid gap-4 sm:gap-6 ${
          activeTab === "both"
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {/* Weekly Distance Chart */}
        {(activeTab === "both" || activeTab === "volume") && (
          <div className="relative overflow-hidden bg-[#131A26] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-xl hover:border-[#C8F902]/40 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#C8F902] shrink-0" />
                  {t.charts.volumeTitle}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  {t.charts.volumeSubtitle}
                </p>
              </div>
              <div className="px-2.5 py-1 rounded bg-[#C8F902]/10 border border-[#C8F902]/25 text-[#C8F902] text-[10px] sm:text-[11px] font-bold shrink-0">
                {t.charts.volumeGoal}
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-50 sm:h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={22} margin={{ top: 5, right: 5, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C8F902" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#84CC16" stopOpacity={0.35} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1E293B"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      width={36}
                      tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="Distance"
                      fill="url(#barGradient)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-50 sm:h-60 flex items-center justify-center text-zinc-600 text-xs font-sans">
                {t.charts.noTelemetry}
              </div>
            )}
          </div>
        )}

        {/* HR & Pace Trend Line Chart */}
        {(activeTab === "both" || activeTab === "trend") && (
          <div className="relative overflow-hidden bg-[#131A26] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-xl hover:border-[#FF5A1F]/40 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <LineIcon className="w-4 h-4 text-[#FF5A1F] shrink-0" />
                  {t.charts.trendTitle}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  {t.charts.trendSubtitle}
                </p>
              </div>
              <div className="px-2.5 py-1 rounded bg-[#FF5A1F]/10 border border-[#FF5A1F]/25 text-[#FF5A1F] text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shrink-0">
                <Flame className="w-3 h-3" /> {t.charts.efficiencyIndex}
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-52.5 sm:h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF5A1F" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#FF5A1F" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1E293B"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="hr"
                      orientation="left"
                      width={36}
                      tick={{ fill: "#FF5A1F", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      domain={["auto", "auto"]}
                    />
                    <YAxis
                      yAxisId="pace"
                      orientation="right"
                      reversed={true}
                      domain={paceDomain}
                      width={40}
                      tick={{ fill: "#C8F902", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatPace}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{
                        fontSize: "11px",
                        paddingTop: "8px",
                      }}
                    />
                    <Area
                      yAxisId="hr"
                      type="monotone"
                      dataKey="Avg HR"
                      stroke="#FF5A1F"
                      strokeWidth={2.5}
                      fill="url(#hrGradient)"
                      dot={{ fill: "#FF5A1F", strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="pace"
                      type="monotone"
                      dataKey="Avg Pace"
                      stroke="#C8F902"
                      strokeWidth={2.5}
                      dot={{ fill: "#C8F902", strokeWidth: 0, r: 3.5 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52.5 sm:h-60 flex items-center justify-center text-zinc-600 text-xs font-sans">
                {t.charts.noTelemetry}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
