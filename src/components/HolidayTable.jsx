function HolidayTable({ rows }) {
  if (!rows.length) {
    return <p className="muted">No rows found in the holidays table yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="holiday-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Country</th>
            <th>State</th>
            <th>Holiday Name</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.holiday_date}-${row.country_code}-${row.region}-${row.name}-${index}`}>
              <td>{row.holiday_date}</td>
              <td>{row.country_code}</td>
              <td>{row.region || 'All'}</td>
              <td>{row.name}</td>
              <td>{Array.isArray(row.holiday_type) ? row.holiday_type.join(', ') : row.holiday_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HolidayTable;
