import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTomorrowInfo } from './hooks/useTomorrowInfo';
import { useLocation } from './hooks/useLocation';
import { fetchHolidaysByDate } from './services/holidayApi';
import { fetchTomorrowWeather } from './services/weatherApi';
import { formatLocationLabel } from './utils/locationLabels';
import { filterHolidaysByLocation, formatHoliday } from './utils/holidayFilter';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HeroCard from './components/HeroCard';
import HolidayCards from './components/HolidayCards';
import LocationSearch from './components/LocationSearch';

function App() {
  const { weekday, fullDate, isoDate } = useTomorrowInfo();
  const { location, loading: locationLoading, error: locationError, setManualLocation } = useLocation();

  const [allHolidays, setAllHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [permissionPromptVisible, setPermissionPromptVisible] = useState(false);
  const [pendingManualSearchId, setPendingManualSearchId] = useState(null);
  const [searchSuccessAnimationKey, setSearchSuccessAnimationKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadHolidays() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchHolidaysByDate(isoDate);
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
  }, [isoDate]);

  useEffect(() => {
    if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
      setWeather(null);
      setWeatherError('');
      return;
    }

    let active = true;

    async function loadWeather() {
      setWeatherLoading(true);
      setWeatherError('');

      try {
        const data = await fetchTomorrowWeather(isoDate, location.latitude, location.longitude);
        if (active) {
          setWeather(data);
        }
      } catch (err) {
        if (active) {
          setWeather(null);
          setWeatherError(err instanceof Error ? err.message : 'Unexpected error while loading weather.');
        }
      } finally {
        if (active) {
          setWeatherLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      active = false;
    };
  }, [isoDate, location]);

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
    setPendingManualSearchId((value) => (typeof value === 'number' ? value + 1 : 1));
    setManualLocation(
      result.countryCode,
      result.regionCode,
      result.countryName,
      result.regionName,
      result.latitude,
      result.longitude
    );
    setPermissionPromptVisible(false);
  };

  useEffect(() => {
    if (pendingManualSearchId === null || isLoading || error) {
      return;
    }

    if (holidays.length > 0) {
      setSearchSuccessAnimationKey((value) => value + 1);
    }

    setPendingManualSearchId(null);
  }, [pendingManualSearchId, isLoading, error, holidays.length]);

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
            weather={weather}
            weatherError={weatherError}
            weatherLoading={weatherLoading}
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

            <LocationSearch
              onSelect={handleSelectLocation}
              disabled={locationLoading}
              successAnimationKey={searchSuccessAnimationKey}
            />
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl">
          <HolidayCards holidays={holidays} isLoading={isLoading} />
        </div>
      </motion.main>

      <Footer />
    </div>
  );
}

export default App;
