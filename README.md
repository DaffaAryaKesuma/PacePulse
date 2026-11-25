# PacePulse ⚡🏃

**Multi-User AI Running Coach & Telemetry SaaS Platform**  
*Event-driven running analytics powered by Next.js 15, Strava OAuth 2.0 & Webhooks, Google Gemini 2.5 Flash, PostgreSQL (Neon/Supabase), and Discord Notifications.*

[![Next.js 15](https://img.shields.io/badge/Next.js-15_(App_Router)-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x_(strict)-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Discord](https://img.shields.io/badge/Discord-Webhook_API-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/)

---

## 📖 Overview

**PacePulse** is an automated telemetry and sports science coaching SaaS built for endurance runners. Designed around peer-reviewed sports science methodologies (Jack Daniels, Stephen Seiler, Pete Pfitzinger, Marius Bakken, and Laurent Malisoux), PacePulse turns raw Strava GPS and biometric telemetry into elite, actionable coaching insights within seconds of concluding a run.

### Key Capabilities
1. **Multi-User Strava OAuth 2.0:** Any runner can sign in with Strava in one click. Their tokens are securely stored and automatically refreshed.
2. **Deep Sports Science AI Coach:** Evaluates pace discipline, aerobic decoupling (cardiac drift), cadence, and split consistency with **mandatory scientific literature citations** from Daniels, Seiler, Pfitzinger, Bakken, and Malisoux.
3. **Dynamic Athlete Customization:** Set personal target distances (5K to Marathon), goal finish times, baseline PBs, threshold HR, max HR, and training phases via an interactive in-app settings modal.
4. **Zero-Touch Webhooks & Re-Analysis:** When a user logs a run, Strava Webhook triggers instant AI evaluation and pushes rich telemetry embeds to the athlete's personal Discord webhook. Athletes can also trigger manual 1-click sync or re-analyze past sessions with updated targets.
5. **Public Athlete Showcase:** Every user can toggle public profile sharing (`/u/[username]`), creating a shareable telemetry portfolio for coaches and recruiters.

---

## 📚 Sports Science Knowledge Base

PacePulse's AI coaching engine (`src/lib/gemini.ts`) is grounded in five core exercise physiology frameworks (`src/lib/sports-science-kb.ts`):

| Framework / Author | Core Tenet | PacePulse Application |
|---|---|---|
| **Jack Daniels, PhD** (*Daniels' Running Formula*) | VDOT tables & Zone pacing (Easy 65–78% Max HR, Threshold ~88–90% Max HR); 10% weekly mileage progression limit. | Flags pace overshoot on recovery days; calculates VDOT progression towards goal time. |
| **Dr. Stephen Seiler & Matt Fitzgerald** (*80/20 Running*) | Polarized training distribution: 80% strictly sub-LT1, 20% high intensity. Avoid the unproductive "Grey Zone". | Detects Zone 3 creep during base aerobic runs; recommends strict HR capping. |
| **Pete Pfitzinger & Scott Douglas** (*Advanced Marathoning*) | Aerobic Decoupling / Cardiac Drift (>5% pace:HR drift indicates aerobic fatigue); 10–14 day reverse taper post-race. | Analyzes second-half HR drift vs split times; prescribes recovery microcycles. |
| **Dr. Marius Bakken** (*Norwegian Sub-Threshold Model*) | High-volume controlled lactate intervals kept strictly below LT2 (170–173 bpm threshold) to maximize speed without autonomic stress. | Guards against excessive lactate accumulation during tempo & threshold blocks. |
| **Dr. Laurent Malisoux et al. (2015)** (*Biomechanics & Shoe Rotation*) | Dual/multi-shoe rotation reduces running-related injury risk by up to 39%; optimal cadence range 170–185 spm. | Monitors cadence spikes/drops and prompts proper footwear selection (e.g. daily trainer vs plated racer). |

---

## 🏛️ Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Athletes
        A1[User Signs in via Strava OAuth] -->|Auth Code Exchange| B[Next.js App Router]
        A2[User finishes Run on Watch] -->|Sync| C[Strava Cloud]
    end

    subgraph Backend [PacePulse Backend]
        B -->|Encrypted JWT Cookie| D[Personal Dashboard /dashboard]
        C -->|Webhook POST Event| E[/api/strava-webhook]
        E -->|Find Athlete by owner_id| F[(PostgreSQL / Neon DB)]
        E -->|Get Fresh Access Token| G[Strava REST API v3]
        G -->|Fetch splits & telemetry| E
        E -->|Athlete Profile + Sports Science KB| H[Google Gemini 2.5 Flash]
        H -->|Evaluated Coaching Feedback| E
        E -->|Upsert Activity Record| F
        E -->|Push Telemetry Embed| I[Personal Discord Webhook]
    end

    subgraph Client [Frontend UI]
        D -->|View Telemetry & Analytics| J[Recharts & Biometric Cards]
        D -->|Update Targets & Webhook| K[Athlete Settings Modal]
        F -->|Public Showcase| L[Public Profile /u/:username]
    end
```

---

## 🎨 UI & Design Language

PacePulse features a **Dark Sport-Tech Telemetry** visual identity inspired by COROS Training Hub, Strava Summit, and motorsport telemetry displays:
- **Canvas:** Deep Void Black (`#09090B`)
- **Surfaces:** Carbon Slate (`#121215`) with precise boundaries (`#27272A`)
- **Telemetry Palette:**
  - 🟢 **Neon Aerobic Green (`#10B981`):** Sub-threshold / Base endurance zone
  - 🟠 **Threshold Orange (`#F97316`):** Lactate threshold / Tempo effort
  - 🔵 **Recovery Blue (`#3B82F6`):** Active recovery zone
  - 🔴 **Race Red (`#EF4444`):** Anaerobic / Max effort

---

## ⚡ Tech Stack

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/) with React 19 and TypeScript (`strict: true`)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with Lucide React icons
- **Visualizations:** [Recharts](https://recharts.org/) for volume trends, pace vs HR correlation, and aerobic efficiency
- **Database & ORM:** PostgreSQL ([Neon Serverless](https://neon.tech/) / Supabase) managed with [Prisma ORM](https://www.prisma.io/)
- **Session Management:** Secure HTTP-only JWT cookies via [jose](https://github.com/panva/jose)
- **AI Engine:** [Google Gemini 2.5 Flash](https://aistudio.google.com/) via lightweight native `fetch` REST client
- **Notifications:** Discord Webhook API for rich embed reporting

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/PacePulse.git
cd PacePulse
npm install
```

### 2. Configure Environment Variables

Copy the template configuration:
```bash
cp .env.example .env.local
```

Configure your `.env.local`:
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SESSION_SECRET="generate_a_random_32_character_string_for_jwt_session"

DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

STRAVA_CLIENT_ID="your_strava_client_id"
STRAVA_CLIENT_SECRET="your_strava_client_secret"
STRAVA_REFRESH_TOKEN="fallback_system_strava_refresh_token"
STRAVA_VERIFY_TOKEN="pacepulse_secure_verify_token_2026"

GEMINI_API_KEY="your_google_gemini_api_key"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
ADMIN_SECRET="your_admin_secret_passphrase"
```

### 3. Initialize Prisma & Database

Push the relational schema to PostgreSQL:
```bash
node ./node_modules/prisma/build/index.js db push
node ./node_modules/prisma/build/index.js generate
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔗 Strava Webhook & OAuth Setup Guide

### Step 1: Create a Strava API Application
1. Go to [Strava Settings > My API Application](https://www.strava.com/settings/api).
2. Configure:
   - **Application Name:** `PacePulse`
   - **Category:** Training
   - **Authorization Callback Domain:** `localhost:3000` (or your production domain, e.g. `pacepulse.vercel.app`)
3. Note your `Client ID` and `Client Secret`.

### Step 2: Register the Strava Webhook Push Subscription
When your application is live on HTTPS (e.g., via Vercel or ngrok):

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F "callback_url=https://your-domain.vercel.app/api/strava-webhook" \
  -F "verify_token=YOUR_STRAVA_VERIFY_TOKEN"
```

To inspect active subscriptions:
```bash
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

---

## 🏃 Athlete Settings & Multi-User Features

- **Connect with Strava:** Click "Connect with Strava" from the landing page. Athletes grant `activity:read_all` permissions, and are immediately redirected to their personal `/dashboard`.
- **Target Customization:** Click **"Athlete Settings"** in the top navigation bar to adjust:
  - Target race distance (5K, 10K, Half Marathon, Marathon)
  - Target time (e.g. `01:45:00`)
  - Current Personal Best (PB)
  - Threshold Heart Rate (LT2 in bpm) & Max HR
  - Training phase (`Recovery`, `Base`, `Build`, `Peak`)
  - Personal Discord Webhook URL for private notifications
  - Public profile visibility toggle (`/u/[username]`)
- **1-Click Historical Sync:** Click **"Sync Latest Runs"** in the dashboard to immediately pull and evaluate up to 10 recent Strava runs without requiring admin credentials.
- **AI Re-Analysis:** Click **"Re-Analyze"** on any activity card to re-run Gemini 2.5 Flash against your latest profile parameters and sports science literature.

---

## 📄 License

MIT License © 2026 PacePulse
