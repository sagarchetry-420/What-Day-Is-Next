import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WeatherIcon from './WeatherIcon';

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 18;
const VIEW_TOGGLE_INTERVAL_MS = 8000;

const CONTENT_VARIANTS = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.25 }
  }
};

const ITEM_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: i * 0.08,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  })
};

function WeatherSkeleton() {
  return (
    <div className="weather-display-container">
      <div className="weather-card weather-card-loading">
        <div className="weather-content weather-skeleton-content">
          {/* Label skeleton */}
          <div className="skeleton-shimmer weather-skeleton-label" />

          {/* Temperature skeleton */}
          <div className="weather-skeleton-temp">
            <div className="skeleton-shimmer weather-skeleton-temp-value" />
            <div className="skeleton-shimmer weather-skeleton-temp-unit" />
          </div>

          {/* Icon and condition skeleton */}
          <div className="weather-skeleton-visual">
            <div className="skeleton-shimmer weather-skeleton-icon" />
            <div className="skeleton-shimmer weather-skeleton-condition" />
          </div>
        </div>
      </div>
    </div>
  );
}

function WeatherDisplay({ weather, isLoading = false, error = null }) {
  const [isDayView, setIsDayView] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!weather) {
      return;
    }

    const nowHour = new Date().getHours();
    const initialDay = nowHour >= DAY_START_HOUR && nowHour < DAY_END_HOUR;
    setIsDayView(initialDay);

    if (!weather.daytime || !weather.nighttime) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setIsDayView((prev) => !prev);
    }, VIEW_TOGGLE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [weather]);

  if (isLoading) {
    return <WeatherSkeleton />;
  }

  if (error || !weather) {
    return null;
  }

  const hasDay = Boolean(weather.daytime);
  const hasNight = Boolean(weather.nighttime);
  const isDay = hasDay && (!hasNight || isDayView);
  const currentData = isDay ? weather.daytime : weather.nighttime;
  const condition = currentData?.condition || weather.condition || 'Clear';
  const temperature = currentData?.avg_temp_c ?? weather.temperature_c ?? '--';

  return (
    <div className="weather-display-container">
      <motion.div
        className={`weather-card weather-card-animated ${isDay ? 'weather-card-day' : 'weather-card-night'}`}
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isDay ? 'day' : 'night'}
            className="weather-content"
            variants={CONTENT_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.span
              className="weather-label weather-label-animated"
              variants={ITEM_VARIANTS}
              custom={0}
              initial="initial"
              animate="animate"
            >
              {isDay ? 'Day' : 'Night'}
            </motion.span>

            <motion.div
              className="weather-temp weather-temp-animated"
              variants={ITEM_VARIANTS}
              custom={1}
              initial="initial"
              animate="animate"
            >
              <span className="weather-temp-value">{Math.round(temperature)}</span>
              <span className="weather-temp-unit">°C</span>
            </motion.div>

            <motion.div
              className="weather-visual weather-visual-animated"
              variants={ITEM_VARIANTS}
              custom={2}
              initial="initial"
              animate="animate"
            >
              <WeatherIcon
                condition={condition}
                isNight={!isDay}
                className="weather-icon-large weather-icon-animated"
              />
              <span className="weather-condition">
                {condition}
              </span>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default WeatherDisplay;
