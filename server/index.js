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
const corsOrigin = process.env.CORS_ORIGIN || '*';

if (!calendarificKey) {
  console.warn('calendarific_API_KEY is missing. Holiday endpoint will return an error.');
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Supabase credentials are missing. Persistent daily caching will be unavailable.');
}

const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((value) => value.trim()),
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.disable('x-powered-by');

const rateLimitStore = new Map();
const pendingDailyFetches = new Map();
const pendingMonthlyReset = new Map();
const CALENDARIFIC_TIMEOUT_MS = 15_000;
const COUNTRY_FETCH_CONCURRENCY = 8;
const MONTHLY_RESET_KEY = 'monthly-reset-tracker';
const TOMORROW_MONTH_SYNC_KEY = 'tomorrow-month-sync-tracker';

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

function normalizeRegionCode(value) {
  if (!value) {
    return '';
  }
  const raw = String(value).trim();
  if (!raw) {
    return '';
  }
  if (raw.includes('-')) {
    return raw.split('-').pop().toUpperCase();
  }
  return raw.toUpperCase();
}

function extractHolidayRegions(holiday) {
  const states = Array.isArray(holiday?.states) ? holiday.states : [];
  const locations = Array.isArray(holiday?.locations) ? holiday.locations : [];

  const fromStates = states
    .map((item) => item?.abbrev || item?.name || null)
    .filter(Boolean);
  const fromLocations = locations
    .map((item) => item?.iso || item?.name || null)
    .filter(Boolean);

  const normalized = [...fromStates, ...fromLocations]
    .map((region) => normalizeRegionCode(region))
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function mapMonthlyHolidayRows(country, holiday, year, month) {
  const fallbackDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const holidayDate = String(holiday?.date?.iso || fallbackDate).split('T')[0];
  const regions = extractHolidayRegions(holiday);

  const base = {
    name: holiday?.name || 'Unnamed Holiday',
    description: holiday?.description || '',
    holiday_date: holidayDate,
    country_code: country.code,
    country_name: country.name,
    holiday_type: Array.isArray(holiday?.type) ? holiday.type : [holiday?.type || 'Unknown'],
    source: 'calendarific',
    source_payload: holiday || {}
  };

  if (!regions.length) {
    return [{ ...base, region: 'All' }];
  }

  return regions.map((regionCode) => ({ ...base, region: regionCode }));
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

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getTomorrowMonthKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function getLastResetMonth() {
  const { data, error } = await supabase
    .from('holiday_cache_meta')
    .select('cache_key, data')
    .eq('cache_key', MONTHLY_RESET_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }

  return data?.data?.lastResetMonth || null;
}

async function setLastResetMonth(monthKey) {
  const { error } = await supabase.from('holiday_cache_meta').upsert(
    [{ cache_key: MONTHLY_RESET_KEY, last_fetched: new Date().toISOString().split('T')[0], data: { lastResetMonth: monthKey } }],
    { onConflict: 'cache_key' }
  );

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

async function getLastTomorrowMonthSync() {
  const { data, error } = await supabase
    .from('holiday_cache_meta')
    .select('cache_key, data')
    .eq('cache_key', TOMORROW_MONTH_SYNC_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }

  return data?.data?.lastTomorrowMonth || null;
}

async function setLastTomorrowMonthSync(monthKey) {
  const { error } = await supabase.from('holiday_cache_meta').upsert(
    [{ cache_key: TOMORROW_MONTH_SYNC_KEY, last_fetched: new Date().toISOString().split('T')[0], data: { lastTomorrowMonth: monthKey } }],
    { onConflict: 'cache_key' }
  );

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

async function clearHolidayData() {
  const { error: holidaysError } = await supabase
    .from('holidays')
    .delete()
    .neq('id', 0);

  if (holidaysError) {
    throw new Error(`Failed to clear holidays: ${holidaysError.message}`);
  }

  // Clear cache except for the monthly reset tracker key
  const { error: cacheError } = await supabase
    .from('holiday_cache_meta')
    .delete()
    .neq('cache_key', MONTHLY_RESET_KEY);

  if (cacheError) {
    throw new Error(`Failed to clear cache: ${cacheError.message}`);
  }
}

async function fetchAndStoreMonthlyHolidays(targetYear = null, targetMonth = null) {
  const now = new Date();
  const year = targetYear !== null ? targetYear : now.getFullYear();
  const month = targetMonth !== null ? targetMonth : now.getMonth() + 1;

  const countries = await getCountries();
  const allRows = [];

  const countryResults = await mapWithConcurrency(countries, COUNTRY_FETCH_CONCURRENCY, async (country) => {
    try {
      const response = await axios.get('https://calendarific.com/api/v2/holidays', {
        params: {
          api_key: calendarificKey,
          country: country.code,
          year,
          month
        },
        timeout: CALENDARIFIC_TIMEOUT_MS
      });

      const holidays = response?.data?.response?.holidays || [];
      return {
        ok: true,
        rows: holidays.flatMap((holiday) => mapMonthlyHolidayRows(country, holiday, year, month))
      };
    } catch {
      return { ok: false, rows: [] };
    }
  });

  const successfulRequests = countryResults.filter((result) => result.ok).length;
  if (successfulRequests === 0) {
    throw new Error('Could not retrieve holiday data from Calendarific.');
  }

  for (const result of countryResults) {
    allRows.push(...result.rows);
  }

  if (allRows.length > 0) {
    // Deduplicate rows to avoid "ON CONFLICT DO UPDATE cannot affect row a second time" error
    const seen = new Map();
    for (const row of allRows) {
      const key = `${row.name}|${row.holiday_date}|${row.country_code}|${row.region}`;
      seen.set(key, row);
    }
    const uniqueRows = Array.from(seen.values());

    const batchSize = 500;
    for (let i = 0; i < uniqueRows.length; i += batchSize) {
      const batch = uniqueRows.slice(i, i + batchSize);
      const { error } = await supabase.from('holidays').upsert(batch, {
        onConflict: 'name,holiday_date,country_code,region'
      });
      if (error) {
        throw new Error(`Supabase upsert failed: ${error.message}`);
      }
    }
  }

  return allRows.length;
}

async function ensureMonthlyReset() {
  const currentMonth = getCurrentMonthKey();
  const tomorrowMonth = getTomorrowMonthKey();
  const lastResetMonth = await getLastResetMonth();
  const results = { needed: false, currentMonth: null, tomorrowMonth: null };

  // Check and sync current month if needed
  if (lastResetMonth !== currentMonth) {
    if (!pendingMonthlyReset.has(currentMonth)) {
      const [year, month] = currentMonth.split('-').map(Number);
      pendingMonthlyReset.set(
        currentMonth,
        (async () => {
          console.log(`[monthly-reset] Starting reset for ${currentMonth}...`);
          await clearHolidayData();
          const rowCount = await fetchAndStoreMonthlyHolidays(year, month);
          await setLastResetMonth(currentMonth);
          console.log(`[monthly-reset] Completed. Stored ${rowCount} holiday records.`);
          return rowCount;
        })()
      );
    }

    const rowCount = await pendingMonthlyReset.get(currentMonth);
    pendingMonthlyReset.delete(currentMonth);
    results.needed = true;
    results.currentMonth = rowCount;
  }

  // If tomorrow is in a different month, check if it has been synced
  if (tomorrowMonth !== currentMonth) {
    const lastTomorrowSync = await getLastTomorrowMonthSync();

    if (lastTomorrowSync !== tomorrowMonth) {
      const tomorrowCacheKey = `tomorrow-month-${tomorrowMonth}`;
      if (!pendingMonthlyReset.has(tomorrowCacheKey)) {
        const [year, month] = tomorrowMonth.split('-').map(Number);
        pendingMonthlyReset.set(
          tomorrowCacheKey,
          (async () => {
            console.log(`[monthly-reset] Syncing tomorrow's month ${tomorrowMonth}...`);
            const rowCount = await fetchAndStoreMonthlyHolidays(year, month);
            await setLastTomorrowMonthSync(tomorrowMonth);
            console.log(`[monthly-reset] Tomorrow's month completed. Stored ${rowCount} holiday records.`);
            return rowCount;
          })()
        );
      }

      const rowCount = await pendingMonthlyReset.get(tomorrowCacheKey);
      pendingMonthlyReset.delete(tomorrowCacheKey);
      results.needed = true;
      results.tomorrowMonth = rowCount;
    }
  }

  return results;
}

app.get('/api/holidays/tomorrow', async (req, res) => {
  try {
    if (!calendarificKey) {
      return res.status(500).json({ message: 'Calendarific API key is not configured.' });
    }

    if (!supabase) {
      return res.status(500).json({ message: 'Supabase is not configured on the server.' });
    }

    await ensureMonthlyReset();

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

async function getAllHolidaysHandler(req, res) {
  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase is not configured on the server.' });
    }

    await ensureMonthlyReset();

    const date = String(req.query.date || '');
    if (date && !isValidIsoDate(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const rawLimit = Number(req.query.limit || 1000);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 10000) : 1000;

    let query = supabase
      .from('holidays')
      .select('holiday_date,country_code,region,name,holiday_type')
      .order('holiday_date', { ascending: false })
      .order('country_code', { ascending: true })
      .order('name', { ascending: true });

    if (date) {
      query = query.eq('holiday_date', date).limit(10000);
    } else {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase read failed: ${error.message}`);
    }

    return res.json({ data: data || [] });
  } catch (error) {
    return res.status(502).json({
      message: error?.message || 'Unexpected server error while fetching all holidays.'
    });
  }
}

app.get('/api/holidays/all', getAllHolidaysHandler);
app.get('/api/holidays/verify', getAllHolidaysHandler);
app.get('/api/holidays', getAllHolidaysHandler);

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
