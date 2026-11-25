"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Settings, Target, Heart, ShieldCheck, Share2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import type { AthleteInfo } from "@/types";
import { useLanguage } from "@/components/LanguageProvider";

interface AthleteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: AthleteInfo;
  onUpdated: () => void;
}

export function AthleteSettingsModal({
  isOpen,
  onClose,
  athlete,
  onUpdated,
}: AthleteSettingsModalProps) {
  const { t } = useLanguage();
  const [goalDistance, setGoalDistance] = useState(athlete.goalDistance || "General Fitness");
  const goalSec = athlete.goalTimeSec ?? 0;
  const [goalHours, setGoalHours] = useState(Math.floor(goalSec / 3600));
  const [goalMinutes, setGoalMinutes] = useState(Math.floor((goalSec % 3600) / 60));
  const [goalSeconds, setGoalSeconds] = useState(goalSec % 60);

  const pbSec = athlete.currentPbSec ?? 0;
  const [pbHours, setPbHours] = useState(Math.floor(pbSec / 3600));
  const [pbMinutes, setPbMinutes] = useState(Math.floor((pbSec % 3600) / 60));
  const [pbSeconds, setPbSeconds] = useState(pbSec % 60);

  const [thresholdHr, setThresholdHr] = useState(athlete.thresholdHr?.toString() || "");
  const [maxHr, setMaxHr] = useState(athlete.maxHr?.toString() || "190");
  const [trainingPhase, setTrainingPhase] = useState(athlete.trainingPhase || "auto");
  const [targetRaceDate, setTargetRaceDate] = useState(
    athlete.targetRaceDate ? athlete.targetRaceDate.split("T")[0] : ""
  );
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [hasActiveWebhook, setHasActiveWebhook] = useState(
    Boolean(athlete.hasDiscordWebhook || athlete.discordWebhookUrl)
  );
  const [clearingWebhook, setClearingWebhook] = useState(false);
  const [isPublic, setIsPublic] = useState(athlete.isPublic !== false);
  const [username, setUsername] = useState(athlete.username || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const isGeneralFitness = goalDistance === "General Fitness";
    const calculatedGoalSec = isGeneralFitness
      ? null
      : goalHours * 3600 + goalMinutes * 60 + goalSeconds;
    const calculatedPbSec = pbHours * 3600 + pbMinutes * 60 + pbSeconds;

    if (!isGeneralFitness && (!calculatedGoalSec || calculatedGoalSec <= 0)) {
      setError(t.settings.invalidGoalTime);
      setSaving(false);
      return;
    }

    const payload: Record<string, unknown> = {
      goalDistance,
      goalTimeSec: calculatedGoalSec,
      currentPbSec: calculatedPbSec > 0 ? calculatedPbSec : null,
      thresholdHr: thresholdHr ? parseInt(thresholdHr, 10) : null,
      maxHr: maxHr ? parseInt(maxHr, 10) : 190,
      trainingPhase,
      targetRaceDate: targetRaceDate || null,
      isPublic,
      username: username.trim(),
    };

    const trimmedWebhook = discordWebhookUrl.trim();
    if (trimmedWebhook !== "") {
      payload.discordWebhookUrl = trimmedWebhook;
    }

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setError(data.error || t.settings.saveError);
      } else {
        if (trimmedWebhook !== "") {
          setHasActiveWebhook(true);
          setDiscordWebhookUrl("");
        }
        setSuccess(true);
        setTimeout(() => {
          onUpdated();
          onClose();
        }, 1000);
      }
    } catch {
      setError(t.settings.networkError);
    } finally {
      setSaving(false);
    }
  };

  const handleClearWebhook = async () => {
    if (clearingWebhook || saving) return;
    setClearingWebhook(true);
    setError(null);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearDiscordWebhook: true }),
      });
      if (res.ok) {
        setHasActiveWebhook(false);
        setDiscordWebhookUrl("");
        onUpdated();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error || t.settings.saveError);
      }
    } catch {
      setError(t.settings.networkError);
    } finally {
      setClearingWebhook(false);
    }
  };

  const modalBody = (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => !saving && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl max-h-[90dvh] flex flex-col bg-[#121215] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-start sm:items-center justify-between gap-2 p-4 sm:p-5 border-b border-[#27272A] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white font-mono">
                {t.settings.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-mono">
                {t.settings.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="athlete-settings-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs font-mono">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{t.settings.savedSuccess}</span>
            </div>
          )}
          {/* Target Milestone */}
          <div className="p-4 rounded-xl bg-[#18181B]/70 border border-[#27272A] space-y-3">
            <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider">
              <Target className="w-4 h-4 text-orange-400" /> {t.settings.raceGoalTitle}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 block mb-1">{t.settings.targetDistance}</label>
                <select
                  value={goalDistance}
                  onChange={(e) => setGoalDistance(e.target.value)}
                  className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
                >
                  <option value="General Fitness">{t.settings.generalFitnessOption}</option>
                  <option value="5K">5K Road / Track</option>
                  <option value="10K">10K Road</option>
                  <option value="Half Marathon">Half Marathon (21.1 km)</option>
                  <option value="Marathon">Full Marathon (42.2 km)</option>
                </select>
              </div>

              {goalDistance !== "General Fitness" && (
              <div>
                <label className="text-zinc-500 block mb-1">{t.settings.targetTime}</label>
                <div className="grid grid-cols-3 gap-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={goalHours}
                    onChange={(e) => setGoalHours(parseInt(e.target.value) || 0)}
                    placeholder="HH"
                    className="bg-[#121215] border border-[#27272A] rounded-lg px-2 py-2 text-center text-white focus:outline-none focus:border-orange-500/50"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={goalMinutes}
                    onChange={(e) => setGoalMinutes(parseInt(e.target.value) || 0)}
                    placeholder="MM"
                    className="bg-[#121215] border border-[#27272A] rounded-lg px-2 py-2 text-center text-white focus:outline-none focus:border-orange-500/50"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={goalSeconds}
                    onChange={(e) => setGoalSeconds(parseInt(e.target.value) || 0)}
                    placeholder="SS"
                    className="bg-[#121215] border border-[#27272A] rounded-lg px-2 py-2 text-center text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 block mb-1">{t.settings.currentPb}</label>
                <div className="grid grid-cols-3 gap-1 max-w-50">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={pbHours}
                    onChange={(e) => setPbHours(parseInt(e.target.value) || 0)}
                    placeholder="HH"
                    className="bg-[#121215] border border-[#27272A] rounded-lg px-2 py-2 text-center text-white focus:outline-none focus:border-orange-500/50"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={pbMinutes}
                    onChange={(e) => setPbMinutes(parseInt(e.target.value) || 0)}
                    placeholder="MM"
                    className="bg-[#121215] border border-[#27272A] rounded-lg px-2 py-2 text-center text-white focus:outline-none focus:border-orange-500/50"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={pbSeconds}
                    onChange={(e) => setPbSeconds(parseInt(e.target.value) || 0)}
                    placeholder="SS"
                    className="bg-[#121215] border border-[#27272A] rounded-lg px-2 py-2 text-center text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">{t.settings.targetRaceDate}</label>
                <input
                  type="date"
                  value={targetRaceDate}
                  onChange={(e) => setTargetRaceDate(e.target.value)}
                  className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>
          </div>

          {/* Physiological Benchmarks */}
          <div className="p-4 rounded-xl bg-[#18181B]/70 border border-[#27272A] space-y-3">
            <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider">
              <Heart className="w-4 h-4 text-emerald-400" /> {t.settings.biometricsTitle}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-zinc-500 block mb-1">{t.settings.thresholdHr}</label>
                <input
                  type="number"
                  value={thresholdHr}
                  onChange={(e) => setThresholdHr(e.target.value)}
                  placeholder="e.g. 173"
                  className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">{t.settings.maxHr}</label>
                <input
                  type="number"
                  value={maxHr}
                  onChange={(e) => setMaxHr(e.target.value)}
                  placeholder="e.g. 190"
                  className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">{t.settings.trainingPhase}</label>
                <select
                  value={trainingPhase}
                  onChange={(e) => setTrainingPhase(e.target.value)}
                  className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="auto">{t.settings.phaseAuto}</option>
                  <option value="Recovery">{t.settings.phaseRecovery}</option>
                  <option value="Base">{t.settings.phaseBase}</option>
                  <option value="Build">{t.settings.phaseBuild}</option>
                  <option value="Peak">{t.settings.phasePeak}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Discord Webhook & Public Visibility */}
          <div className="p-4 rounded-xl bg-[#18181B]/70 border border-[#27272A] space-y-3">
            <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-blue-400" /> {t.settings.integrationsTitle}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-zinc-500">{t.settings.discordLabel}</label>
                {hasActiveWebhook && (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      {t.settings.discordActiveBadge}
                    </span>
                    <button
                      type="button"
                      disabled={clearingWebhook || saving}
                      onClick={() => void handleClearWebhook()}
                      className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-[10px] font-bold transition-colors disabled:opacity-50"
                    >
                      {t.settings.discordRemoveBtn}
                    </button>
                  </div>
                )}
              </div>
              <input
                type="url"
                value={discordWebhookUrl}
                onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                placeholder={
                  hasActiveWebhook
                    ? t.settings.discordKeepPlaceholder
                    : "https://discord.com/api/webhooks/..."
                }
                className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50"
              />
              <span className="text-[10px] text-zinc-600 block mt-0.5">
                {t.settings.discordHint}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-zinc-500 block mb-1">{t.settings.publicUsername}</label>
                <div className="flex items-center">
                  <span className="text-zinc-600 bg-zinc-900 px-2.5 py-2 border border-r-0 border-[#27272A] rounded-l-lg">
                    /u/
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="my-handle"
                    className="w-full bg-[#121215] border border-[#27272A] rounded-r-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1 sm:pt-4">
                <input
                  type="checkbox"
                  id="isPublicToggle"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 shrink-0"
                />
                <label htmlFor="isPublicToggle" className="text-zinc-300 flex items-center gap-1.5 cursor-pointer">
                  <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {t.settings.allowPublic}
                </label>
              </div>
            </div>
          </div>

        </form>

        {/* Sticky Footer */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 p-4 sm:p-5 border-t border-[#27272A] bg-[#121215] shrink-0 text-xs font-mono">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-[#27272A] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {t.settings.cancel}
          </button>
          <button
            type="submit"
            form="athlete-settings-form"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.settings.saving}
              </>
            ) : (
              t.settings.save
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalBody, document.body) : null;
}
