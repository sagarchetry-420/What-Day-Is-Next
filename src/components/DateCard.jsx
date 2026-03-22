import { memo } from 'react';

function DateCard({ weekday, fullDate }) {
  return (
    <section className="card" aria-labelledby="tomorrow-heading">
      <h1 id="tomorrow-heading">Tomorrow is</h1>
      <p className="day-name">{weekday}</p>
      <p className="full-date">{fullDate}</p>
    </section>
  );
}

export default memo(DateCard);
