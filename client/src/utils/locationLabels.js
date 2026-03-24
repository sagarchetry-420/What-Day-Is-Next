import { Country, State } from 'country-state-city';

const COUNTRIES = Country.getAllCountries();
const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.isoCode, country]));

const STATES_BY_COUNTRY = new Map(
  COUNTRIES.map((country) => [country.isoCode, State.getStatesOfCountry(country.isoCode)])
);

const SEARCH_ENTRIES = COUNTRIES.flatMap((country) => {
  const countryEntry = {
    id: `country-${country.isoCode}`,
    type: 'country',
    countryCode: country.isoCode,
    countryName: country.name,
    latitude: Number(country.latitude),
    longitude: Number(country.longitude),
    regionCode: '',
    regionName: '',
    label: country.name,
    keywords: `${country.name} ${country.isoCode}`.toLowerCase()
  };

  const states = (STATES_BY_COUNTRY.get(country.isoCode) || []).map((state) => ({
    id: `state-${country.isoCode}-${state.isoCode}`,
    type: 'state',
    countryCode: country.isoCode,
    countryName: country.name,
    latitude: Number(state.latitude || country.latitude),
    longitude: Number(state.longitude || country.longitude),
    regionCode: state.isoCode,
    regionName: state.name,
    label: `${state.name}, ${country.name}`,
    keywords: `${state.name} ${state.isoCode} ${country.name} ${country.isoCode}`.toLowerCase()
  }));

  return [countryEntry, ...states];
});

export function getCountryName(countryCode = '') {
  return COUNTRY_BY_CODE.get(countryCode.toUpperCase())?.name || countryCode;
}

export function getRegionName(countryCode = '', regionCode = '', fallbackRegion = '') {
  if (!regionCode || regionCode.toUpperCase() === 'ALL') {
    return '';
  }

  const states = STATES_BY_COUNTRY.get(countryCode.toUpperCase()) || [];
  const matched = states.find((state) => state.isoCode.toUpperCase() === regionCode.toUpperCase());
  return matched?.name || fallbackRegion || regionCode;
}

export function formatLocationLabel(location) {
  if (!location?.countryCode) {
    return 'Unknown location';
  }

  const countryName = location.countryName || getCountryName(location.countryCode);
  const regionName = getRegionName(location.countryCode, location.regionCode, location.region);

  return regionName ? `${regionName}, ${countryName}` : countryName;
}

export function searchLocations(query, limit = 8) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return SEARCH_ENTRIES.filter((entry) => entry.keywords.includes(normalized)).slice(0, limit);
}

export function formatHolidayRegionCountry(countryCode, regionCode = '') {
  const countryName = getCountryName(countryCode);
  const regionName = getRegionName(countryCode, regionCode);
  return regionName ? `${regionName}, ${countryName}` : countryName;
}
