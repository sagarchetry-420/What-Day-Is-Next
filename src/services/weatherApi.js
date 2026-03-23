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

async function parseError(response, fallback) {
  try {
    const data = await response.json();
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchTomorrowWeather(date, latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Weather location coordinates are invalid.');
  }

  const key = `weather:${date}:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = getCached(key);
  if (cached) {
    return cached;
  }
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const url =
    `${API_BASE}/api/weather/tomorrow?date=${encodeURIComponent(date)}` +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

  const requestPromise = (async () => {
    const { request, clear } = withTimeout(url);
    let response;
    try {
      response = await request;
    } catch (err) {
      clear();
      if (err?.name === 'AbortError') {
        throw new Error('Weather service request timed out. Please try again.');
      }
      throw new Error('Unable to reach the weather service. Make sure the API server is running and try again.');
    }
    clear();

    if (!response.ok) {
      const fallback = response.status === 404
        ? 'Weather endpoint not found. Restart the backend server to load the new weather route.'
        : `Weather request failed with status ${response.status}`;
      const message = await parseError(response, fallback);
      throw new Error(message);
    }

    const payload = await response.json();
    const data = payload?.data || null;
    setCached(key, data);
    return data;
  })();

  inFlightRequests.set(key, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(key);
  }
}
