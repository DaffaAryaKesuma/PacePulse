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
import { BarChart3, LineChart as LineIcon, Activity } from "lucide-react";
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
    <div className="bg-[#111114]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl text-xs tabular-nums">
      <p className="text-zinc-300 font-semibold mb-2 pb-1 border-b border-white/10">
        Week of {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-zinc-400">{p.name}:</span>
          </div>
          <span className="font-semibold tabular-nums" style={{ color: p.color }}>
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
    <div className="space-y-4">
      {/* Charts Section Header with Tab Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{t.charts.title}</span>
          </h2>
          <p className="text-xs text-zinc-400">
            {t.charts.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#111114] p-1 rounded-lg border border-white/10 text-xs w-full sm:w-auto self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("both")}
            className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === "both"
                ? "bg-zinc-800 text-zinc-100 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="lg:hidden">{t.charts.bothShort}</span>
            <span className="hidden lg:inline">{t.charts.bothLong}</span>
          </button>
          <button
            onClick={() => setActiveTab("volume")}
            className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === "volume"
                ? "bg-zinc-800 text-emerald-400 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.charts.volumeOnly}
          </button>
          <button
            onClick={() => setActiveTab("trend")}
            className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === "trend"
                ? "bg-zinc-800 text-emerald-400 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.charts.paceVsHr}
          </button>
        </div>
      </div>

      <div
        className={`grid gap-4 ${
          activeTab === "both"
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {/* Weekly Distance Chart */}
        {(activeTab === "both" || activeTab === "volume") && (
          <div className="h-full bg-[#111114] border border-white/10 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {t.charts.volumeTitle}
                </h3>
                <p className="text-xs text-zinc-400">
                  {t.charts.volumeSubtitle}
                </p>
              </div>
              <div className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/10 text-zinc-200 text-[11px] font-medium shrink-0">
                {t.charts.volumeGoal}
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-52 sm:h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={20} margin={{ top: 5, right: 5, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: "#a1a1aa", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      width={36}
                      tick={{ fill: "#a1a1aa", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="Distance"
                      fill="url(#barGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 sm:h-56 flex items-center justify-center text-zinc-500 text-xs">
                {t.charts.noTelemetry}
              </div>
            )}
          </div>
        )}

        {/* HR & Pace Trend Line Chart */}
        {(activeTab === "both" || activeTab === "trend") && (
          <div className="h-full bg-[#111114] border border-white/10 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <LineIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  {t.charts.trendTitle}
                </h3>
                <p className="text-xs text-zinc-400">
                  {t.charts.trendSubtitle}
                </p>
              </div>
              <div className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/10 text-zinc-200 text-[11px] font-medium shrink-0">
                {t.charts.efficiencyIndex}
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-52 sm:h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F97316" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#F97316" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: "#a1a1aa", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="hr"
                      orientation="left"
                      width={36}
                      tick={{ fill: "#F97316", fontSize: 10 }}
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
                      tick={{ fill: "#10B981", fontSize: 10 }}
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
                      stroke="#F97316"
                      strokeWidth={2}
                      fill="url(#hrGradient)"
                      dot={{ fill: "#F97316", strokeWidth: 0, r: 2.5 }}
                      activeDot={{ r: 4.5 }}
                    />
                    <Line
                      yAxisId="pace"
                      type="monotone"
                      dataKey="Avg Pace"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: "#10B981", strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 4.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 sm:h-56 flex items-center justify-center text-zinc-500 text-xs">
                {t.charts.noTelemetry}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
