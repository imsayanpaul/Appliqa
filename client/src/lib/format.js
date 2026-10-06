// Normalise digit grouping in salary strings (e.g. "$1,00,000" -> "$100,000").
// Older cached listings were formatted with the server's locale.
export function formatSalary(salary) {
  if (!salary || salary === 'Not specified') return '';
  return salary.replace(/\d{1,3}(?:,\d{2,3})+/g, (m) => Number(m.replace(/,/g, '')).toLocaleString('en-US'));
}

// Approximate monthly pay from an annual CTC range such as "₹15L - ₹22L",
// "12-18 LPA", "₹1.2Cr" or "$120K - $150K". Returns null when unparseable.
const UNITS = { cr: 1e7, crore: 1e7, l: 1e5, lakh: 1e5, lakhs: 1e5, lpa: 1e5, k: 1e3, m: 1e6 };

export function monthlyFromCTC(range) {
  if (!range) return null;
  const text = String(range).replace(/,/g, '');
  const currency = (text.match(/[₹$€£]/) || [''])[0] || (/lpa|lakh|cr/i.test(text) ? '₹' : '');
  const parts = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(cr(?:ore)?|lakhs?|lpa|l|k|m)?\b/gi)];
  if (!parts.length) return null;
  // A unit written once ("15-22 LPA") applies to every number in the range
  const sharedUnit = parts.map((p) => p[2]).filter(Boolean).pop();
  const values = parts.slice(0, 2).map((p) => Number(p[1]) * (UNITS[(p[2] || sharedUnit || '').toLowerCase()] || 1));
  if (values.some((v) => !v || v < 1000)) return null;
  const indian = currency === '₹';
  const fmt = (n) => {
    if (indian) {
      if (n >= 1e5) return `₹${(n / 1e5).toFixed(n >= 1e6 ? 1 : 2).replace(/\.?0+$/, '')}L`;
      return `₹${Math.round(n / 1e3)}K`;
    }
    return `${currency}${n >= 1e4 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : Math.round(n).toLocaleString('en-US')}`;
  };
  const monthly = values.map((v) => v / 12);
  return monthly.length > 1 && monthly[0] !== monthly[1]
    ? `${fmt(monthly[0])} – ${fmt(monthly[1])}`
    : fmt(monthly[0]);
}
