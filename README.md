
## Project Overview
`What Day Is Next` shows tomorrow’s weekday/date and relevant holidays for the user’s detected or manually selected location. It uses a React + Vite frontend and an Express backend that integrates with Calendarific and caches data in Supabase for reliability and API efficiency.

## Setup Instructions
1. Install dependencies:
`cd client && npm install`
`cd ../server && npm install`

2. Configure environment variables:
- Set `calendarific_API_KEY`
- Set `SUPABASE_URL`
- Set `SUPABASE_SERVICE_ROLE_KEY`
- Set optional `MET_NO_USER_AGENT` (recommended with contact/app info)

3. Start both backend and frontend in development:
Backend:
`cd server && npm run dev`

Frontend:
`cd client && npm run dev`

4. Open:
`http://localhost:5173`

Production commands:
- Build frontend: `cd client && npm run build`
- Start server: `cd server && npm start`
- Run tests: `cd client && npm test`

## API Usage
The backend exposes:
- `GET /api/health`
- `GET /api/holidays?date=YYYY-MM-DD&limit=...`
- `GET /api/holidays/all`
- `GET /api/holidays/verify`
- `GET /api/holidays/tomorrow?date=YYYY-MM-DD`
- `GET /api/weather/tomorrow?date=YYYY-MM-DD&lat=..&lon=..`

Request limits and optimization:
- Calendarific monthly quota target: 500 requests (example usage noted at 300)
- Server-side caching in Supabase prevents repeated upstream fetches for the same date
- In-memory request deduplication avoids duplicate concurrent fetches
- Frontend request caching/reuse reduces redundant API calls during session usage
- Timeout + retry handling improves resilience under transient network issues
- Rate limiting is applied on `/api/*` and returns `429` with `Retry-After`

## Location Handling
- Automatic detection: browser geolocation + reverse geocoding
- Cached location reuse to reduce repeated lookups
- Manual location search supports country and region/state selection
- Country/region normalization is applied before holiday filtering

## Testing Approach
Black Box Testing:
- Verified user-facing flow for auto detection, manual location selection, holiday rendering, loading/error/empty states, and responsive UI behavior

White Box Testing:
- Validated API integration and filtering logic for date/country/region combinations
- Added unit tests for:
  - `src/utils/date.test.js` (tomorrow/date conversion)
  - `src/utils/holidayFilter.test.js` (country/region fallback and dedupe behavior)

System Testing:
- Validated end-to-end flow:
  Location detection -> API request -> Supabase-backed data retrieval -> UI-ready filtering
- Verified API behavior for health, valid requests, and invalid date handling

## Build and Deployment
- Build the frontend with `cd client && npm run build`.
- Deploy static frontend (e.g., Vercel/Netlify) and run backend as Node service.
- Ensure HTTPS is enabled at hosting/platform level.
- Configure `CORS_ORIGIN` to only trusted frontend domains.
- Provide required env vars from `.env.example` in host secrets.
- Configure platform-level gzip/brotli and cache headers for static assets.

## Project Structure
- `client/src/` frontend React app
- `client/public/` static frontend assets
- `client/vite.config.js` frontend dev proxy and build config
- `server/` backend API and scheduled sync
- `supabase/` schema/migration SQL
- `supabase/weather_cache.sql` weather cache table for location/date-based forecast reuse

## Known Limitations
- Holiday coverage is dependent on Calendarific data availability per country/date
- API rate limits still apply under extreme traffic, though caching reduces pressure
- Some highly localized holidays may depend on source region metadata quality
- Build currently reports a large bundle-size warning from Vite
- Cross-browser validation should still be completed in staging before release
