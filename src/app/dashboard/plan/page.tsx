"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Sparkles,
  RefreshCw,
  Loader2,
  Radio,
  AlertCircle,
  Footprints,
  Heart,
  Clock,
  SlidersHorizontal,
  Trophy,
  Droplets,
  Flame,
  Mountain,
  BookOpen,
  Bot,
  ShieldCheck,
  Target,
  Lock,
} from "lucide-react";
import { LanguageToggle, useLanguage } from "@/components/LanguageProvider";
import {
  buildRaceDayStrategy,
  type RaceDistanceKey,
  type ElevationProfile,
  type ResolvedTrainingPhase,
} from "@/lib/sports-analytics";
import type { WeeklyPlanData, WeeklyPlanDay } from "@/types";

interface PlanApiResponse {
  plan: WeeklyPlanData | null;
  vdot: number | null;
  acwr?: { ratio: number; status: string };
  resolvedPhase?: ResolvedTrainingPhase;
  goalDistance?: string | null;
  goalTimeSec?: number | null;
  availableRunDays?: string[];
  preferredLongRunDay?: string | null;
  error?: string;
  details?: string;
}

const WEEK_DAY_OPTIONS = [
  { key: "Senin", labelId: "Senin", labelEn: "Mon" },
  { key: "Selasa", labelId: "Selasa", labelEn: "Tue" },
  { key: "Rabu", labelId: "Rabu", labelEn: "Wed" },
  { key: "Kamis", labelId: "Kamis", labelEn: "Thu" },
  { key: "Jumat", labelId: "Jumat", labelEn: "Fri" },
  { key: "Sabtu", labelId: "Sabtu", labelEn: "Sat" },
  { key: "Minggu", labelId: "Minggu", labelEn: "Sun" },
] as const;

export default function TrainingPlanPage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [plan, setPlan] = useState<WeeklyPlanData | null>(null);
  const [vdot, setVdot] = useState<number | null>(null);
  const [resolvedPhase, setResolvedPhase] = useState<ResolvedTrainingPhase | null>(null);
  const [goalDistance, setGoalDistance] = useState<string | null | undefined>(undefined);
  const [availableRunDays, setAvailableRunDays] = useState<string[]>(
    WEEK_DAY_OPTIONS.map((d) => d.key)
  );
  const [preferredLongRunDay, setPreferredLongRunDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");

  // Race-Day Strategy Builder state
  const [raceDistance, setRaceDistance] = useState<RaceDistanceKey>("Half Marathon");
  const [elevationProfile, setElevationProfile] = useState<ElevationProfile>("flat");

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plans/current");
      if (res.status === 401) {
        router.push("/?login=required");
        return;
      }
      const json = (await res.json()) as PlanApiResponse;
      if (res.ok) {
        setPlan(json.plan);
        setVdot(json.vdot);
        setResolvedPhase(json.resolvedPhase ?? null);
        setGoalDistance(json.goalDistance ?? null);
        if (json.availableRunDays && json.availableRunDays.length >= 2) {
          setAvailableRunDays(json.availableRunDays);
        }
        if (json.preferredLongRunDay !== undefined) {
          setPreferredLongRunDay(json.preferredLongRunDay);
        }
        if (
          json.goalDistance === "5K" ||
          json.goalDistance === "10K" ||
          json.goalDistance === "Half Marathon" ||
          json.goalDistance === "Marathon"
        ) {
          setRaceDistance(json.goalDistance);
        }
      } else {
        setError(json.details || json.error || "Failed to load plan");
      }
    } catch {
      setError("Network error while loading plan");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    const onRefresh = () => {
      void loadPlan();
    };
    window.addEventListener("pacepulse:refresh", onRefresh);
    return () => window.removeEventListener("pacepulse:refresh", onRefresh);
  }, [loadPlan]);

  const toggleRunDay = (dayKey: string) => {
    setError(null);
    setAvailableRunDays((prev) => {
      if (prev.includes(dayKey)) {
        if (prev.length <= 2) {
          setError(t.planPage.minTwoDaysError);
          return prev;
        }
        if (preferredLongRunDay === dayKey) {
          setPreferredLongRunDay(null);
        }
        return prev.filter((d) => d !== dayKey);
      }
      return [...prev, dayKey];
    });
  };

  const handleLongRunDayChange = (val: string) => {
    const nextLong = val || null;
    setPreferredLongRunDay(nextLong);
    if (nextLong && !availableRunDays.includes(nextLong)) {
      setAvailableRunDays((prev) => [...prev, nextLong]);
    }
  };

  const handleGenerate = async () => {
    if (generating) return;
    if (availableRunDays.length < 2) {
      setError(t.planPage.minTwoDaysError);
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          availableRunDays,
          preferredLongRunDay,
        }),
      });
      const json = (await res.json()) as PlanApiResponse;
      if (res.ok && json.plan) {
        setPlan(json.plan);
        setVdot(json.vdot);
        if (json.resolvedPhase) setResolvedPhase(json.resolvedPhase);
      } else {
        setError(json.details || json.error || "Failed to generate plan");
      }
    } catch {
      setError("Network error while generating plan");
    } finally {
      setGenerating(false);
    }
  };

  const handleReschedule = async (reasonText: string) => {
    const trimmed = reasonText.trim();
    if (!trimmed || rescheduling) return;
    setRescheduling(true);
    setError(null);
    try {
      const res = await fetch("/api/plans/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmed, language }),
      });
      const json = (await res.json()) as PlanApiResponse;
      if (res.ok && json.plan) {
        setPlan(json.plan);
        setVdot(json.vdot);
        if (json.resolvedPhase) setResolvedPhase(json.resolvedPhase);
        setCustomReason("");
      } else {
        setError(json.details || json.error || "Failed to reschedule plan");
      }
    } catch {
      setError("Network error while rescheduling plan");
    } finally {
      setRescheduling(false);
    }
  };

  const intensityBadge = (intensity: WeeklyPlanDay["intensity"]) => {
    const styles: Record<WeeklyPlanDay["intensity"], string> = {
      rest: "bg-zinc-800 text-zinc-400 border-zinc-700",
      easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      moderate: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      hard: "bg-orange-500/10 text-orange-400 border-orange-500/30",
      long: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    };
    return styles[intensity] ?? styles.easy;
  };

  const strategy = buildRaceDayStrategy(vdot, raceDistance, elevationProfile);

  const strategyNoteLabel = (note: "control" | "steady" | "push" | "uphill_safe") => {
    if (note === "control") return t.planPage.noteControl;
    if (note === "push") return t.planPage.notePush;
    if (note === "uphill_safe") return t.planPage.noteUphill;
    return t.planPage.noteSteady;
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      {/* Clean Page Topbar */}
      <header className="border-b border-white/10 bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-sans">
          <span className="text-zinc-100 font-semibold truncate">{t.nav.plan}</span>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-8">
        {/* Onboarding Banner when User Goal is Unset */}
        {goalDistance === null && (
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-orange-500/15 via-amber-500/10 to-emerald-500/10 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <Target className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-sans text-white">
                  {t.onboarding.bannerTitle}
                </h2>
                <p className="text-xs font-sans text-zinc-300 mt-1">
                  {t.onboarding.bannerSubtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("pacepulse:open-settings"))}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-sans font-bold text-xs transition-all shrink-0 shadow-lg shadow-orange-500/20"
            >
              {t.onboarding.ctaButton}
            </button>
          </div>
        )}

        {/* Page Header + Generate CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 tracking-wide">
              <CalendarClock className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{t.planPage.title}</span>
            </h1>
            <p className="text-xs font-sans text-zinc-500 mt-1">
              {t.planPage.subtitle}
            </p>
            {resolvedPhase && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-sans">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase">
                  {resolvedPhase.isAuto ? "🤖 AUTO: " : ""}
                  {language === "id" ? resolvedPhase.labelId : resolvedPhase.labelEn}
                </span>
                <span className="text-zinc-400">
                  {language === "id" ? resolvedPhase.reasonId : resolvedPhase.reasonEn}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating || rescheduling}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors disabled:opacity-50 shrink-0"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.planPage.generatingBtn}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{t.planPage.generateBtn}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-sans flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Preferensi Hari Lari & Long Run */}
        <div className="bg-[#111114] border border-white/10 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">
                {t.planPage.schedulePrefsTitle}
              </h2>
              <p className="text-xs text-zinc-400">
                {t.planPage.schedulePrefsDesc}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs text-zinc-400 whitespace-nowrap">
                {t.planPage.longRunDayLabel}
              </label>
              <select
                value={preferredLongRunDay ?? ""}
                onChange={(e) => handleLongRunDayChange(e.target.value)}
                className="bg-[#09090B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">{t.planPage.longRunAuto}</option>
                {WEEK_DAY_OPTIONS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {language === "id" ? d.labelId : d.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {WEEK_DAY_OPTIONS.map((d) => {
              const active = availableRunDays.includes(d.key);
              const isLong = preferredLongRunDay === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleRunDay(d.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    active
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : "bg-[#09090B] border-white/10 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {!active && <Lock className="w-3 h-3" />}
                  <span>{language === "id" ? d.labelId : d.labelEn}</span>
                  {isLong && (
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-200 border border-white/10">
                      LR
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {plan?.rescheduleNote && (
          <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-sans flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-orange-400 shrink-0" />
            <span>
              <strong>{t.planPage.rescheduledBanner}</strong> {plan.rescheduleNote}
            </span>
          </div>
        )}

        {plan && plan.days?.length > 0 && (
          <div className="bg-[#111114] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold font-sans text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.planPage.strategyCardTitle}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-sans">
                <span className="px-2.5 py-0.5 rounded-full bg-[#09090B] border border-white/10 text-zinc-300">
                  {t.planPage.plannedVolumeLabel}{" "}
                  <strong className="text-emerald-400">
                    {Math.round(
                      plan.days.reduce((s, d) => s + (d.distanceKm || 0), 0) * 10
                    ) / 10}{" "}
                    km
                  </strong>
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-bold ${
                    plan.source === "gemini"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  }`}
                >
                  <Bot className="w-3 h-3 shrink-0" />
                  {plan.source === "gemini"
                    ? t.planPage.sourceGemini
                    : t.planPage.sourceEngine}
                </span>
              </div>
            </div>
            {plan.coachSummary && (
              <p className="text-xs font-sans text-zinc-400 leading-relaxed">
                {plan.coachSummary}
              </p>
            )}
          </div>
        )}

        {/* 7-Day Weekly Plan Grid */}
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#111114] border border-white/10 text-zinc-400 text-xs font-sans">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>{t.planPage.loadingPlan}</span>
            </div>
          </div>
        ) : !plan || !plan.days?.length ? (
          <div className="bg-[#111114] border border-white/10 rounded-2xl p-8 text-center space-y-3">
            <CalendarClock className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="text-base font-bold font-sans text-white">
              {t.planPage.emptyTitle}
            </h2>
            <p className="text-xs font-sans text-zinc-500 max-w-md mx-auto">
              {t.planPage.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {plan.days.map((day, idx) => {
              const dayOption = WEEK_DAY_OPTIONS[idx];
              const isLockedRest =
                dayOption && !availableRunDays.includes(dayOption.key) && day.intensity === "rest";
              const isLockedLong =
                dayOption && preferredLongRunDay === dayOption.key && day.intensity === "long";
              return (
              <div
                key={`${day.day}-${idx}`}
                className="bg-[#111114] border border-white/10 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-white/20 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <span>{day.day}</span>
                      {(isLockedRest || isLockedLong) && (
                        <span title={t.planPage.lockedLabel}>
                          <Lock className="w-3 h-3 text-emerald-500" />
                        </span>
                      )}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase bg-zinc-800/80 text-zinc-200 border-white/10`}
                    >
                      {day.sessionType}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 font-sans">
                    <span className="text-2xl font-black text-white">
                      {day.distanceKm > 0 ? day.distanceKm : "—"}
                    </span>
                    {day.distanceKm > 0 && (
                      <span className="text-xs text-zinc-500">km</span>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] font-sans text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{day.targetPace}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-3 h-3 text-orange-400 shrink-0" />
                      <span className="truncate">
                        {t.planPage.hrCapLabel} {day.hrCap}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Footprints className="w-3 h-3 text-blue-400 shrink-0" />
                      <span className="truncate">
                        {t.planPage.shoeLabel} {day.shoe}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10/60 space-y-2">
                  <p className="text-[11px] font-sans text-zinc-500 leading-relaxed">
                    {day.rationale}
                  </p>
                  {day.literatureCitation && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#09090B] border border-white/10 text-[10px] font-sans text-zinc-400">
                      <BookOpen className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{day.literatureCitation}</span>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Adaptive Plan Rescheduler Panel */}
        <section className="bg-[#111114] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold font-sans text-white uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-orange-400 shrink-0 ${rescheduling ? "animate-spin" : ""}`} />
              <span>{t.planPage.rescheduleTitle}</span>
            </h2>
            <p className="text-xs font-sans text-zinc-500 mt-0.5">
              {t.planPage.rescheduleSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              t.planPage.presetOverslept,
              t.planPage.presetRain,
              t.planPage.presetHeavyLegs,
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={rescheduling || generating}
                onClick={() => void handleReschedule(preset)}
                className="px-3 py-1.5 rounded-xl bg-[#09090B] border border-white/10 text-zinc-300 hover:text-white hover:border-orange-500/50 text-xs font-sans transition-all disabled:opacity-50"
              >
                {preset}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleReschedule(customReason);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder={t.planPage.customPlaceholder}
              disabled={rescheduling || generating}
              className="flex-1 bg-[#09090B] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-sans text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50"
            />
            <button
              type="submit"
              disabled={rescheduling || generating || !customReason.trim()}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-sans font-bold text-xs transition-all disabled:opacity-40 shrink-0"
            >
              {rescheduling ? t.planPage.reschedulingBtn : t.planPage.rescheduleBtn}
            </button>
          </form>
        </section>

        {/* Race-Day Pacing & Fueling Strategy Builder */}
        <section className="bg-[#111114] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold font-sans text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.planPage.raceBuilderTitle}</span>
              </h2>
              <p className="text-xs font-sans text-zinc-500 mt-0.5">
                {t.planPage.raceBuilderSubtitle} (VDOT {strategy.vdotUsed})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
              <select
                aria-label={t.planPage.distanceLabel}
                value={raceDistance}
                onChange={(e) => setRaceDistance(e.target.value as RaceDistanceKey)}
                className="bg-[#09090B] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="5K">5K</option>
                <option value="10K">10K</option>
                <option value="Half Marathon">Half Marathon (21.1K)</option>
                <option value="Marathon">Marathon (42.2K)</option>
              </select>

              <div className="inline-flex rounded-xl bg-[#09090B] border border-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setElevationProfile("flat")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    elevationProfile === "flat"
                      ? "bg-emerald-500 text-zinc-950 font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t.planPage.elevFlat}
                </button>
                <button
                  type="button"
                  onClick={() => setElevationProfile("rolling")}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                    elevationProfile === "rolling"
                      ? "bg-orange-500 text-zinc-950 font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Mountain className="w-3.5 h-3.5" />
                  <span>{t.planPage.elevRolling}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-sans">
            <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/10">
              <div className="text-[10px] text-zinc-500 uppercase">{t.planPage.projectedFinish}</div>
              <div className="text-xl font-black text-emerald-400">{strategy.projectedFinishTime}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/10">
              <div className="text-[10px] text-zinc-500 uppercase">{t.planPage.avgTargetPace}</div>
              <div className="text-xl font-black text-white">{strategy.avgTargetPace}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/10">
              <div className="text-[10px] text-zinc-500 uppercase">{t.planPage.carbsPerHour}</div>
              <div className="text-xl font-black text-orange-400">{strategy.carbsPerHour} g/hr</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/10">
              <div className="text-[10px] text-zinc-500 uppercase">{t.planPage.totalCarbs}</div>
              <div className="text-xl font-black text-blue-400">{strategy.totalCarbsGrams} g</div>
            </div>
          </div>

          {/* Split Pace Table + Fueling Schedule Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Split Pace Table */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold font-sans text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                {t.planPage.splitTableTitle}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#09090B]/60">
                <table className="w-full text-xs font-sans whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#09090B] text-zinc-500 text-[11px]">
                      <th className="text-left py-2 px-3">{t.planPage.colSegment}</th>
                      <th className="text-left py-2 px-3">{t.planPage.colTargetPace}</th>
                      <th className="text-left py-2 px-3">{t.planPage.colCumulative}</th>
                      <th className="text-left py-2 px-3">{t.planPage.colStrategy}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategy.splits.map((seg) => (
                      <tr key={seg.segmentLabel} className="border-b border-white/10/50">
                        <td className="py-2 px-3 font-bold text-white">{seg.segmentLabel}</td>
                        <td className="py-2 px-3 font-bold text-emerald-400">{seg.targetPace}</td>
                        <td className="py-2 px-3 text-zinc-300">{seg.cumulativeTime}</td>
                        <td className="py-2 px-3 text-[11px] text-zinc-400">
                          {strategyNoteLabel(seg.strategyNote)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hydration & Fueling Schedule */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold font-sans text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                {t.planPage.fuelTableTitle}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#09090B]/60">
                <table className="w-full text-xs font-sans whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#09090B] text-zinc-500 text-[11px]">
                      <th className="text-left py-2 px-3">{t.planPage.colMinute}</th>
                      <th className="text-left py-2 px-3">{t.planPage.colIntake}</th>
                      <th className="text-left py-2 px-3">{t.planPage.colCarbs}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategy.fuelingSchedule.map((item) => (
                      <tr key={item.minuteMark} className="border-b border-white/10/50">
                        <td className="py-2 px-3 font-bold text-white">
                          {item.minuteMark === 0 ? "Pre-Start" : `${item.minuteMark}'`}
                        </td>
                        <td className="py-2 px-3 text-blue-300">
                          {item.itemType === "gel_water"
                            ? `${t.planPage.intakeGel} (${item.fluidMl} ml)`
                            : item.itemType === "electrolyte"
                              ? `${t.planPage.intakeElectrolyte} (${item.fluidMl} ml)`
                              : `${t.planPage.intakeWater} (${item.fluidMl} ml)`}
                        </td>
                        <td className="py-2 px-3 font-bold text-orange-400">
                          {item.carbsGrams > 0 ? `+${item.carbsGrams} g` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
