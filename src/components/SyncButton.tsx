"use client";

import { useState } from "react";
import { RefreshCw, X, Key, Loader2 } from "lucide-react";

interface SyncButtonProps {
  onSyncComplete: () => void;
}

export function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSync = async () => {
    if (!secret.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/activities/sync-manual", {
        method: "POST",
        headers: {
          "x-admin-secret": secret,
        },
      });

      const data = await res.json() as { message?: string; error?: string };

      if (!res.ok) {
        setResult({
          success: false,
          message: data.error ?? "Sync failed",
        });
      } else {
        setResult({ success: true, message: data.message ?? "Sync complete!" });
        onSyncComplete();
      }
    } catch (err) {
      setResult({ success: false, message: "Network error. Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all duration-150"
      >
        <RefreshCw className="w-4 h-4" />
        Sync Latest Strava Runs
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !loading && setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative z-10 bg-[#121215] border border-[#27272A] rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="text-base font-semibold text-white">
                  Sync Strava Activities
                </h2>
              </div>
              {!loading && (
                <button
                  onClick={() => setShowModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-sm text-zinc-500 mb-4">
              This will pull your 10 most recent Strava runs, run AI analysis on
              each, and save them to the dashboard.
            </p>

            <div className="mb-4">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
                Admin Secret
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && handleSync()}
                  placeholder="Enter ADMIN_SECRET..."
                  className="w-full bg-zinc-900 border border-[#27272A] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {result && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm font-mono ${
                  result.success
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {result.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => !loading && setShowModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#27272A] text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSync}
                disabled={loading || !secret.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Start Sync
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
