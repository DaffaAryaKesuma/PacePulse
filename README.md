# PacePulse ⚡🏃

**Automated AI Running Coach & Telemetry Dashboard**  
*Event-driven running analytics powered by Next.js 15, Strava Webhooks, Google Gemini 2.5 Flash, PostgreSQL (Supabase), and Discord Notifications.*

[![Next.js 15](https://img.shields.io/badge/Next.js-15_(App_Router)-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x_(strict)-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Discord](https://img.shields.io/badge/Discord-Webhook_API-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/)

---

## 📖 Overview

**PacePulse** is an automated telemetry and coaching platform built for endurance athletes. Designed around the **Threshold Lab / Norwegian-lite** methodology (dual-threshold training with strict heart rate discipline), PacePulse turns raw Strava GPS and biometric telemetry into actionable coaching insights within seconds of concluding a run.

### Why PacePulse?
Traditional fitness apps either present overwhelming raw data or generic, canned advice. PacePulse provides:
1. **Zero-Touch Automation:** When you finish a run on your Garmin, Apple Watch, or COROS, Strava fires a webhook.
2. **Instant AI Feedback:** Within seconds, **Gemini 2.5 Flash** evaluates your pace discipline, heart rate drift, cadence, and split consistency against your target race profile.
3. **Multi-Channel Delivery:** Comprehensive telemetry is stored in PostgreSQL, broadcast as a rich embed to Discord, and rendered on a sleek **Dark Sport-Tech Telemetry** dashboard.

---

## 🏛️ Architecture & Data Flow

```mermaid
flowchart LR
    A[Athlete finishes Run<br/>Garmin / COROS / Apple Watch] --> B[Strava Cloud]
    B -->|Webhook POST Event| C[Next.js API Route<br/>/api/strava-webhook]
    C -->|HTTP 200 within <2s| B
    C -->|Fetch details & splits| D[Strava REST API v3]
    C -->|Evaluate splits & HR drift| E[Google Gemini 2.5 Flash]
    C -->|Upsert Activity Record| F[(PostgreSQL / Supabase)]
    C -->|Push Rich Telemetry Embed| G[Discord Webhook]
    F -->|Telemetry Query & Aggregations| H[PacePulse Dashboard<br/>React + Recharts]
```

1. **Strava Webhook Trigger:** Athlete syncs their watch. Strava sends an event payload to `/api/strava-webhook`.
2. **Async Execution:** The route returns an immediate HTTP `200` (<2 seconds) to satisfy Strava's timeout SLA, continuing async processing via Vercel Serverless lifecycles.
3. **Data Enrichment:** The server requests a fresh OAuth access token and pulls granular metric splits (`splits_metric`), heart rate curves, and elevation changes.
4. **AI Coach Analysis:** Metrics are passed to **Gemini 2.5 Flash** using a data-driven system prompt configured with the athlete's specific physiological profile (e.g., Threshold HR 173 bpm, Half Marathon Sub-1:45 target).
5. **Storage & Notifications:** Prisma upserts the activity and telemetry data into PostgreSQL, and formats a real-time Discord notification.

---

## 🎨 UI & Design Language

PacePulse uses a **Dark Sport-Tech Telemetry** visual identity inspired by COROS Training Hub, Strava Summit, and motorsport pit telemetry:
- **Canvas:** Deep Void Black (`#09090B`)
- **Cards & Surfaces:** Carbon Slate (`#121215`) with subtle border lines (`#27272A`)
- **Accents:**
  - 🟢 **Neon Aerobic Green (`#10B981`):** Sub-threshold / Base endurance zone
  - 🟠 **Threshold Orange (`#F97316`):** Lactate threshold / Tempo effort
  - 🔵 **Recovery Blue (`#3B82F6`):** Active recovery zone
  - 🔴 **Race Red (`#EF4444`):** Anaerobic / Max effort

---

## ⚡ Tech Stack

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/) with React 19 and TypeScript (`strict: true`)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with Lucide React icons
- **Visualizations:** [Recharts](https://recharts.org/) for pace trends, HR distribution, and weekly volume bar charts
- **Database & ORM:** [PostgreSQL (Supabase)](https://supabase.com/) managed via [Prisma ORM](https://www.prisma.io/)
- **AI Engine:** [Google Gemini 2.5 Flash](https://aistudio.google.com/) via lightweight native `fetch` REST client (no heavy SDK overhead)
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

Fill in the required credentials in `.env.local`:
```env
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres?schema=public"
STRAVA_CLIENT_ID="your_strava_client_id"
STRAVA_CLIENT_SECRET="your_strava_client_secret"
STRAVA_REFRESH_TOKEN="your_strava_refresh_token"
STRAVA_VERIFY_TOKEN="your_custom_verify_token"
GEMINI_API_KEY="your_google_gemini_api_key"
DISCORD_WEBHOOK_URL="your_discord_webhook_url"
ADMIN_SECRET="your_admin_passphrase"
```

### 3. Initialize Prisma & Database

Run Prisma migrations or push schema directly to your database:
```bash
npx prisma db push
npx prisma generate
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔗 Strava Webhook & API Setup Guide

### Step 1: Create a Strava API Application
1. Go to [Strava Settings > My API Application](https://www.strava.com/settings/api).
2. Create an application with:
   - **Application Name:** `PacePulse`
   - **Category:** Training
   - **Authorization Callback Domain:** `localhost` (or your Vercel deployment domain, e.g. `pacepulse.vercel.app`)
3. Note your `Client ID` and `Client Secret`.

### Step 2: Authorize `activity:read_all` Scope
To access full run telemetry and splits, open this URL in your browser (replace `YOUR_CLIENT_ID`):
```text
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=read,activity:read_all
```
After clicking **Authorize**, your browser will redirect to `http://localhost/?state=&code=AUTHORIZATION_CODE&scope=...`. Copy the `AUTHORIZATION_CODE`.

Exchange the code for a permanent `refresh_token`:
```bash
curl -X POST https://www.strava.com/oauth/token \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F code=AUTHORIZATION_CODE \
  -F grant_type=authorization_code
```
Save the returned `refresh_token` in `.env.local` as `STRAVA_REFRESH_TOKEN`.

### Step 3: Register the Strava Webhook Subscription
Once your app is deployed to a public HTTPS domain (such as Vercel):

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F "callback_url=https://your-domain.vercel.app/api/strava-webhook" \
  -F "verify_token=YOUR_STRAVA_VERIFY_TOKEN"
```

Strava will send a GET handshake request to verify the endpoint:
- Strava verifies: `hub.mode === 'subscribe'` & `hub.verify_token === YOUR_STRAVA_VERIFY_TOKEN`
- PacePulse responds with: `{ "hub.challenge": challenge }` (HTTP 200)

To check existing active subscriptions:
```bash
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

---

## 📥 Historical Data Seeding

Don't wait for your next workout to test the dashboard! Use the built-in manual sync endpoint to immediately fetch your last 10 runs from Strava and analyze them with Gemini:

```bash
curl -X POST https://your-domain.vercel.app/api/activities/sync-manual \
  -H "x-admin-secret: YOUR_ADMIN_SECRET"
```

Alternatively, click the **"Sync Latest Strava Runs"** button directly on the PacePulse web dashboard and enter your `ADMIN_SECRET` in the prompt modal.

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial PacePulse release"
   git remote add origin https://github.com/your-username/PacePulse.git
   git push -u origin main
   ```
2. Import the project in [Vercel](https://vercel.com/new).
3. Under **Environment Variables**, add all keys from `.env.example`:
   - `DATABASE_URL`
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_REFRESH_TOKEN`
   - `STRAVA_VERIFY_TOKEN`
   - `GEMINI_API_KEY`
   - `DISCORD_WEBHOOK_URL`
   - `ADMIN_SECRET`
4. Deploy! After deployment finishes, execute the Strava Webhook subscription command using your new Vercel domain.

---

## 🏃 Athlete Profile & Methodology Reference

PacePulse's coach engine is tuned to the following baseline profile:
- **Athlete Focus:** Half Marathon Sub-1:45:00 progression (target race pace: 4:58/km)
- **Reference Benchmarks:** 10K PB: 51:44 | Debut HM: 02:04:08
- **Heart Rate Threshold (LT2):** 173 bpm
- **Pace Threshold (LT2):** 4:40/km
- **Shoe Rotation:** ASICS Novablast 5 (Base / Recovery), ASICS Magic Speed 4 (Intervals / Tempo / Race)
- **Training Philosophy:** Norwegian-lite (Double threshold sessions, high aerobic volume strictly under Zone 2 HR cap of 148 bpm, controlled lactate accumulation)

---

## 📄 License

MIT License © 2026 PacePulse
