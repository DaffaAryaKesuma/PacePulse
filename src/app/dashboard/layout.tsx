"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History,
  CalendarClock,
  FlaskConical,
  Zap,
  Home,
  RefreshCw,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useLanguage, LanguageToggle } from "@/components/LanguageProvider";
import { AthleteSettingsModal } from "@/components/AthleteSettingsModal";
import type { AthleteInfo } from "@/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, t, setLanguage } = useLanguage();

  const [currentUser, setCurrentUser] = useState<AthleteInfo | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = (await res.json()) as { user: AthleteInfo | null };
      if (json.user) {
        setCurrentUser(json.user);
        if (json.user.preferredLanguage === "id" || json.user.preferredLanguage === "en") {
          setLanguage(json.user.preferredLanguage);
        }
      }
    } catch {
      // Ignore auth fetch error here; child pages handle redirect
    }
  }, [setLanguage]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener("pacepulse:open-settings", handleOpenSettings);
    return () => window.removeEventListener("pacepulse:open-settings", handleOpenSettings);
  }, []);

  const emitRefresh = () => {
    window.dispatchEvent(new CustomEvent("pacepulse:refresh"));
  };

  const handleGlobalSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncToast(null);
    try {
      const res = await fetch("/api/activities/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
        signal: AbortSignal.timeout(65000),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        setSyncToast(json.message || "Runs synced!");
        emitRefresh();
      } else {
        setSyncToast(json.error || "Sync failed.");
      }
    } catch {
      setSyncToast("Network error during sync.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncToast(null), 5000);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
    }
  };

  const handleLanguagePersist = (nextLang: "id" | "en") => {
    if (!currentUser) return;
    fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredLanguage: nextLang }),
    }).catch(() => {});
  };

  const navItems = [
    {
      href: "/dashboard",
      label: t.nav.overview,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/dashboard/history",
      label: t.nav.history,
      icon: History,
      exact: false,
    },
    {
      href: "/dashboard/plan",
      label: t.nav.plan,
      icon: CalendarClock,
      exact: false,
    },
    {
      href: "/dashboard/analytics",
      label: t.nav.analytics,
      icon: FlaskConical,
      exact: false,
    },
  ];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-[#1E293B] bg-[#0E141F] z-30">
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img
              src="/logo.jpg"
              alt="PacePulse"
              className="w-8 h-8 rounded-xl object-cover border border-[#C8F902]/40 shadow-md shadow-[#C8F902]/10 shrink-0"
            />
            <span className="font-display italic text-lg font-extrabold tracking-wider text-white">
              PACE<span className="text-[#C8F902]">PULSE</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 text-xs font-semibold overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  active
                    ? "bg-[#C8F902]/12 border-[#C8F902]/35 text-[#C8F902] font-bold"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-[#131A26]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Global Actions & Language Switcher in Sidebar Bottom */}
        <div className="p-3 border-t border-[#1E293B] space-y-2 text-xs">
          <button
            type="button"
            onClick={() => void handleGlobalSync()}
            disabled={syncing}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#C8F902] hover:bg-[#d8ff3b] text-[#0B0F17] font-bold transition-all disabled:opacity-50 shadow-md shadow-[#C8F902]/15"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`} />
            <span className="truncate">{syncing ? t.nav.syncing : t.nav.syncLatestRuns}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            disabled={!currentUser}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#131A26] border border-[#1E293B] text-slate-200 hover:text-white hover:border-[#C8F902]/50 font-semibold transition-all disabled:opacity-50"
          >
            <Settings className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
            <span className="truncate">{t.header.athleteSettings}</span>
          </button>

          <div className="pt-1 flex items-center justify-between gap-2">
            <LanguageToggle onChange={handleLanguagePersist} />

            <div className="flex items-center gap-1">
              <Link
                href="/"
                title={t.nav.home}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-[#18181B] transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                title={t.nav.logout}
                aria-label={t.nav.logout}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Top Utility Bar (keeps actions accessible without bottom-left collision) */}
      <div className="lg:hidden sticky top-0 z-40 border-b border-[#1E293B] bg-[#0B0F17]/95 backdrop-blur-md">
        <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/logo.jpg"
              alt="PacePulse"
              className="w-7 h-7 rounded-lg object-cover border border-[#C8F902]/40 shrink-0"
            />
            <span className="font-display italic text-base font-extrabold tracking-wider text-white">
              PACE<span className="text-[#C8F902]">PULSE</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageToggle onChange={handleLanguagePersist} />

            <button
              type="button"
              onClick={() => void handleGlobalSync()}
              disabled={syncing}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#C8F902] text-[#0B0F17] font-bold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? t.nav.syncing : t.nav.sync}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              disabled={!currentUser}
              aria-label={t.nav.settings}
              className="p-1.5 rounded-lg bg-[#131A26] border border-[#1E293B] text-slate-200 hover:text-white disabled:opacity-50"
            >
              <Settings className="w-3.5 h-3.5 text-[#FF5A1F]" />
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={t.nav.logout}
              className="p-1.5 rounded-lg bg-[#131A26] border border-[#1E293B] text-slate-400 hover:text-red-400"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-64 pb-20 lg:pb-0">
        {syncToast && (
          <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-4">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-sans flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{syncToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncToast(null)}
                className="text-emerald-400/70 hover:text-emerald-400 shrink-0"
              >
                {t.dashboard.dismiss}
              </button>
            </div>
          </div>
        )}
        {children}
      </div>

      {/* Mobile & Tablet Bottom Navigation Bar */}
      <nav
        aria-label="Mobile dashboard navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#27272A] bg-[#0E0E12]/95 backdrop-blur-md"
      >
        <div className="grid grid-cols-4 h-16 max-w-xl mx-auto px-1 font-sans">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl mx-1 my-1.5 transition-colors ${
                  active
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-bold truncate max-w-[96px]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Global Athlete Settings Modal */}
      {currentUser && (
        <AthleteSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          athlete={currentUser}
          onUpdated={() => {
            void loadUser();
            emitRefresh();
          }}
        />
      )}
    </div>
  );
}
