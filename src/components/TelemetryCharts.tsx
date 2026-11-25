"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
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
    <div className="bg-[#121215]/95 backdrop-blur-md border border-[#27272A] rounded-xl p-3 shadow-2xl text-xs font-mono">
      <p className="text-zinc-400 font-bold mb-2 pb-1 border-b border-[#27272A] flex items-center justify-between">
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
          <span className="font-bold font-mono" style={{ color: p.color }}>
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
  const [activeTab, setActiveTab] = useState<"both" | "volume" | "trend">("both");

  const chartData = weeklyTrend.map((w) => ({
    week: formatWeekLabel(w.week),
    Distance: parseFloat(w.distanceKm.toFixed(1)),
    "Avg HR": w.avgHr,
    "Avg Pace": w.avgPaceSec,
    Sessions: w.sessions,
  }));

  return (
    <div className="space-y-4 mb-8">
      {/* Charts Section Header with Tab Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Telemetry Graphs & Biometric Trends
          </h2>
          <p className="text-xs text-zinc-500 font-mono">
            8-Week Rolling Progression • Volume & Lactate Heart Rate Correlation
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-xl border border-[#27272A] text-xs font-mono self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("both")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "both"
                ? "bg-zinc-800 text-white font-bold shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Side by Side
          </button>
          <button
            onClick={() => setActiveTab("volume")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "volume"
                ? "bg-zinc-800 text-emerald-400 font-bold shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Volume Only
          </button>
          <button
            onClick={() => setActiveTab("trend")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "trend"
                ? "bg-zinc-800 text-orange-400 font-bold shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Pace vs HR
          </button>
        </div>
      </div>

      <div
        className={`grid gap-6 ${
          activeTab === "both"
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {/* Weekly Distance Chart */}
        {(activeTab === "both" || activeTab === "volume") && (
          <div className="relative overflow-hidden bg-[#121215] border border-[#27272A] rounded-2xl p-6 shadow-xl hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Weekly Volume Load
                </h3>
                <p className="text-xs text-zinc-500 font-mono">
                  Aerobic base mileage accumulator (km/week)
                </p>
              </div>
              <div className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold">
                Goal: 45 km/wk
              </div>
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barSize={26}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272A"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
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
            ) : (
              <div className="h-[240px] flex items-center justify-center text-zinc-600 text-xs font-mono">
                No telemetry recorded yet
              </div>
            )}
          </div>
        )}

        {/* HR & Pace Trend Line Chart */}
        {(activeTab === "both" || activeTab === "trend") && (
          <div className="relative overflow-hidden bg-[#121215] border border-[#27272A] rounded-2xl p-6 shadow-xl hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <LineIcon className="w-4 h-4 text-orange-400" />
                  Aerobic Decoupling & Pace Trend
                </h3>
                <p className="text-xs text-zinc-500 font-mono">
                  Orange: Heart Rate (bpm) • Green: Cruise Pace
                </p>
              </div>
              <div className="px-2.5 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-mono font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> Efficiency Index ↑
              </div>
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#F97316" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272A"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="hr"
                    orientation="left"
                    tick={{ fill: "#F97316", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <YAxis
                    yAxisId="pace"
                    orientation="right"
                    tick={{ fill: "#10B981", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatPace}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      fontSize: "11px",
                      fontFamily: "monospace",
                      paddingTop: "8px",
                    }}
                  />
                  <Area
                    yAxisId="hr"
                    type="monotone"
                    dataKey="Avg HR"
                    stroke="#F97316"
                    strokeWidth={2.5}
                    fill="url(#hrGradient)"
                    dot={{ fill: "#F97316", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="pace"
                    type="monotone"
                    dataKey="Avg Pace"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ fill: "#10B981", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-zinc-600 text-xs font-mono">
                No telemetry recorded yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
