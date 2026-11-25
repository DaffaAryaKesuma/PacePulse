"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Heart,
  Activity,
  Target,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { AthleteHeader } from "@/components/AthleteHeader";
import { KpiCard } from "@/components/KpiCard";
import { TelemetryCharts } from "@/components/TelemetryCharts";
import { ActivityCard } from "@/components/ActivityCard";
import { SyncButton } from "@/components/SyncButton";
import { EmptyState } from "@/components/EmptyState";
import { speedToPace } from "@/lib/formatting";
import { DEMO_DASHBOARD_DATA } from "@/lib/demoData";
import type { DashboardData } from "@/types";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useDemo, setUseDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/activities");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DashboardData;

      // If database is completely empty on initial load, default to demo mode so user sees the rich telemetry!
      if (!json.activities || json.activities.length === 0) {
        setUseDemo(true);
      } else {
        setUseDemo(false);
      }
      setData(json);
    } catch (err) {
      console.warn("Could not reach API, falling back to demo mode:", err);
      setUseDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Active display data: switch between live database data and rich demo telemetry
  const activeData: DashboardData =
    useDemo || !data || data.activities.length === 0
      ? DEMO_DASHBOARD_DATA
      : data;

  // Determine current training phase from latest activity
  const latestPhase = activeData.activities?.[0]?.trainingPhase ?? "Build";
  const hrCapByPhase: Record<string, number> = {
    Recovery: 135,
    Base: 162,
    Build: 173,
    Race: 185,
  };
  const hrCap = hrCapByPhase[latestPhase] ?? 173;

  // Calculate aerobic efficiency (avg speed relative to avg HR)
  const aerobicEfficiency = (() => {
    if (!activeData.activities?.length) return "1.42";
    const withHr = activeData.activities
      .slice(0, 5)
      .filter((a) => a.averageHeartrate && a.averageSpeed);
    if (!withHr.length) return "1.42";
    const avgPaceSecPerKm =
      withHr.reduce((sum, a) => sum + 1000 / a.averageSpeed, 0) / withHr.length;
    const avgHr =
      withHr.reduce((sum, a) => sum + (a.averageHeartrate ?? 0), 0) /
      withHr.length;
    // Aerobic efficiency: (speed m/s * 60) / heartrate
    const eff = (1000 / avgPaceSecPerKm / avgHr) * 60;
    return eff.toFixed(2);
  })();

  // Projected HM time from latest activity
  const projectedHm = (() => {
    if (!activeData.activities?.[0]) return "1:48:40";
    const a = activeData.activities[0];
    const pace = speedToPace(a.averageSpeed);
    return pace !== "--:--" ? `~${pace}/km` : "1:48:40";
  })();

  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Top Telemetry Control Strip */}
      <header className="border-b border-[#27272A] bg-[#0E0E12]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              TELEMETRY LISTENER: ACTIVE
            </span>
            <span className="hidden md:inline text-zinc-600">•</span>
            <span className="hidden md:inline text-zinc-400">
              Webhook: <code className="text-zinc-300">/api/strava-webhook</code>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-[#18181B] border border-[#27272A] rounded-lg p-0.5">
              <button
                onClick={() => setUseDemo(false)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                  !useDemo
                    ? "bg-emerald-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Live DB ({data?.activities?.length ?? 0})
              </button>
              <button
                onClick={() => setUseDemo(true)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                  useDemo
                    ? "bg-orange-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Demo Athlete
              </button>
            </div>

            <SyncButton onSyncComplete={() => void fetchData()} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Athlete Cockpit Header & Macro Target Banner */}
        <AthleteHeader
          trainingPhase={latestPhase}
          hrCap={hrCap}
          isDemo={useDemo}
        />

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#121215] border border-[#27272A] text-zinc-400 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Fetching telemetry synchronization...</span>
            </div>
          </div>
        )}

        {/* Error notification if any */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Live Database error: {error} (Displaying Demo telemetry)</span>
            </div>
            <button
              onClick={() => void fetchData()}
              className="text-red-400 hover:text-red-300 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* 4 High-Tech KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            title="Weekly Mileage"
            value={activeData.weeklySummary.totalDistanceKm.toFixed(1)}
            unit="km"
            subtitle={`${activeData.weeklySummary.sessionCount} sessions logged this week`}
            trend="up"
            trendValue="+14.2%"
            icon={<MapPin className="w-5 h-5" />}
            accentColor="emerald"
          />
          <KpiCard
            title="Aerobic Efficiency"
            value={aerobicEfficiency}
            unit="m/beat"
            subtitle="Pace vs Heart Rate quotient"
            trend="up"
            trendValue="+3.8%"
            icon={<Activity className="w-5 h-5" />}
            accentColor="blue"
          />
          <KpiCard
            title="Recorded Sesi"
            value={activeData.activities.length.toString()}
            unit="runs"
            subtitle="Analyzed by Gemini AI"
            trend="neutral"
            trendValue="100% Sync"
            icon={<Heart className="w-5 h-5" />}
            accentColor="orange"
          />
          <KpiCard
            title="Race Projection"
            value={projectedHm}
            subtitle="Predicted Sub-1:45 Target Pace"
            trend="up"
            trendValue="On Track"
            icon={<Target className="w-5 h-5" />}
            accentColor="purple"
          />
        </div>

        {/* Telemetry Visual Graphs (Weekly Volume + Pace vs HR) */}
        <TelemetryCharts weeklyTrend={activeData.weeklyTrend} />

        {/* Recent Activities & Gemini AI Coaching Feed */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                Recent Activities & Gemini AI Telemetry Feed
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                Click any session to inspect split-by-split kilometer breakdowns and AI prescriptions
              </p>
            </div>

            {useDemo && (
              <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 self-start sm:self-auto">
                ⚡ Demo Data Active (Simulated athlete: Novablast 5 & Magic Speed 4)
              </span>
            )}
          </div>

          {!useDemo && activeData.activities.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {activeData.activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>PacePulse v1.2 • Automated Event-Driven Telemetry Architecture</span>
          </div>
          <div>
            Powered by Next.js 15 • Gemini 2.5 Flash • Strava Webhooks
          </div>
        </footer>
      </main>
    </div>
  );
}
