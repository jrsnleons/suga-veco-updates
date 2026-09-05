# ⚡ VECO Brownout Tracker (Visayan Electric — Cebu)

A clean, minimalist, and searchable power interruption web application and automated Facebook scraper built for Cebu residents. Designed following Apple Human Interface Guidelines and the shadcn/ui zinc dark palette.

---

## Features

- **⚡ Is Your Power Affected?**: Central search bar with instant direct answer ("✓ All Clear" vs "● Notice").
- **⭐ My Saved Places**: Pin your home, work, or parents' barangays to monitor status at a glance.
- **📅 Week Calendar**: 7-day Apple-style horizontal strip with status indicator dots and daily schedules.
- **📜 Outage Archive**: High-density compact summary of historical data with perpetual retention.
- **📍 Estimated Affected Zone Map**: Visual radar sector map inside the detail modal with direct Google Maps integration.
- **🔗 Original Facebook Source Links**: Every schedule card links directly to the official VECO post.
- **🤖 Automated Facebook Scraper**: Passive `/api/graphql/` interception using Patchright (stealth Playwright). Runs every 30 minutes with zero OCR overhead.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + TypeScript
- **Styling**: Tailwind CSS v4 (shadcn/ui zinc-950 dark theme)
- **Database**: LibSQL (`@libsql/client`), dual-mode supporting both local SQLite (`data/veco.db`) and remote Turso Cloud SQLite
- **Scraper**: `patchright` (stealth Playwright) + GitHub Actions automated cron
- **Area-Specific Superseder**: Automatically overrides earlier weekly plans with specific daily/hourly post updates per barangay

---

## 🚀 100% Free Cloud Deployment Guide (Turso + Vercel + GitHub Actions)

This stack is **100% free forever** with zero credit card required:
- **Turso (LibSQL)**: Cloud SQLite database (9GB free, 1 billion row reads/month).
- **Vercel**: Global Next.js hosting and edge API routes.
- **GitHub Actions**: Automated 30-minute scraper running Playwright/Chromium (2,000 free runner minutes/month).

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
4. Click **Deploy**. Your live site will now query Turso Cloud SQLite instantly!

---

### Step 3: Configure 30-Minute Automated Scraper (GitHub Actions)

The repository includes a ready-to-run GitHub Actions workflow at [`.github/workflows/scrape.yml`](.github/workflows/scrape.yml).

1. In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
2. Click **New repository secret** and add:
   - `TURSO_DATABASE_URL`: `libsql://veco-db-[your-username].turso.io`
   - `TURSO_AUTH_TOKEN`: `(your token from Step 1)`
3. That's it! GitHub Actions will now automatically:
   - Run every 30 minutes.
   - Launch stealth headless Chromium.
   - Scrape the latest VECO Facebook advisories.
   - Run the area-specific superseding algorithm.
   - Persist new updates directly to your Turso Cloud database.
4. You can also manually trigger a scrape at any time by going to the **Actions** tab on GitHub and clicking **Run workflow**.

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

## Running the Scraper Locally

- To run a single scrape cycle:
  ```bash
  npm run scrape
  ```
- To run the background 30-minute scheduler locally:
  ```bash
  npm run scheduler
  ```

