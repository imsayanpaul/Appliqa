// Searches the jobs synced from company career feeds, and merges them with JSearch results.
const { supabase } = require('../supabase');

const LIMIT = 20;
const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = { '24h': 1, today: 1, '3days': 3, week: 7, month: 30 };

// The same city goes by several names in job posts
const CITY_NAMES = [
  ['bengaluru', 'bangalore'], ['gurugram', 'gurgaon'], ['delhi', 'ncr', 'noida', 'gurugram', 'gurgaon'], ['noida', 'ncr'],
  ['mumbai', 'navi mumbai', 'thane'], ['kochi', 'cochin'], ['trivandrum', 'thiruvananthapuram'], ['mysuru', 'mysore'],
];
function cityNames(city) {
  const c = String(city || '').trim().toLowerCase().replace(/[^a-z ]/g, '');
  if (!c) return [];
  const names = new Set([c]);
  for (const group of CITY_NAMES) if (group[0] === c || (group.length === 2 && group.includes(c))) group.forEach((n) => names.add(n));
  return [...names];
}

// "fullstack" and "full stack" are the same search, and so on
const SPELLINGS = [
  [/\bfull[\s-]?stack\b/gi, '(fullstack or "full stack")'],
  [/\bfront[\s-]?end\b/gi, '(frontend or "front end")'],
  [/\bback[\s-]?end\b/gi, '(backend or "back end")'],
  [/\bnode\.?\s?js\b/gi, '(node or nodejs)'],
  [/\breact\.?\s?js\b/gi, 'react'],
];
function searchQuery(text) {
  let q = String(text || '').replace(/["():|&!<>*]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  for (const [re, to] of SPELLINGS) q = q.replace(re, to);
  return q;
}

const toJob = (row) => ({
  id: row.id,
  title: row.title,
  company: row.company,
  companyLogo: null,
  location: row.location,
  description: row.description,
  employmentType: row.employment_type,
  employmentTypes: row.employment_type ? [row.employment_type] : [],
  salary: '',
  datePosted: row.date_posted,
  applyLink: row.apply_link,
  publisher: `${row.company} careers`,
  remote: row.remote,
  highlights: {},
  requiredSkills: [],
  requiredExperience: {},
  direct: true,
});

const COLUMNS = 'id, title, company, location, description, employment_type, date_posted, apply_link, remote';
let tableMissingLogged = false;

const ROLE_WORD = /^(intern|internship|trainee|fresher|graduate|developer|engineer|programmer|analyst|manager|designer|consultant|architect|lead|associate|executive|specialist|administrator|recruiter|accountant)s?$/i;
const isSkillSearch = (text) => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  return words.length === 1 && !ROLE_WORD.test(words[0]);
};

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const INTERN_WORD = /\bintern(ship)?s?\b/i;
const isInternWord = (word) => /^intern(ship)?s?$/i.test(word);
const isSymbolWord = (word) => /[+#.]/.test(word) && !/\.?js$/i.test(word);
const wordsOf = (text) => String(text || '').trim().split(/\s+/).filter(Boolean);

// Text search stems and strips symbols: "intern" also finds "internal", "C++" becomes "c".
// Those two kinds of word must really appear as typed.
function literallyMentions(row, query) {
  const text = `${row.title} ${row.company} ${row.description || ''}`;
  return wordsOf(query).every((word) => {
    if (isInternWord(word)) return INTERN_WORD.test(row.title);
    if (isSymbolWord(word)) return new RegExp(`(?<![a-z0-9+#.])${escapeRe(word)}(?![a-z0-9+#])`, 'i').test(text);
    return true;
  });
}
const needsLiteralCheck = (query) => wordsOf(query).some((word) => isInternWord(word) || isSymbolWord(word));

// Open jobs for a search. Matches the title, company and team; single-skill searches also read
// job descriptions when titles find little.
async function searchDirectJobs({ query, location = '', datePosted = '', remote = '' }) {
  const q = searchQuery(query);
  if (!q) return [];
  const run = async (column) => {
    let req = supabase.from('direct_jobs').select(COLUMNS).is('closed_at', null)
      .textSearch(column, q, { type: 'websearch', config: 'english' })
      .order('date_posted', { ascending: false, nullsFirst: false })
      // The literal check throws rows away afterwards, so it needs more to choose from
      .limit(needsLiteralCheck(query) ? 200 : LIMIT);
    const days = WINDOW_DAYS[datePosted];
    if (days) req = req.gte('date_posted', new Date(Date.now() - days * DAY).toISOString());
    if (remote === 'true') req = req.eq('remote', true);
    const names = cityNames(location);
    if (names.length) req = req.or([...names.map((n) => `location.ilike.%${n}%`), 'remote.eq.true'].join(','));
    return req;
  };

  const first = await run('title_search');
  if (first.error) {
    if (!tableMissingLogged) console.warn('[DirectJobs] search unavailable:', first.error.message);
    tableMissingLogged = true;
    return [];
  }
  let rows = first.data || [];
  // A single skill ("python") rarely appears in titles, so look in descriptions too.
  // Role searches ("data analyst") stay on titles: their words appear in unrelated job text.
  if (rows.length < 5 && isSkillSearch(query)) {
    const second = await run('body_search');
    if (!second.error) {
      const have = new Set(rows.map((r) => r.id));
      rows = rows.concat((second.data || []).filter((r) => !have.has(r.id)));
    }
  }
  return rows.filter((r) => literallyMentions(r, query)).slice(0, LIMIT).map(toJob);
}

const LEGAL_SUFFIX = /\b(pvt|private|ltd|limited|llp|inc|llc|corp|corporation|technologies|technology|software|solutions|india|co)\b\.?/gi;
const normal = (s) => String(s || '').toLowerCase().replace(LEGAL_SUFFIX, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const dedupeKey = (job) => `${normal(job.company)}|${normal(job.title)}`;

// Alternates JSearch and feed jobs, because feeds lean senior and shouldn't bury everything else.
// A JSearch copy of a feed job is dropped, keeping the employer's own link.
function mergeJobs(direct, others) {
  const directKeys = new Set(direct.map(dedupeKey));
  const rest = others.filter((job) => !directKeys.has(dedupeKey(job)));
  const seen = new Set();
  const out = [];
  for (let i = 0; i < Math.max(direct.length, rest.length); i++) {
    for (const job of [rest[i], direct[i]]) {
      if (!job) continue;
      const key = dedupeKey(job);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(job);
    }
  }
  return out;
}

// Career feeds are synced for India and open-remote jobs only
const directJobsApply = (country) => !country || /^(india|in)$/i.test(String(country).trim());

module.exports = { searchDirectJobs, mergeJobs, directJobsApply, searchQuery, cityNames, toJob, dedupeKey, isSkillSearch, literallyMentions };
