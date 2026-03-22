# Tomorrow Holidays App

Production-ready React + Vite app with a secure Express backend for Calendarific holiday data.

## Features
- Modern React functional components + hooks
- Responsive, clean UI with subtle animations
- Locale-accurate tomorrow day/date using `Intl`
- Worldwide holiday fetch for tomorrow via Calendarific API
- Secure server-side API key usage (never exposed to browser)
- Persistent daily cache in Supabase (fetch once/day, then serve DB data to all users)
- Monthly scheduler (28th, UTC) to prefetch next-month worldwide holidays into Supabase
- SEO meta tags and semantic HTML
- Loading/error/empty states and API fallback handling
- Code splitting with `React.lazy`

## Project Structure
- `src/` React frontend
- `server/` Express API
- `vite.config.js` Vite config with `/api` proxy in dev
- `.env` local secrets (not committed)
- `.env.example` required env template

## Setup
1. Install dependencies:
   `npm install`
2. Configure env:
   - Copy `.env.example` to `.env`
   - Add your real `calendarific_API_KEY`
   - Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
3. Run backend + frontend together:
   `npm run dev:all`
4. Open:
   `http://localhost:5173`

## Production
- Build frontend assets:
  `npm run build`
- Run API server:
  `npm start`

## Daily Cache Behavior
- The API endpoint stores holidays by date in Supabase table `holiday_cache_meta`.
- First request for a date fetches from Calendarific and writes DB row.
- Any refresh or any other user request for the same date reads from DB only.
- Next date causes a new one-time fetch and DB update for that date.

## Monthly Background Sync
- A cron job runs on the 28th of every month at 03:00 UTC: `0 3 28 * *`.
- It fetches next month holidays country-by-country from Calendarific.
- It waits ~1.5 seconds between country requests to reduce 429/rate-limit issues.
- It maps:
  - national holidays as `region = "All"`
  - state/location holidays as separate rows per state/location code
- Data is upserted into `holidays` using unique key:
  - `(name, holiday_date, country_code, region)`
- Optional startup sync:
  - set `HOLIDAY_SYNC_RUN_ON_START=true`

## Supabase Schema
Run `supabase/migration.sql` in your Supabase SQL editor. It creates:
- `holidays` table (optional historical/raw storage)
- `holiday_cache_meta` table used by the API for per-date cached JSON payload

For deployment (Vercel/Netlify), host frontend static assets and deploy API as a Node service/serverless function with `calendarific_API_KEY` set in platform environment variables.
