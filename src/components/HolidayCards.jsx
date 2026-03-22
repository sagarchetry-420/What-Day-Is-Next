import { motion } from 'framer-motion';
import { formatHolidayRegionCountry } from '../utils/locationLabels';

function HolidayCards({ holidays }) {
  if (holidays.length <= 1) {
    return null;
  }

  return (
    <section className="w-full">
      <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-theme-muted sm:mb-8 sm:text-left">
        All Holidays
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
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
      </div>
    </section>
  );
}

export default HolidayCards;
