"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Heart,
  Activity,
  Target,
  Loader2,
  AlertCircle,
  ExternalLink,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AthleteHeader } from "@/components/AthleteHeader";
import { KpiCard } from "@/components/KpiCard";
import { TelemetryCharts } from "@/components/TelemetryCharts";
import { ActivityCard } from "@/components/ActivityCard";
import { LanguageToggle, useLanguage } from "@/components/LanguageProvider";
import { speedToPace } from "@/lib/formatting";
import {
  calculateAcwr,
  calculateRaceReadiness,
  calculateVdotPredictor,
} from "@/lib/sports-analytics";
import type { DashboardData } from "@/types";

interface PageProps {
  params: Promise<{ username: string }>;
}

const PAGE_SIZE = 10;

export default function PublicProfilePage({ params }: PageProps) {
  const { username } = use(params);
  const { t } = useLanguage();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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
    <div className="min-h-screen bg-[#0B0F17] text-white selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Top Banner */}
      <header className="border-b border-[#1E293B] bg-[#0B0F17]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-sans">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <img
              src="/logo.jpg"
              alt="PacePulse"
              className="w-7 h-7 rounded-lg object-cover border border-[#C8F902]/40 shrink-0"
            />
            <span className="font-display italic text-base font-extrabold tracking-wider text-white">
              PACE<span className="text-[#C8F902]">PULSE</span>
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden md:inline text-zinc-500">
              {t.nav.verifiedPortfolio}
            </span>
            <LanguageToggle />
            <a
              href="/api/auth/strava"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold transition-all whitespace-nowrap"
            >
              <span className="sm:hidden">{t.nav.connectStrava}</span>
              <span className="hidden sm:inline">{t.nav.connectStravaFull}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#131A26] border border-[#1E293B] text-zinc-400 text-xs font-sans">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>{t.publicProfile.loading}</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md mx-auto my-16 bg-[#131A26] border border-red-500/30 rounded-2xl p-8 text-center space-y-4 font-sans">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-white">{t.publicProfile.unavailable}</h3>
            <p className="text-xs text-zinc-400">{error}</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors"
            >
              {t.publicProfile.returnHome}
            </Link>
          </div>
        )}

        {!loading && athlete && data && (() => {
          const vdotPred = calculateVdotPredictor(data.activities);
          const acwrMetrics = calculateAcwr(data.activities);
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const longestRun30dKm = data.activities
            .filter((a) => new Date(a.startDate).getTime() >= thirtyDaysAgo)
            .reduce((max, a) => Math.max(max, a.distanceMeters / 1000), 0);
          const readiness = calculateRaceReadiness({
            currentVdot: vdotPred?.vdot ?? null,
            goalDistance: athlete.goalDistance,
            goalTimeSec: athlete.goalTimeSec,
            avgWeeklyKm28d: acwrMetrics.chronicWeeklyAvgKm,
            longestRun30dKm,
            acwr: acwrMetrics.ratio,
          });
          return (
            <>
              <AthleteHeader
                athlete={athlete}
                vdot={vdotPred?.vdot ?? null}
                personalBests={data.personalBests ?? []}
                readiness={readiness}
                isOwner={false}
              />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <KpiCard
                title={t.kpi.weeklyMileage}
                value={data.weeklySummary.totalDistanceKm.toFixed(1)}
                unit="km"
                subtitle={`${data.weeklySummary.sessionCount} ${t.kpi.sessionsLogged}`}
                trend="up"
                trendValue="+10% Rule"
                icon={<MapPin className="w-5 h-5" />}
                accentColor="emerald"
              />
              <KpiCard
                title={t.kpi.aerobicDecoupling}
                value={aerobicEfficiency}
                unit="m/beat"
                subtitle={t.kpi.cardiacDriftEff}
                trend="up"
                trendValue="Decoupling <5%"
                icon={<Activity className="w-5 h-5" />}
                accentColor="blue"
              />
              <KpiCard
                title={t.kpi.recordedSessions}
                value={data.activities.length.toString()}
                unit="runs"
                subtitle={t.kpi.evaluatedByCoach}
                trend="neutral"
                trendValue="Strava Verified"
                icon={<Heart className="w-5 h-5" />}
                accentColor="orange"
              />
              <KpiCard
                title={t.kpi.cruisePace}
                value={projectedPace}
                subtitle={t.kpi.vdotPace}
                trend="up"
                trendValue={t.kpi.targetReady}
                icon={<Target className="w-5 h-5" />}
                accentColor="purple"
              />
            </div>

            {/* Telemetry Visuals */}
            <TelemetryCharts weeklyTrend={data.weeklyTrend} />

            {/* Activities Feed */}
            <div className="space-y-4">
              <div className="border-b border-[#1E293B] pb-3">
                <h2 className="text-base font-bold text-white font-sans uppercase tracking-wider">
                  {t.publicProfile.feedTitle}
                </h2>
                <p className="text-xs text-zinc-500 font-sans">
                  {t.publicProfile.feedSubtitle}
                </p>
              </div>

              {data.activities.length === 0 ? (
                <div className="bg-[#131A26] border border-[#1E293B] rounded-xl p-8 text-center text-xs font-sans text-zinc-500">
                  {t.publicProfile.noPublicSessions}
                </div>
              ) : (() => {
                const totalPages = Math.max(1, Math.ceil(data.activities.length / PAGE_SIZE));
                const safePage = Math.min(currentPage, totalPages);
                const pageItems = data.activities.slice(
                  (safePage - 1) * PAGE_SIZE,
                  safePage * PAGE_SIZE
                );
                return (
                  <>
                    <div className="space-y-4">
                      {pageItems.map((activity) => (
                        <ActivityCard key={activity.id} activity={activity} canReanalyze={false} />
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="pt-4 flex items-center justify-between gap-3 font-sans text-xs border-t border-[#1E293B]">
                        <button
                          type="button"
                          disabled={safePage <= 1}
                          onClick={() => {
                            setCurrentPage((p) => Math.max(1, p - 1));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#131A26] border border-[#1E293B] text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>{t.historyPage.prev}</span>
                        </button>

                        <span className="text-zinc-400">
                          {t.historyPage.page}{" "}
                          <strong className="text-white">{safePage}</strong>{" "}
                          {t.historyPage.of}{" "}
                          <strong className="text-white">{totalPages}</strong>
                        </span>

                        <button
                          type="button"
                          disabled={safePage >= totalPages}
                          onClick={() => {
                            setCurrentPage((p) => Math.min(totalPages, p + 1));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#131A26] border border-[#1E293B] text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 transition-all"
                        >
                          <span>{t.historyPage.next}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </>
          );
        })()}

        {/* Footer */}
        <footer className="mt-12 sm:mt-16 pt-6 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600 font-sans text-center sm:text-left">
          <div>
            {t.publicProfile.footerLeft}
          </div>
          <a href="/api/auth/strava" className="text-orange-400 hover:underline">
            {t.publicProfile.footerCta}
          </a>
        </footer>
      </main>
    </div>
  );
}
