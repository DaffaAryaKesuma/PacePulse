"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LanguageToggle, useLanguage } from "@/components/LanguageProvider";

export default function PrivacyPolicyPage() {
  const { language } = useLanguage();
  const isId = language === "id";

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans">
      <header className="border-b border-white/10 bg-[#09090B]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-300 hover:text-zinc-100 font-medium"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
            <span>{isId ? "Kembali ke Beranda" : "Back to Home"}</span>
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-100">
              {isId ? "Kebijakan Privasi PacePulse" : "PacePulse Privacy Policy"}
            </h1>
            <p className="text-xs text-zinc-400">
              {isId
                ? "Terakhir diperbarui: November 2026"
                : "Last updated: November 2026"}
            </p>
          </div>
        </div>

        <div className="bg-[#111114] border border-white/10 rounded-xl p-6 space-y-5 text-sm leading-relaxed text-zinc-300">
          <section className="space-y-1.5">
            <h2 className="text-sm font-semibold text-zinc-100">
              {isId ? "1. Data yang Kami Kumpulkan" : "1. Data We Collect"}
            </h2>
            <p>
              {isId
                ? "Saat Anda masuk menggunakan Strava OAuth 2.0, PacePulse hanya mengakses profil atlet dasar (nama, foto profil, daftar sepatu) serta data telemetri aktivitas lari Anda (jarak, durasi, pace, detak jantung, cadence, elevasi, dan split per kilometer)."
                : "When you sign in with Strava OAuth 2.0, PacePulse only accesses your basic athlete profile (name, avatar, gear list) and running activity telemetry (distance, duration, pace, heart rate, cadence, elevation, and kilometer splits)."}
            </p>
          </section>

          <section className="space-y-1.5 pt-4 border-t border-white/5">
            <h2 className="text-sm font-semibold text-zinc-100">
              {isId ? "2. Penggunaan Data & AI Coaching" : "2. Data Usage & AI Coaching"}
            </h2>
            <p>
              {isId
                ? "Data Anda disimpan secara terisolasi per akun di PostgreSQL dan digunakan secara eksklusif untuk menghitung ambang LT1/LT2, prediksi VDOT, rasio ACWR, rencana latihan mingguan, serta konsultasi AI Sports Science Coach pribadi Anda."
                : "Your data is stored isolated per account in PostgreSQL and used exclusively to compute LT1/LT2 thresholds, VDOT race predictions, ACWR workload ratios, weekly training plans, and your personal AI Sports Science Coach consultations."}
            </p>
          </section>

          <section className="space-y-1.5 pt-4 border-t border-white/5">
            <h2 className="text-sm font-semibold text-zinc-100">
              {isId ? "3. Visibilitas & Kontrol Pengguna" : "3. Visibility & User Control"}
            </h2>
            <p>
              {isId
                ? "Secara default, tidak ada data pengguna yang ditampilkan di halaman utama. Anda dapat menonaktifkan Showcase Profil Publik kapan saja melalui menu Pengaturan Atlet atau mencabut akses aplikasi dari pengaturan akun Strava Anda."
                : "By default, no user data is exposed on the public landing page. You can disable your Public Profile Showcase at any time in Athlete Settings or revoke app access directly from your Strava account settings."}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
