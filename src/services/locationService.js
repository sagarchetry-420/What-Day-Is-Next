import { Country, State } from 'country-state-city';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const LOCATION_STORAGE_KEY = 'user-location-preference';
const LOCATION_CACHE_KEY = 'location-cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const COUNTRY_BY_CODE = new Map();
const STATES_BY_COUNTRY = new Map();

function getCountryStateLoaders() {
  if (COUNTRY_BY_CODE.size && STATES_BY_COUNTRY.size) {
    return;
  }

  try {
    const countries = Country.getAllCountries();
    countries.forEach((country) => {
      COUNTRY_BY_CODE.set(country.isoCode, country);
      STATES_BY_COUNTRY.set(country.isoCode, State.getStatesOfCountry(country.isoCode));
    });
  } catch {
    // Keep empty maps; we'll fallback to defaults
  }
}

function isValidNumber(value) {
  return Number.isFinite(Number(value));
}

function resolveCoordinates(countryCode = '', regionCode = '') {
  getCountryStateLoaders();
  const code = String(countryCode || '').toUpperCase();
  const region = String(regionCode || '').toUpperCase();

  const states = STATES_BY_COUNTRY.get(code) || [];
  const matchedState = states.find((state) => state.isoCode.toUpperCase() === region);
  if (matchedState && isValidNumber(matchedState.latitude) && isValidNumber(matchedState.longitude)) {
    return {
      latitude: Number(matchedState.latitude),
      longitude: Number(matchedState.longitude)
    };
  }

  const country = COUNTRY_BY_CODE.get(code);
  if (country && isValidNumber(country.latitude) && isValidNumber(country.longitude)) {
    return {
      latitude: Number(country.latitude),
      longitude: Number(country.longitude)
    };
  }

  return null;
}

/**
 * Get user's current position using browser Geolocation API
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        let message = 'Unable to retrieve location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied by user.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get location details using OpenStreetMap Nominatim
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{countryCode: string, countryName: string, region: string, regionCode: string}>}
 */
export async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
    addressdetails: '1',
    'accept-language': 'en'
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent': 'TomorrowHolidayApp/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status ${response.status}`);
  }

  const data = await response.json();
  const address = data.address || {};

  // Extract country code (ISO 3166-1 alpha-2)
  const countryCode = (address.country_code || '').toUpperCase();
  const countryName = address.country || '';

  // Extract state/region - Nominatim uses different fields depending on country
  // Priority: state > province > region > county
  const region = address.state || address.province || address.region || address.county || '';

  // Get ISO 3166-2 subdivision code if available
  // Nominatim may return this in the ISO3166-2-lvl4 or similar field
  let regionCode = '';
  for (const key of Object.keys(address)) {
    if (key.startsWith('ISO3166-2')) {
      const code = address[key];
      // Extract the subdivision part (e.g., "US-CA" -> "CA")
      if (code && code.includes('-')) {
        regionCode = code.split('-')[1];
      } else {
        regionCode = code || '';
      }
      break;
    }
  }

  // If no ISO code found, try to derive from state name for US states
  if (!regionCode && countryCode === 'US' && region) {
    regionCode = getUSStateCode(region);
  }

  return {
    countryCode,
    countryName,
    region,
    regionCode,
    latitude,
    longitude
  };
}

/**
 * Map US state names to state codes
 */
const US_STATE_CODES = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
};

function getUSStateCode(stateName) {
  const normalized = stateName.toLowerCase().trim();
  return US_STATE_CODES[normalized] || '';
}

/**
 * Get cached location from localStorage
 * @returns {{countryCode: string, countryName: string, region: string, regionCode: string, timestamp: number} | null}
 */
export function getCachedLocation() {
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (data.timestamp && now - data.timestamp < CACHE_DURATION_MS) {
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

function hasCoordinates(location) {
  return isValidNumber(location?.latitude) && isValidNumber(location?.longitude);
}

/**
 * Save location to cache
 * @param {{countryCode: string, countryName: string, region: string, regionCode: string}} location
 */
export function cacheLocation(location) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
      ...location,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get user's stored location preference (fallback)
 * @returns {{countryCode: string, regionCode: string} | null}
 */
export function getStoredPreference() {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save user's location preference
 * @param {{countryCode: string, regionCode: string}} preference
 */
export function saveLocationPreference(preference) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Detect user's location automatically
 * Returns cached location if available, otherwise gets fresh location
 * @returns {Promise<{countryCode: string, countryName: string, region: string, regionCode: string, source: 'geolocation' | 'cache' | 'preference' | 'default'}>}
 */
export async function detectLocation() {
  // 1. Check cache first
  const cached = getCachedLocation();
  if (cached) {
    if (hasCoordinates(cached)) {
      return { ...cached, source: 'cache' };
    }

    const resolved = resolveCoordinates(cached.countryCode, cached.regionCode);
    if (resolved) {
      const upgraded = { ...cached, ...resolved };
      cacheLocation(upgraded);
      saveLocationPreference({
        countryCode: upgraded.countryCode,
        regionCode: upgraded.regionCode,
        latitude: upgraded.latitude,
        longitude: upgraded.longitude
      });
      return { ...upgraded, source: 'cache' };
    }
  }

  // 2. Try browser geolocation
  try {
    const coords = await getCurrentPosition();
    const location = await reverseGeocode(coords.latitude, coords.longitude);
    cacheLocation(location);
    saveLocationPreference({
      countryCode: location.countryCode,
      regionCode: location.regionCode,
      latitude: location.latitude,
      longitude: location.longitude
    });
    return { ...location, source: 'geolocation' };
  } catch {
    // Geolocation failed, try fallbacks
  }

  // 3. Try stored preference
  const preference = getStoredPreference();
  if (preference?.countryCode) {
    const resolved = resolveCoordinates(preference.countryCode, preference.regionCode);
    const latitude = isValidNumber(preference.latitude)
      ? Number(preference.latitude)
      : (resolved?.latitude ?? null);
    const longitude = isValidNumber(preference.longitude)
      ? Number(preference.longitude)
      : (resolved?.longitude ?? null);

    if (latitude !== null && longitude !== null) {
      saveLocationPreference({
        ...preference,
        latitude,
        longitude
      });
    }

    return {
      countryCode: preference.countryCode,
      countryName: '',
      region: '',
      regionCode: preference.regionCode || '',
      latitude,
      longitude,
      source: 'preference'
    };
  }

  // 4. Default fallback (US, no specific region)
  return {
    countryCode: 'US',
    countryName: 'United States',
    region: '',
    regionCode: '',
    latitude: 37.0902,
    longitude: -95.7129,
    source: 'default'
  };
}

/**
 * Clear cached location data
 */
export function clearLocationCache() {
  try {
    localStorage.removeItem(LOCATION_CACHE_KEY);
  } catch {
    // Ignore errors
  }
}
