"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Trophy,
  Gauge,
  Footprints,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Radio,
  Medal,
  RefreshCw,
} from "lucide-react";
import { LanguageToggle, useLanguage } from "@/components/LanguageProvider";
import {
  calculateVdotPredictor,
  calculateAcwr,
  calculateShoeMileage,
} from "@/lib/sports-analytics";
import { formatDuration } from "@/lib/formatting";
import type { DashboardData, AthleteInfo, PersonalBestInfo } from "@/types";

export default function SportsLabAnalyticsPage() {
  const router = useRouter();
  const { t, setLanguage } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingPb, setRefreshingPb] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meJson = (await meRes.json()) as { user: AthleteInfo | null };
      if (!meJson.user) {
        router.push("/?login=required");
        return;
      }
      if (meJson.user.preferredLanguage === "id" || meJson.user.preferredLanguage === "en") {
        setLanguage(meJson.user.preferredLanguage);
      }

      const actRes = await fetch("/api/activities");
      if (actRes.ok) {
        const actJson = (await actRes.json()) as DashboardData;
        setData(actJson);
      }
    } finally {
      setLoading(false);
    }
  }, [router, setLanguage]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const onRefresh = () => {
      void loadAnalytics();
    };
    window.addEventListener("pacepulse:refresh", onRefresh);
    return () => window.removeEventListener("pacepulse:refresh", onRefresh);
  }, [loadAnalytics]);

  const handleRefreshPbs = async () => {
    if (refreshingPb) return;
    setRefreshingPb(true);
    try {
      const res = await fetch("/api/activities/pb-refresh", { method: "POST" });
      if (res.ok) {
        const json = (await res.json()) as { personalBests?: PersonalBestInfo[] };
        if (json.personalBests) {
          setData((prev) =>
            prev ? { ...prev, personalBests: json.personalBests } : prev
          );
          window.dispatchEvent(new CustomEvent("pacepulse:refresh"));
        }
      }
    } finally {
      setRefreshingPb(false);
    }
  };

  const retiredGearNames = data?.athlete?.retiredGearNames ?? [];
  const retiredSet = new Set(
    retiredGearNames.map((n) => n.trim().toLowerCase()).filter(Boolean)
  );

  const handleToggleRetireShoe = async (shoeName: string, retire: boolean) => {
    const cleanName = shoeName.trim();
    if (!cleanName) return;
    const nextList = retire
      ? Array.from(new Set([...retiredGearNames, cleanName]))
      : retiredGearNames.filter(
          (n) => n.trim().toLowerCase() !== cleanName.toLowerCase()
        );
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retiredGearNames: nextList }),
      });
      if (res.ok) {
        setData((prev) =>
          prev && prev.athlete
            ? {
                ...prev,
                athlete: { ...prev.athlete, retiredGearNames: nextList },
              }
            : prev
        );
        window.dispatchEvent(new CustomEvent("pacepulse:refresh"));
      }
    } catch {
      // ignore
    }
  };

  const activities = data?.activities ?? [];
  const vdotData = calculateVdotPredictor(activities);
  const acwr = calculateAcwr(activities);
  const activityShoes = calculateShoeMileage(activities, 700, retiredGearNames);
  const sessionCountByGear = new Map(
    activityShoes.map((s) => [s.gearName.toLowerCase(), s.sessionCount])
  );

  // Prefer authoritative Strava master Gear distances when available (excluding retired)
  const shoes =
    data?.gears && data.gears.length > 0
      ? data.gears
          .filter((g) => !retiredSet.has(g.name.trim().toLowerCase()))
          .map((g) => {
            const maxKm = 700;
            const totalKm = Math.round(g.distanceKm * 10) / 10;
            const percentage = Math.round((totalKm / maxKm) * 100);
            const status: "ok" | "warning" | "replace" =
              percentage >= 100 ? "replace" : percentage >= 85 ? "warning" : "ok";
            return {
              gearName: g.name,
              totalKm,
              sessionCount: sessionCountByGear.get(g.name.toLowerCase()) ?? 0,
              maxKm,
              percentage,
              status,
            };
          })
      : activityShoes;

  const acwrStyle = {
    undertraining: {
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/30",
      bar: "bg-blue-500",
      label: t.analyticsPage.statusUndertraining,
    },
    sweet_spot: {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      bar: "bg-emerald-500",
      label: t.analyticsPage.statusSweetSpot,
    },
    caution: {
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30",
      bar: "bg-amber-500",
      label: t.analyticsPage.statusCaution,
    },
    high_risk: {
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/30",
      bar: "bg-red-500",
      label: t.analyticsPage.statusHighRisk,
    },
  }[acwr.status];

  const acwrBarWidth = Math.min(100, Math.round((acwr.ratio / 2.0) * 100));

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <header className="border-b border-white/10 bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-sans">
          <span className="text-zinc-100 font-semibold truncate">{t.nav.analytics}</span>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 tracking-wide">
            <FlaskConical className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{t.analyticsPage.title}</span>
          </h1>
          <p className="text-xs font-sans text-zinc-500 mt-1">
            {t.analyticsPage.subtitle}
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#111114] border border-white/10 text-zinc-400 text-xs font-sans">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>{t.analyticsPage.loading}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Card 1: VDOT Race Predictor */}
            <div className="bg-[#111114] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold font-sans text-white uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>{t.analyticsPage.vdotTitle}</span>
                  </h2>
                  <p className="text-[11px] font-sans text-zinc-500 mt-0.5">
                    {t.analyticsPage.vdotSubtitle}
                  </p>
                </div>
                {vdotData && (
                  <div className="px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-sans text-xs font-black shrink-0">
                    {vdotData.vdot}
                  </div>
                )}
              </div>

              {vdotData ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5 font-sans">
                    <div className="p-3 rounded-xl bg-[#09090B] border border-white/10">
                      <div className="text-[10px] text-zinc-500 uppercase">5K</div>
                      <div className="text-base font-black text-emerald-400">
                        {vdotData.predictions.fiveK}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#09090B] border border-white/10">
                      <div className="text-[10px] text-zinc-500 uppercase">10K</div>
                      <div className="text-base font-black text-emerald-400">
                        {vdotData.predictions.tenK}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#09090B] border border-white/10">
                      <div className="text-[10px] text-zinc-500 uppercase">21.1K (HM)</div>
                      <div className="text-base font-black text-orange-400">
                        {vdotData.predictions.halfMarathon}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#09090B] border border-white/10">
                      <div className="text-[10px] text-zinc-500 uppercase">42.2K (FM)</div>
                      <div className="text-base font-black text-purple-400">
                        {vdotData.predictions.marathon}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] font-sans text-zinc-500 truncate pt-1 border-t border-white/10/60">
                    {t.analyticsPage.vdotSource} <span className="text-zinc-300">{vdotData.sourceActivityName}</span>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-xs font-sans text-zinc-500">
                  {t.analyticsPage.vdotEmpty}
                </div>
              )}
            </div>

            {/* Card 2: ACWR Gauge */}
            <div className="bg-[#111114] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
              <div>
                <h2 className="text-sm font-bold font-sans text-white uppercase tracking-wider flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{t.analyticsPage.acwrTitle}</span>
                </h2>
                <p className="text-[11px] font-sans text-zinc-500 mt-0.5">
                  {t.analyticsPage.acwrSubtitle}
                </p>
              </div>

              <div className="flex items-baseline justify-between font-sans">
                <div className={`text-3xl font-black ${acwrStyle.color}`}>
                  {acwr.ratio.toFixed(2)}
                </div>
                <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${acwrStyle.bg} ${acwrStyle.color}`}>
                  {acwrStyle.label}
                </span>
              </div>

              {/* Gauge Bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded-full bg-[#09090B] border border-white/10 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${acwrStyle.bar}`}
                    style={{ width: `${acwrBarWidth}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-sans text-zinc-500">
                  <span>0.0</span>
                  <span className="text-emerald-400">0.8 – 1.3</span>
                  <span className="text-amber-400">1.5</span>
                  <span className="text-red-400">2.0+</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10/60 font-sans text-xs">
                <div className="p-2.5 rounded-xl bg-[#09090B]">
                  <div className="text-[10px] text-zinc-500">{t.analyticsPage.acuteLoad}</div>
                  <div className="text-sm font-bold text-white flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    {acwr.acuteKm.toFixed(1)} km
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#09090B]">
                  <div className="text-[10px] text-zinc-500">{t.analyticsPage.chronicLoad}</div>
                  <div className="text-sm font-bold text-zinc-300">
                    {acwr.chronicWeeklyAvgKm.toFixed(1)} km
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Shoe Mileage Tracker */}
            <div className="bg-[#111114] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
              <div>
                <h2 className="text-sm font-bold font-sans text-white uppercase tracking-wider flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{t.analyticsPage.shoeTitle}</span>
                </h2>
                <p className="text-[11px] font-sans text-zinc-500 mt-0.5">
                  {t.analyticsPage.shoeSubtitle}
                </p>
              </div>

              {shoes.length === 0 ? (
                <div className="py-8 text-center text-xs font-sans text-zinc-500">
                  {t.analyticsPage.shoeEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  {shoes.map((shoe) => {
                    const barColor =
                      shoe.status === "replace"
                        ? "bg-red-500"
                        : shoe.status === "warning"
                          ? "bg-amber-400"
                          : "bg-emerald-500";
                    const textColor =
                      shoe.status === "replace"
                        ? "text-red-400"
                        : shoe.status === "warning"
                          ? "text-amber-400"
                          : "text-emerald-400";

                    return (
                      <div
                        key={shoe.gearName}
                        className="p-3 rounded-xl bg-[#09090B] border border-white/10 space-y-2 font-sans"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold text-white truncate">
                            {shoe.gearName}
                          </div>
                          <div className={`text-xs font-bold shrink-0 ${textColor}`}>
                            {shoe.totalKm.toFixed(1)} / {shoe.maxKm} km
                          </div>
                        </div>

                        <div className="h-2 w-full rounded-full bg-[#111114] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${Math.min(100, shoe.percentage)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                          <span>
                            {shoe.sessionCount} {t.analyticsPage.shoeSessions} ({shoe.percentage}%)
                          </span>
                          <div className="flex items-center gap-2">
                            {shoe.status === "replace" ? (
                              <span className="text-red-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {t.analyticsPage.shoeReplace}
                              </span>
                            ) : shoe.status === "warning" ? (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {t.analyticsPage.shoeWarn}
                              </span>
                            ) : (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> OK
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleToggleRetireShoe(shoe.gearName, true)}
                              className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 text-[10px] font-medium transition-colors"
                            >
                              {t.analyticsPage.retireShoe}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {retiredGearNames.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                    {t.analyticsPage.retiredShoesTitle} ({retiredGearNames.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {retiredGearNames.map((name) => (
                      <div
                        key={name}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-white/10 text-[11px] text-zinc-400"
                      >
                        <span className="line-through">{name}</span>
                        <button
                          type="button"
                          onClick={() => void handleToggleRetireShoe(name, false)}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          {t.analyticsPage.restoreShoe}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 4: All-Time Personal Bests */}
          <div className="bg-[#111114] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold font-sans text-white uppercase tracking-wider flex items-center gap-2">
                  <Medal className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{t.analyticsPage.pbTitle}</span>
                </h2>
                <p className="text-xs font-sans text-zinc-500 mt-0.5">
                  {t.analyticsPage.pbSubtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleRefreshPbs()}
                disabled={refreshingPb}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-sans font-bold transition-all disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingPb ? "animate-spin" : ""}`} />
                <span>{refreshingPb ? t.analyticsPage.pbRefreshing : t.analyticsPage.pbRefreshBtn}</span>
              </button>
            </div>

            {(() => {
              const pbMap = new Map(
                (data?.personalBests ?? []).map((pb) => [pb.distanceKey, pb])
              );
              const categories: Array<{
                key: "1K" | "5K" | "10K" | "HM" | "FM";
                label: string;
                vdotPred?: string;
              }> = [
                { key: "1K", label: "1K" },
                { key: "5K", label: "5K", vdotPred: vdotData?.predictions.fiveK },
                { key: "10K", label: "10K", vdotPred: vdotData?.predictions.tenK },
                { key: "HM", label: "Half Marathon", vdotPred: vdotData?.predictions.halfMarathon },
                { key: "FM", label: "Marathon", vdotPred: vdotData?.predictions.marathon },
              ];

              const formatPace = (sec: number) => {
                const m = Math.floor(sec / 60);
                const s = Math.round(sec % 60);
                return `${m}:${s.toString().padStart(2, "0")}/km`;
              };

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-sans">
                  {categories.map((cat) => {
                    const pb = pbMap.get(cat.key);
                    return (
                      <div
                        key={cat.key}
                        className="p-3.5 rounded-xl bg-[#09090B] border border-white/10 flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            {cat.label}
                          </span>
                          {pb && (
                            <span className="text-[11px] font-bold text-emerald-400">
                              {formatPace(pb.paceSecPerKm)}
                            </span>
                          )}
                        </div>

                        {pb ? (
                          <>
                            <div className="text-2xl font-black text-amber-400">
                              {formatDuration(pb.timeSeconds)}
                            </div>
                            <div className="space-y-0.5 text-[10px] text-zinc-500 border-t border-white/10/60 pt-2">
                              <div className="text-zinc-300 font-semibold truncate" title={pb.activityName}>
                                {pb.activityName}
                              </div>
                              <div>
                                {new Date(pb.achievedAt).toLocaleDateString()}
                              </div>
                              {cat.vdotPred && (
                                <div className="text-zinc-400 pt-0.5">
                                  {t.analyticsPage.pbVdotPred} <span className="text-emerald-400">{cat.vdotPred}</span>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="py-4 text-xs text-zinc-600">
                            {t.analyticsPage.pbNoRecord}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          </div>
        )}
      </main>
    </div>
  );
}
