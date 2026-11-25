# PacePulse — AI Running Coach & Sports Science Telemetry SaaS

[![Next.js](https://img.shields.io/badge/Next.js-16.4_(App_Router)-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x_(Strict)-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Neon PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Strava API](https://img.shields.io/badge/Strava-OAuth_2.0_%26_Webhooks-FC4C02?style=for-the-badge&logo=strava&logoColor=white)](https://developers.strava.com/)
[![Gemini AI](https://img.shields.io/badge/Google-Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Open-Meteo](https://img.shields.io/badge/Open--Meteo-Weather_%26_AQI-FF9900?style=for-the-badge)](https://open-meteo.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

**Event-driven, multi-tenant AI Running Coach & Sports Science Telemetry SaaS** that transforms raw Strava GPS and heart-rate streams into evidence-based physiological diagnoses, adaptive weekly training plans, and automated Discord coaching reports.

- **Live Production App:** [https://pace-pulse.vercel.app/](https://pace-pulse.vercel.app/)
- **Zero-Login Live Athlete Showcase:** [https://pace-pulse.vercel.app/u/black_daffa-8449](https://pace-pulse.vercel.app/u/black_daffa-8449)

---

## Key Highlights

1. **Evidence-Based AI Coaching & Anti-Overtraining Guardrails**
   Session evaluations and weekly plan generation are grounded in peer-reviewed endurance physiology (**Jack Daniels' 10% Volume Rule & VDOT**, **Stephen Seiler's 80/20 Polarized Model**, **Pete Pfitzinger's Cardiac Drift**, and **Marius Bakken's Norwegian Sub-LT2**), paired with automatic periodization phase detection (*Recovery → Base → Threshold/Build → Peak/Taper*) based on target race date or recent workload.
2. **Hybrid AI + Deterministic Sports Science Fallback**
   Built for **100% system resilience**: if **Gemini AI** hits rate limits (`429`) or transient downtime (`503`), PacePulse seamlessly falls back to a deterministic mathematical sports-science engine (**VDOT, ACWR, LT1/LT2, 80/20 volume caps**) so athletes always receive safe, guardrail-enforced training plans and rescheduling without errors.
3. **Real-Time Strava Webhook & Tropical Weather / AQI Context**
   End-to-end automation when a new run syncs to Strava: fetches local temperature, humidity, and US AQI via **Open-Meteo** to prevent tropical heat-induced *cardiac drift* bias, computes aerobic discipline & traffic friction scores, and pushes a formatted coaching report directly to the athlete's personal **Discord Webhook**.
4. **Full Strava Bulk Sync, Gear Rotation & All-Time PB Tracker**
   Supports bulk historical synchronization (`per_page=200`), Strava shoe mileage wear tracking (*Malisoux et al.*), automatic extraction of All-Time Personal Bests (`1K`–`FM` including Strava `best_efforts`), and **100% dynamic per-user goal calibration** (`5K`, `10K`, `Half Marathon`, `Marathon`, or `General Fitness / Aerobic Base`).
5. **Zero-Login Live Public Athlete Showcase (`/u/[slug]`)**
   Shareable public telemetry portfolio allowing recruiters, coaches, and peers to inspect interactive **Reversed Pace vs. Heart Rate** charts, KPI cards, and AI coaching diagnoses without requiring Strava authentication.

---

## System Architecture & Data Flow

```text
Strava OAuth & Webhooks
        │
        ▼
Next.js App Router API (Route Handlers & JWT Session)
        │
        ├──► Neon PostgreSQL (Prisma ORM: User, Activity, Gear, PersonalBest, WeeklyPlan)
        └──► Open-Meteo API (Local Temperature, Humidity & US AQI)
                │
                ▼
     Gemini AI + Deterministic Sports Science Engine
       (VDOT, ACWR, LT1/LT2, 10% Cap, Auto-Phase, ID/EN)
                │
                ├──► Recharts 4-Menu Dashboard & Public Showcase (/u/[username])
                └──► Personal Discord Webhook Notifications
```

### 4-Menu Dashboard & Bilingual Experience (`ID / EN`)

| Menu | Route | Core Capabilities |
| :--- | :--- | :--- |
| **Overview** | `/dashboard` | Dynamic Goal & Readiness cockpit, HR Zone reference strip, KPI cards, Recharts **Aerobic Decoupling & Reversed Pace Trend**, and recent AI coaching feed. |
| **Run History** | `/dashboard/history` | Full searchable & shoe-filterable activity log, metric kilometer splits, lifestyle context tags (`heavy_legs`, `poor_sleep`, `high_caffeine`, `work_stress`), and on-demand AI re-analysis. |
| **Training Plan** | `/dashboard/plan` | **AI Adaptive Training Plan** (7-day 80/20 schedule with shoe rotation & literature citations), **Adaptive Rescheduler** for disrupted days, and **Race-Day Strategy & Fueling Builder**. |
| **Sports Lab & Gear** | `/dashboard/analytics` | **Jack Daniels VDOT Race Predictor**, **ACWR Workload Ratio Guard**, **Strava Shoe Mileage Tracker** (700 km retirement threshold), and **All-Time Personal Bests (`1K`–`FM`)**. |

All UI labels, AI coaching evaluations, and weekly training plans dynamically follow the user's selected **Bahasa Indonesia (`id`)** or **English (`en`)** language preference.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js `16.4.6` (App Router, Webpack) + React `19.3.0` |
| **Language** | TypeScript `5.x` (`strict: true`) |
| **Styling & Icons** | Tailwind CSS `v4` + Lucide React |
| **Data Visualization** | Recharts `3.x` |
| **Database & ORM** | Neon Serverless PostgreSQL + Prisma ORM `6.4.1` |
| **Authentication** | Strava OAuth 2.0 + HTTP-only JWT cookies (`jose`) |
| **AI & Fallback** | Google Gemini REST API + Deterministic Sports Science Engine |
| **External Telemetry** | Strava API v3 + Open-Meteo Weather & Air Quality API |
| **Notifications** | Discord Webhook API (per-athlete encrypted/stored URL) |
| **Deployment** | Vercel (`@vercel/functions` for background webhook processing) |

---

## Project Structure

```text
E:\PacePulse
├── prisma/
│   └── schema.prisma              # User, Activity, Gear, PersonalBest, WeeklyPlan models
├── src/
│   ├── app/
│   │   ├── api/                   # Strava OAuth, webhooks, sync, PB refresh, plans, settings
│   │   ├── dashboard/             # 4-menu authenticated SaaS dashboard
│   │   │   ├── analytics/         # Sports Lab (VDOT, ACWR, Gear, All-Time PBs)
│   │   │   ├── history/           # Full Run History & split telemetry
│   │   │   └── plan/              # Adaptive Training Plan & Race-Day Strategy Builder
│   │   ├── u/[username]/          # Zero-login Public Athlete Showcase
│   │   └── page.tsx               # Landing page & live public preview
│   ├── components/                # AthleteHeader, ActivityCard, TelemetryCharts, Modals, i18n
│   └── lib/
│       ├── gemini.ts              # Gemini AI + Deterministic Fallback & Plan Guardrails
│       ├── sports-analytics.ts    # VDOT, ACWR, Auto-Phase, Race Strategy & PB Sync
│       ├── plan-context.ts        # Full physiology/workload/shoe context extractor
│       ├── sports-science-kb.ts   # Literature-grounded coaching system context
│       ├── weather.ts             # Open-Meteo weather & US AQI enrichment
│       ├── strava.ts              # Strava OAuth token refresh & API helpers
│       └── i18n.ts                # Complete Indonesian & English dictionary
└── package.json
```

---

## Local Setup Guide

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/DaffaAryaKesuma/PacePulse.git
cd PacePulse
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root with the following keys:

```env
# PostgreSQL (Neon / Supabase)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Strava OAuth 2.0 & Webhook
STRAVA_CLIENT_ID="your_strava_client_id"
STRAVA_CLIENT_SECRET="your_strava_client_secret"
STRAVA_VERIFY_TOKEN="your_webhook_verify_token"

# Google Gemini AI
GEMINI_API_KEY="your_gemini_api_key"

# Session & App URL
SESSION_SECRET="at_least_32_characters_long_random_secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional
DISCORD_WEBHOOK_URL=""
ADMIN_SECRET=""
```

### 3. Push Database Schema & Generate Prisma Client

```bash
npx prisma db push && npx prisma generate
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Developer

**Daffa Arya Kesuma** 
