import { useMemo } from 'react';
import { useClock } from '../contexts/ClockContext';
import { formatTomorrow, getTomorrow, toISODateLocal } from '../utils/date';

export function useTomorrowInfo() {
  const { now, locale } = useClock();

  return useMemo(() => {
    const tomorrow = getTomorrow(now);
    const formatted = formatTomorrow(tomorrow, locale);

    return {
      locale,
      tomorrow,
      isoDate: toISODateLocal(tomorrow),
      ...formatted
    };
  }, [locale, now]);
}
