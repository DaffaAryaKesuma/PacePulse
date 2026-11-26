"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Footprints,
  Mountain,
  Clock,
  Bot,
  MessageSquare,
  Zap,
  Sparkles,
  Award,
  RefreshCw,
  BookOpen,
  CloudSun,
  Wind,
  TrafficCone,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { ActivityData } from "@/types";
import {
  speedToPace,
  metersToKm,
  formatDuration,
  cadenceToSpm,
  formatDate,
} from "@/lib/formatting";
import { useLanguage } from "@/components/LanguageProvider";

interface ActivityCardProps {
  activity: ActivityData;
  canReanalyze?: boolean;
  defaultExpanded?: boolean;
  autoAnalyze?: boolean;
}

function PhaseTag({ phase }: { phase: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider bg-zinc-800/80 text-zinc-200 border border-white/10">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {phase} Phase
    </span>
  );
}

function isPendingFeedback(text: string | null | undefined): boolean {
  if (!text) return true;
  const normalized = text.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized.startsWith("ai analysis pending") ||
    normalized.startsWith("ai sports science analysis pending")
  );
}

function renderInlineBold(text: string): React.ReactNode[] {
  const cleaned = text.replace(/(?<!\*)\*(?!\*)/g, "");
  const parts = cleaned.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <strong key={idx} className="text-white font-bold">
        {part}
      </strong>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

function renderFormattedFeedback(text: string): React.ReactNode {
  const lines = text.split(/\r?\n/);
  return lines.map((rawLine, i) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return <div key={i} className="h-2" />;
    }

    // Markdown headings (e.g. ### 1. Ringkasan Sesi)
    const headingMatch = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      return (
        <div key={i} className="text-emerald-400 font-bold mt-2 first:mt-0">
          {renderInlineBold(headingMatch[1])}
        </div>
      );
    }

    // Bullet points (* item or - item)
    const bulletMatch = trimmed.match(/^[*-]\s+(.*)$/);
    if (bulletMatch) {
      return (
        <div key={i} className="flex items-start gap-2 pl-1">
          <span className="text-emerald-400 shrink-0">•</span>
          <span>{renderInlineBold(bulletMatch[1])}</span>
        </div>
      );
    }

    return <div key={i}>{renderInlineBold(trimmed)}</div>;
  });
}

function detectFeedbackLanguage(text: string): "id" | "en" | null {
  const lower = text.toLowerCase();
  const idScore = [
    "ringkasan sesi",
    "observasi utama",
    "konteks literatur",
    "rekomendasi sesi",
    "yang sudah bagus",
    "anda ",
    "latihan ",
    "sesi ",
  ].filter((k) => lower.includes(k)).length;
  const enScore = [
    "session summary",
    "key observations",
    "sports science literature",
    "next session recommendation",
    "you completed",
    "your next run",
    "this session",
    "however,",
  ].filter((k) => lower.includes(k)).length;

  if (idScore > enScore) return "id";
  if (enScore > idScore) return "en";
  return null;
}

export function ActivityCard({
  activity,
  canReanalyze,
  defaultExpanded = false,
  autoAnalyze = false,
}: ActivityCardProps) {
  const { language, t } = useLanguage();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);
  const [translatedCache, setTranslatedCache] = useState<Partial<Record<"id" | "en", string>>>({});
  const [translating, setTranslating] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  const [localTags, setLocalTags] = useState<string[] | null>(null);
  const [savingTag, setSavingTag] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);

  const baseFeedback = localFeedback ?? activity.aiFeedback;
  const feedback = translatedCache[language] ?? baseFeedback;
  const activeTags = localTags ?? activity.contextTags ?? [];

  const distanceKm = parseFloat(metersToKm(activity.distanceMeters));
  const avgPace = speedToPace(activity.averageSpeed);
  const cadenceSpm = cadenceToSpm(activity.averageCadence);
  const duration = formatDuration(activity.movingTimeSec);

  const isSpeedSession =
    activity.trainingPhase === "Build" ||
    activity.trainingPhase === "Peak" ||
    activity.trainingPhase === "Race" ||
    (activity.averageSpeed > 0 && 1000 / activity.averageSpeed < 290); // < 4:50/km
  const shoeName = activity.gearName || (isSpeedSession ? "Magic Speed 4" : "Novablast 5");
  const shoeTagColor = "bg-zinc-800/80 text-zinc-200 border-white/10";

  const runAnalysis = useCallback(async (expandOnResult: boolean) => {
    if (reanalyzing) return;
    setReanalyzing(true);
    setReanalyzeError(null);

    try {
      const res = await fetch(`/api/activities/${activity.id}/reanalyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });

      const data = (await res.json()) as { aiFeedback?: string; error?: string; details?: string };
      if (res.ok && data.aiFeedback) {
        setLocalFeedback(data.aiFeedback);
        setTranslatedCache({ [language]: data.aiFeedback });
        if (expandOnResult) setExpanded(true);
      } else {
        setReanalyzeError(data.details || data.error || "Gagal menganalisis ulang dengan Gemini AI.");
        if (expandOnResult) setExpanded(true);
      }
    } catch (err) {
      console.error("Re-analyze error:", err);
      setReanalyzeError("Network error saat menghubungi server analisis AI.");
      if (expandOnResult) setExpanded(true);
    } finally {
      setReanalyzing(false);
    }
  }, [activity.id, language, reanalyzing]);

  // Auto-translate expanded AI diagnosis when user switches website language
  useEffect(() => {
    if (!expanded || !baseFeedback || isPendingFeedback(baseFeedback)) return;
    if (translatedCache[language]) return;

    const detected = detectFeedbackLanguage(baseFeedback);
    if (!detected || detected === language) return;

    let cancelled = false;
    setTranslating(true);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: baseFeedback, targetLanguage: language }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { translatedText?: string } | null) => {
        if (!cancelled && json?.translatedText) {
          setTranslatedCache((prev) => ({
            ...prev,
            [detected]: baseFeedback,
            [language]: json.translatedText,
          }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [expanded, baseFeedback, language, translatedCache]);

  // Auto-analyze only when explicitly enabled (e.g. latest run on Overview)
  useEffect(() => {
    if (autoAnalyze && canReanalyze && isPendingFeedback(feedback) && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      void runAnalysis(defaultExpanded);
    }
  }, [autoAnalyze, canReanalyze, feedback, defaultExpanded, runAnalysis]);

  const handleReanalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await runAnalysis(true);
  };

  const handleToggleTag = async (tagKey: string) => {
    if (!canReanalyze || savingTag) return;
    const prev = activeTags;
    const next = prev.includes(tagKey)
      ? prev.filter((item) => item !== tagKey)
      : [...prev, tagKey];

    setLocalTags(next);
    setSavingTag(tagKey);

    try {
      const res = await fetch(`/api/activities/${activity.id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextTags: next }),
      });
      if (!res.ok) {
        setLocalTags(prev);
      }
    } catch {
      setLocalTags(prev);
    } finally {
      setSavingTag(null);
    }
  };

  const lifestyleOptions = [
    { key: "poor_sleep", label: t.activity.tagPoorSleep },
    { key: "high_caffeine", label: t.activity.tagHighCaffeine },
    { key: "heavy_legs", label: t.activity.tagHeavyLegs },
    { key: "work_stress", label: t.activity.tagWorkStress },
  ];

  const hasEnvBadges =
    typeof activity.temperatureC === "number" ||
    typeof activity.aqi === "number" ||
    typeof activity.trafficFrictionScore === "number" ||
    typeof activity.easyRunDisciplineScore === "number";

  // Compute 5-zone HR distribution from splits (or fallback to averageHeartrate)
  const hrZoneStats = (() => {
    const refMaxHr = Math.max(185, activity.maxHeartrate ?? 190);
    const splitsWithHr = (activity.splitsJson ?? []).filter(
      (s) => typeof s.average_heartrate === "number" && s.average_heartrate > 0
    );
    const counts = [0, 0, 0, 0, 0];
    const classify = (hr: number) => {
      const pct = hr / refMaxHr;
      if (pct < 0.7) return 0;
      if (pct < 0.8) return 1;
      if (pct < 0.87) return 2;
      if (pct < 0.94) return 3;
      return 4;
    };

    if (splitsWithHr.length > 0) {
      for (const s of splitsWithHr) {
        counts[classify(s.average_heartrate!)] += 1;
      }
    } else if (activity.averageHeartrate && activity.averageHeartrate > 0) {
      counts[classify(activity.averageHeartrate)] = 1;
    } else {
      return null;
    }

    const total = counts.reduce((a, b) => a + b, 0) || 1;
    const dominantIdx = counts.indexOf(Math.max(...counts));
    const labels = ["Z1 Recovery", "Z2 Aerobic", "Z3 Tempo", "Z4 Threshold", "Z5 VO2Max"];
    const colors = ["#38BDF8", "#10B981", "#C8F902", "#FF5A1F", "#EF4444"];
    return {
      pcts: counts.map((c) => Math.round((c / total) * 100)),
      dominantLabel: labels[dominantIdx],
      dominantColor: colors[dominantIdx],
      colors,
    };
  })();

  return (
    <div className="bg-[#111114] border border-white/10 rounded-xl transition-colors hover:border-white/20">
      {/* Top Header */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <PhaseTag phase={activity.trainingPhase} />
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${shoeTagColor}`}
              >
                {shoeName}
              </span>
              <span className="text-xs text-zinc-400">
                {formatDate(activity.startDate)}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 wrap-break-word">
              {activity.name}
            </h3>
          </div>

          <div className="flex items-center sm:items-end justify-between sm:justify-start sm:flex-col gap-2 shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-2xl font-bold tracking-tight text-emerald-400 tabular-nums leading-none">
                {distanceKm.toFixed(2)}
                <span className="text-xs font-medium text-zinc-400 ml-1">km</span>
              </div>
              <div className="text-xs text-zinc-400 tabular-nums mt-1">
                {t.activity.movingTime} {duration}
              </div>
            </div>

            {canReanalyze && (
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                title="Re-run sports science evaluation with latest athlete benchmarks"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 border border-white/10 text-zinc-300 hover:text-zinc-100 hover:border-white/20 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${reanalyzing ? "animate-spin text-emerald-400" : ""}`} />
                <span>{reanalyzing ? t.activity.analyzing : t.activity.reAnalyze}</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Metrics Strip (flat, hairline divided, no nested cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3.5 border-y border-white/5">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 truncate flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
              {t.activity.avgPace}
            </div>
            <div className="text-base font-bold text-zinc-100 tabular-nums mt-0.5">
              {avgPace}
              <span className="text-xs font-normal text-zinc-400">/km</span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 truncate flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-zinc-400 shrink-0" />
              {t.activity.avgHr}
            </div>
            <div className="text-base font-bold text-zinc-100 tabular-nums mt-0.5">
              {activity.averageHeartrate
                ? Math.round(activity.averageHeartrate)
                : "—"}
              <span className="text-xs font-normal text-zinc-400"> bpm</span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 truncate flex items-center gap-1.5">
              <Footprints className="w-3 h-3 text-zinc-400 shrink-0" />
              {t.activity.cadence}
            </div>
            <div className="text-base font-bold text-zinc-100 tabular-nums mt-0.5">
              {cadenceSpm ?? "—"}
              <span className="text-xs font-normal text-zinc-400"> spm</span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 truncate flex items-center gap-1.5">
              <Mountain className="w-3 h-3 text-zinc-400 shrink-0" />
              {t.activity.elevationGain}
            </div>
            <div className="text-base font-bold text-zinc-100 tabular-nums mt-0.5">
              {activity.totalElevationGain !== null
                ? activity.totalElevationGain.toFixed(0)
                : "—"}
              <span className="text-xs font-normal text-zinc-400"> m</span>
            </div>
          </div>
        </div>

        {/* 5-Zone HR Distribution Mini Bar */}
        {hrZoneStats && (
          <div className="mt-3 flex items-center gap-3">
            <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/10 text-zinc-200 shrink-0">
              {hrZoneStats.dominantLabel}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden flex gap-0.5">
              {hrZoneStats.pcts.map((pct, idx) =>
                pct > 0 ? (
                  <div
                    key={idx}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: hrZoneStats.colors[idx],
                    }}
                    title={`Z${idx + 1}: ${pct}%`}
                    className="h-full rounded-full transition-all duration-500"
                  />
                ) : null
              )}
            </div>
            <span className="hidden sm:inline text-[11px] text-zinc-400 tabular-nums shrink-0">
              Z1–Z5 HR
            </span>
          </div>
        )}

        {/* Environment, Friction & Easy-Run Discipline Badges */}
        {hasEnvBadges && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-sans">
            {typeof activity.temperatureC === "number" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20">
                <CloudSun className="w-3 h-3 shrink-0" />
                {activity.temperatureC.toFixed(1)}°C
                {typeof activity.humidityPct === "number" ? ` • ${activity.humidityPct}%` : ""}
              </span>
            )}
            {typeof activity.aqi === "number" && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                  activity.aqi > 100
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                <Wind className="w-3 h-3 shrink-0" />
                {t.activity.envAqi} {activity.aqi}
              </span>
            )}
            {typeof activity.trafficFrictionScore === "number" && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                  activity.trafficFrictionScore > 50
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                    : activity.trafficFrictionScore > 20
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                <TrafficCone className="w-3 h-3 shrink-0" />
                {activity.trafficFrictionScore > 50
                  ? t.activity.frictionHeavy
                  : activity.trafficFrictionScore > 20
                    ? t.activity.frictionModerate
                    : t.activity.frictionSterile}{" "}
                ({activity.trafficFrictionScore})
              </span>
            )}
            {typeof activity.easyRunDisciplineScore === "number" && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold ${
                  activity.easyRunDisciplineScore < 75
                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {activity.easyRunDisciplineScore < 75 ? (
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                ) : (
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                )}
                {activity.easyRunDisciplineScore < 75
                  ? `${t.activity.egoRunAlert} (${activity.easyRunDisciplineScore}/100)`
                  : `${t.activity.disciplineLabel} ${activity.easyRunDisciplineScore}/100`}
              </span>
            )}
          </div>
        )}

        {/* Lifestyle Quick-Tags (interactive for owner) */}
        {(canReanalyze || activeTags.length > 0) && (
          <div className="mt-3 pt-2.5 border-t border-[#27272A]/50 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-sans">
            <span className="text-zinc-500 mr-1">{t.activity.lifestyleTitle}</span>
            {lifestyleOptions.map((opt) => {
              const selected = activeTags.includes(opt.key);
              if (!canReanalyze && !selected) return null;
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={!canReanalyze || savingTag === opt.key}
                  onClick={() => void handleToggleTag(opt.key)}
                  className={`px-2 py-0.5 rounded-full border transition-all ${
                    selected
                      ? "bg-orange-500/15 border-orange-500/40 text-orange-300 font-bold"
                      : "bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-white hover:border-zinc-500"
                  } ${!canReanalyze ? "cursor-default" : "cursor-pointer"}`}
                >
                  {selected ? "✓ " : "+ "}
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Mini Split Consistency Bar Preview (if splits exist) */}
        {activity.splitsJson && Array.isArray(activity.splitsJson) && activity.splitsJson.length > 0 && (
          <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans text-zinc-500">
            <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {t.activity.splitDistribution}
            </span>
            <div className="flex items-end gap-1 overflow-x-auto pb-0.5">
              {(activity.splitsJson as Array<{ split: number; average_speed: number }>).slice(0, 16).map((s) => {
                const paceSec = 1000 / s.average_speed;
                const isFast = paceSec < 280; // sub-4:40
                const isMid = paceSec >= 280 && paceSec < 330;
                const barColor = isFast
                  ? "bg-orange-400"
                  : isMid
                    ? "bg-emerald-400"
                    : "bg-blue-400";
                return (
                  <div
                    key={s.split}
                    title={`KM ${s.split}: ${speedToPace(s.average_speed)}/km`}
                    className={`w-2 rounded-t-sm transition-all hover:scale-125 ${barColor}`}
                    style={{
                      height: `${Math.max(8, Math.min(22, 28 - (paceSec - 250) * 0.1))}px`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* AI Feedback Accordion Toggle */}
      {feedback && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-linear-to-r from-[#18181B] via-[#151518] to-[#18181B] border-t border-[#27272A] text-xs font-sans hover:bg-zinc-800/80 transition-all duration-200 text-left"
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px] sm:text-xs truncate">
                <span className="truncate">{t.activity.evalTitle}</span>
                <BookOpen className="w-3 h-3 text-zinc-400 shrink-0 hidden sm:inline" />
              </span>
              <Sparkles className="w-3 h-3 text-orange-400 animate-pulse shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-zinc-400 shrink-0">
              <span className="text-[11px] hidden sm:inline">
                {expanded ? t.activity.collapse : t.activity.expand}
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-emerald-400" />
              )}
            </div>
          </button>

          {expanded && (
            <div className="p-5 border-t border-white/5 space-y-6">
              {/* Split Kilometer Telemetry Table */}
              {activity.splitsJson && Array.isArray(activity.splitsJson) && activity.splitsJson.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                      {t.activity.splitTelemetry}
                    </h4>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      {t.activity.metricSplits}
                    </span>
                  </div>

                  <div className="overflow-x-auto border-y border-white/10">
                    <table className="w-full text-xs font-sans tabular-nums whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-white/10 text-zinc-400 text-[11px] uppercase tracking-wider">
                          <th className="text-left py-2 px-2.5 font-medium">{t.activity.km}</th>
                          <th className="text-left py-2 px-2.5 font-medium">{t.activity.pace}</th>
                          <th className="text-left py-2 px-2.5 font-medium">{t.activity.heartRate}</th>
                          <th className="text-left py-2 px-2.5 font-medium">{t.activity.elevation}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(activity.splitsJson as Array<{
                          split: number;
                          average_speed: number;
                          average_heartrate?: number;
                          elevation_difference?: number;
                        }>).map((split) => {
                          const splitPace = speedToPace(split.average_speed);
                          return (
                            <tr
                              key={split.split}
                              className="hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-2 px-2.5 text-zinc-400 font-medium">
                                #{split.split}
                              </td>
                              <td className="py-2 px-2.5 text-emerald-400 font-semibold">
                                {splitPace}/km
                              </td>
                              <td className="py-2 px-2.5 text-zinc-200 font-medium">
                                {split.average_heartrate
                                  ? `${Math.round(split.average_heartrate)} bpm`
                                  : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-zinc-400">
                                {split.elevation_difference !== undefined
                                  ? `${split.elevation_difference > 0 ? "+" : ""}${split.elevation_difference.toFixed(0)}m`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* AI Coach Detailed Feedback */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                    {t.activity.diagnosisTitle}
                  </h4>
                  <div className="flex items-center gap-2 shrink-0">
                    {canReanalyze && (
                      <Link
                        href={`/coach?activityId=${activity.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.activity.discussWithCoach}</span>
                      </Link>
                    )}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800/80 text-zinc-200 border border-white/10 shrink-0">
                      <Bot className="w-3 h-3" /> Gemini 2.5 Flash
                    </div>
                  </div>
                </div>
                {reanalyzeError && (
                  <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs wrap-break-word">
                    <strong>{t.activity.reanalyzeError}</strong> {reanalyzeError}
                  </div>
                )}
                <div className="text-sm leading-relaxed text-zinc-300 space-y-1.5 wrap-break-word">
                  {translating && (
                    <div className="text-[11px] text-emerald-400 animate-pulse mb-2">
                      {language === "id" ? "Menerjemahkan analisis ke Bahasa Indonesia..." : "Translating analysis to English..."}
                    </div>
                  )}
                  {reanalyzing && isPendingFeedback(feedback)
                    ? t.activity.autoAnalyzing
                    : renderFormattedFeedback(feedback)}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
