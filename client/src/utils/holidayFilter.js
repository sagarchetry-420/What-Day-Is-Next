function normalizeRegionCode(region = '') {
  const value = String(region || '').trim().toUpperCase();
  if (!value) {
    return '';
  }
  if (value.includes('-')) {
    return value.split('-').pop() || '';
  }
  return value;
}

export function filterHolidaysByLocation(holidays, targetDate, location) {
  if (!holidays || !location?.countryCode) {
    return [];
  }

  const { countryCode, regionCode } = location;
  const normalizedRegionCode = normalizeRegionCode(regionCode);

  const countryHolidays = holidays.filter((h) => {
    const holidayDate = h.holiday_date || '';
    const hCountryCode = (h.country_code || '').toUpperCase();
    return holidayDate === targetDate && hCountryCode === countryCode.toUpperCase();
  });

  if (countryHolidays.length === 0) {
    return [];
  }

  const regionalHolidays = [];
  const nationalHolidays = [];
  const allRegionalHolidays = [];

  for (const holiday of countryHolidays) {
    const region = normalizeRegionCode(holiday.region || '');

    if (region === 'ALL' || region === '') {
      nationalHolidays.push(holiday);
    } else {
      allRegionalHolidays.push(holiday);
      if (normalizedRegionCode && region === normalizedRegionCode) {
        regionalHolidays.push(holiday);
      }
    }
  }

  const seen = new Set();
  const result = [];

  const preferredRegionals = normalizedRegionCode ? regionalHolidays : [];
  const regionFallback =
    (!normalizedRegionCode && nationalHolidays.length === 0) ||
    (normalizedRegionCode && regionalHolidays.length === 0 && nationalHolidays.length === 0)
      ? allRegionalHolidays
      : [];

  for (const h of preferredRegionals) {
    const key = h.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ ...h, isRegional: true });
    }
  }

  for (const h of nationalHolidays) {
    const key = h.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ ...h, isRegional: false });
    }
  }

  for (const h of regionFallback) {
    const key = h.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ ...h, isRegional: true });
    }
  }

  return result;
}

export function formatHoliday(holiday, index) {
  return {
    id: `${holiday.country_code}-${holiday.holiday_date}-${index}-${holiday.name}`,
    name: holiday.name,
    date: holiday.holiday_date,
    country: holiday.country_code,
    region: holiday.region,
    type: holiday.holiday_type || [],
    isRegional: holiday.isRegional || false
  };
}

export { normalizeRegionCode };
