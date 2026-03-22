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
