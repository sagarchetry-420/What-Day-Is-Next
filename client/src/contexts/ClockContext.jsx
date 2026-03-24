import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ClockContext = createContext(null);

function getLocale() {
  return navigator?.language || 'en-US';
}

export function ClockProvider({ children }) {
  const [now, setNow] = useState(() => new Date());
  const locale = useMemo(getLocale, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  const value = useMemo(() => ({ now, locale }), [now, locale]);

  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
}

export function useClock() {
  const context = useContext(ClockContext);
  if (!context) {
    throw new Error('useClock must be used within a ClockProvider');
  }
  return context;
}
