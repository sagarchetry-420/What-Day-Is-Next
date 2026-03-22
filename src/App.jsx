import { useEffect, useState } from 'react';
import { useTomorrowInfo } from './hooks/useTomorrowInfo';
import { fetchTomorrowHolidays } from './services/holidayApi';

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

  const primaryHoliday = holidays.length > 0 ? holidays[0] : null;

  return (
    <div className="app-container">
      <header className="app-header">
        <svg className="calendar-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="app-title">Tomorrow</span>
      </header>

      <main className="main-content">
        <p className="tomorrow-label">TOMORROW IS...</p>

        <div className="date-card">
          <h1 className="weekday">{weekday}</h1>
          <p className="full-date">{fullDate}</p>

          {loading && (
            <div className="holiday-badge loading">
              <span className="badge-text">Loading holidays...</span>
            </div>
          )}

          {!loading && error && (
            <div className="holiday-badge error">
              <span className="badge-text">{error}</span>
            </div>
          )}

          {!loading && !error && primaryHoliday && (
            <div className="holiday-badge">
              <span className="badge-emoji">🎉</span>
              <span className="badge-text">
                <span className="badge-label">HOLIDAY:</span> {primaryHoliday.name.toUpperCase()}
              </span>
            </div>
          )}

          {!loading && !error && holidays.length === 0 && (
            <div className="holiday-badge muted">
              <span className="badge-text">No holidays tomorrow</span>
            </div>
          )}

          {!loading && !error && holidays.length > 1 && (
            <p className="more-holidays">+{holidays.length - 1} more holidays worldwide</p>
          )}
        </div>

        {!loading && !error && holidays.length > 1 && (
          <div className="holidays-list">
            <h2 className="holidays-list-title">All Holidays</h2>
            <ul className="holidays-grid">
              {holidays.map((holiday) => (
                <li key={holiday.id} className="holiday-card">
                  <span className="holiday-name">{holiday.name}</span>
                  <span className="holiday-country">{holiday.country}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <a href="#privacy" className="footer-link">PRIVACY</a>
        <p className="copyright">&copy; 2024 TOMORROW UTILITY</p>
      </footer>
    </div>
  );
}

export default App;
