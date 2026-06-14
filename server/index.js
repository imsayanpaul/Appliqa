const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.path}`);
  res.on('finish', () => {
    console.log(`[Response] ${req.method} ${req.path} -> ${res.statusCode}`);
  });
  next();
});

// Disable browser caching for all dynamic API endpoints
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Routes
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/user', require('./routes/user'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'supabase',
    timestamp: new Date().toISOString()
  });
});

const { supabase } = require('./lib/supabase');

// Database cache pruning function (runs on startup & every 24 hours)
const cleanupCache = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    console.log('🧹 [Cleanup] Running database cache pruning...');

    // 1. Delete old search caches
    const { error: searchErr } = await supabase
      .from('search_cache')
      .delete()
      .lt('created_at', thirtyDaysAgo);

    if (searchErr) throw searchErr;

    // 2. Delete jobs in job_cache that are older than 30 days and NOT saved by users
    const { data: savedJobs, error: savedErr } = await supabase
      .from('saved_jobs')
      .select('job_id');

    if (savedErr) throw savedErr;

    const savedJobIds = (savedJobs || []).map(j => j.job_id).filter(Boolean);

    let deleteQuery = supabase
      .from('job_cache')
      .delete()
      .lt('created_at', thirtyDaysAgo);

    if (savedJobIds.length > 0) {
      deleteQuery = deleteQuery.not('id', 'in', `(${savedJobIds.join(',')})`);
    }

    const { error: jobErr } = await deleteQuery;
    if (jobErr) throw jobErr;

    console.log('🧹 [Cleanup] Database cache pruning completed successfully.');
  } catch (err) {
    console.error('🧹 [Cleanup] Cache pruning failed:', err.message);
  }
};

app.listen(PORT, () => {
  console.log(`🚀 Appliqa server running on http://localhost:${PORT}`);
  
  // Run pruning on startup and schedule every 24 hours
  cleanupCache();
  setInterval(cleanupCache, 24 * 60 * 60 * 1000);
});
