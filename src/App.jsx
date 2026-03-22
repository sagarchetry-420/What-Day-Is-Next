import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTomorrowInfo } from './hooks/useTomorrowInfo';
import { useLocation } from './hooks/useLocation';
import { fetchAllHolidays } from './services/holidayApi';
import { formatLocationLabel } from './utils/locationLabels';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HeroCard from './components/HeroCard';
import HolidayCards from './components/HolidayCards';
import LocationSearch from './components/LocationSearch';

function filterHolidaysByLocation(holidays, targetDate, location) {
  if (!holidays || !location?.countryCode) {
    return [];
  }

  const { countryCode, regionCode } = location;

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

  for (const holiday of countryHolidays) {
    const region = (holiday.region || '').toUpperCase();

    if (region === 'ALL' || region === '') {
      nationalHolidays.push(holiday);
    } else if (regionCode && region === regionCode.toUpperCase()) {
      regionalHolidays.push(holiday);
    }
  }

  const seen = new Set();
  const result = [];

  for (const h of regionalHolidays) {
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

  return result;
}

function formatHoliday(holiday, index) {
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

function App() {
  const { weekday, fullDate, isoDate } = useTomorrowInfo();
  const { location, loading: locationLoading, error: locationError, setManualLocation } = useLocation();

  const [allHolidays, setAllHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissionPromptVisible, setPermissionPromptVisible] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadHolidays() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchAllHolidays(5000);
        if (active) {
          setAllHolidays(data);
        }
      } catch (err) {
        if (active) {
          setAllHolidays([]);
          setError(err instanceof Error ? err.message : 'Unexpected error while loading holidays.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHolidays();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator?.permissions) {
      return;
    }

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        setPermissionPromptVisible(status.state === 'prompt');
      })
      .catch(() => {
        setPermissionPromptVisible(false);
      });
  }, []);

  const holidays = useMemo(() => {
    if (!location || allHolidays.length === 0) {
      return [];
    }

    const filtered = filterHolidaysByLocation(allHolidays, isoDate, location);
    return filtered.map((h, i) => formatHoliday(h, i));
  }, [allHolidays, isoDate, location]);

  const isLoading = loading || locationLoading;
  const locationLabel = useMemo(() => formatLocationLabel(location), [location]);
  const permissionDenied = Boolean(locationError && locationError.toLowerCase().includes('denied'));

  const handleSelectLocation = (result) => {
    setManualLocation(result.countryCode, result.regionCode, result.countryName, result.regionName);
    setPermissionPromptVisible(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex w-full flex-1 flex-col items-stretch justify-center gap-8 px-4 py-6 sm:gap-12 sm:px-6 sm:py-8 lg:gap-16 lg:px-10"
      >
        <div className="mx-auto w-full max-w-5xl">
          <HeroCard
            weekday={weekday}
            fullDate={fullDate}
            isLoading={isLoading}
            error={error}
            holidays={holidays}
            locationLabel={locationLabel}
          />
        </div>

        <section className="mx-auto w-full max-w-xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-theme-secondary">
                Showing holidays for <span className="font-medium text-theme-primary">{locationLabel}</span>
              </p>
              {permissionPromptVisible && (
                <p className="text-xs text-theme-muted">
                  Allow location access for automatic detection, or search below
                </p>
              )}
              {permissionDenied && (
                <p className="text-xs text-amber-500">
                  Location denied — search manually
                </p>
              )}
            </div>

            <LocationSearch onSelect={handleSelectLocation} disabled={locationLoading} />
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl">
          <HolidayCards holidays={holidays} />
        </div>
      </motion.main>

      <Footer />
    </div>
  );
}

export default App;
