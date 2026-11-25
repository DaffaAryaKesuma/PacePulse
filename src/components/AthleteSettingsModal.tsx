"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Settings, Target, Heart, ShieldCheck, Share2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import type { AthleteInfo } from "@/types";

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
  const [goalDistance, setGoalDistance] = useState(athlete.goalDistance || "Half Marathon");
  const [goalHours, setGoalHours] = useState(Math.floor(athlete.goalTimeSec / 3600));
  const [goalMinutes, setGoalMinutes] = useState(Math.floor((athlete.goalTimeSec % 3600) / 60));
  const [goalSeconds, setGoalSeconds] = useState(athlete.goalTimeSec % 60);

  const pbSec = athlete.currentPbSec || 7448;
  const [pbHours, setPbHours] = useState(Math.floor(pbSec / 3600));
  const [pbMinutes, setPbMinutes] = useState(Math.floor((pbSec % 3600) / 60));
  const [pbSeconds, setPbSeconds] = useState(pbSec % 60);

  const [thresholdHr, setThresholdHr] = useState(athlete.thresholdHr?.toString() || "173");
  const [maxHr, setMaxHr] = useState(athlete.maxHr?.toString() || "190");
  const [trainingPhase, setTrainingPhase] = useState(athlete.trainingPhase || "Base");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(athlete.discordWebhookUrl || "");
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

    const calculatedGoalSec = goalHours * 3600 + goalMinutes * 60 + goalSeconds;
    const calculatedPbSec = pbHours * 3600 + pbMinutes * 60 + pbSeconds;

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalDistance,
          goalTimeSec: calculatedGoalSec,
          currentPbSec: calculatedPbSec > 0 ? calculatedPbSec : null,
          thresholdHr: thresholdHr ? parseInt(thresholdHr, 10) : null,
          maxHr: maxHr ? parseInt(maxHr, 10) : 190,
          trainingPhase,
          discordWebhookUrl: discordWebhookUrl.trim() || null,
          isPublic,
          username: username.trim(),
        }),
      });

      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setError(data.error || "Failed to update profile settings.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onUpdated();
          onClose();
        }, 1000);
      }
    } catch {
      setError("Network error while updating settings.");
    } finally {
      setSaving(false);
    }
  };

  const modalBody = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => !saving && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl bg-[#121215] border border-[#27272A] rounded-2xl p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-[#27272A] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                Athlete Profile & Sports Science Settings
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                Dynamically calibrates Gemini AI prompts and target telemetry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>Settings saved successfully! Updating telemetry...</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs font-mono">
          {/* Target Milestone */}
          <div className="p-4 rounded-xl bg-[#18181B]/70 border border-[#27272A] space-y-3">
            <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider">
              <Target className="w-4 h-4 text-orange-400" /> Primary Race Goal
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 block mb-1">Target Distance</label>
                <select
                  value={goalDistance}
                  onChange={(e) => setGoalDistance(e.target.value)}
                  className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
                >
                  <option value="5K">5K Road / Track</option>
                  <option value="10K">10K Road</option>
                  <option value="Half Marathon">Half Marathon (21.1 km)</option>
                  <option value="Marathon">Full Marathon (42.2 km)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Target Time (HH:MM:SS)</label>
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
            </div>

            <div>
              <label className="text-zinc-500 block mb-1">Current Personal Best (PB) Time</label>
              <div className="grid grid-cols-3 gap-1 max-w-[200px]">
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
          </div>

          {/* Physiological Benchmarks */}
          <div className="p-4 rounded-xl bg-[#18181B]/70 border border-[#27272A] space-y-3">
            <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider">
              <Heart className="w-4 h-4 text-emerald-400" /> Biometric Thresholds
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-zinc-500 block mb-1">Threshold HR (LT2)</label>
                <input
                  type="number"
                  value={thresholdHr}
                  onChange={(e) => setThresholdHr(e.target.value)}
                  placeholder="e.g. 173"
                  className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Max Heart Rate</label>
                <input
                  type="number"
                  value={maxHr}
                  onChange={(e) => setMaxHr(e.target.value)}
                  placeholder="e.g. 190"
                  className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Training Phase</label>
                <select
                  value={trainingPhase}
                  onChange={(e) => setTrainingPhase(e.target.value)}
                  className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="Recovery">Recovery (Z1 Flush)</option>
                  <option value="Base">Base Building (Z2 Volume)</option>
                  <option value="Build">Build (Threshold / Norwegian)</option>
                  <option value="Peak">Peak / Taper</option>
                </select>
              </div>
            </div>
          </div>

          {/* Discord Webhook & Public Visibility */}
          <div className="p-4 rounded-xl bg-[#18181B]/70 border border-[#27272A] space-y-3">
            <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-blue-400" /> Integrations & Public Showcase
            </div>

            <div>
              <label className="text-zinc-500 block mb-1">Personal Discord Webhook URL (Optional)</label>
              <input
                type="url"
                value={discordWebhookUrl}
                onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder-zinc-700 focus:outline-none focus:border-blue-500/50"
              />
              <span className="text-[10px] text-zinc-600 block mt-0.5">
                Leave blank to disable private notifications.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-zinc-500 block mb-1">Public Profile Username</label>
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

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="isPublicToggle"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="isPublicToggle" className="text-zinc-300 flex items-center gap-1.5 cursor-pointer">
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  Allow Public Portfolio Showcase
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-[#27272A] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Athlete Settings"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalBody, document.body) : null;
}
