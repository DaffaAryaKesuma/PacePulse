"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  Sparkles,
  ArrowRight,
  Zap,
  Bot,
  CalendarClock,
  Trophy,
  CloudSun,
  ChevronRight,
} from "lucide-react";
import { AthleteHeader } from "@/components/AthleteHeader";
import { ActivityCard } from "@/components/ActivityCard";
import { LanguageToggle, useLanguage } from "@/components/LanguageProvider";
import { DEMO_DASHBOARD_DATA } from "@/lib/demoData";
import type { DashboardData, AthleteInfo } from "@/types";

export default function LandingPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [currentUser, setCurrentUser] = useState<AthleteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  // Check if session user is active
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json: { user: AthleteInfo | null }) => {
        if (json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch only 3 latest showcase activities for lightweight landing preview
  const fetchShowcaseData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activities?limit=3");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DashboardData;

      if (!json.activities || json.activities.length === 0) {
        setUseDemo(true);
      } else {
        setUseDemo(false);
      }
      setData(json);
    } catch {
      setUseDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchShowcaseData();
  }, [fetchShowcaseData]);

  const activeData: DashboardData =
    useDemo || !data || data.activities.length === 0
      ? DEMO_DASHBOARD_DATA
      : data;

  const showcaseAthlete = activeData.athlete || {
    id: "demo-athlete",
    username: "black_daffa-8449",
    fullName: "Daffa (Norwegian-lite Athlete)",
    avatarUrl: null,
    goalDistance: "Half Marathon",
    goalTimeSec: 6300,
    currentPbSec: 7448,
    thresholdHr: 173,
    maxHr: 190,
    thresholdPaceSec: 280,
    trainingPhase: "Build",
    isPublic: true,
  };

  const showcaseUsername = showcaseAthlete.username || "black_daffa-8449";
  const previewActivities = activeData.activities.slice(0, 3);
  const totalCount = activeData.totalActivities ?? activeData.activities.length;
  const latestPhase = previewActivities[0]?.trainingPhase ?? showcaseAthlete.trainingPhase ?? "Build";
  const hrCap = showcaseAthlete.thresholdHr ? showcaseAthlete.thresholdHr - 11 : 162;

  const features = [
    {
      icon: Bot,
      title: t.landing.f1Title,
      desc: t.landing.f1Desc,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      icon: CalendarClock,
      title: t.landing.f2Title,
      desc: t.landing.f2Desc,
      accent: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    },
    {
      icon: Trophy,
      title: t.landing.f3Title,
      desc: t.landing.f3Desc,
      accent: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    },
    {
      icon: CloudSun,
      title: t.landing.f4Title,
      desc: t.landing.f4Desc,
      accent: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Clean Top Navbar */}
      <header className="border-b border-[#27272A] bg-[#0E0E12]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-sm sm:text-base font-black tracking-wider text-white">
              PACE<span className="text-emerald-400">PULSE</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageToggle />

            {currentUser ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap"
              >
                <span>{t.nav.myDashboard}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <a
                href="/api/auth/strava"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold transition-all shadow-lg shadow-orange-500/20 whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden">{t.nav.connectStrava}</span>
                <span className="hidden sm:inline">{t.nav.connectStravaFull}</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 sm:py-20 border-b border-[#27272A]/80">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[220px] sm:h-[300px] bg-linear-to-tr from-emerald-500/10 via-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 text-center space-y-5 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181B] border border-[#27272A] text-[10px] sm:text-xs font-mono text-zinc-300 max-w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">{t.landing.heroPill}</span>
          </div>

          <h1 className="text-2xl sm:text-5xl font-black font-mono tracking-tight text-white leading-tight">
            {t.landing.heroTitle1}{" "}
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 via-orange-400 to-orange-500">
              {t.landing.heroTitle2}
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-400 font-mono leading-relaxed">
            {t.landing.heroDesc}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href="/api/auth/strava"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-mono font-black text-sm transition-all shadow-xl shadow-orange-500/25"
            >
              <Zap className="w-4 h-4" />
              <span>{t.landing.ctaConnect}</span>
            </a>

            <Link
              href={`/u/${showcaseUsername}`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#18181B] border border-[#27272A] text-zinc-300 hover:text-white hover:border-zinc-500 font-mono text-sm transition-all"
            >
              <span>{t.landing.ctaExplore}</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </Link>
          </div>
        </div>
      </section>

      {/* Core Features Grid (4 Cards) */}
      <section className="py-12 sm:py-16 border-b border-[#27272A] bg-[#0C0C0F]">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-lg sm:text-2xl font-black font-mono text-white uppercase tracking-wider">
              {t.landing.featuresTitle}
            </h2>
            <p className="text-xs font-mono text-zinc-400 max-w-xl mx-auto">
              {t.landing.featuresSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="bg-[#121215] border border-[#27272A] rounded-2xl p-5 space-y-3 hover:border-zinc-600 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${feat.accent}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white font-mono">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live Telemetry Preview (Max 3 Latest Activities) */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272A]">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-orange-400 font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" /> {t.landing.showcaseBadge}
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-mono text-white">
                {t.landing.showcaseTitle}
              </h2>
              <p className="text-xs font-mono text-zinc-500">
                {t.landing.showcaseDesc}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#121215] border border-[#27272A] text-zinc-400 text-xs font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>{t.landing.loadingShowcase}</span>
              </div>
            </div>
          ) : (
            <>
              <AthleteHeader
                athlete={showcaseAthlete}
                trainingPhase={latestPhase}
                hrCap={hrCap}
                isDemo={useDemo}
                isOwner={false}
              />

              <div className="space-y-4">
                {previewActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    canReanalyze={false}
                  />
                ))}
              </div>

              <div className="pt-2 flex justify-center">
                <Link
                  href={`/u/${showcaseUsername}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs sm:text-sm transition-all"
                >
                  <span>
                    {t.landing.viewAllShowcasePrefix} {totalCount} {t.landing.viewAllShowcaseSuffix}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#27272A] py-6 sm:py-8 bg-[#0A0A0D]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-zinc-600 font-mono text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{t.landing.footerLeft}</span>
          </div>
          <div>{t.landing.footerRight}</div>
        </div>
      </footer>
    </div>
  );
}
