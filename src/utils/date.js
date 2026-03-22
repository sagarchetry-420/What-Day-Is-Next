export function getTomorrow(baseDate = new Date()) {
  const tomorrow = new Date(baseDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

export function formatTomorrow(tomorrow, locale) {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(tomorrow);
  const fullDate = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(tomorrow);

  return { weekday, fullDate };
}

export function toISODateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
