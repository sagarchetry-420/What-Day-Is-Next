const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchTomorrowHolidays(date) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/holidays/tomorrow?date=${encodeURIComponent(date)}`);
  } catch {
    throw new Error(
      'Unable to reach the holiday service. Make sure the API server is running and try again.'
    );
  }

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
  return payload?.data || [];
}

export async function fetchAllHolidays(limit = 1000) {
  const endpoints = [
    `${API_BASE}/api/holidays/all?limit=${encodeURIComponent(limit)}`,
    `${API_BASE}/api/holidays/verify?limit=${encodeURIComponent(limit)}`,
    `${API_BASE}/api/holidays?limit=${encodeURIComponent(limit)}`
  ];

  let response = null;
  let lastStatus = 0;
  for (const url of endpoints) {
    response = await fetch(url);
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
  return payload?.data || [];
}
