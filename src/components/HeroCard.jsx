import { AnimatePresence, motion } from 'framer-motion';

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
            <motion.p
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-theme-secondary sm:text-base"
            >
              Detecting your location and holidays...
            </motion.p>
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
                {weatherLoading && <p className="text-sm text-theme-secondary sm:text-base">Loading tomorrow weather...</p>}
                {!weatherLoading && weather && (
                  <div className="flex flex-col items-center gap-1 text-sm text-theme-secondary sm:text-base">
                    <p>
                      {weather.weekday || 'Tomorrow'} • {weather.condition || weather.summary} • {weather.temperature_c}°C
                    </p>
                    {weather.daytime && (
                      <p>
                        Day: {weather.daytime.condition} {weather.daytime.avg_temp_c}°C
                        {' '}({weather.daytime.min_temp_c}°C–{weather.daytime.max_temp_c}°C)
                      </p>
                    )}
                    {weather.nighttime && (
                      <p>
                        Night: {weather.nighttime.condition} {weather.nighttime.avg_temp_c}°C
                        {' '}({weather.nighttime.min_temp_c}°C–{weather.nighttime.max_temp_c}°C)
                      </p>
                    )}
                  </div>
                )}
                {!weatherLoading && !weather && weatherError && (
                  <p className="text-sm text-theme-secondary sm:text-base">{weatherError}</p>
                )}
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
