"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History,
  CalendarClock,
  FlaskConical,
  Bot,
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
    {
      href: "/coach",
      label: t.nav.coach,
      icon: Bot,
      exact: false,
    },
  ];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-white/10 bg-[#09090B] z-30">
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img
              src="/logo.jpg"
              alt="PacePulse"
              className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
            />
            <span className="text-base font-bold tracking-tight text-zinc-100">
              PACE<span className="text-emerald-500">PULSE</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 text-xs font-medium overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  active
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold"
                    : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Global Actions & Language Switcher in Sidebar Bottom */}
        <div className="p-3 border-t border-white/10 space-y-2 text-xs">
          <button
            type="button"
            onClick={() => void handleGlobalSync()}
            disabled={syncing}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`} />
            <span className="truncate">{syncing ? t.nav.syncing : t.nav.syncLatestRuns}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            disabled={!currentUser}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-900/70 border border-white/10 text-zinc-300 hover:text-zinc-100 hover:border-white/20 font-medium transition-colors disabled:opacity-50"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{t.header.athleteSettings}</span>
          </button>

          <div className="pt-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 tracking-wide truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">{t.nav.stravaConnectedFull}</span>
            </span>

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

      {/* Mobile & Tablet Top Utility Bar */}
      <div className="lg:hidden sticky top-0 z-40 border-b border-white/10 bg-[#09090B]/95 backdrop-blur-md">
        <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/logo.jpg"
              alt="PacePulse"
              className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0"
            />
            <span className="text-sm font-bold tracking-tight text-zinc-100">
              PACE<span className="text-emerald-500">PULSE</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageToggle onChange={handleLanguagePersist} />

            <button
              type="button"
              onClick={() => void handleGlobalSync()}
              disabled={syncing}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? t.nav.syncing : t.nav.sync}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              disabled={!currentUser}
              aria-label={t.nav.settings}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-50"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={t.nav.logout}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-zinc-100"
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
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#09090B]/95 backdrop-blur-md"
      >
        <div className="grid grid-cols-5 h-16 max-w-xl mx-auto px-1 font-sans">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg mx-0.5 my-1.5 transition-colors ${
                  active
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-medium truncate max-w-18">
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
