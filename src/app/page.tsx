"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Heart,
  Activity,
  Target,
  Loader2,
  Sparkles,
  Radio,
  SlidersHorizontal,
  ExternalLink,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Flame,
  Award,
  Layers,
  ChevronRight,
} from "lucide-react";
import { AthleteHeader } from "@/components/AthleteHeader";
import { KpiCard } from "@/components/KpiCard";
import { TelemetryCharts } from "@/components/TelemetryCharts";
import { ActivityCard } from "@/components/ActivityCard";
import { speedToPace } from "@/lib/formatting";
import { DEMO_DASHBOARD_DATA } from "@/lib/demoData";
import type { DashboardData, AthleteInfo } from "@/types";

export default function LandingPage() {
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

  // Fetch featured showcase athlete activities
  const fetchShowcaseData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activities");
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
    fetchShowcaseData();
  }, [fetchShowcaseData]);

  const activeData: DashboardData =
    useDemo || !data || data.activities.length === 0
      ? DEMO_DASHBOARD_DATA
      : data;

  const showcaseAthlete = activeData.athlete || {
    id: "demo-athlete",
    username: "pro-runner",
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

  const latestPhase = activeData.activities?.[0]?.trainingPhase ?? "Build";
  const hrCap = showcaseAthlete.thresholdHr ? showcaseAthlete.thresholdHr - 11 : 162;

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
    return ((1000 / avgPaceSecPerKm / avgHr) * 60).toFixed(2);
  })();

  const projectedHm = (() => {
    if (!activeData.activities?.[0]) return "1:48:40";
    const a = activeData.activities[0];
    const pace = speedToPace(a.averageSpeed);
    return pace !== "--:--" ? `~${pace}/km` : "1:48:40";
  })();

  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Top Header */}
      <header className="border-b border-[#27272A] bg-[#0E0E12]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-base font-black tracking-wider text-white">
                PACE<span className="text-emerald-400">PULSE</span>
              </span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                SaaS v2.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#science-frameworks"
              className="hidden md:inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sports Science</span>
            </a>

            <a
              href="#showcase-section"
              className="hidden sm:inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span>Athlete Showcase</span>
            </a>

            {currentUser ? (
              <a
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                <span>My Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            ) : (
              <a
                href="/api/auth/strava"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold transition-all shadow-lg shadow-orange-500/20"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Connect with Strava</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-[#27272A]/80">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-emerald-500/10 via-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181B] border border-[#27272A] text-xs font-mono text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            MULTI-USER SPORTS SCIENCE SAAS • STRAVA WEBHOOK AUTOMATION
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-mono tracking-tight text-white leading-tight">
            Automated AI Running Coach & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-orange-400 to-orange-500">
              Biometric Telemetry Dashboard
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-400 font-mono leading-relaxed">
            Every time you finish a run, Strava fires a webhook. Within seconds, Gemini AI evaluates your lactate threshold, split pacing, and cardiac drift against <strong>Jack Daniels VDOT</strong>, <strong>Seiler 80/20</strong>, and <strong>Marius Bakken Norwegian Sub-Threshold</strong> methodologies.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/api/auth/strava"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-mono font-black text-sm transition-all shadow-xl shadow-orange-500/25"
            >
              <Zap className="w-4 h-4" />
              <span>Connect Strava OAuth 2.0</span>
            </a>

            <a
              href="#showcase-section"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#18181B] border border-[#27272A] text-zinc-300 hover:text-white hover:border-zinc-500 font-mono text-sm transition-all"
            >
              <span>Explore Live Telemetry Showcase</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </a>
          </div>

          {/* Value Props Pills */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-zinc-500">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121215] border border-[#27272A]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Zero-Touch Ingestion
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121215] border border-[#27272A]">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Literature Citation Engine
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121215] border border-[#27272A]">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Dynamic Custom Target (5K–42K)
            </span>
          </div>
        </div>
      </section>

      {/* Sports Science Knowledge Base Section */}
      <section id="science-frameworks" className="py-16 border-b border-[#27272A] bg-[#0C0C0F]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-xl sm:text-2xl font-black font-mono text-white uppercase tracking-wider flex items-center justify-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              The Sports Science Knowledge Base
            </h2>
            <p className="text-xs font-mono text-zinc-400 max-w-xl mx-auto">
              PacePulse replaces generic chatbot advice with peer-reviewed physiological frameworks. Every AI diagnosis cites established endurance literature.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Jack Daniels */}
            <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-5 space-y-3 hover:border-emerald-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-xs">
                JD
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">Jack Daniels VDOT</h3>
                <p className="text-[11px] text-zinc-500 font-mono">Daniels&apos; Running Formula</p>
              </div>
              <ul className="text-xs text-zinc-400 font-mono space-y-1.5 list-disc list-inside">
                <li>Easy (65–78% Max HR) for mitochondrial density</li>
                <li>Threshold (~88–90% Max HR) steady state</li>
                <li>Max 10% weekly mileage volume progression rule</li>
              </ul>
            </div>

            {/* Stephen Seiler 80/20 */}
            <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-5 space-y-3 hover:border-orange-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold font-mono text-xs">
                80/20
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">Seiler Polarized Model</h3>
                <p className="text-[11px] text-zinc-500 font-mono">80/20 Running (2010)</p>
              </div>
              <ul className="text-xs text-zinc-400 font-mono space-y-1.5 list-disc list-inside">
                <li>80% strictly sub-VT1 Zone 1/2 aerobic work</li>
                <li>20% dedicated high-intensity threshold/intervals</li>
                <li>Prevents chronic &quot;Grey Zone&quot; sympathetic fatigue</li>
              </ul>
            </div>

            {/* Pete Pfitzinger */}
            <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-5 space-y-3 hover:border-blue-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold font-mono text-xs">
                PF
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">Pfitzinger Decoupling</h3>
                <p className="text-[11px] text-zinc-500 font-mono">Advanced Marathoning</p>
              </div>
              <ul className="text-xs text-zinc-400 font-mono space-y-1.5 list-disc list-inside">
                <li>Cardiac drift &gt;5% signals aerobic base deficiency</li>
                <li>Threshold pacing as prime predictor of race outcome</li>
                <li>10–14 day reverse taper post-competition reload</li>
              </ul>
            </div>

            {/* Marius Bakken */}
            <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-5 space-y-3 hover:border-red-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-bold font-mono text-xs">
                MB
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">Norwegian Sub-Threshold</h3>
                <p className="text-[11px] text-zinc-500 font-mono">Double Threshold Method</p>
              </div>
              <ul className="text-xs text-zinc-400 font-mono space-y-1.5 list-disc list-inside">
                <li>Strict lactate ceiling (2.5–3.5 mmol/L)</li>
                <li>High-frequency threshold volume without injury</li>
                <li>Short interval recoveries (45–60s) for lactate clearance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Public Athlete Showcase Section */}
      <section id="showcase-section" className="py-16">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-orange-400 font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Featured Public Athlete Showcase
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-mono text-white">
                Live Public Athlete Telemetry Dashboard
              </h2>
              <p className="text-xs font-mono text-zinc-500">
                Recruiters & visitors can test and inspect full interactive telemetry without logging in to Strava.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <a
                href="/api/auth/strava"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-mono font-bold transition-all"
              >
                <span>Connect Your Strava</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#121215] border border-[#27272A] text-zinc-400 text-xs font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Loading showcase athlete telemetry...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Athlete Cockpit Header */}
              <AthleteHeader
                athlete={showcaseAthlete}
                trainingPhase={latestPhase}
                hrCap={hrCap}
                isDemo={useDemo}
                isOwner={false}
              />

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard
                  title="Weekly Mileage"
                  value={activeData.weeklySummary.totalDistanceKm.toFixed(1)}
                  unit="km"
                  subtitle={`${activeData.weeklySummary.sessionCount} sessions logged`}
                  trend="up"
                  trendValue="+14.2%"
                  icon={<MapPin className="w-5 h-5" />}
                  accentColor="emerald"
                />
                <KpiCard
                  title="Aerobic Efficiency"
                  value={aerobicEfficiency}
                  unit="m/beat"
                  subtitle="Pfitzinger Cardiac Drift Index"
                  trend="up"
                  trendValue="+3.8%"
                  icon={<Activity className="w-5 h-5" />}
                  accentColor="blue"
                />
                <KpiCard
                  title="Recorded Runs"
                  value={activeData.activities.length.toString()}
                  unit="runs"
                  subtitle="Evaluated by Gemini AI"
                  trend="neutral"
                  trendValue="100% Sync"
                  icon={<Heart className="w-5 h-5" />}
                  accentColor="orange"
                />
                <KpiCard
                  title="Race Projection"
                  value={projectedHm}
                  subtitle="Sub-1:45 Target Pacer"
                  trend="up"
                  trendValue="On Track"
                  icon={<Target className="w-5 h-5" />}
                  accentColor="purple"
                />
              </div>

              {/* Recharts Graphs */}
              <TelemetryCharts weeklyTrend={activeData.weeklyTrend} />

              {/* Activities Feed */}
              <div className="space-y-4">
                <div className="border-b border-[#27272A] pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                      Showcase Activities & Sports Science AI Feed
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">
                      Click any session to inspect split-by-split kilometer breakdowns and literature citations
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {activeData.activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} canReanalyze={false} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#27272A] py-8 bg-[#0A0A0D]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>PacePulse SaaS v2.0 • Multi-User Telemetry Platform</span>
          </div>
          <div>
            Built with Next.js 15, Prisma ORM, Strava API, and Google Gemini 2.5 Flash
          </div>
        </div>
      </footer>
    </div>
  );
}
