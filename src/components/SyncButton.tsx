"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, X, Key, Loader2, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

interface SyncButtonProps {
  onSyncComplete: () => void;
}

export function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = () => {
    setResult(null);
    setSecret("");
    setShowModal(true);
  };

  const handleClose = () => {
    if (!loading) {
      setShowModal(false);
      setResult(null);
    }
  };

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

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setResult({
          success: false,
          message: data.error ?? "Authentication failed. Check your ADMIN_SECRET.",
        });
      } else {
        // Tutup modal secara otomatis begitu sinkronisasi berhasil
        setShowModal(false);
        setSecret("");
        setResult(null);
        onSyncComplete();

        // Tampilkan toast konfirmasi keberhasilan sinkronisasi
        const successMsg = data.message ?? "Aktivitas Strava berhasil disinkronkan & dianalisis AI!";
        setToastMessage(successMsg);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch {
      setResult({
        success: false,
        message: "Network request failed. Make sure server is reachable.",
      });
    } finally {
      setLoading(false);
    }
  };

  const modalContent = showModal && (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Dimmed Background Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-md bg-[#121215] border border-[#27272A] rounded-2xl p-4 sm:p-6 shadow-2xl transition-all duration-300">
        {/* Modal Top Bar */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <RefreshCw className={`w-5 h-5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                Sync Strava Activities
              </h3>
              <p className="text-xs text-zinc-500 font-sans">
                Manual Ingest & Gemini AI Pipeline
              </p>
            </div>
          </div>

          {!loading && (
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Explanation */}
        <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
          Fetches your last 10 runs directly from Strava API, executes automatic kilometer split analysis via Gemini 2.5 Flash, and stores them in your database.
        </p>

        {/* Admin Secret Input */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs font-sans">
            <label className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Admin Passphrase
            </label>
            <span className="text-[10px] text-zinc-600">x-admin-secret</span>
          </div>

          <div className="relative">
            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSync()}
              placeholder="Enter ADMIN_SECRET..."
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 font-sans focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        {/* Feedback Message */}
        {result && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs font-sans flex items-start gap-2.5 ${
              result.success
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {result.success ? (
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed">{result.message}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#27272A] text-xs font-sans font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSync}
            disabled={loading || !secret.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-sans font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing 10 Runs...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Trigger Ingest
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-sans font-bold hover:bg-emerald-500/20 transition-all duration-150"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sync Latest Strava Runs</span>
        <span className="sm:hidden">Sync</span>
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}

      {/* Floating Success Toast */}
      {mounted &&
        toastMessage &&
        createPortal(
          <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-9999 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500 text-zinc-950 font-sans text-xs font-bold shadow-2xl transition-all duration-300">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>,
          document.body
        )}
    </>
  );
}
