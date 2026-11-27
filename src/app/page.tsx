"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  Bot,
  CalendarClock,
  Trophy,
  Gauge,
  ChevronRight,
} from "lucide-react";
import { AthleteHeader } from "@/components/AthleteHeader";
import { ActivityCard } from "@/components/ActivityCard";
import { LanguageToggle, useLanguage } from "@/components/LanguageProvider";
import { DEMO_ACTIVITIES } from "@/lib/demoData";
import { resolvePhysiologicalThresholds } from "@/lib/sports-analytics";
import type { AthleteInfo } from "@/types";

const DEMO_ATHLETE: AthleteInfo = {
  id: "demo-athlete",
  username: null,
  fullName: "Demo Athlete",
  avatarUrl: null,
  goalDistance: "Half Marathon",
  goalTimeSec: 6300,
  currentPbSec: 7448,
  thresholdHr: 173,
  maxHr: 190,
  restingHr: 52,
  thresholdPaceSec: 280,
  trainingPhase: "Build",
  isPublic: false,
};

export default function LandingPage() {
  const router = useRouter();
  const { t } = useLanguage();

  // Redirect authenticated users straight to their personal dashboard
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json: { user: AthleteInfo | null }) => {
        if (json.user) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const previewActivities = DEMO_ACTIVITIES.slice(0, 2);
  const demoThresholds = resolvePhysiologicalThresholds(DEMO_ATHLETE, DEMO_ACTIVITIES);

  const features = [
    {
      icon: Gauge,
      title: "LT1 / LT2 3-Tier Calibration",
      desc: t.landing.f1Desc,
    },
    {
      icon: Trophy,
      title: t.landing.f3Title,
      desc: t.landing.f3Desc,
    },
    {
      icon: Bot,
      title: "AI Running Coach",
      desc: t.landing.f2Desc,
    },
    {
      icon: CalendarClock,
      title: "Adaptive Training Plan",
      desc: t.landing.f4Desc,
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-[#09090B]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.jpg"
              alt="PacePulse"
              className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
            />
            <span className="text-base font-bold tracking-tight text-zinc-100">
              PACE<span className="text-emerald-500">PULSE</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <LanguageToggle />
            <a
              href="/api/auth/strava"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-colors whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">{t.nav.connectStrava}</span>
              <span className="hidden sm:inline">{t.nav.connectStravaFull}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-14 sm:py-20 border-b border-white/10 bg-[#09090B]">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-800/80 border border-white/10 text-[11px] font-medium uppercase tracking-wider text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>{t.landing.heroPill}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-100 leading-tight">
            {t.landing.heroTitle1}{" "}
            <br className="hidden sm:block" />
            <span className="text-emerald-400">{t.landing.heroTitle2}</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-400 leading-relaxed">
            {t.landing.heroDesc}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/api/auth/strava"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>{t.landing.ctaConnect}</span>
            </a>

            <a
              href="#demo-preview"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#111114] border border-white/10 text-zinc-200 hover:text-zinc-100 hover:border-white/20 text-sm font-medium transition-colors"
            >
              <span>{t.landing.interactiveDemoBadge}</span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </a>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-12 sm:py-16 border-b border-white/10 bg-[#09090B]">
        <div className="max-w-6xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-100">
              {t.landing.featuresTitle}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              {t.landing.featuresSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="h-full bg-[#111114] border border-white/10 rounded-xl p-5 space-y-3 hover:border-white/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center text-emerald-500">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-200">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Static Interactive Demo Preview (100% Dummy Mockup — Zero User DB Exposure) */}
      <section id="demo-preview" className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-800/80 border border-white/10 text-[11px] font-medium uppercase tracking-wider text-emerald-400 mb-2">
                <Sparkles className="w-3 h-3" /> {t.landing.interactiveDemoBadge}
              </div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-100">
                {t.landing.interactiveDemoTitle}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {t.landing.interactiveDemoDesc}
              </p>
            </div>
          </div>

          <AthleteHeader
            athlete={DEMO_ATHLETE}
            trainingPhase="Build"
            thresholds={demoThresholds}
            isDemo={true}
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
            <a
              href="/api/auth/strava"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>{t.landing.ctaConnectAccount}</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 bg-[#09090B]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{t.landing.footerLeft}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{t.landing.footerRight}</span>
            <Link
              href="/privacy"
              className="text-zinc-300 hover:text-emerald-400 underline underline-offset-4 transition-colors"
            >
              {t.landing.privacyPolicy}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
