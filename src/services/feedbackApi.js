const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function withTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    request: fetch(url, { ...options, signal: controller.signal }),
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

export async function fetchFeedbacks() {
  const endpoints = [
    `${API_BASE}/api/feedbacks`,
    `${API_BASE}/api/feedback`,
    `${API_BASE}/api/feedback/all`
  ];

  let response = null;
  let lastStatus = 0;

  for (const url of endpoints) {
    const { request, clear } = withTimeout(url);
    try {
      response = await request;
    } catch (err) {
      clear();
      if (err?.name === 'AbortError') {
        throw new Error('Feedback service request timed out. Please try again.');
      }
      throw new Error('Unable to reach feedback service. Make sure the API server is running and try again.');
    }
    clear();
    lastStatus = response.status;
    if (response.ok) {
      break;
    }
    if (response.status !== 404) {
      break;
    }
  }

  if (!response) {
    throw new Error('Unable to reach feedback service. Make sure the API server is running and try again.');
  }

  if (!response.ok) {
    const fallback = `Feedback request failed with status ${lastStatus || response.status}`;
    const message = await parseError(response, fallback);
    throw new Error(message);
  }

  const payload = await response.json();
  return payload?.data || [];
}

export async function submitFeedback({ name = '', email = '', message }) {
  const endpoints = [
    `${API_BASE}/api/feedbacks`,
    `${API_BASE}/api/feedback`
  ];
  let response = null;
  let lastStatus = 0;

  for (const url of endpoints) {
    const { request, clear } = withTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      },
      15000
    );

    try {
      response = await request;
    } catch (err) {
      clear();
      if (err?.name === 'AbortError') {
        throw new Error('Feedback submission timed out. Please try again.');
      }
      throw new Error('Unable to submit feedback. Make sure the API server is running and try again.');
    }

    clear();
    lastStatus = response.status;
    if (response.ok) {
      break;
    }
    if (response.status !== 404) {
      break;
    }
  }

  if (!response) {
    throw new Error('Unable to submit feedback. Make sure the API server is running and try again.');
  }

  if (!response.ok) {
    const fallback = `Feedback submit failed with status ${lastStatus || response.status}`;
    const errorMessage = await parseError(response, fallback);
    throw new Error(errorMessage);
  }

  const payload = await response.json();
  return payload?.data || null;
}
