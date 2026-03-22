import { memo } from 'react';

function HolidayList({ holidays }) {
  if (!holidays.length) {
    return (
      <p className="muted" role="status">
        No worldwide holidays were found for tomorrow.
      </p>
    );
  }

  return (
    <ul className="holiday-list" aria-live="polite">
      {holidays.map((holiday) => (
        <li key={holiday.id} className="holiday-item">
          <h3>{holiday.name}</h3>
          <p>
            <strong>Date:</strong> {holiday.date}
          </p>
          <p>
            <strong>Country:</strong> {holiday.country}
          </p>
          {holiday.description ? (
            <p>
              <strong>Description:</strong> {holiday.description}
            </p>
          ) : (
            <p className="muted">
              <strong>Description:</strong> Not available
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default memo(HolidayList);
