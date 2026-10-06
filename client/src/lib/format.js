// Normalise digit grouping in salary strings (e.g. "$1,00,000" -> "$100,000").
// Older cached listings were formatted with the server's locale.
export function formatSalary(salary) {
  if (!salary || salary === 'Not specified') return '';
  return salary.replace(/\d{1,3}(?:,\d{2,3})+/g, (m) => Number(m.replace(/,/g, '')).toLocaleString('en-US'));
}
