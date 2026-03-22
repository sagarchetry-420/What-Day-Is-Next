const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const responseCache = new Map();
const inFlightRequests = new Map();
const MAX_CACHE_AGE_MS = 5 * 60 * 1000;

function getCached(key) {
  const cached = responseCache.get(key);
  if (!cached) {
    return null;
  }
  if (Date.now() - cached.timestamp > MAX_CACHE_AGE_MS) {
    responseCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCached(key, data) {
  responseCache.set(key, { timestamp: Date.now(), data });
}

function withTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    request: fetch(url, { signal: controller.signal }),
    clear: () => clearTimeout(timeoutId)
  };
}

async function fetchJsonWithRetry(url, fallbackNetworkError, retries = 1) {
  let attempt = 0;
  while (attempt <= retries) {
    attempt += 1;
    const { request, clear } = withTimeout(url);
    try {
      const response = await request;
      clear();
      return response;
    } catch (err) {
      clear();
      if (attempt > retries) {
        if (err?.name === 'AbortError') {
          throw new Error('Holiday service request timed out. Please try again.');
        }
        throw new Error(fallbackNetworkError);
      }
    }
  }
  throw new Error(fallbackNetworkError);
}

export async function fetchTomorrowHolidays(date) {
  const url = `${API_BASE}/api/holidays/tomorrow?date=${encodeURIComponent(date)}`;
  const cacheKey = `tomorrow:${date}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    const response = await fetchJsonWithRetry(
      url,
      'Unable to reach the holiday service. Make sure the API server is running and try again.'
    );

    if (!response.ok) {
      const fallback =
        response.status === 502
          ? 'Holiday service is unavailable (502). Check your Calendarific key and that the API server is running.'
          : `Holiday request failed with status ${response.status}`;
      let message = fallback;

      try {
        const data = await response.json();
        message = data?.message || fallback;
      } catch {
        message = fallback;
      }

      throw new Error(message);
    }

    const payload = await response.json();
    const data = payload?.data || [];
    setCached(cacheKey, data);
    return data;
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

async function parseError(response, fallback) {
  try {
    const data = await response.json();
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchAllHolidays(limit = 1000) {
  const cacheKey = `all:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const endpoints = [
    `${API_BASE}/api/holidays/all?limit=${encodeURIComponent(limit)}`,
    `${API_BASE}/api/holidays/verify?limit=${encodeURIComponent(limit)}`,
    `${API_BASE}/api/holidays?limit=${encodeURIComponent(limit)}`
  ];

  const requestPromise = (async () => {
    let response = null;
    let lastStatus = 0;
    for (const url of endpoints) {
      response = await fetchJsonWithRetry(
        url,
        'Unable to reach the holiday service. Make sure the API server is running and try again.'
      );
      lastStatus = response.status;
      if (response.ok) {
        break;
      }
      if (response.status !== 404) {
        break;
      }
    }

    if (!response.ok) {
      const fallback = `All holidays request failed with status ${lastStatus || response.status}`;
      let message = fallback;
      try {
        const data = await response.json();
        message = data?.message || fallback;
      } catch {
        message = fallback;
      }
      throw new Error(message);
    }

    const payload = await response.json();
    const data = payload?.data || [];
    setCached(cacheKey, data);
    return data;
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

export async function fetchHolidaysByDate(date) {
  const cacheKey = `date:${date}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    const response = await fetchJsonWithRetry(
      `${API_BASE}/api/holidays?date=${encodeURIComponent(date)}&limit=10000`,
      'Unable to reach the holiday service. Make sure the API server is running and try again.'
    );

    if (!response.ok) {
      const fallback = `Holiday request failed with status ${response.status}`;
      const message = await parseError(response, fallback);
      throw new Error(message);
    }

    const payload = await response.json();
    const data = payload?.data || [];
    setCached(cacheKey, data);
    return data;
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}
