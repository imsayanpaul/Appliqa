// Job sources that come straight from employers: the public job feeds of the hiring
// systems behind company career pages. Each adapter turns one company's feed into the
// same job shape, so adding a system means adding one function here.
const TIMEOUT_MS = 20000;
const MAX_DESCRIPTION = 12000;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bull: '•' };
const decodeEntities = (s) => String(s || '').replace(/&(#x?[0-9a-f]+|[a-z0-9]+);/gi, (whole, name) => {
  const key = name.toLowerCase();
  if (key[0] === '#' && key !== '#39') {
    const code = key[1] === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' ';
  }
  return key in ENTITIES ? ENTITIES[key] : whole;
});

// HTML to readable text, keeping paragraphs and bullets
function toPlainText(html) {
  // Feeds sometimes escape their HTML, so tags only appear after decoding
  const text = decodeEntities(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|ul|ol|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(text)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_DESCRIPTION);
}

const INDIA_PLACES = /\b(india|bengaluru|bangalore|mumbai|navi mumbai|thane|delhi|new delhi|ncr|gurgaon|gurugram|noida|hyderabad|secunderabad|pune|chennai|kolkata|ahmedabad|jaipur|kochi|cochin|coimbatore|indore|chandigarh|mohali|lucknow|trivandrum|thiruvananthapuram|nagpur|vadodara|mysore|mysuru|visakhapatnam|bhubaneswar)\b/i;
const OPEN_REMOTE = /^\s*(remote|fully remote|anywhere|worldwide|global|work from home)\s*$/i;

const OPEN_TO_INDIA = /\b(india|anywhere|worldwide|globally)\b/i;
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

// Appliqa keeps jobs in India, and remote jobs whose text says they're open to India or anywhere
// (a bare "Remote" often means remote within one country). Year-old postings are abandoned listings.
const keepJob = ({ location, country, description, datePosted }) => {
  if (datePosted && Date.now() - new Date(datePosted).getTime() > MAX_AGE_MS) return false;
  if (country) return /^(in|ind|india)$/i.test(country);
  if (INDIA_PLACES.test(location || '')) return true;
  return OPEN_REMOTE.test(location || '') && OPEN_TO_INDIA.test(description || '');
};

function employmentFrom(text, title = '') {
  const t = `${text || ''} ${title}`;
  if (/\b(intern|internship|trainee|apprentice)/i.test(t)) return 'INTERN';
  if (/\b(contract|contractor|freelance|fixed[\s-]?term|temporary)\b/i.test(t)) return 'CONTRACTOR';
  if (/\bpart[\s-]?time\b/i.test(t)) return 'PARTTIME';
  return /full[\s-]?time/i.test(text || '') ? 'FULLTIME' : '';
}

const isoDate = (value) => {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

async function getJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'AppliqaJobSync/1.0 (+https://www.appliqa.xyz)' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) throw Object.assign(new Error('Board not found'), { notFound: true });
  if (!res.ok) throw new Error(`Feed answered ${res.status}`);
  return res.json();
}

// ---- Adapters: raw posting to the shared job shape ----
function mapGreenhouse(p, company) {
  const location = p.location?.name || '';
  return {
    externalId: String(p.id), title: p.title, location,
    remote: /\bremote\b/i.test(location),
    description: toPlainText(p.content),
    employmentType: employmentFrom('', p.title),
    datePosted: isoDate(p.first_published || p.updated_at),
    applyLink: p.absolute_url,
    department: p.departments?.[0]?.name || '',
    company,
  };
}

function mapLever(p, company) {
  const location = p.categories?.allLocations?.join(' / ') || p.categories?.location || '';
  const parts = [p.descriptionPlain || toPlainText(p.description)];
  for (const list of p.lists || []) parts.push(`${list.text}\n${toPlainText(`<ul>${list.content}</ul>`)}`);
  if (p.additionalPlain) parts.push(p.additionalPlain);
  return {
    externalId: String(p.id), title: p.text, location,
    country: p.country || '',
    remote: p.workplaceType === 'remote' || /\bremote\b/i.test(location),
    description: parts.filter(Boolean).join('\n\n').trim().slice(0, MAX_DESCRIPTION),
    employmentType: employmentFrom(p.categories?.commitment, p.text),
    datePosted: isoDate(p.createdAt),
    applyLink: p.hostedUrl || p.applyUrl,
    department: p.categories?.team || p.categories?.department || '',
    company,
  };
}

function mapAshby(p, company) {
  const places = [p.location, ...(p.secondaryLocations || []).map((s) => s.location)].filter(Boolean);
  return {
    externalId: String(p.id), title: p.title,
    location: places.join(' / '),
    country: p.address?.postalAddress?.addressCountry || '',
    remote: Boolean(p.isRemote) || p.workplaceType === 'Remote',
    description: (p.descriptionPlain || toPlainText(p.descriptionHtml)).trim().slice(0, MAX_DESCRIPTION),
    employmentType: employmentFrom(p.employmentType, p.title),
    datePosted: isoDate(p.publishedAt),
    applyLink: p.jobUrl || p.applyUrl,
    department: p.department || p.team || '',
    company,
  };
}

function mapSmartRecruiters(p, company, detail = {}) {
  const loc = p.location || {};
  const sections = detail.jobAd?.sections || {};
  const description = ['companyDescription', 'jobDescription', 'qualifications', 'additionalInformation']
    .map((k) => sections[k]?.text).filter(Boolean).map(toPlainText).join('\n\n');
  return {
    externalId: String(p.id), title: p.name,
    location: loc.fullLocation || [loc.city, loc.region, loc.country].filter(Boolean).join(', '),
    country: loc.country || '',
    remote: Boolean(loc.remote),
    description: description.slice(0, MAX_DESCRIPTION),
    employmentType: employmentFrom(p.typeOfEmployment?.label, p.name),
    datePosted: isoDate(p.releasedDate),
    applyLink: detail.postingUrl || detail.applyUrl || `https://jobs.smartrecruiters.com/${p.company?.identifier}/${p.id}`,
    department: p.department?.label || p.function?.label || '',
    company,
  };
}

// ---- Fetching one company ----
const SOURCES = {
  async greenhouse({ slug, name }) {
    const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`);
    return (data.jobs || []).map((p) => mapGreenhouse(p, name));
  },
  async lever({ slug, name }) {
    const data = await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`);
    return (Array.isArray(data) ? data : []).map((p) => mapLever(p, name));
  },
  async ashby({ slug, name }) {
    const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`);
    return (data.jobs || []).filter((p) => p.isListed !== false).map((p) => mapAshby(p, name));
  },
  async smartrecruiters({ slug, name }) {
    const base = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings`;
    const postings = [];
    for (let offset = 0; offset < 500; offset += 100) {
      const page = await getJson(`${base}?limit=100&offset=${offset}&country=in`);
      postings.push(...(page.content || []));
      if (postings.length >= (page.totalFound || 0) || !page.content?.length) break;
    }
    // The list has no descriptions, so each kept posting needs one more request
    const jobs = [];
    for (const p of postings.slice(0, 60)) {
      const detail = await getJson(`${base}/${encodeURIComponent(p.id)}`).catch(() => ({}));
      jobs.push(mapSmartRecruiters(p, name, detail));
    }
    return jobs;
  },
};

// Jobs for one company ({ ats, slug, name }), already narrowed to what Appliqa keeps
async function fetchCompanyJobs(company) {
  const source = SOURCES[company.ats];
  if (!source) throw new Error(`Unknown job source: ${company.ats}`);
  const jobs = await source(company);
  return jobs
    .filter((j) => j.title && j.applyLink && keepJob(j))
    // "Plain text" fields in some feeds still carry tags and entities
    .map((j) => ({ ...j, description: toPlainText(j.description) }));
}

module.exports = { fetchCompanyJobs, SOURCES, keepJob, toPlainText, employmentFrom, mapGreenhouse, mapLever, mapAshby, mapSmartRecruiters };
