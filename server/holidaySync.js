const axios = require('axios');
const cron = require('node-cron');

const CALENDARIFIC_BASE_URL = 'https://calendarific.com/api/v2';
const REQUEST_TIMEOUT_MS = 15_000;
const COUNTRY_SLEEP_MS = 1_500;
const DB_BATCH_SIZE = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextMonthYearMonth(baseDate = new Date()) {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth() + 1;
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

function normalizeHolidayType(type) {
  if (Array.isArray(type)) {
    return type.filter(Boolean);
  }
  if (typeof type === 'string' && type.trim()) {
    return [type.trim()];
  }
  return ['Unknown'];
}

function parseStateCodes(holiday) {
  const states = Array.isArray(holiday?.states) ? holiday.states : [];
  const locations = Array.isArray(holiday?.locations) ? holiday.locations : [];

  const fromStates = states
    .map((item) => item?.abbrev || item?.name || null)
    .filter(Boolean);
  const fromLocations = locations
    .map((item) => item?.iso || item?.name || null)
    .filter(Boolean);

  const all = [...fromStates, ...fromLocations];
  return Array.from(new Set(all));
}

function mapHolidayRows(country, holiday) {
  const holidayDate = toIsoDate(holiday?.date?.iso || holiday?.date?.datetime);
  if (!holidayDate) {
    return [];
  }

  const stateCodes = parseStateCodes(holiday);
  const holidayType = normalizeHolidayType(holiday?.type);
  const base = {
    holiday_date: holidayDate,
    country_code: country.code,
    country_name: country.name,
    name: holiday?.name || 'Unnamed Holiday',
    description: holiday?.description || '',
    holiday_type: holidayType,
    source: 'calendarific',
    source_payload: holiday
  };

  if (!stateCodes.length) {
    return [{ ...base, region: 'All' }];
  }

  return stateCodes.map((stateCode) => ({ ...base, region: String(stateCode) }));
}

async function fetchCountries(apiKey) {
  const response = await axios.get(`${CALENDARIFIC_BASE_URL}/countries`, {
    params: { api_key: apiKey },
    timeout: REQUEST_TIMEOUT_MS
  });

  const countries = response?.data?.response?.countries || [];
  return countries
    .filter((country) => (country?.['iso-2'] || country?.['iso-3166']) && country?.country_name)
    .map((country) => ({
      code: country['iso-2'] || country['iso-3166'],
      name: country.country_name
    }));
}

async function fetchCountryMonthHolidays(apiKey, countryCode, year, month) {
  const response = await axios.get(`${CALENDARIFIC_BASE_URL}/holidays`, {
    params: {
      api_key: apiKey,
      country: countryCode,
      year,
      month
    },
    timeout: REQUEST_TIMEOUT_MS
  });

  return response?.data?.response?.holidays || [];
}

async function upsertRows(supabase, rows) {
  if (!rows.length) {
    return;
  }

  for (let i = 0; i < rows.length; i += DB_BATCH_SIZE) {
    const batch = rows.slice(i, i + DB_BATCH_SIZE);
    const { error } = await supabase.from('holidays').upsert(batch, {
      onConflict: 'name,holiday_date,country_code,region'
    });
    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  }
}

async function syncMonthHolidays({ supabase, apiKey, year, month, logger = console }) {
  const countries = await fetchCountries(apiKey);
  let totalCountries = 0;
  let totalRows = 0;
  let failedCountries = 0;

  for (const country of countries) {
    totalCountries += 1;
    try {
      const holidays = await fetchCountryMonthHolidays(apiKey, country.code, year, month);
      const rows = holidays.flatMap((holiday) => mapHolidayRows(country, holiday));
      await upsertRows(supabase, rows);
      totalRows += rows.length;
      logger.info?.(
        `[holiday-sync] ${country.code}: holidays=${holidays.length}, rows=${rows.length}`
      );
    } catch (error) {
      failedCountries += 1;
      logger.error?.(
        `[holiday-sync] ${country.code} failed: ${error?.response?.status || ''} ${error.message}`
      );
    }

    await sleep(COUNTRY_SLEEP_MS);
  }

  if (totalCountries === failedCountries) {
    throw new Error('Holiday sync failed for all countries.');
  }

  logger.info?.(
    `[holiday-sync] completed year=${year} month=${month} countries=${totalCountries} rows=${totalRows} failed=${failedCountries}`
  );

  return { totalCountries, totalRows, failedCountries };
}

function createMonthlyHolidayScheduler({ supabase, apiKey, logger = console, runOnStart = false }) {
  if (!supabase) {
    throw new Error('Supabase client is required for scheduler.');
  }
  if (!apiKey) {
    throw new Error('Calendarific API key is required for scheduler.');
  }

  const runNextMonthSync = async () => {
    const { year, month } = getNextMonthYearMonth(new Date());
    return syncMonthHolidays({ supabase, apiKey, year, month, logger });
  };

  const task = cron.schedule(
    '0 3 28 * *',
    async () => {
      try {
        await runNextMonthSync();
      } catch (error) {
        logger.error?.(`[holiday-sync] scheduled run failed: ${error.message}`);
      }
    },
    { scheduled: true, timezone: 'UTC' }
  );

  if (runOnStart) {
    runNextMonthSync().catch((error) => {
      logger.error?.(`[holiday-sync] startup run failed: ${error.message}`);
    });
  }

  return {
    task,
    runNextMonthSync
  };
}

module.exports = {
  createMonthlyHolidayScheduler,
  syncMonthHolidays,
  getNextMonthYearMonth
};
