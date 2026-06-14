const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const requireAuth = require('../middleware/auth');

const JSEARCH_BASE = 'https://jsearch.p.rapidapi.com';

// --- In-memory search cache (15-minute TTL) ---
const searchCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function getCached(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
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

// Optional auth middleware — attaches user if token is valid, but doesn't block
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) req.user = user;
    }
  } catch (_) {}
  next();
};

// Search jobs via JSearch API
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const {
      query = 'developer',
      location = '',
      country = '',
      page = 1,
      employmentType = '',
      datePosted = '',
      remote = '',
      radius = ''
    } = req.query;

    const userId = req.user?.id; // From optional auth middleware

    let searchQuery = query;
    if (location && country) {
      searchQuery += ` in ${location}, ${country}`;
    } else if (country) {
      searchQuery += ` in ${country}`;
    } else if (location) {
      searchQuery += ` in ${location}`;
    }

    const params = new URLSearchParams({
      query: searchQuery,
      page: String(page),
      num_pages: '1',
      date_posted: datePosted || 'all'
    });

    if (employmentType) params.append('employment_types', employmentType);
    if (remote === 'true') params.append('remote_jobs_only', 'true');
    if (radius) params.append('radius', radius);

    const cacheKey = params.toString();
    
    // 1. Check in-memory cache first
    const cachedInMemory = getCached(cacheKey);
    if (cachedInMemory) {
      return res.json({ success: true, ...cachedInMemory, fromCache: true, fromMemory: true });
    }

    // 2. Check Supabase DB cache (valid for 24 hours)
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: dbCacheEntry, error: dbCacheError } = await supabase
        .from('search_cache')
        .select('job_ids, created_at')
        .eq('cache_key', cacheKey)
        .gt('created_at', oneDayAgo)
        .maybeSingle();

      if (dbCacheEntry && dbCacheEntry.job_ids && dbCacheEntry.job_ids.length > 0) {
        const { data: dbJobs, error: dbJobsError } = await supabase
          .from('job_cache')
          .select('*')
          .in('id', dbCacheEntry.job_ids);

        if (dbJobs && dbJobs.length > 0) {
          const mappedJobs = dbCacheEntry.job_ids
            .map(id => {
              const found = dbJobs.find(j => j.id === id);
              if (!found) return null;
              return {
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
              };
            })
            .filter(Boolean);

          const result = { jobs: mappedJobs, totalResults: mappedJobs.length, page: parseInt(page) };
          setCache(cacheKey, result);

          return res.json({ success: true, ...result, fromCache: true, fromDatabase: true });
        }
      }
    } catch (dbReadError) {
      console.error('Failed to read from Supabase cache:', dbReadError);
    }

    // 3. Cache miss: Fetch from JSearch API
    const response = await fetch(`${JSEARCH_BASE}/search?${params}`, {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'jsearch.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('JSearch API error:', response.status, errText);
      return res.status(response.status).json({
        error: 'Job search API error',
        message: response.status === 429 ? 'API rate limit exceeded.' : 'Failed to fetch jobs'
      });
    }

    const data = await response.json();

    const jobs = (data.data || []).map(job => ({
      id: job.job_id,
      title: job.job_title,
      company: job.employer_name,
      companyLogo: job.employer_logo,
      location: job.job_city ? `${job.job_city}, ${job.job_state || ''} ${job.job_country}` : job.job_country,
      description: job.job_description,
      employmentType: job.job_employment_type,
      salary: job.job_min_salary && job.job_max_salary
        ? `$${job.job_min_salary.toLocaleString()} - $${job.job_max_salary.toLocaleString()}`
        : job.job_salary_period ? `${job.job_salary_period}` : 'Not specified',
      datePosted: job.job_posted_at_datetime_utc,
      applyLink: job.job_apply_link,
      remote: job.job_is_remote,
      highlights: job.job_highlights || {},
      requiredSkills: job.job_required_skills || [],
      requiredExperience: job.job_required_experience || {}
    }));

    const result = { jobs, totalResults: data.data?.length || 0, page: parseInt(page) };
    setCache(cacheKey, result);
    // Return the response immediately to the user to minimize latency
    res.json({ success: true, ...result });

    // --- Background Operations (Asynchronous) ---

    // 1. Save search history in the background
    if (userId) {
      (async () => {
        try {
          const cleanQuery = query.trim().replace(/\s+/g, ' ');
          if (isValidSearchQuery(cleanQuery, jobs.length)) {
            const { error: historyError } = await supabase.from('search_history').insert({
              user_id: userId,
              query: cleanQuery,
              filter_location: location,
              filter_employment_type: employmentType,
              filter_date_posted: datePosted,
              filter_remote: remote === 'true',
              results_count: jobs.length
            });
            if (historyError) {
              console.error('Failed to save search history to Supabase:', historyError);
            }
          }
        } catch (e) {
          console.error('Failed to save search history', e);
        }
      })();
    }

    // 2. Save to Supabase Caching Layer in the background
    if (jobs.length > 0) {
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

          // Upsert job details
          const { error: upsertJobsError } = await supabase
            .from('job_cache')
            .upsert(jobCacheRows, { onConflict: 'id' });

          if (upsertJobsError) {
            console.error('Failed to upsert jobs into job_cache:', upsertJobsError);
          } else {
            // Save query mapping
            const jobIds = jobs.map(j => j.id);
            const { error: upsertSearchError } = await supabase
              .from('search_cache')
              .upsert({
                cache_key: cacheKey,
                job_ids: jobIds,
                created_at: new Date().toISOString()
              }, { onConflict: 'cache_key' });

            if (upsertSearchError) {
              console.error('Failed to upsert search_cache:', upsertSearchError);
            }
          }
        } catch (cacheError) {
          console.error('Error writing to database cache:', cacheError);
        }
      })();
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Save a job
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { job } = req.body;
    if (!job) return res.status(400).json({ error: 'job required' });

    const { data: savedJob, error } = await supabase.from('saved_jobs').insert({
      user_id: req.user.id,
      job_id: job.id,
      title: job.title,
      company: job.company || '',
      location: job.location || '',
      salary: job.salary || '',
      description: job.description || '',
      employment_type: job.employmentType || '',
      apply_link: job.applyLink || '',
      company_logo: job.companyLogo || '',
      date_posted: job.datePosted || '',
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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

    // Fetch top 7 searches directly from the database view
    const { data: topSearches, error } = await supabase
      .from('top_searches')
      .select('query')
      .limit(7);

    if (error) throw error;

    const resultSet = new Set();
    if (topSearches && topSearches.length > 0) {
      topSearches.forEach(row => {
        if (row.query) resultSet.add(row.query);
      });
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

module.exports = router;

