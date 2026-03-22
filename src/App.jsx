import { lazy, Suspense, useEffect, useState } from 'react';
import DateCard from './components/DateCard';
import StatusMessage from './components/StatusMessage';
import { useTomorrowInfo } from './hooks/useTomorrowInfo';
import { fetchTomorrowHolidays } from './services/holidayApi';

const HolidayList = lazy(() => import('./components/HolidayList'));

function App() {
  const { weekday, fullDate, isoDate } = useTomorrowInfo();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHolidays() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchTomorrowHolidays(isoDate);
        if (active) {
          setHolidays(data);
        }
      } catch (err) {
        if (active) {
          setHolidays([]);
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

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Tomorrow Snapshot</p>
      </header>

      <main className="layout" id="main-content">
        <DateCard weekday={weekday} fullDate={fullDate} />

        <section className="card" aria-labelledby="holidays-heading">
          <h2 id="holidays-heading">Worldwide Holidays Tomorrow</h2>

          {loading ? <StatusMessage message="Loading holiday data..." /> : null}
          {!loading && error ? <StatusMessage type="error" message={error} /> : null}

          {!loading && !error ? (
            <Suspense fallback={<StatusMessage message="Preparing holiday list..." />}>
              <HolidayList holidays={holidays} />
            </Suspense>
          ) : null}
        </section>
      </main>
    </>
  );
}

export default App;
