"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/navigation";
import {
  MapPin,
  Heart,
  Activity,
  Target,
  Loader2,
  AlertCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { AthleteHeader } from "@/components/AthleteHeader";
import { KpiCard } from "@/components/KpiCard";
import { TelemetryCharts } from "@/components/TelemetryCharts";
import { ActivityCard } from "@/components/ActivityCard";
import { speedToPace } from "@/lib/formatting";
import type { DashboardData } from "@/types";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default function PublicProfilePage({ params }: PageProps) {
  const { username } = use(params);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/activities?username=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DashboardData;

      if (!json.athlete) {
        setError(`Athlete @${username} was not found or has set their profile to private.`);
      } else {
        setData(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load public profile");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const athlete = data?.athlete;

  // Aerobic Efficiency
  const aerobicEfficiency = (() => {
    if (!data?.activities?.length) return "—";
    const withHr = data.activities
      .slice(0, 5)
      .filter((a) => a.averageHeartrate && a.averageSpeed);
    if (!withHr.length) return "—";
    const avgPaceSecPerKm =
      withHr.reduce((sum, a) => sum + 1000 / a.averageSpeed, 0) / withHr.length;
    const avgHr =
      withHr.reduce((sum, a) => sum + (a.averageHeartrate ?? 0), 0) /
      withHr.length;
    return ((1000 / avgPaceSecPerKm / avgHr) * 60).toFixed(2);
  })();

  const projectedPace = (() => {
    if (!data?.activities?.[0]) return "—";
    const a = data.activities[0];
    const pace = speedToPace(a.averageSpeed);
    return pace !== "--:--" ? `~${pace}/km` : "—";
  })();

  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Top Banner */}
      <header className="border-b border-[#27272A] bg-[#0E0E12]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between text-xs font-mono">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-bold tracking-wider text-white">
              PACE<span className="text-emerald-400">PULSE</span>
            </span>
          </a>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-zinc-500">
              Verified Sports Science Telemetry Portfolio
            </span>
            <a
              href="/api/auth/strava"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold transition-all"
            >
              <span>Connect Your Strava</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#121215] border border-[#27272A] text-zinc-400 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Loading public athlete telemetry...</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md mx-auto my-16 bg-[#121215] border border-red-500/30 rounded-2xl p-8 text-center space-y-4 font-mono">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Profile Unavailable</h3>
            <p className="text-xs text-zinc-400">{error}</p>
            <a
              href="/"
              className="inline-block px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors"
            >
              Return to PacePulse Home
            </a>
          </div>
        )}

        {!loading && athlete && data && (
          <>
            <AthleteHeader
              athlete={athlete}
              isOwner={false}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard
                title="Weekly Mileage"
                value={data.weeklySummary.totalDistanceKm.toFixed(1)}
                unit="km"
                subtitle={`${data.weeklySummary.sessionCount} sessions logged`}
                trend="up"
                trendValue="+10% Rule"
                icon={<MapPin className="w-5 h-5" />}
                accentColor="emerald"
              />
              <KpiCard
                title="Aerobic Decoupling"
                value={aerobicEfficiency}
                unit="m/beat"
                subtitle="Cardiac drift efficiency"
                trend="up"
                trendValue="Decoupling <5%"
                icon={<Activity className="w-5 h-5" />}
                accentColor="blue"
              />
              <KpiCard
                title="Recorded Sessions"
                value={data.activities.length.toString()}
                unit="runs"
                subtitle="Evaluated by AI Coach"
                trend="neutral"
                trendValue="Strava Verified"
                icon={<Heart className="w-5 h-5" />}
                accentColor="orange"
              />
              <KpiCard
                title="Cruise Pace"
                value={projectedPace}
                subtitle="Jack Daniels VDOT Pace"
                trend="up"
                trendValue="Target Ready"
                icon={<Target className="w-5 h-5" />}
                accentColor="purple"
              />
            </div>

            {/* Telemetry Visuals */}
            <TelemetryCharts weeklyTrend={data.weeklyTrend} />

            {/* Activities Feed */}
            <div className="space-y-4">
              <div className="border-b border-[#27272A] pb-3">
                <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                  Public Training Log & Gemini AI Coach Diagnoses
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  Evidence-based splits, heart rate control, and sports science prescriptions
                </p>
              </div>

              {data.activities.length === 0 ? (
                <div className="bg-[#121215] border border-[#27272A] rounded-xl p-8 text-center text-xs font-mono text-zinc-500">
                  No public running sessions recorded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {data.activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} canReanalyze={false} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600 font-mono">
          <div>
            PacePulse Public Athlete Showcase • Powered by Strava & Gemini 2.5 Flash
          </div>
          <a href="/api/auth/strava" className="text-orange-400 hover:underline">
            Create Your Free Telemetry Dashboard →
          </a>
        </footer>
      </main>
    </div>
  );
}
