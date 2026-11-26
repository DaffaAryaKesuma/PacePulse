"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Heart,
  Activity,
  Target,
  Loader2,
  RefreshCw,
  Share2,
  Check,
  AlertCircle,
  Radio,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { AthleteHeader } from "@/components/AthleteHeader";
import { KpiCard } from "@/components/KpiCard";
import { TelemetryCharts } from "@/components/TelemetryCharts";
import { ActivityCard } from "@/components/ActivityCard";
import { useLanguage } from "@/components/LanguageProvider";
import { speedToPace } from "@/lib/formatting";
import {
  calculateAcwr,
  calculateRaceReadiness,
  calculateVdotPredictor,
  resolveActiveTrainingPhase,
} from "@/lib/sports-analytics";
import type { DashboardData, AthleteInfo } from "@/types";

export default function PersonalDashboard() {
  const router = useRouter();
  const { t, setLanguage } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [currentUser, setCurrentUser] = useState<AthleteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      if (json.user.preferredLanguage === "id" || json.user.preferredLanguage === "en") {
        setLanguage(json.user.preferredLanguage);
      }
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

  useEffect(() => {
    const onRefresh = () => {
      void fetchData();
    };
    window.addEventListener("pacepulse:refresh", onRefresh);
    const vdotPredictor = data ? calculateVdotPredictor(data.activities) : null;
  const acwrMetrics = data ? calculateAcwr(data.activities) : null;
  const longestRun30dKm = (() => {
    if (!data?.activities?.length) return 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return data.activities
      .filter((a) => new Date(a.startDate).getTime() >= thirtyDaysAgo)
      .reduce((max, a) => Math.max(max, a.distanceMeters / 1000), 0);
  })();
  const readiness =
    currentUser && data && acwrMetrics
      ? calculateRaceReadiness({
          currentVdot: vdotPredictor?.vdot ?? null,
          goalDistance: currentUser.goalDistance,
          goalTimeSec: currentUser.goalTimeSec,
          avgWeeklyKm28d: acwrMetrics.chronicWeeklyAvgKm,
          longestRun30dKm,
          acwr: acwrMetrics.ratio,
        })
      : null;

  const resolvedPhase =
    currentUser && data && acwrMetrics
      ? resolveActiveTrainingPhase(currentUser, data.activities, acwrMetrics)
      : null;

  return () => window.removeEventListener("pacepulse:refresh", onRefresh);
  }, [fetchData]);

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

  const vdotPredictor = data ? calculateVdotPredictor(data.activities) : null;
  const acwrMetrics = data ? calculateAcwr(data.activities) : null;
  const longestRun30dKm = (() => {
    if (!data?.activities?.length) return 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return data.activities
      .filter((a) => new Date(a.startDate).getTime() >= thirtyDaysAgo)
      .reduce((max, a) => Math.max(max, a.distanceMeters / 1000), 0);
  })();
  const readiness =
    currentUser && data && acwrMetrics
      ? calculateRaceReadiness({
          currentVdot: vdotPredictor?.vdot ?? null,
          goalDistance: currentUser.goalDistance,
          goalTimeSec: currentUser.goalTimeSec,
          avgWeeklyKm28d: acwrMetrics.chronicWeeklyAvgKm,
          longestRun30dKm,
          acwr: acwrMetrics.ratio,
        })
      : null;

  const resolvedPhase =
    currentUser && data && acwrMetrics
      ? resolveActiveTrainingPhase(currentUser, data.activities, acwrMetrics)
      : null;

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Clean Page Topbar: Connection Status + Page Breadcrumb */}
      <header className="border-b border-white/10 bg-[#09090B]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold tracking-wide truncate">
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{t.nav.stravaConnectedFull}</span>
              <span className="sm:hidden">{t.nav.stravaConnected}</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-100 font-semibold truncate">{t.nav.overview}</span>
          </div>

          <span className="hidden md:inline text-zinc-400 truncate">
            {t.nav.welcome} <strong className="text-zinc-100">{currentUser?.fullName}</strong>
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Sync Toast Feedback */}
        {syncMessage && (
          <div className="p-4 rounded-xl bg-[#111114] border border-white/10 text-emerald-400 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-zinc-400 hover:text-zinc-200">
              {t.dashboard.dismiss}
            </button>
          </div>
        )}

        {/* Onboarding Banner when User Goal is Unset */}
        {currentUser && !currentUser.goalDistance && (
          <div className="p-5 rounded-xl bg-[#111114] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Target className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">
                  {t.onboarding.bannerTitle}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {t.onboarding.bannerSubtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("pacepulse:open-settings"))}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shrink-0"
            >
              {t.onboarding.ctaButton}
            </button>
          </div>
        )}

        {/* Athlete Cockpit Header */}
        <AthleteHeader
          athlete={currentUser}
          resolvedPhase={resolvedPhase}
          vdot={vdotPredictor?.vdot ?? null}
          personalBests={data?.personalBests ?? []}
          readiness={readiness}
          isOwner={true}
        />

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#111114] border border-white/10 text-zinc-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>{t.dashboard.loadingTelemetry}</span>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && !loading && (
          <div className="bg-[#111114] border border-red-500/20 rounded-xl p-4 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => fetchData()} className="text-zinc-300 hover:text-zinc-100 underline">
              {t.dashboard.retry}
            </button>
          </div>
        )}

        {!loading && data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title={t.kpi.weeklyMileage}
                value={data.weeklySummary.totalDistanceKm.toFixed(1)}
                unit="km"
                subtitle={`${data.weeklySummary.sessionCount} ${t.kpi.sessionsLoggedWeek}`}
                trend="up"
                trendValue="+10% Rule"
                icon={<MapPin className="w-4 h-4" />}
                accentColor="emerald"
              />
              <KpiCard
                title={t.kpi.aerobicEfficiency}
                value={aerobicEfficiency}
                unit="m/beat"
                subtitle={t.kpi.pfitzingerIndex}
                trend="up"
                trendValue="Decoupling <5%"
                icon={<Activity className="w-4 h-4" />}
                accentColor="blue"
              />
              <KpiCard
                title={t.kpi.recordedRuns}
                value={data.activities.length.toString()}
                unit="runs"
                subtitle={t.kpi.analyzedByAi}
                trend="neutral"
                trendValue="Auto Sync"
                icon={<Heart className="w-4 h-4" />}
                accentColor="orange"
              />
              <KpiCard
                title={t.kpi.latestCruisePace}
                value={projectedPace}
                subtitle={t.kpi.vdotProjection}
                trend="up"
                trendValue={t.kpi.onTrack}
                icon={<Target className="w-4 h-4" />}
                accentColor="purple"
              />
            </div>

            {/* Recharts Telemetry Visuals */}
            <TelemetryCharts weeklyTrend={data.weeklyTrend} />

            {/* Activities Feed */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{t.dashboard.feedTitle}</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {t.dashboard.feedSubtitle}
                  </p>
                </div>

                {currentUser?.username && (
                  <button
                    onClick={handleCopyPublic}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111114] border border-white/10 text-zinc-300 hover:text-zinc-100 hover:border-white/20 text-xs self-start sm:self-auto"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-zinc-400" />}
                    <span>{copied ? t.dashboard.linkCopied : `${t.dashboard.publicProfile} (/u/${currentUser.username})`}</span>
                  </button>
                )}
              </div>

              {data.activities.length === 0 ? (
                <div className="bg-[#111114] border border-white/10 rounded-xl p-6 sm:p-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center mx-auto">
                    <RefreshCw className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">
                      {t.dashboard.noRunsTitle}
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                      {t.dashboard.noRunsDesc}
                    </p>
                  </div>
                  <button
                    onClick={handleUserSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                    <span>{syncing ? t.nav.syncing : t.dashboard.sync10Runs}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.activities.slice(0, 3).map((activity, idx) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      canReanalyze={true}
                      defaultExpanded={idx === 0}
                      autoAnalyze={idx === 0}
                    />
                  ))}

                  {data.activities.length > 3 && (
                    <div className="pt-1 flex justify-center">
                      <Link
                        href="/dashboard/history"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111114] border border-white/10 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-white/20 transition-colors"
                      >
                        <span>
                          {t.dashboard.viewAllHistory} ({t.dashboard.totalSuffix} {data.activities.length})
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{t.dashboard.footerLeft}</span>
          </div>
          <div>
            {t.dashboard.footerRight}
          </div>
        </footer>
      </main>
    </div>
  );
}
