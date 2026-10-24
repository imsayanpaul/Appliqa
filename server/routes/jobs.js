const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const requireAuth = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { sendServerError } = require('../lib/errors');
const { feedRoles, feedFilters, profileSkills, matchSkills, rankScore, sameJobKey } = require('../lib/jobFeed');
const { checkJobLink } = require('../lib/linkCheck');

const JSEARCH_BASE = 'https://jsearch.p.rapidapi.com';

// --- Search caches ---
// Fresh-job searches ("Past 24 hours") expire quickly so new postings show up during
// the day; everything else keeps the long cache to save JSearch quota.
const HOUR = 60 * 60 * 1000;
const FRESH_FILTERS = new Set(['24h', 'today']);
const cacheTtl = (datePosted) => {
  if (FRESH_FILTERS.has(datePosted)) return { memory: 10 * 60 * 1000, db: HOUR };
  if (datePosted === '3days') return { memory: 15 * 60 * 1000, db: 6 * HOUR };
  return { memory: 15 * 60 * 1000, db: 24 * HOUR };
};

const searchCache = new Map();

function getCached(key, ttl) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  if (searchCache.size > 200) {
    const oldest = searchCache.keys().next().value;
    searchCache.delete(oldest);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

function isValidSearchQuery(q, resultsCount) {
  if (!q || typeof q !== 'string') return false;
  
  const trimmed = q.trim();
  
  // 1. Length check: view top_searches requires length between 3 and 25
  if (trimmed.length < 3 || trimmed.length > 25) return false;
  
  // 2. Must return results (gibberish/typos usually return 0 jobs)
  if (resultsCount === undefined || resultsCount === null || resultsCount === 0) return false;
  
  // 3. Characters check: only allow letters, numbers, spaces, and common job/tech chars: #, +, -, /, .
  const validCharsRegex = /^[a-zA-Z0-9\s+#\-\/.]+$/;
  if (!validCharsRegex.test(trimmed)) return false;
  
  // 4. No 3 or more consecutive identical characters (e.g. 'xxx', 'aaa')
  if (/(.)\1\1/.test(trimmed)) return false;
  
  // 5. Avoid common test inputs and gibberish keymashes
  const lowercase = trimmed.toLowerCase();
  const blacklist = ['test', 'testing', 'asdf', 'qwerty', 'zxcv', 'ghjk', 'fake', 'dummy', 'hello', 'world', 'none', 'null', 'undefined'];
  if (blacklist.includes(lowercase)) return false;
  if (lowercase.includes('asdf') || lowercase.includes('qwerty') || lowercase.includes('zxcv') || lowercase.includes('ghjk')) return false;
  
  // 6. Must contain at least one vowel to filter out consonant-only keymashes (e.g., 'sdfgh', 'qwrty')
  // Allow common tech/business acronyms that don't have vowels (like 'AWS', 'QA', 'PR', 'IT', 'JS', 'TS', 'CSS', 'SQL', 'PHP', 'ML', 'HR')
  const hasVowel = /[aeiouy]/i.test(trimmed);
  const allowedAcronyms = ['aws', 'qa', 'pr', 'it', 'js', 'ts', 'css', 'sql', 'php', 'ml', 'hr'];
  if (!hasVowel && !allowedAcronyms.includes(lowercase)) return false;
  
  return true;
}

// JSearch searches one country's index (default "us"), so map the picker to ISO codes
const COUNTRY_CODES = {
  'india': 'in', 'united states': 'us', 'usa': 'us', 'united kingdom': 'gb', 'uk': 'gb', 'canada': 'ca',
  'germany': 'de', 'australia': 'au', 'singapore': 'sg', 'uae': 'ae', 'united arab emirates': 'ae',
  'netherlands': 'nl', 'japan': 'jp'
};

const SENIOR_TITLE = /\b(senior|sr\.?|lead|principal|staff|head|director|manager|architect|vp)\b/i;
const INTERN_TITLE = /\b(intern|internship|trainee|apprentice)/i;

// JSearch treats these filters loosely, so tighten the page of results
const isInternship = (job) => /intern/i.test(job.employmentType || '') || INTERN_TITLE.test(job.title || '');

const ENTRY_LEVEL = /\b(fresher|freshers|entry[\s-]?level|graduate|trainee|no experience|0\s*(?:-|–|to)\s*[12]\s*(?:years?|yrs?))\b/i;
const YEARS = '(?:years?|yrs?)';
const EXPERIENCE_PATTERNS = [
  new RegExp(`(\\d{1,2})\\s*\\+\\s*${YEARS}`, 'gi'),                                   // 3+ years
  new RegExp(`(\\d{1,2})\\s*(?:-|–|to)\\s*\\d{1,2}\\s*${YEARS}`, 'gi'),               // 3-5 years
  new RegExp(`(?:minimum|min\\.?|at\\s*least|atleast)\\s*(?:of\\s*)?(\\d{1,2})\\s*${YEARS}`, 'gi'), // minimum 3 years
  new RegExp(`(\\d{1,2})\\s*${YEARS}\\s*(?:of\\s*)?(?:relevant\\s*|professional\\s*|hands[\\s-]on\\s*)?(?:experience|exp)\\b`, 'gi'), // 3 years of experience
];

// The smallest number of years a posting asks for, or null when it doesn't say.
// Smallest, so "0-2 years" wins over an unrelated "20 years in business".
function requiredYears(text) {
  let min = null;
  for (const re of EXPERIENCE_PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const n = Number(m[1]);
      if (!Number.isNaN(n) && (min === null || n < min)) min = n;
    }
  }
  return min;
}

const isEntryLevel = (job) => {
  const title = job.title || '';
  if (SENIOR_TITLE.test(title)) return false;
  if (ENTRY_LEVEL.test(title)) return true;
  const years = requiredYears(`${title} ${job.description || ''}`);
  return years === null || years < 2;
};

const typeMentions = {
  CONTRACTOR: /\b(contract|contractor|freelance|freelancer|fixed[\s-]?term|consultant basis)\b/i,
  PARTTIME: /\bpart[\s-]?time\b/i,
};
const matchesType = (job, wanted) => {
  const pattern = typeMentions[wanted];
  if (!pattern) return true; // full time and "all types" stay as JSearch returns them
  const tagged = (job.employmentTypes || []).includes(wanted) || pattern.test(job.employmentType || '');
  return tagged || pattern.test(job.title || '') || pattern.test(job.description || '');
};

const matchesFilters = (job, { remote, employmentType, experience }) => {
  if (remote === 'true' && !job.remote) return false;
  if (employmentType === 'INTERN' && (!isInternship(job) || SENIOR_TITLE.test(job.title || ''))) return false;
  if (employmentType && !matchesType(job, employmentType)) return false;
  if (experience === 'fresher' && !isEntryLevel(job)) return false;
  return true;
};

// Each uncached search spends RapidAPI quota
const searchLimiter = rateLimit({ name: 'jobs-search', windowMs: 60 * 1000, maxAuthed: 40, maxAnon: 15 });

const mapCachedJob = (found) => ({
  id: found.id,
  title: found.title,
  company: found.company,
  companyLogo: found.company_logo,
  location: found.location,
  description: found.description,
  employmentType: found.employment_type,
  salary: found.salary,
  datePosted: found.date_posted,
  applyLink: found.apply_link,
  remote: found.remote,
  highlights: found.highlights || {},
  requiredSkills: found.required_skills || [],
  requiredExperience: found.required_experience || {}
});

const mapJSearchJob = (job) => ({
  id: job.job_id,
  title: job.job_title,
  company: job.employer_name,
  companyLogo: job.employer_logo,
  location: job.job_city ? `${job.job_city}, ${job.job_state || ''} ${job.job_country}` : job.job_country,
  description: job.job_description,
  employmentType: job.job_employment_type,
  employmentTypes: job.job_employment_types || [],
  salary: job.job_min_salary && job.job_max_salary
    ? `$${job.job_min_salary.toLocaleString('en-US')} - $${job.job_max_salary.toLocaleString('en-US')}`
    : job.job_salary_period ? `${job.job_salary_period}` : 'Not specified',
  datePosted: job.job_posted_at_datetime_utc,
  applyLink: job.job_apply_link,
  publisher: job.job_publisher || '',
  remote: job.job_is_remote,
  highlights: job.job_highlights || {},
  requiredSkills: job.job_required_skills || [],
  requiredExperience: job.job_required_experience || {}
});

// Saves a fresh JSearch page to the shared Supabase cache (in the background)
function writeDbCache(cacheKey, jobs) {
  if (!jobs.length) return;
  (async () => {
    try {
      const jobCacheRows = jobs.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company || '',
        location: j.location || '',
        salary: j.salary || '',
        description: j.description || '',
        employment_type: j.employmentType || '',
        apply_link: j.applyLink || '',
        company_logo: j.companyLogo || '',
        date_posted: j.datePosted || '',
        remote: j.remote || false,
        highlights: j.highlights || {},
        required_skills: j.requiredSkills || [],
        required_experience: j.requiredExperience || {}
      }));

      const { error: upsertJobsError } = await supabase
        .from('job_cache')
        .upsert(jobCacheRows, { onConflict: 'id' });
      if (upsertJobsError) {
        console.error('Failed to upsert jobs into job_cache:', upsertJobsError);
        return;
      }
      const { error: upsertSearchError } = await supabase
        .from('search_cache')
        .upsert({ cache_key: cacheKey, job_ids: jobs.map(j => j.id), created_at: new Date().toISOString() }, { onConflict: 'cache_key' });
      if (upsertSearchError) console.error('Failed to upsert search_cache:', upsertSearchError);
    } catch (cacheError) {
      console.error('Error writing to database cache:', cacheError);
    }
  })();
}

// One page of jobs for a search: the memory cache, then the shared Supabase
// cache, then JSearch. Used by the search page and the "for you" feed.
async function findJobs({ query = 'developer', location = '', country = '', page = 1, employmentType = '', datePosted = '', remote = '', experience = '', radius = '' }) {
  let searchQuery = query;
  const countryCode = COUNTRY_CODES[String(country).trim().toLowerCase()] || '';
  // "Fresher" is how Indian listings say entry level; it beats the API's experience filter
  if (experience === 'fresher') {
    searchQuery += countryCode === 'in' ? ' fresher' : ' entry level';
  }
  if (location && country) {
    searchQuery += ` in ${location}, ${country}`;
  } else if (country) {
    searchQuery += ` in ${country}`;
  } else if (location) {
    searchQuery += ` in ${location}`;
  }

  // "24h" is our label for JSearch's freshest window, which it calls "today"
  const fresh = FRESH_FILTERS.has(datePosted);
  const ttl = cacheTtl(datePosted);
  const params = new URLSearchParams({
    query: searchQuery,
    page: String(page),
    num_pages: '1',
    date_posted: fresh ? 'today' : (datePosted || 'all')
  });

  if (countryCode) params.append('country', countryCode);
  if (employmentType) params.append('employment_types', employmentType);
  // remote_jobs_only was retired by JSearch and is silently ignored
  if (remote === 'true') params.append('work_from_home', 'true');
  if (radius) params.append('radius', radius);

  const cacheKey = params.toString();

  // 1. In-memory cache
  const cachedInMemory = getCached(cacheKey, ttl.memory);
  if (cachedInMemory) return { result: cachedInMemory, fromMemory: true };

  // 2. Supabase cache (1 hour for fresh-job searches, up to 24 hours otherwise)
  try {
    const freshSince = new Date(Date.now() - ttl.db).toISOString();
    const { data: dbCacheEntry } = await supabase
      .from('search_cache')
      .select('job_ids, created_at')
      .eq('cache_key', cacheKey)
      .gt('created_at', freshSince)
      .maybeSingle();

    if (dbCacheEntry?.job_ids?.length) {
      const { data: dbJobs } = await supabase
        .from('job_cache')
        .select('*')
        .in('id', dbCacheEntry.job_ids);

      if (dbJobs?.length) {
        const byId = new Map(dbJobs.map((j) => [j.id, j]));
        const mappedJobs = dbCacheEntry.job_ids
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map(mapCachedJob)
          // Re-apply the filters: older cache entries were saved under looser rules
          .filter((job) => matchesFilters(job, { remote, employmentType, experience }));

        const result = { jobs: mappedJobs, totalResults: mappedJobs.length, page: parseInt(page) };
        setCache(cacheKey, result);
        return { result, fromDatabase: true };
      }
    }
  } catch (dbReadError) {
    console.error('Failed to read from Supabase cache:', dbReadError);
  }

  // 3. Cache miss: JSearch
  const response = await fetch(`${JSEARCH_BASE}/search?${params}`, {
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
      'x-rapidapi-host': 'jsearch.p.rapidapi.com'
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('JSearch API error:', response.status, errText);
    const err = new Error('Job search API error');
    err.status = response.status;
    err.apiMessage = response.status === 429 ? 'API rate limit exceeded.' : 'Failed to fetch jobs';
    throw err;
  }

  const data = await response.json();
  const jobs = (data.data || []).map(mapJSearchJob);

  let filtered = jobs.filter((job) => matchesFilters(job, { remote, employmentType, experience }));
  if (fresh) {
    // Keep only the last 24 hours (JSearch's "today" is loose) and show the newest first
    const cutoff = Date.now() - 24 * HOUR;
    filtered = filtered
      .filter((job) => !job.datePosted || new Date(job.datePosted).getTime() >= cutoff)
      .sort((a, b) => (new Date(b.datePosted).getTime() || 0) - (new Date(a.datePosted).getTime() || 0));
  }
  const result = { jobs: filtered, totalResults: filtered.length, page: parseInt(page) };
  setCache(cacheKey, result);
  writeDbCache(cacheKey, filtered);
  return { result };
}

// Search jobs via JSearch API
router.get('/search', optionalAuth, searchLimiter, async (req, res) => {
  try {
    const {
      query = 'developer',
      location = '',
      employmentType = '',
      datePosted = '',
      remote = '',
      page = 1,
      record = '1' // '0' for background searches that shouldn't appear in history
    } = req.query;
    const userId = req.user?.id; // From optional auth middleware

    // Record the search in the person's history (in the background), whether
    // the results came from a cache or from JSearch. First page only; a repeat
    // of an older search replaces it so it moves to the top.
    const saveHistory = (resultsCount) => {
      if (!userId || record === '0' || Number(page) !== 1) return;
      (async () => {
        try {
          const cleanQuery = query.trim().replace(/\s+/g, ' ');
          // Personal history keeps every real search (long ones, punctuation,
          // no results). The stricter isValidSearchQuery only guards trending.
          if (cleanQuery.length < 2 || cleanQuery.length > 120) return;
          await supabase.from('search_history').delete()
            .eq('user_id', userId)
            .ilike('query', cleanQuery.replace(/[\\%_]/g, '\\$&'));
          const { error: historyError } = await supabase.from('search_history').insert({
            user_id: userId,
            query: cleanQuery,
            filter_location: location,
            filter_employment_type: employmentType,
            filter_date_posted: datePosted,
            filter_remote: remote === 'true',
            results_count: resultsCount
          });
          if (historyError) console.error('Failed to save search history to Supabase:', historyError);
        } catch (e) {
          console.error('Failed to save search history', e);
        }
      })();
    };

    let found;
    try {
      found = await findJobs(req.query);
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: 'Job search API error', message: err.apiMessage });
      throw err;
    }
    const { result, fromMemory, fromDatabase } = found;
    saveHistory(result.jobs?.length || 0);
    const flags = fromMemory ? { fromCache: true, fromMemory: true } : fromDatabase ? { fromCache: true, fromDatabase: true } : {};
    res.json({ success: true, ...result, ...flags });
  } catch (error) {
    sendServerError(res, error, 'Job search failed');
  }
});

// Save a job (including custom external jobs)
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { job } = req.body;
    if (!job || !job.title) return res.status(400).json({ error: 'Job title is required' });

    const jobId = job.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { data: savedJob, error } = await supabase.from('saved_jobs').insert({
      user_id: req.user.id,
      job_id: jobId,
      title: job.title,
      company: job.company || 'Direct Employer',
      location: job.location || '',
      salary: job.salary || '',
      description: job.description || '',
      employment_type: job.employmentType || 'Full-time',
      apply_link: job.applyLink || '',
      company_logo: job.companyLogo || '',
      date_posted: job.datePosted || new Date().toISOString(),
      status: job.status || 'saved',
      match_score: job.matchScore || 0,
      match_details: job.matchDetails || null,
      cover_letter: job.coverLetter || '',
      recruiter_dm: job.recruiterDM || ''
    }).select().single();

    if (error) {
      if (error.code === '23505') { // Postgres Unique violation
        return res.status(409).json({ error: 'Job already saved' });
      }
      throw error;
    }

    res.json({ success: true, savedJob });
  } catch (error) {
    sendServerError(res, error, 'Failed to save job');
  }
});

// Get saved jobs
router.get('/saved', requireAuth, async (req, res) => {
  try {
    const { data: jobs, error } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform from snake_case database to camelCase frontend expectations
    const formattedJobs = jobs.map(j => ({
      _id: j.id,
      jobId: j.job_id,
      title: j.title,
      company: j.company,
      location: j.location,
      salary: j.salary,
      description: j.description,
      employmentType: j.employment_type,
      applyLink: j.apply_link,
      companyLogo: j.company_logo,
      datePosted: j.date_posted,
      matchScore: j.match_score,
      matchDetails: j.match_details,
      coverLetter: j.cover_letter,
      recruiterDM: j.recruiter_dm,
      interviewPrep: j.interview_prep,
      status: j.status,
      createdAt: j.created_at
    }));

    res.json({ success: true, jobs: formattedJobs });
  } catch (error) {
    sendServerError(res, error, 'Failed to load saved jobs');
  }
});

// Update saved job details (e.g. for custom opportunities)
router.patch('/saved/:id', requireAuth, async (req, res) => {
  try {
    const { title, company, location, salary, applyLink, description, status } = req.body;
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (company !== undefined) updateData.company = company;
    if (location !== undefined) updateData.location = location;
    if (salary !== undefined) updateData.salary = salary;
    if (applyLink !== undefined) updateData.apply_link = applyLink;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const { data: job, error } = await supabase
      .from('saved_jobs')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, job });
  } catch (error) {
    sendServerError(res, error, 'Failed to update saved job');
  }
});

// Update job status
router.patch('/saved/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['saved', 'applied', 'interview', 'offer', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: job, error } = await supabase
      .from('saved_jobs')
      .update({ status })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id) // Ensure they own it
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, job });
  } catch (error) {
    sendServerError(res, error, 'Failed to update job status');
  }
});

// Save cover letter to a saved job
router.patch('/saved/:id/cover-letter', requireAuth, async (req, res) => {
  try {
    const { coverLetter } = req.body;
    if (!coverLetter) return res.status(400).json({ error: 'coverLetter is required' });

    const { data: job, error } = await supabase
      .from('saved_jobs')
      .update({ cover_letter: coverLetter })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, job });
  } catch (error) {
    sendServerError(res, error, 'Failed to save cover letter');
  }
});

// Save recruiter DM to a saved job
router.patch('/saved/:id/recruiter-dm', requireAuth, async (req, res) => {
  try {
    const { recruiterDM } = req.body;
    if (!recruiterDM) return res.status(400).json({ error: 'recruiterDM is required' });

    const { data: job, error } = await supabase
      .from('saved_jobs')
      .update({ recruiter_dm: recruiterDM })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, job });
  } catch (error) {
    sendServerError(res, error, 'Failed to save recruiter DM');
  }
});

// Delete saved job
router.delete('/saved/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    sendServerError(res, error, 'Failed to delete saved job');
  }
});

// Save interview prep to a saved job
router.patch('/saved/:id/interview-prep', requireAuth, async (req, res) => {
  try {
    const { interviewPrep } = req.body;
    if (!interviewPrep) return res.status(400).json({ error: 'interviewPrep is required' });

    const { data: job, error } = await supabase
      .from('saved_jobs')
      .update({ interview_prep: typeof interviewPrep === 'string' ? interviewPrep : JSON.stringify(interviewPrep) })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, job });
  } catch (error) {
    sendServerError(res, error, 'Failed to save interview prep');
  }
});

// Cache for suggested roles (5 minutes TTL)
let suggestedRolesCache = null;
let suggestedRolesCacheTime = 0;
const SUGGESTED_ROLES_TTL = 5 * 60 * 1000;

const defaultRoles = [
  'React Developer',
  'Python Engineer',
  'Data Scientist',
  'UI/UX Designer',
  'DevOps Engineer',
  'Full Stack',
  'Machine Learning',
  'Product Manager'
];

router.get('/suggested-roles', async (req, res) => {
  try {
    const now = Date.now();
    if (suggestedRolesCache && (now - suggestedRolesCacheTime < SUGGESTED_ROLES_TTL)) {
      return res.json({ success: true, roles: suggestedRolesCache });
    }

    // Popular searches from the database view; history now keeps every search,
    // so screen out long, odd or junk queries here before they trend
    const { data: topSearches, error } = await supabase
      .from('top_searches')
      .select('query')
      .limit(40);

    if (error) throw error;

    const resultSet = new Set();
    for (const row of topSearches || []) {
      if (resultSet.size >= 7) break;
      if (row.query && isValidSearchQuery(row.query, 1)) resultSet.add(row.query);
    }

    // Merge with defaults if we have fewer than 7 dynamic popular searches
    for (const role of defaultRoles) {
      if (resultSet.size >= 7) break;
      resultSet.add(role);
    }

    const result = Array.from(resultSet).slice(0, 7);
    
    // Update cache
    suggestedRolesCache = result;
    suggestedRolesCacheTime = now;

    res.json({ success: true, roles: result });
  } catch (error) {
    console.error('Failed to fetch suggested roles:', error);
    res.json({ success: true, roles: defaultRoles });
  }
});

// --- "For you" feed ---
// Runs searches built from the person's profile, drops jobs they've saved or
// hidden, marks the ones they haven't seen yet and ranks by skill match.
const feedLimiter = rateLimit({ name: 'jobs-feed', windowMs: 60 * 1000, maxAuthed: 20, maxAnon: 0 });
const FEED_SIZE = 12;
const NEW_WINDOW = 24 * HOUR;

async function feedEvents(userId, kind, jobIds) {
  let q = supabase.from('job_feed_events').select('job_id, created_at').eq('user_id', userId).eq('kind', kind);
  if (jobIds) q = q.in('job_id', jobIds);
  const { data, error } = await q.limit(5000);
  if (error) {
    // Table not created yet: the feed still works, just without seen/hidden memory
    console.warn('[Feed] job_feed_events:', error.message);
    return null;
  }
  return data || [];
}

router.get('/feed', requireAuth, feedLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('desired_role, location, country, experience_level, job_type, remote, skills, resume_skills, resume_suggested_roles, resume_experience_level')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) throw profileError;

    const roles = feedRoles(profile || {});
    if (!roles.length) return res.json({ success: true, jobs: [], meta: { needsProfile: true } });

    // The client sends the city it worked out from the saved address
    const location = String(req.query.location || '').slice(0, 60);
    const country = profile.country || '';
    const { experience, employmentType } = feedFilters(profile);
    const base = { location, country, experience, employmentType, page: 1 };

    const settle = (promises) => Promise.allSettled(promises)
      .then((all) => all.flatMap((r) => (r.status === 'fulfilled' ? r.value.result.jobs : [])));

    let pool = await settle(roles.map((role) => findJobs({ ...base, query: role, datePosted: 'week' })));
    // A quiet week: widen the first role to the past month, then to the whole country
    if (pool.length < FEED_SIZE) {
      pool = pool.concat(await settle([findJobs({ ...base, query: roles[0], datePosted: 'month' })]));
    }
    if (pool.length < FEED_SIZE && location && country) {
      pool = pool.concat(await settle([findJobs({ ...base, location: '', query: roles[0], datePosted: 'week' })]));
    }

    const [savedRes, hidden] = await Promise.all([
      supabase.from('saved_jobs').select('job_id, title, company').eq('user_id', userId),
      feedEvents(userId, 'dismissed'),
    ]);
    const savedIds = new Set((savedRes.data || []).map((j) => j.job_id));
    const savedKeys = new Set((savedRes.data || []).map(sameJobKey));
    const hiddenIds = new Set((hidden || []).map((e) => e.job_id));

    const unique = new Map();
    for (const job of pool) {
      const key = sameJobKey(job);
      if (!job.id || savedIds.has(job.id) || hiddenIds.has(job.id) || savedKeys.has(key) || unique.has(key)) continue;
      unique.set(key, job);
    }
    const candidates = [...unique.values()];

    const seen = await feedEvents(userId, 'seen', candidates.map((j) => j.id));
    const firstSeen = new Map((seen || []).map((e) => [e.job_id, new Date(e.created_at).getTime()]));
    const skills = profileSkills(profile);

    const ranked = candidates
      .map((job) => {
        const matchedSkills = matchSkills(job, skills);
        const seenAt = firstSeen.get(job.id);
        const isNew = seen !== null && (!seenAt || Date.now() - seenAt < NEW_WINDOW);
        return { job: { ...job, matchedSkills, isNew }, score: rankScore(job, { matched: matchedSkills, roles, isNew, prefersRemote: !!profile.remote }) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, FEED_SIZE)
      .map((r) => r.job);

    res.json({
      success: true,
      jobs: ranked,
      meta: {
        roles,
        location,
        experience,
        employmentType,
        skillsCount: skills.length,
        newCount: ranked.filter((j) => j.isNew).length,
        available: candidates.length,
        hiddenCount: hiddenIds.size,
        remembers: seen !== null,
      },
    });

    // Remember what was shown, so it stops counting as new after a day
    const unseen = ranked.filter((j) => !firstSeen.has(j.id)).map((j) => ({ user_id: userId, job_id: j.id, kind: 'seen' }));
    if (unseen.length && seen !== null) {
      supabase.from('job_feed_events').upsert(unseen, { onConflict: 'user_id,job_id,kind', ignoreDuplicates: true })
        .then(({ error }) => error && console.warn('[Feed] could not record seen jobs:', error.message));
    }
  } catch (error) {
    sendServerError(res, error, 'Failed to load your feed');
  }
});

const validJobId = (id) => typeof id === 'string' && id.length > 0 && id.length <= 200;

// "Not interested": hide a job from the feed for good
router.post('/feed/dismiss', requireAuth, feedLimiter, async (req, res) => {
  try {
    const { jobId } = req.body || {};
    if (!validJobId(jobId)) return res.status(400).json({ error: 'jobId is required' });
    const { error } = await supabase.from('job_feed_events')
      .upsert({ user_id: req.user.id, job_id: jobId, kind: 'dismissed' }, { onConflict: 'user_id,job_id,kind', ignoreDuplicates: true });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    sendServerError(res, error, 'Failed to hide the job');
  }
});

router.delete('/feed/dismiss/:jobId', requireAuth, feedLimiter, async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!validJobId(jobId)) return res.status(400).json({ error: 'jobId is required' });
    const { error } = await supabase.from('job_feed_events')
      .delete().eq('user_id', req.user.id).eq('job_id', jobId).eq('kind', 'dismissed');
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    sendServerError(res, error, 'Failed to restore the job');
  }
});

// Whether a posting's apply page still looks open. Cached per link for 6 hours.
const linkLimiter = rateLimit({ name: 'jobs-link-status', windowMs: 60 * 1000, maxAuthed: 20, maxAnon: 0 });
const linkStatusCache = new Map();

router.get('/link-status', requireAuth, linkLimiter, async (req, res) => {
  try {
    const url = String(req.query.url || '');
    if (!url || url.length > 2000) return res.status(400).json({ error: 'url is required' });
    const cached = linkStatusCache.get(url);
    if (cached && Date.now() - cached.at < 6 * HOUR) return res.json({ success: true, ...cached.result });
    const result = await checkJobLink(url);
    if (linkStatusCache.size > 2000) linkStatusCache.delete(linkStatusCache.keys().next().value);
    linkStatusCache.set(url, { at: Date.now(), result });
    res.json({ success: true, ...result });
  } catch (error) {
    sendServerError(res, error, 'Failed to check the link');
  }
});

module.exports = router;

