const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const requireAuth = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { sendServerError } = require('../lib/errors');
const { feedRoles, feedFilters, profileSkills, matchSkills, rankScore, sameJobKey } = require('../lib/jobFeed');
const { checkJobLink } = require('../lib/linkCheck');
const { checkJob, cleanDealBreakers } = require('../lib/dealBreakers');

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

// The tracker columns come from a migration (applied_at, source, ...). Until it
// has run, writes retry without them so saving and status changes keep working.
const TRACKER_COLUMNS = ['applied_at', 'status_updated_at', 'follow_up_count', 'last_follow_up_at', 'source', 'resume_snapshot'];
const isMissingColumn = (error) => error && (error.code === '42703' || error.code === 'PGRST204');
const withoutTracker = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => !TRACKER_COLUMNS.includes(k)));

// Where an application went, from the job board's name or the link's site
function sourceOf(job) {
  if (job.publisher) return String(job.publisher).replace(/\.com$/i, '').slice(0, 60);
  try {
    return new URL(job.applyLink).hostname.replace(/^www\./, '').slice(0, 60);
  } catch {
    return null;
  }
}

// The resume someone applied with: the one they picked, or their primary one (photo left out)
async function resumeSnapshot(userId, profileId) {
  const { data } = await supabase.from('profiles').select('builder_data').eq('id', userId).maybeSingle();
  const builder = data?.builder_data;
  const list = Array.isArray(builder?.profiles) ? builder.profiles.filter((p) => p && p.id) : [];
  const chosen = list.find((p) => p.id === profileId) || list.find((p) => p.id === builder?.primaryId) || list[0];
  if (!chosen) return null;
  const { photo, ...rest } = chosen.data || {};
  return { id: chosen.id, name: chosen.name || 'Resume', updatedAt: chosen.updatedAt || null, takenAt: new Date().toISOString(), data: rest };
}

const APPLIED_STAGES = new Set(['applied', 'interview', 'offer', 'rejected']);

// Save a job (including custom external jobs)
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { job } = req.body;
    if (!job || !job.title) return res.status(400).json({ error: 'Job title is required' });

    const jobId = job.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const status = job.status || 'saved';
    const now = new Date().toISOString();
    const row = {
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
      status,
      match_score: job.matchScore || 0,
      match_details: job.matchDetails || null,
      cover_letter: job.coverLetter || '',
      recruiter_dm: job.recruiterDM || '',
      source: sourceOf(job),
      status_updated_at: now,
      ...(APPLIED_STAGES.has(status) ? { applied_at: now } : {}),
    };
    let { data: savedJob, error } = await supabase.from('saved_jobs').insert(row).select().single();
    if (isMissingColumn(error)) {
      ({ data: savedJob, error } = await supabase.from('saved_jobs').insert(withoutTracker(row)).select().single());
    }

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
      createdAt: j.created_at,
      appliedAt: j.applied_at || null,
      statusUpdatedAt: j.status_updated_at || null,
      followUpCount: j.follow_up_count || 0,
      lastFollowUpAt: j.last_follow_up_at || null,
      source: j.source || null,
      resumeSnapshot: j.resume_snapshot ? { id: j.resume_snapshot.id, name: j.resume_snapshot.name, takenAt: j.resume_snapshot.takenAt } : null,
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
    if (status !== undefined) {
      updateData.status = status;
      updateData.status_updated_at = new Date().toISOString();
    }

    let { data: job, error } = await supabase
      .from('saved_jobs')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (isMissingColumn(error)) {
      ({ data: job, error } = await supabase.from('saved_jobs').update(withoutTracker(updateData))
        .eq('id', req.params.id).eq('user_id', req.user.id).select().single());
    }
    if (!error && job && APPLIED_STAGES.has(job.status) && 'applied_at' in job && !job.applied_at) {
      await supabase.from('saved_jobs').update({ applied_at: new Date().toISOString() }).eq('id', job.id).eq('user_id', req.user.id);
    }

    if (error) throw error;
    res.json({ success: true, job });
  } catch (error) {
    sendServerError(res, error, 'Failed to update saved job');
  }
});

// Update job status
router.patch('/saved/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, resumeProfileId } = req.body;
    const validStatuses = ['saved', 'applied', 'interview', 'offer', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: current } = await supabase.from('saved_jobs').select('*')
      .eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
    if (!current) return res.status(404).json({ error: 'Job not found' });

    const now = new Date().toISOString();
    const update = { status, status_updated_at: now };
    // First time it's marked applied (or later): remember when, and keep a copy of the resume sent
    if (APPLIED_STAGES.has(status) && !current.applied_at) {
      update.applied_at = now;
      if ('resume_snapshot' in current && !current.resume_snapshot) {
        update.resume_snapshot = await resumeSnapshot(req.user.id, resumeProfileId).catch(() => null);
      }
    }

    let { data: job, error } = await supabase.from('saved_jobs').update(update)
      .eq('id', req.params.id).eq('user_id', req.user.id).select().single();
    if (isMissingColumn(error)) {
      ({ data: job, error } = await supabase.from('saved_jobs').update({ status })
        .eq('id', req.params.id).eq('user_id', req.user.id).select().single());
    }

    if (error) throw error;
    res.json({ success: true, job });
  } catch (error) {
    sendServerError(res, error, 'Failed to update job status');
  }
});

// A follow-up was sent for this application
router.post('/saved/:id/follow-up', requireAuth, async (req, res) => {
  try {
    const { data: current } = await supabase.from('saved_jobs').select('id, follow_up_count')
      .eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
    if (!current) return res.status(404).json({ error: 'Job not found' });
    const update = { follow_up_count: (current.follow_up_count || 0) + 1, last_follow_up_at: new Date().toISOString() };
    const { error } = await supabase.from('saved_jobs').update(update).eq('id', req.params.id).eq('user_id', req.user.id);
    if (isMissingColumn(error)) return res.status(503).json({ error: 'Run the tracker migration to record follow-ups.' });
    if (error) throw error;
    res.json({ success: true, followUpCount: update.follow_up_count, lastFollowUpAt: update.last_follow_up_at });
  } catch (error) {
    sendServerError(res, error, 'Failed to record the follow-up');
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

// --- Trending searches ---
// A term trends when at least two different people searched it in the last 30
// days, so one person repeating a search can't push it up. Ranked by people,
// then by how recently it was searched. TRENDING_HIDE (comma-separated) and the
// list below keep terms out on purpose.
const TRENDING_DAYS = 30;
const TRENDING_MIN_PEOPLE = 2;
const HIDDEN_TRENDING = ['actor', 'acting'];
const hiddenTrending = () => new Set([
  ...HIDDEN_TRENDING,
  ...(process.env.TRENDING_HIDE || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
]);

function trendingSearches(rows, { hidden = new Set(), minPeople = TRENDING_MIN_PEOPLE, max = 7 } = {}) {
  const terms = new Map();
  for (const row of rows) {
    const text = String(row.query || '').trim().replace(/\s+/g, ' ');
    const key = text.toLowerCase();
    if (!key || !row.user_id || hidden.has(key) || !isValidSearchQuery(text, 1)) continue;
    const t = terms.get(key) || { people: new Set(), last: '', spellings: new Map() };
    t.people.add(row.user_id);
    if (String(row.created_at) > t.last) t.last = String(row.created_at);
    t.spellings.set(text, (t.spellings.get(text) || 0) + 1);
    terms.set(key, t);
  }
  return [...terms.values()]
    .filter((t) => t.people.size >= minPeople)
    .sort((a, b) => b.people.size - a.people.size || b.last.localeCompare(a.last))
    .slice(0, max)
    // Show the spelling people used most ("React Developer" over "react developer")
    .map((t) => [...t.spellings.entries()].sort((a, b) => b[1] - a[1] || (/[A-Z]/.test(b[0]) - /[A-Z]/.test(a[0])))[0][0]);
}

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

    // Searches from the last 30 days, counted by how many different people made them
    const since = new Date(Date.now() - TRENDING_DAYS * 86400000).toISOString();
    const { data: rows, error } = await supabase
      .from('search_history')
      .select('user_id, query, created_at')
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) throw error;

    const result = trendingSearches(rows || [], { hidden: hiddenTrending() });
    // Fill the rest with defaults, skipping any already trending
    for (const role of defaultRoles) {
      if (result.length >= 7) break;
      if (!result.some((r) => r.toLowerCase() === role.toLowerCase())) result.push(role);
    }
    
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

const FEED_COLUMNS = 'desired_role, location, country, experience_level, job_type, remote, skills, resume_skills, resume_suggested_roles, resume_experience_level, resume_languages';

async function feedProfile(userId) {
  let { data, error } = await supabase.from('profiles').select(`${FEED_COLUMNS}, deal_breakers, alert_city`).eq('id', userId).maybeSingle();
  if (isMissingColumn(error)) {
    ({ data, error } = await supabase.from('profiles').select(FEED_COLUMNS).eq('id', userId).maybeSingle());
  }
  if (error) throw error;
  return data || {};
}

const recordSeen = (userId, jobs) => {
  const rows = jobs.map((j) => ({ user_id: userId, job_id: j.id, kind: 'seen' }));
  if (!rows.length) return Promise.resolve();
  return supabase.from('job_feed_events').upsert(rows, { onConflict: 'user_id,job_id,kind', ignoreDuplicates: true })
    .then(({ error }) => error && console.warn('[Feed] could not record seen jobs:', error.message));
};

// The "for you" list for one person. Used by the home page and the daily alert email.
// onlyUnseen: just jobs never shown before (for alerts); recordSeen: remember what's returned.
async function buildFeed(userId, { location = '', onlyUnseen = false, size = FEED_SIZE, remember = true } = {}) {
  const profile = await feedProfile(userId);
  const roles = feedRoles(profile);
  if (!roles.length) return { jobs: [], meta: { needsProfile: true } };
  // Without a country JSearch only searches the US, which would be wrong for most people
  if (!String(profile.country || '').trim()) return { jobs: [], meta: { needsCountry: true, roles } };

  const country = profile.country || '';
  const city = location || profile.alert_city || '';
  const { experience, employmentType } = feedFilters(profile);
  const base = { location: city, country, experience, employmentType, page: 1 };

  const settle = (promises) => Promise.allSettled(promises)
    .then((all) => all.flatMap((r) => (r.status === 'fulfilled' ? r.value.result.jobs : [])));

  let pool = await settle(roles.map((role) => findJobs({ ...base, query: role, datePosted: 'week' })));
  // A quiet week: widen the first role to the past month, then to the whole country
  if (pool.length < FEED_SIZE) {
    pool = pool.concat(await settle([findJobs({ ...base, query: roles[0], datePosted: 'month' })]));
  }
  if (pool.length < FEED_SIZE && city && country) {
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
  // Deal-breakers the person ticked hide a job; other warning signs are shown on the card
  const dealBreakers = cleanDealBreakers(profile.deal_breakers);
  const languages = profile.resume_languages || [];
  let blockedCount = 0;
  let candidates = [];
  for (const job of unique.values()) {
    const flags = checkJob(job, { dealBreakers, languages });
    if (flags.some((f) => f.hard)) {
      blockedCount += 1;
      continue;
    }
    candidates.push(flags.length ? { ...job, flags } : job);
  }

  const seen = await feedEvents(userId, 'seen', candidates.map((j) => j.id));
  const firstSeen = new Map((seen || []).map((e) => [e.job_id, new Date(e.created_at).getTime()]));
  if (onlyUnseen) candidates = candidates.filter((j) => !firstSeen.has(j.id));
  const skills = profileSkills(profile);

  const ranked = candidates
    .map((job) => {
      const matchedSkills = matchSkills(job, skills);
      const seenAt = firstSeen.get(job.id);
      const isNew = seen !== null && (!seenAt || Date.now() - seenAt < NEW_WINDOW);
      return { job: { ...job, matchedSkills, isNew }, score: rankScore(job, { matched: matchedSkills, roles, isNew, prefersRemote: !!profile.remote }) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, size)
    .map((r) => r.job);

  // Remember what was shown, so it stops counting as new after a day
  if (remember && seen !== null) await recordSeen(userId, ranked.filter((j) => !firstSeen.has(j.id)));

  return {
    jobs: ranked,
    meta: {
      roles,
      location: city,
      experience,
      employmentType,
      skillsCount: skills.length,
      newCount: ranked.filter((j) => j.isNew).length,
      available: candidates.length,
      hiddenCount: hiddenIds.size,
      blockedCount,
      dealBreakers,
      remembers: seen !== null,
    },
    profile,
  };
}

router.get('/feed', requireAuth, feedLimiter, async (req, res) => {
  try {
    // The client sends the city it worked out from the saved address
    const location = String(req.query.location || '').slice(0, 60);
    const { jobs, meta, profile } = await buildFeed(req.user.id, { location });
    res.json({ success: true, jobs, meta });
    // Keep the city for the alert email, which runs without the browser
    if (location && profile && 'alert_city' in profile && profile.alert_city !== location) {
      supabase.from('profiles').update({ alert_city: location }).eq('id', req.user.id).then(() => {});
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
module.exports.buildFeed = buildFeed;
module.exports.recordSeen = recordSeen;
module.exports.trendingSearches = trendingSearches;

