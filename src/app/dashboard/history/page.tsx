"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  History,
  Radio,
  Search,
  Footprints,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { ActivityCard } from "@/components/ActivityCard";
import { useLanguage } from "@/components/LanguageProvider";
import type { DashboardData } from "@/types";

const PAGE_SIZE = 10;

export default function RunHistoryPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGear, setSelectedGear] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/auth/me");
      const meJson = (await meRes.json()) as { user: unknown | null };
      if (!meJson.user) {
        router.push("/?login=required");
        return;
      }

      const res = await fetch("/api/activities");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run history");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const onRefresh = () => {
      void loadHistory();
    };
    window.addEventListener("pacepulse:refresh", onRefresh);
    return () => window.removeEventListener("pacepulse:refresh", onRefresh);
  }, [loadHistory]);

  const activities = data?.activities ?? [];

  // Distinct shoe names for dropdown filter
  const gearOptions = useMemo(() => {
    const set = new Set<string>();
    for (const act of activities) {
      if (act.gearName?.trim()) {
        set.add(act.gearName.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activities]);

  // Filtered runs
  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities.filter((act) => {
      const matchesName = !q || act.name.toLowerCase().includes(q);
      const matchesGear =
        selectedGear === "ALL" || (act.gearName?.trim() ?? "") === selectedGear;
      return matchesName && matchesGear;
    });
  }, [activities, searchQuery, selectedGear]);

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedActivities = filteredActivities.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      {/* Clean Page Topbar */}
      <header className="border-b border-[#27272A] bg-[#0E0E12]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider truncate">
              <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" />
              <span className="hidden sm:inline">{t.nav.stravaConnectedFull}</span>
              <span className="sm:hidden">{t.nav.stravaConnected}</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-white font-bold truncate">{t.nav.history}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        {/* Page Heading */}
        <div>
          <h1 className="text-lg sm:text-2xl font-black font-mono text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{t.historyPage.title}</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            {t.historyPage.subtitle}
          </p>
        </div>

        {/* Search & Gear Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 font-mono text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t.historyPage.searchPlaceholder}
              className="w-full bg-[#121215] border border-[#27272A] rounded-xl pl-9 pr-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="relative sm:w-64">
            <Footprints className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label={t.historyPage.allShoes}
              value={selectedGear}
              onChange={(e) => {
                setSelectedGear(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#121215] border border-[#27272A] rounded-xl pl-9 pr-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="ALL">{t.historyPage.allShoes}</option>
              {gearOptions.map((gear) => (
                <option key={gear} value={gear}>
                  {gear}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#121215] border border-[#27272A] text-zinc-400 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>{t.historyPage.loading}</span>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-10 text-center text-xs font-mono text-zinc-500">
            {t.historyPage.emptyFiltered}
          </div>
        ) : (
          <>
            {/* Count Summary */}
            <div className="text-xs font-mono text-zinc-500">
              {t.historyPage.showingCount}{" "}
              <strong className="text-zinc-200">
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filteredActivities.length)}
              </strong>{" "}
              {t.historyPage.of}{" "}
              <strong className="text-emerald-400">{filteredActivities.length}</strong>{" "}
              {t.historyPage.runs}
            </div>

            {/* Activities List */}
            <div className="space-y-4">
              {paginatedActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  canReanalyze={true}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-4 flex items-center justify-between gap-3 font-mono text-xs border-t border-[#27272A]">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121215] border border-[#27272A] text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t.historyPage.prev}</span>
                </button>

                <span className="text-zinc-400">
                  {t.historyPage.page}{" "}
                  <strong className="text-white">{safePage}</strong>{" "}
                  {t.historyPage.of}{" "}
                  <strong className="text-white">{totalPages}</strong>
                </span>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121215] border border-[#27272A] text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 transition-all"
                >
                  <span>{t.historyPage.next}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
