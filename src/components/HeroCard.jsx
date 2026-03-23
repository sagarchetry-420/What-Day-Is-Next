import { AnimatePresence, motion } from 'framer-motion';
import WeatherDisplay from './WeatherDisplay';

function HeroCard({
  weekday,
  fullDate,
  isLoading,
  error,
  holidays,
  locationLabel,
  weather,
  weatherError,
  weatherLoading
}) {
  const primaryHoliday = holidays.length > 0 ? holidays[0] : null;

  return (
    <section className="w-full py-12 text-center sm:py-16 lg:py-20">
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-xs font-medium uppercase tracking-[0.3em] text-theme-muted sm:text-sm sm:tracking-[0.25em]"
      >
        Tomorrow is...
      </motion.p>

      <motion.h1
        key={weekday}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="font-brand mt-6 text-5xl leading-none text-theme-primary sm:mt-8 sm:text-7xl lg:text-8xl"
      >
        {weekday}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mt-4 text-base text-accent-orange sm:mt-6 sm:text-xl lg:text-2xl"
      >
        {fullDate}
      </motion.p>

      <div className="mt-10 min-h-10 sm:mt-12">
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Location skeleton */}
              <div className="flex flex-col items-center gap-2">
                <div className="skeleton-shimmer h-3 w-16 rounded-full" />
                <div className="skeleton-shimmer h-5 w-32 rounded-full" />
              </div>
              {/* Weather skeleton */}
              <div className="flex items-center gap-3 mt-2">
                <div className="skeleton-shimmer h-12 w-12 rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <div className="skeleton-shimmer h-8 w-16 rounded" />
                  <div className="skeleton-shimmer h-3 w-20 rounded-full" />
                </div>
              </div>
            </motion.div>
          )}

          {!isLoading && error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-red-400 sm:text-base"
            >
              {error}
            </motion.p>
          )}

            {!isLoading && !error && primaryHoliday && (
              <motion.div
                key="holiday"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-xs uppercase tracking-widest text-theme-muted">Holiday</span>
                <p className="text-lg font-semibold text-accent-emerald sm:text-xl lg:text-2xl">
                  {primaryHoliday.name}
                </p>
              </motion.div>
            )}

            {!isLoading && !error && (
              <motion.div
                key="weather"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mt-4 flex flex-col items-center gap-1"
              >
                <span className="text-xs uppercase tracking-widest text-theme-muted">Weather</span>
                <WeatherDisplay
                  weather={weather}
                  isLoading={weatherLoading}
                  error={weatherError}
                />
              </motion.div>
            )}

          {!isLoading && !error && holidays.length === 0 && (
            <motion.p
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-theme-secondary sm:text-base"
            >
              No holidays tomorrow in {locationLabel}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

export default HeroCard;
