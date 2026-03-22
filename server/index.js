const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { createMonthlyHolidayScheduler } = require('./holidaySync');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const calendarificKey = process.env.calendarific_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const rateLimitMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 60);

if (!calendarificKey) {
  console.warn('calendarific_API_KEY is missing. Holiday endpoint will return an error.');
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Supabase credentials are missing. Persistent daily caching will be unavailable.');
}

const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

app.use(cors());
app.use(express.json());

const rateLimitStore = new Map();
const pendingDailyFetches = new Map();
const CALENDARIFIC_TIMEOUT_MS = 15_000;
const COUNTRY_FETCH_CONCURRENCY = 8;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function apiRateLimiter(req, res, next) {
  const now = Date.now();
  const key = `${getClientIp(req)}:${req.path}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart >= rateLimitWindowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= rateLimitMaxRequests) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + rateLimitWindowMs - now) / 1000);
    res.set('Retry-After', String(Math.max(retryAfterSeconds, 1)));
    return res.status(429).json({
      message: `Rate limit exceeded. Try again in ${Math.max(retryAfterSeconds, 1)} seconds.`
    });
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return next();
}

app.use('/api', apiRateLimiter);

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function mapWithConcurrency(items, limit, worker) {
  const output = [];
  let index = 0;

  async function runner() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      output[currentIndex] = await worker(items[currentIndex]);
    }
  }

  const count = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: count }, () => runner()));
  return output;
}

async function getCountries() {
  const response = await axios.get('https://calendarific.com/api/v2/countries', {
    params: { api_key: calendarificKey },
    timeout: CALENDARIFIC_TIMEOUT_MS
  });

  const countries = response?.data?.response?.countries || [];
  return countries
    .filter((country) => (country?.['iso-2'] || country?.['iso-3166']) && country?.country_name)
    .map((country) => ({
      code: country['iso-2'] || country['iso-3166'],
      name: country.country_name
    }));
}

async function getHolidaysByCountry(countryCode, dateParts) {
  const response = await axios.get('https://calendarific.com/api/v2/holidays', {
    params: {
      api_key: calendarificKey,
      country: countryCode,
      year: dateParts.year,
      month: dateParts.month,
      day: dateParts.day
    },
    timeout: CALENDARIFIC_TIMEOUT_MS
  });

  return response?.data?.response?.holidays || [];
}

async function fetchWorldwideHolidaysForDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  const dateParts = { year, month, day };
  const countries = await getCountries();

  const countryResults = await mapWithConcurrency(countries, COUNTRY_FETCH_CONCURRENCY, async (country) => {
    try {
      const holidays = await getHolidaysByCountry(country.code, dateParts);
      return {
        ok: true,
        holidays: holidays.map((holiday, idx) => ({
          id: `${country.code}-${date}-${idx}-${holiday?.name || 'holiday'}`,
          name: holiday?.name || 'Unnamed Holiday',
          date: holiday?.date?.iso || date,
          country: country.name,
          description: holiday?.description || ''
        }))
      };
    } catch {
      return { ok: false, holidays: [] };
    }
  });

  const successfulRequests = countryResults.filter((result) => result.ok).length;
  if (successfulRequests === 0) {
    throw new Error('Could not retrieve holiday data from Calendarific.');
  }

  const unique = Array.from(
    new Map(
      countryResults
        .flatMap((result) => result.holidays)
        .map((item) => [`${item.name}-${item.country}-${item.date}`, item])
    ).values()
  );

  return unique;
}

async function getCachedDailyHolidays(cacheKey) {
  const { data, error } = await supabase
    .from('holiday_cache_meta')
    .select('cache_key, data, last_fetched')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }

  return data || null;
}

async function upsertDailyHolidays(cacheKey, date, data) {
  const { error } = await supabase.from('holiday_cache_meta').upsert(
    [{ cache_key: cacheKey, last_fetched: date, data }],
    { onConflict: 'cache_key' }
  );

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

app.get('/api/holidays/tomorrow', async (req, res) => {
  try {
    if (!calendarificKey) {
      return res.status(500).json({ message: 'Calendarific API key is not configured.' });
    }

    if (!supabase) {
      return res.status(500).json({ message: 'Supabase is not configured on the server.' });
    }

    const date = String(req.query.date || '');
    if (!isValidIsoDate(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const cacheKey = `worldwide-${date}`;
    const cached = await getCachedDailyHolidays(cacheKey);
    if (cached) {
      return res.json({ data: cached.data });
    }

    if (!pendingDailyFetches.has(cacheKey)) {
      pendingDailyFetches.set(
        cacheKey,
        (async () => {
          const holidays = await fetchWorldwideHolidaysForDate(date);
          await upsertDailyHolidays(cacheKey, date, holidays);
          return holidays;
        })()
      );
    }

    const holidays = await pendingDailyFetches.get(cacheKey);
    return res.json({ data: holidays });
  } catch (error) {
    const message =
      error?.response?.data?.meta?.error_detail ||
      error?.message ||
      'Unexpected server error while fetching holidays.';

    return res.status(502).json({ message });
  } finally {
    const date = String(req.query.date || '');
    if (isValidIsoDate(date)) {
      pendingDailyFetches.delete(`worldwide-${date}`);
    }
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart >= rateLimitWindowMs) {
      rateLimitStore.delete(key);
    }
  }
}, Math.max(rateLimitWindowMs, 30_000)).unref();

app.listen(port, () => {
  console.log(`Holiday API server is running on port ${port}.`);
});

if (supabase && calendarificKey) {
  const runSyncOnStart = process.env.HOLIDAY_SYNC_RUN_ON_START === 'true';
  createMonthlyHolidayScheduler({
    supabase,
    apiKey: calendarificKey,
    logger: console,
    runOnStart: runSyncOnStart
  });
}
