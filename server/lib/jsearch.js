// JSearch through RapidAPI, then through OpenWebNinja's copy of it once RapidAPI's quota runs out.
const RAPIDAPI_BASE = 'https://jsearch.p.rapidapi.com';
const BACKUP_BASE = 'https://api.openwebninja.com/jsearch/search-v2';
const QUOTA_USED_UP = new Set([403, 429]);

// One page of search results. params is a URLSearchParams; both services read the same ones.
async function fetchJSearch(params) {
  const response = await fetch(`${RAPIDAPI_BASE}/search?${params}`, {
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
      'x-rapidapi-host': 'jsearch.p.rapidapi.com'
    }
  });
  const backupKey = process.env.OPENWEBNINJA_API_KEY;
  if (!QUOTA_USED_UP.has(response.status) || !backupKey) return response;

  console.warn(`[JSearch] RapidAPI answered ${response.status}, using the backup`);
  return fetch(`${BACKUP_BASE}?${params}`, { headers: { 'X-API-Key': backupKey } });
}

// RapidAPI returns the jobs as data; the backup returns them as data.jobs
const jobsIn = (body) => (Array.isArray(body?.data) ? body.data : body?.data?.jobs) || [];

module.exports = { fetchJSearch, jobsIn };
