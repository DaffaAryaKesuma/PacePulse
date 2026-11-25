"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Heart,
  Activity,
  Target,
  Loader2,
  RefreshCw,
  LogOut,
  Settings,
  Share2,
  Check,
  AlertCircle,
  Radio,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { AthleteHeader } from "@/components/AthleteHeader";
import { KpiCard } from "@/components/KpiCard";
import { TelemetryCharts } from "@/components/TelemetryCharts";
import { ActivityCard } from "@/components/ActivityCard";
import { AthleteSettingsModal } from "@/components/AthleteSettingsModal";
import { speedToPace } from "@/lib/formatting";
import type { DashboardData, AthleteInfo } from "@/types";

export default function PersonalDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [currentUser, setCurrentUser] = useState<AthleteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1. Check user authentication
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = (await res.json()) as { user: AthleteInfo | null };
      if (!json.user) {
        router.push("/?login=required");
        return null;
      }
      setCurrentUser(json.user);
      return json.user;
    } catch {
      router.push("/?login=required");
      return null;
    }
  }, [router]);

  // 2. Fetch user activities and dashboard telemetry
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/activities");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DashboardData;
      setData(json);
      if (json.athlete) {
        setCurrentUser(json.athlete);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load telemetry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth().then((u) => {
      if (u) {
        fetchData();
      }
    });
  }, [checkAuth, fetchData]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  // Handle Direct User Strava Sync (No admin secret needed!)
  const handleUserSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/activities/sync", { method: "POST" });
      const resJson = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        setSyncMessage(resJson.message || "Runs successfully synced from Strava!");
        fetchData();
      } else {
        setError(resJson.error || "Failed to sync runs from Strava.");
      }
    } catch {
      setError("Network error during sync.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleCopyPublic = () => {
    if (typeof window !== "undefined" && currentUser?.username) {
      const url = `${window.location.origin}/u/${currentUser.username}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Aerobic Efficiency Index
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
    const eff = (1000 / avgPaceSecPerKm / avgHr) * 60;
    return eff.toFixed(2);
  })();

  const projectedPace = (() => {
    if (!data?.activities?.[0]) return "—";
    const a = data.activities[0];
    const pace = speedToPace(a.averageSpeed);
    return pace !== "--:--" ? `~${pace}/km` : "—";
  })();

  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Top Navbar */}
      <header className="border-b border-[#27272A] bg-[#0E0E12]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              STRAVA OAUTH 2.0 • CONNECTED
            </span>
            <span className="hidden md:inline text-zinc-600">•</span>
            <span className="hidden md:inline text-zinc-400">
              Welcome, <strong className="text-white">{currentUser?.fullName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync button for authenticated athlete */}
            <button
              onClick={handleUserSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Syncing..." : "Sync Latest Runs"}</span>
            </button>

            {/* Settings button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-zinc-300 hover:text-white hover:border-zinc-500 transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Sync Toast Feedback */}
        {syncMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-emerald-400/70 hover:text-emerald-400">
              Dismiss
            </button>
          </div>
        )}

        {/* Athlete Cockpit Header */}
        <AthleteHeader
          athlete={currentUser}
          isOwner={true}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#121215] border border-[#27272A] text-zinc-400 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Loading telemetry analytics...</span>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => fetchData()} className="text-red-400 hover:text-red-300 underline">
              Retry
            </button>
          </div>
        )}

        {!loading && data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard
                title="Weekly Mileage"
                value={data.weeklySummary.totalDistanceKm.toFixed(1)}
                unit="km"
                subtitle={`${data.weeklySummary.sessionCount} sessions logged this week`}
                trend="up"
                trendValue="+10% Rule"
                icon={<MapPin className="w-5 h-5" />}
                accentColor="emerald"
              />
              <KpiCard
                title="Aerobic Efficiency"
                value={aerobicEfficiency}
                unit="m/beat"
                subtitle="Pfitzinger Cardiac Drift Index"
                trend="up"
                trendValue="Decoupling <5%"
                icon={<Activity className="w-5 h-5" />}
                accentColor="blue"
              />
              <KpiCard
                title="Recorded Runs"
                value={data.activities.length.toString()}
                unit="runs"
                subtitle="Analyzed by Sports Science AI"
                trend="neutral"
                trendValue="Auto Sync"
                icon={<Heart className="w-5 h-5" />}
                accentColor="orange"
              />
              <KpiCard
                title="Latest Cruise Pace"
                value={projectedPace}
                subtitle="Jack Daniels VDOT Projection"
                trend="up"
                trendValue="On Track"
                icon={<Target className="w-5 h-5" />}
                accentColor="purple"
              />
            </div>

            {/* Recharts Telemetry Visuals */}
            <TelemetryCharts weeklyTrend={data.weeklyTrend} />

            {/* Activities Feed */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                    Your Running Telemetry & AI Coach Feed
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono">
                    Sessions auto-evaluated against Jack Daniels, Seiler 80/20, Pfitzinger, and Marius Bakken literature
                  </p>
                </div>

                {currentUser?.username && (
                  <button
                    onClick={handleCopyPublic}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-zinc-400 hover:text-white text-xs font-mono self-start sm:self-auto"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copied ? "Link Copied!" : `Public Profile (/u/${currentUser.username})`}</span>
                  </button>
                )}
              </div>

              {data.activities.length === 0 ? (
                <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-10 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <RefreshCw className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-mono">
                      No Strava Runs Synchronized Yet
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono max-w-md mx-auto mt-1">
                      Click the button below to pull your 10 most recent runs from Strava and have Gemini AI analyze them automatically!
                    </p>
                  </div>
                  <button
                    onClick={handleUserSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                    <span>{syncing ? "Syncing..." : "Sync 10 Latest Runs from Strava"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} canReanalyze={true} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>PacePulse SaaS v2.0 • Multi-User Telemetry & Sports Science AI</span>
          </div>
          <div>
            Jack Daniels • Seiler 80/20 • Pfitzinger • Marius Bakken
          </div>
        </footer>
      </main>

      {/* Settings Modal */}
      {currentUser && (
        <AthleteSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          athlete={currentUser}
          onUpdated={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
