# ⚡ VECO Brownout Tracker (Visayan Electric — Cebu)

A clean, minimalist, and searchable power interruption web application and automated advisory synchronization system built for Cebu residents. Designed following Apple Human Interface Guidelines and the shadcn/ui zinc dark palette.

---

## Features

- **⚡ Is Your Power Affected?**: Central search bar with instant direct answer ("✓ All Clear" vs "● Notice").
- **⭐ My Saved Places**: Pin your home, work, or parents' barangays to monitor status at a glance.
- **📅 Week Calendar**: 7-day Apple-style horizontal strip with status indicator dots and daily schedules.
- **📜 Outage Archive**: High-density compact summary of historical data with perpetual retention.
- **📍 Estimated Affected Zone Map**: Visual radar sector map inside the detail modal with direct Google Maps integration.
- **🔗 Original Facebook Source Links**: Every schedule card links directly to the official VECO post.
- **🔄 Stale-While-Revalidate (SWR) Sync**: Automatic background revalidation whenever residents open the app if data is older than 30 minutes.
- **🔄 Tactile UI Refresh**: Interactive one-tap refresh button in the header for instantaneous manual synchronizations.
- **🤖 Area-Specific Superseder**: Automatically overrides earlier weekly plans with specific daily/hourly post updates per barangay.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + TypeScript
- **Styling**: Tailwind CSS v4 (shadcn/ui zinc-950 dark theme)
- **Database**: LibSQL (`@libsql/client`), dual-mode supporting both local SQLite (`data/veco.db`) and remote Turso Cloud SQLite
- **Automation**: Stale-While-Revalidate On-Demand Serverless Sync + 30-minute Cloud Cron (`vercel.json` / `cron-job.org`)

---

## 🚀 100% Free Cloud Deployment Guide (Turso + Vercel)

This stack is **100% free forever** with zero credit card required:
- **Turso (LibSQL)**: Cloud SQLite database (9GB free, 1 billion row reads/month).
- **Vercel**: Global Next.js hosting, Edge API routes, and Serverless Cron.
- **Zero GitHub Actions runner minutes required!**

### Step 1: Create Free Turso Database

1. Install Turso CLI (or use the web dashboard at [turso.tech](https://turso.tech)):
   ```bash
   brew install tursodatabase/tap/turso
   turso auth signup
   ```
2. Create a database:
   ```bash
   turso db create veco-db
   ```
3. Retrieve your database URL and Auth Token:
   ```bash
   turso db show veco-db --url
   # Output: libsql://veco-db-[your-username].turso.io

   turso db tokens create veco-db
   # Output: eyJhbGciOi... (your auth token)
   ```
4. Push your existing local records to Turso in one command:
   ```bash
   TURSO_DATABASE_URL="libsql://veco-db-[your-username].turso.io" \
   TURSO_AUTH_TOKEN="your-token" \
   npm run turso:push
   ```

---

### Step 2: Deploy Frontend on Vercel

1. Push this repository to your GitHub account.
2. Go to [vercel.com](https://vercel.com) and import your repository.
3. In **Settings > Environment Variables**, add:
   - `TURSO_DATABASE_URL`: `libsql://veco-db-[your-username].turso.io`
   - `TURSO_AUTH_TOKEN`: `(your token from Step 1)`
   - `CRON_SECRET`: `(generate any random string, e.g. "my-secret-token-123")`
   - `CARTO_API_KEY`: `(CARTO basemaps API key from carto.com/basemaps/apikey - kept secure on server)`
4. Click **Deploy**. Your live site is now active!

---

### Step 3: Automated 30-Minute Updates

Your deployment is automatically kept fresh in two complementary ways:

1. **Automatic On-Demand Background Sync (Built-in)**:
   - When any visitor opens your website, if data has not been updated in the last 30 minutes, `/api/outages` serves cached data immediately and transparently synchronizes fresh advisories in the background.

2. **Scheduled 30-Minute Cloud Cron**:
   - `vercel.json` includes the 30-minute cron configuration for `/api/sync`.
   - **For 100% free external cron triggering** (e.g., via [cron-job.org](https://cron-job.org)):
     - Create a free job on `cron-job.org` pointing to `https://[your-app].vercel.app/api/sync?secret=YOUR_CRON_SECRET`
     - Set the schedule to **Every 30 minutes**.
     - It runs in <500ms and consumes 0 GitHub runner minutes.

---

## Local Development Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Initial Data
```bash
# Import live feed data into local SQLite (file:data/veco.db)
npm run import-live
```

### 3. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Local Scraper & Tooling

- To run a direct scrape locally:
  ```bash
  npm run scrape
  ```
- To run the background 30-minute scheduler locally:
  ```bash
  npm run scheduler
  ```
