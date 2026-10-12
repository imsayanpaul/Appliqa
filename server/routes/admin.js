// Admin-only overview of users. Access is limited to emails listed in ADMIN_EMAILS
// (comma-separated, set on the server). Anyone else gets a plain 404, so the
// endpoint's existence isn't revealed.
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const requireAuth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { sendServerError } = require('../lib/errors');

const adminEmails = () => (process.env.ADMIN_EMAILS || '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

const requireAdmin = (req, res, next) => {
  const email = (req.user?.email || '').toLowerCase();
  const verified = Boolean(req.user?.email_confirmed_at || req.user?.confirmed_at);
  if (!email || !verified || !adminEmails().includes(email)) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
};

const adminLimiter = rateLimit({ name: 'admin', windowMs: 60 * 1000, maxAuthed: 30, maxAnon: 5 });

// Reads every row of a table in pages; returns [] if the table or a column is missing
async function readAll(table, columns) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; from < 100000; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) {
      console.warn(`[Admin] ${table}: ${error.message}`);
      return rows;
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function readAuthUsers() {
  const users = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data?.users || []));
    if (!data?.users || data.users.length < 1000) break;
  }
  return users;
}

const latest = (...dates) => dates.filter(Boolean).sort().pop() || null;

router.get('/users', requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  try {
    const [authUsers, profiles, searches, savedJobs, aiUsage] = await Promise.all([
      readAuthUsers(),
      readAll('profiles', 'id, name, country, location, desired_role, experience_level, resume_uploaded_at, resumes_optimized_count, cover_letters_generated_count, recruiter_dms_sent_count'),
      readAll('search_history', 'user_id, created_at'),
      readAll('saved_jobs', 'user_id, status, created_at'),
      readAll('ai_usage', 'user_id, feature, input_tokens, output_tokens, created_at'),
    ]);

    const since30d = Date.now() - 30 * 86400000;
    const tokensByUser = new Map();
    const byFeature = new Map();
    let totalTokens = 0;
    let tokensLast30Days = 0;
    for (const row of aiUsage) {
      const tokens = (row.input_tokens || 0) + (row.output_tokens || 0);
      const recent = new Date(row.created_at).getTime() >= since30d;
      totalTokens += tokens;
      if (recent) tokensLast30Days += tokens;
      const u = tokensByUser.get(row.user_id) || { input: 0, output: 0, last30: 0, calls: 0 };
      u.input += row.input_tokens || 0;
      u.output += row.output_tokens || 0;
      u.calls += 1;
      if (recent) u.last30 += tokens;
      tokensByUser.set(row.user_id, u);
      const f = byFeature.get(row.feature) || { feature: row.feature, calls: 0, tokens: 0 };
      f.calls += 1;
      f.tokens += tokens;
      byFeature.set(row.feature, f);
    }

    const profileById = new Map(profiles.map((p) => [p.id, p]));
    const activity = new Map();
    const bump = (id) => {
      if (!activity.has(id)) activity.set(id, { searches: 0, lastSearch: null, saved: 0, applied: 0, interview: 0, offer: 0, lastSaved: null });
      return activity.get(id);
    };
    for (const s of searches) {
      const a = bump(s.user_id);
      a.searches += 1;
      a.lastSearch = latest(a.lastSearch, s.created_at);
    }
    for (const j of savedJobs) {
      const a = bump(j.user_id);
      a.saved += 1;
      if (j.status === 'applied') a.applied += 1;
      if (j.status === 'interview') a.interview += 1;
      if (j.status === 'offer') a.offer += 1;
      a.lastSaved = latest(a.lastSaved, j.created_at);
    }

    const users = authUsers.map((u) => {
      const p = profileById.get(u.id) || {};
      const a = activity.get(u.id) || {};
      const aiUses = (p.resumes_optimized_count || 0) + (p.cover_letters_generated_count || 0) + (p.recruiter_dms_sent_count || 0);
      return {
        id: u.id,
        email: u.email || '',
        name: p.name || u.user_metadata?.full_name || u.user_metadata?.name || '',
        provider: u.app_metadata?.provider || 'email',
        verified: Boolean(u.email_confirmed_at),
        joinedAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
        lastActiveAt: latest(u.last_sign_in_at, a.lastSearch, a.lastSaved, p.resume_uploaded_at),
        location: [p.location, p.country].filter(Boolean).join(', '),
        desiredRole: p.desired_role || '',
        experienceLevel: p.experience_level || '',
        hasResume: Boolean(p.resume_uploaded_at),
        resumeUploadedAt: p.resume_uploaded_at || null,
        searches: a.searches || 0,
        savedJobs: a.saved || 0,
        applied: a.applied || 0,
        interviews: a.interview || 0,
        offers: a.offer || 0,
        aiUses,
        inputTokens: tokensByUser.get(u.id)?.input || 0,
        outputTokens: tokensByUser.get(u.id)?.output || 0,
        tokens: (tokensByUser.get(u.id)?.input || 0) + (tokensByUser.get(u.id)?.output || 0),
        tokens30d: tokensByUser.get(u.id)?.last30 || 0,
        aiCalls: tokensByUser.get(u.id)?.calls || 0,
      };
    });

    const now = Date.now();
    const within = (date, days) => date && now - new Date(date).getTime() <= days * 86400000;
    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalUsers: users.length,
        newLast7Days: users.filter((u) => within(u.joinedAt, 7)).length,
        activeLast7Days: users.filter((u) => within(u.lastActiveAt, 7)).length,
        activeLast30Days: users.filter((u) => within(u.lastActiveAt, 30)).length,
        withResume: users.filter((u) => u.hasResume).length,
        totalSearches: searches.length,
        totalSavedJobs: savedJobs.length,
        totalApplied: users.reduce((n, u) => n + u.applied, 0),
        totalTokens,
        tokensLast30Days,
        signedOutTokens: (tokensByUser.get(null)?.input || 0) + (tokensByUser.get(null)?.output || 0),
      },
      byFeature: [...byFeature.values()].sort((a, b) => b.tokens - a.tokens),
      users,
    });
  } catch (error) {
    sendServerError(res, error, 'Failed to load users');
  }
});

// Lets the client decide whether to show the admin link, without exposing the list
router.get('/me', requireAuth, requireAdmin, (req, res) => res.json({ admin: true }));

module.exports = router;
