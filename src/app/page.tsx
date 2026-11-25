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
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 selection:bg-[#C8F902]/25 selection:text-[#C8F902]">
      {/* Clean Top Navbar */}
      <header className="border-b border-[#1E293B] bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/logo.jpg"
              alt="PacePulse"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-[#C8F902]/40 shadow-md shadow-[#C8F902]/10 shrink-0"
            />
            <span className="font-display italic text-lg sm:text-xl font-extrabold tracking-wider text-white">
              PACE<span className="text-[#C8F902]">PULSE</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageToggle />

            {currentUser ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#C8F902] hover:bg-[#d8ff3b] text-[#0B0F17] font-bold transition-all shadow-lg shadow-[#C8F902]/20 whitespace-nowrap"
              >
                <span>{t.nav.myDashboard}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <a
                href="/api/auth/strava"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#C8F902] hover:bg-[#d8ff3b] text-[#0B0F17] font-bold transition-all shadow-lg shadow-[#C8F902]/20 whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden">{t.nav.connectStrava}</span>
                <span className="hidden sm:inline">{t.nav.connectStravaFull}</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Running Track Lanes SVG */}
      <section className="relative overflow-hidden py-12 sm:py-20 border-b border-[#1E293B] bg-[#0B0F17]">
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 400"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.08] pointer-events-none"
          preserveAspectRatio="none"
        >
          <path d="M-80 350 Q 420 80 1280 220" fill="none" stroke="#C8F902" strokeWidth="2" />
          <path d="M-80 375 Q 440 105 1280 245" fill="none" stroke="#C8F902" strokeWidth="1.5" />
          <path d="M-80 400 Q 460 130 1280 270" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
          <path d="M-80 425 Q 480 155 1280 295" fill="none" stroke="#FF5A1F" strokeWidth="2" strokeDasharray="12 8" />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-150 h-55 sm:h-75 bg-linear-to-tr from-[#C8F902]/12 via-[#FF5A1F]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 text-center space-y-5 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#131A26] border border-[#1E293B] text-[10px] sm:text-xs font-semibold text-slate-300 max-w-full">
            <span className="w-2 h-2 rounded-full bg-[#C8F902] animate-pulse shrink-0" />
            <span className="truncate">{t.landing.heroPill}</span>
          </div>

          <h1 className="font-display italic text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
            {t.landing.heroTitle1}{" "}
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#C8F902] via-[#38BDF8] to-[#FF5A1F]">
              {t.landing.heroTitle2}
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            {t.landing.heroDesc}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href="/api/auth/strava"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#C8F902] hover:bg-[#d8ff3b] text-[#0B0F17] font-extrabold text-sm transition-all shadow-xl shadow-[#C8F902]/20"
            >
              <Zap className="w-4 h-4" />
              <span>{t.landing.ctaConnect}</span>
            </a>

            <Link
              href={`/u/${showcaseUsername}`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#131A26] border border-[#1E293B] text-slate-200 hover:text-white hover:border-[#C8F902]/50 text-sm font-semibold transition-all"
            >
              <span>{t.landing.ctaExplore}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* Core Features Grid (4 Cards) */}
      <section className="py-12 sm:py-16 border-b border-[#1E293B] bg-[#0B0F17]">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="font-display italic text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wide">
              {t.landing.featuresTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              {t.landing.featuresSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="bg-[#131A26] border border-[#1E293B] rounded-2xl p-5 space-y-3 hover:border-zinc-600 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${feat.accent}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white font-sans">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E293B]">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-sans text-orange-400 font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" /> {t.landing.showcaseBadge}
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-sans text-white">
                {t.landing.showcaseTitle}
              </h2>
              <p className="text-xs font-sans text-zinc-500">
                {t.landing.showcaseDesc}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#131A26] border border-[#1E293B] text-zinc-400 text-xs font-sans">
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
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-sans font-bold text-xs sm:text-sm transition-all"
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
      <footer className="border-t border-[#1E293B] py-6 sm:py-8 bg-[#0A0A0D]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-zinc-600 font-sans text-center sm:text-left">
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
