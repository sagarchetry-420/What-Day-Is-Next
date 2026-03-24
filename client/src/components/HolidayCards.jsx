import { AnimatePresence, motion } from 'framer-motion';
import { formatHolidayRegionCountry } from '../utils/locationLabels';

function HolidayCardSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={`skeleton-${index}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, delay: index * 0.04 }}
          className="holiday-card-skeleton rounded-2xl bg-theme-secondary p-5 sm:p-6"
        >
          <div className="skeleton-shimmer h-5 w-3/4 rounded-lg sm:h-6" />
          <div className="skeleton-shimmer mt-3 h-3.5 w-1/2 rounded-md sm:mt-4" />
        </motion.div>
      ))}
    </div>
  );
}

function HolidayCards({ holidays, isLoading = false }) {
  const showSkeleton = isLoading && holidays.length === 0;
  const hasMultipleHolidays = holidays.length > 1;

  if (!showSkeleton && !hasMultipleHolidays) {
    return null;
  }

  return (
    <section className="w-full">
      <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-theme-muted sm:mb-8 sm:text-left">
        All Holidays
      </h2>
      <AnimatePresence mode="wait">
        {showSkeleton ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <HolidayCardSkeleton count={6} />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6"
          >
            {holidays.map((holiday, index) => (
              <motion.article
                key={holiday.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="holiday-card cursor-default rounded-2xl bg-theme-secondary p-5 sm:p-6"
              >
                <p className="text-base font-semibold text-theme-primary sm:text-lg">
                  {holiday.name}
                </p>
                <p className="mt-2 text-sm text-theme-secondary">
                  {formatHolidayRegionCountry(holiday.country, holiday.region)}
                </p>
              </motion.article>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default HolidayCards;
