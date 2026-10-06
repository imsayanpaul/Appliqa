const { supabase } = require('../lib/supabase');

// Fixed-window rate limiter. Keys by authenticated user id when available,
// otherwise by client IP.
//
// Counters live in Supabase (rate_limit_hit function, see
// supabase/migrations/*_rate_limits.sql) so every server instance shares them.
// If the function isn't installed or the database call fails, it falls back to
// a per-process in-memory counter so requests are never blocked by a DB outage.

let sharedStoreAvailable = true;

const hitShared = async (key, windowMs) => {
  if (!sharedStoreAvailable) return null;
  const { data, error } = await supabase.rpc('rate_limit_hit', { p_key: key, p_window_ms: windowMs });
  if (error) {
    // PGRST202 = function not found: migration not applied, stop trying
    if (error.code === 'PGRST202') {
      sharedStoreAvailable = false;
      console.warn('[RateLimit] rate_limit_hit() not found in Supabase; using in-memory limits. Apply supabase/migrations/*_rate_limits.sql to share limits across instances.');
    } else {
      console.error('[RateLimit] Shared store error, using in-memory fallback:', error.message);
    }
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { count: row.hit_count, resetAt: new Date(row.window_reset).getTime() };
};

const rateLimit = ({ windowMs, maxAuthed, maxAnon, name = 'default' }) => {
  const localHits = new Map();

  // Periodically drop expired local windows so the map can't grow without bound
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of localHits) {
      if (now >= entry.resetAt) localHits.delete(key);
    }
  }, windowMs).unref();

  const hitLocal = (key) => {
    const now = Date.now();
    let entry = localHits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      localHits.set(key, entry);
    }
    entry.count += 1;
    return entry;
  };

  return async (req, res, next) => {
    const key = `${name}:${req.user?.id ? `u:${req.user.id}` : `ip:${req.ip}`}`;
    const limit = req.user?.id ? maxAuthed : maxAnon;

    let entry;
    try {
      entry = await hitShared(key, windowMs);
    } catch (err) {
      console.error('[RateLimit] Shared store threw, using in-memory fallback:', err.message);
    }
    if (!entry) entry = hitLocal(key);

    const resetSeconds = Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
    res.set('RateLimit-Limit', String(limit));
    res.set('RateLimit-Remaining', String(Math.max(0, limit - entry.count)));
    res.set('RateLimit-Reset', String(resetSeconds));

    if (entry.count > limit) {
      console.warn(`[RateLimit:${name}] ${key} exceeded ${limit} requests`);
      res.set('Retry-After', String(resetSeconds));
      return res.status(429).json({
        error: 'Too many requests',
        message: req.user?.id
          ? 'You are sending requests too quickly. Please wait a moment and try again.'
          : 'Too many requests. Sign in for a higher limit, or wait a moment and try again.'
      });
    }
    next();
  };
};

module.exports = rateLimit;
