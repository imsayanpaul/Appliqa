// Per-user AI usage tracking.
// `trackUsage` (middleware) remembers who the request is for and which feature it is;
// lib/gemini.js calls `recordUsage` after every successful model call. AsyncLocalStorage
// carries the context through the awaits in between, so routes don't pass anything.
// Recording is fire-and-forget and never fails a request.
const { AsyncLocalStorage } = require('node:async_hooks');
const { supabase } = require('./supabase');

const context = new AsyncLocalStorage();
let tableMissingLogged = false;

const trackUsage = (req, res, next) => {
  const feature = (req.path || '').replace(/^\/+/, '').split('/')[0] || 'unknown';
  context.run({ userId: req.user?.id || null, feature }, next);
};

function recordUsage(model, usageMetadata) {
  const store = context.getStore();
  if (!store) return;
  const row = {
    user_id: store.userId,
    feature: store.feature,
    model,
    input_tokens: usageMetadata?.promptTokenCount || 0,
    output_tokens: (usageMetadata?.candidatesTokenCount || 0) + (usageMetadata?.thoughtsTokenCount || 0),
  };
  supabase.from('ai_usage').insert(row).then(({ error }) => {
    if (!error) return;
    if (error.code === '42P01' || error.code === 'PGRST205') {
      if (!tableMissingLogged) console.warn('[Usage] ai_usage table is missing; run the Supabase migration to start tracking.');
      tableMissingLogged = true;
    } else {
      console.warn('[Usage] Could not record:', error.message);
    }
  }, (err) => console.warn('[Usage] Could not record:', err?.message));
}

module.exports = { trackUsage, recordUsage };
