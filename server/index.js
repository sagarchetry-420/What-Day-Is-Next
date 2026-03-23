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
const pendingWeatherFetches = new Map();
const pendingMonthlyReset = new Map();
const weatherRateLimitStore = new Map();
const CALENDARIFIC_TIMEOUT_MS = 15_000;
const MET_NO_TIMEOUT_MS = 12_000;
const MET_NO_BASE_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const MET_NO_USER_AGENT = process.env.MET_NO_USER_AGENT || 'WhatDayIsNext/1.0 (weather integration)';
const weatherRateLimitWindowMs = Number(process.env.WEATHER_RATE_LIMIT_WINDOW_MS || 60_000);
const weatherRateLimitMaxRequests = Number(process.env.WEATHER_RATE_LIMIT_MAX_REQUESTS || 30);
const COUNTRY_FETCH_CONCURRENCY = 8;
const MONTHLY_RESET_KEY = 'monthly-reset-tracker';
const TOMORROW_MONTH_SYNC_KEY = 'tomorrow-month-sync-tracker';
let weatherCacheTableAvailable = true;

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

function weatherRateLimiter(req, res, next) {
  const now = Date.now();
  const key = `${getClientIp(req)}:${req.path}`;
  const entry = weatherRateLimitStore.get(key);

  if (!entry || now - entry.windowStart >= weatherRateLimitWindowMs) {
    weatherRateLimitStore.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= weatherRateLimitMaxRequests) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + weatherRateLimitWindowMs - now) / 1000);
    res.set('Retry-After', String(Math.max(retryAfterSeconds, 1)));
    return res.status(429).json({
      message: 'Weather data is temporarily unavailable. Please try again later.'
    });
  }

  entry.count += 1;
  weatherRateLimitStore.set(key, entry);
  return next();
}

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidCoordinate(value, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max;
}

function normalizeCoordinate(value, digits = 4) {
  return Number(Number(value).toFixed(digits));
}

function weatherCacheKeyFor(date, lat, lon) {
  return `weather-${date}-${normalizeCoordinate(lat)}-${normalizeCoordinate(lon)}`;
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

async function getCachedWeather(cacheKey) {
  if (!weatherCacheTableAvailable) {
    return null;
  }

  const { data, error } = await supabase
    .from('weather_cache')
    .select('cache_key, weather_date, payload, last_fetched_at')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (error) {
    if (error.message?.includes("Could not find the table 'public.weather_cache'")) {
      weatherCacheTableAvailable = false;
      return null;
    }
    throw new Error(`Supabase read failed: ${error.message}`);
  }

  return data || null;
}

async function upsertWeatherCache(cacheKey, weatherDate, latitude, longitude, payload) {
  if (!weatherCacheTableAvailable) {
    return;
  }

  const { error } = await supabase.from('weather_cache').upsert(
    [{
      cache_key: cacheKey,
      weather_date: weatherDate,
      latitude: normalizeCoordinate(latitude),
      longitude: normalizeCoordinate(longitude),
      payload
    }],
    { onConflict: 'cache_key' }
  );

  if (error) {
    if (error.message?.includes("Could not find the table 'public.weather_cache'")) {
      weatherCacheTableAvailable = false;
      return;
    }
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

function toIsoDateOnly(value) {
  return String(value || '').split('T')[0];
}

function getHourFromIsoTime(time) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) {
    return -1;
  }
  return date.getHours();
}

function isDaytimeHour(hour) {
  return hour >= 6 && hour < 18;
}

function normalizeSymbolToFriendlyCondition(symbolCode, temperature, windSpeed, hour) {
  const symbol = String(symbolCode || '').toLowerCase();
  const temp = Number(temperature);
  const wind = Number(windSpeed);

  if (Number.isFinite(wind) && wind >= 10) {
    return 'Windy';
  }
  if (Number.isFinite(temp) && temp <= 2) {
    return 'Cold';
  }
  if (symbol.includes('rain') || symbol.includes('sleet') || symbol.includes('snow') || symbol.includes('shower')) {
    return 'Rainy';
  }
  if (symbol.includes('clear')) {
    return isDaytimeHour(hour) ? 'Sunny' : 'Clear';
  }
  if (symbol.includes('cloud')) {
    return 'Cloudy';
  }
  return Number.isFinite(temp) && temp <= 5 ? 'Cold' : 'Clear';
}

function summarizeTemperatureSegment(entries) {
  if (!entries.length) {
    return null;
  }

  const temps = entries.map((entry) => entry.temperature_c);
  const avg = temps.reduce((sum, value) => sum + value, 0) / temps.length;

  return {
    avg_temp_c: Number(avg.toFixed(1)),
    min_temp_c: Number(Math.min(...temps).toFixed(1)),
    max_temp_c: Number(Math.max(...temps).toFixed(1))
  };
}

function pickPrimaryCondition(entries) {
  if (!entries.length) {
    return 'Clear';
  }

  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry.condition, (counts.get(entry.condition) || 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function getTomorrowWeatherSummary(series) {
  const target = new Date();
  target.setDate(target.getDate() + 1);
  const targetDate = toIsoDateOnly(target.toISOString());

  const tomorrowEntries = (Array.isArray(series) ? series : [])
    .filter((entry) => toIsoDateOnly(entry?.time) === targetDate && entry?.data?.instant?.details)
    .map((entry) => ({
      time: entry.time,
      hour: getHourFromIsoTime(entry.time),
      temperature_c: entry.data.instant.details.air_temperature,
      wind_speed_mps: entry.data.instant.details.wind_speed,
      symbol:
        entry?.data?.next_1_hours?.summary?.symbol_code ||
        entry?.data?.next_6_hours?.summary?.symbol_code ||
        entry?.data?.next_12_hours?.summary?.symbol_code ||
        null
    }))
    .filter((entry) => Number.isFinite(entry.temperature_c) && entry.hour >= 0)
    .map((entry) => ({
      ...entry,
      condition: normalizeSymbolToFriendlyCondition(
        entry.symbol,
        entry.temperature_c,
        entry.wind_speed_mps,
        entry.hour
      )
    }));

  if (!tomorrowEntries.length) {
    throw new Error('No weather timeseries data available for tomorrow.');
  }

  const dayEntries = tomorrowEntries.filter((entry) => isDaytimeHour(entry.hour));
  const nightEntries = tomorrowEntries.filter((entry) => !isDaytimeHour(entry.hour));
  const noonCandidate = tomorrowEntries.find((entry) => entry.time.includes('T12:'));
  const selected = noonCandidate || tomorrowEntries[Math.floor(tomorrowEntries.length / 2)];
  const dateLabel = new Date(`${targetDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
  const daySummary = summarizeTemperatureSegment(dayEntries);
  const nightSummary = summarizeTemperatureSegment(nightEntries);

  return {
    date: targetDate,
    weekday: dateLabel,
    temperature_c: Number(selected.temperature_c.toFixed(1)),
    summary: selected.symbol ? selected.symbol.replace(/_/g, ' ') : 'forecast unavailable',
    condition: selected.condition,
    daytime: daySummary
      ? { ...daySummary, condition: pickPrimaryCondition(dayEntries) }
      : null,
    nighttime: nightSummary
      ? { ...nightSummary, condition: pickPrimaryCondition(nightEntries) }
      : null,
    time_breakdown: tomorrowEntries.map((entry) => ({
      time: entry.time,
      hour_label: `${String(entry.hour).padStart(2, '0')}:00`,
      temperature_c: Number(entry.temperature_c.toFixed(1)),
      condition: entry.condition
    })),
    observed_at: selected.time
  };
}

async function fetchTomorrowWeatherFromMetNo(latitude, longitude) {
  const response = await axios.get(MET_NO_BASE_URL, {
    params: {
      lat: normalizeCoordinate(latitude),
      lon: normalizeCoordinate(longitude)
    },
    headers: {
      'User-Agent': MET_NO_USER_AGENT
    },
    timeout: MET_NO_TIMEOUT_MS
  });

  const timeseries = response?.data?.properties?.timeseries || [];
  return getTomorrowWeatherSummary(timeseries);
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

app.get('/api/weather/tomorrow', weatherRateLimiter, async (req, res) => {
  const date = String(req.query.date || '');
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase is not configured on the server.' });
    }

    if (!isValidIsoDate(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lon, -180, 180)) {
      return res.status(400).json({ message: 'Invalid coordinates. Use lat/lon decimal values.' });
    }

    const cacheKey = weatherCacheKeyFor(date, lat, lon);
    const cached = await getCachedWeather(cacheKey);
    if (cached && String(cached.weather_date) === date) {
      return res.json({ data: cached.payload, cached: true });
    }

    if (!pendingWeatherFetches.has(cacheKey)) {
      pendingWeatherFetches.set(
        cacheKey,
        (async () => {
          const fresh = await fetchTomorrowWeatherFromMetNo(lat, lon);
          await upsertWeatherCache(cacheKey, date, lat, lon, fresh);
          return fresh;
        })()
      );
    }

    const weather = await pendingWeatherFetches.get(cacheKey);
    return res.json({ data: weather, cached: weatherCacheTableAvailable ? false : null });
  } catch (error) {
    const cacheKey = isValidIsoDate(date) && isValidCoordinate(lat, -90, 90) && isValidCoordinate(lon, -180, 180)
      ? weatherCacheKeyFor(date, lat, lon)
      : null;

    if (cacheKey) {
      try {
        const stale = await getCachedWeather(cacheKey);
        if (stale?.payload) {
          return res.json({ data: stale.payload, cached: true, stale: true });
        }
      } catch {
        // ignore fallback read failures
      }
    }

    return res.status(502).json({
      message: error?.message || 'Unexpected server error while fetching weather.'
    });
  } finally {
    if (isValidIsoDate(date) && isValidCoordinate(lat, -90, 90) && isValidCoordinate(lon, -180, 180)) {
      pendingWeatherFetches.delete(weatherCacheKeyFor(date, lat, lon));
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
  for (const [key, entry] of weatherRateLimitStore.entries()) {
    if (now - entry.windowStart >= weatherRateLimitWindowMs) {
      weatherRateLimitStore.delete(key);
    }
  }
}, Math.max(Math.max(rateLimitWindowMs, weatherRateLimitWindowMs), 30_000)).unref();

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
