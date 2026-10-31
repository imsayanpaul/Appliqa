// Daily sync of company career feeds into the direct_jobs table. A company whose feed
// fails is left untouched, so an outage never marks its jobs closed.
const { supabase } = require('../supabase');
const { fetchCompanyJobs } = require('./index');
const COMPANIES = require('./companies.json');

const CONCURRENCY = 6;
const BATCH = 200;
// Not real openings: a feed's catch-all forms
const NOT_A_JOB = /\b(talent (community|pool|network)|general application|future opportunit|open application|expression of interest)\b/i;

const toRow = (company, job, now) => ({
  id: `${company.ats}:${company.slug}:${job.externalId}`,
  ats: company.ats,
  company_slug: company.slug,
  company: company.name,
  title: String(job.title).trim().slice(0, 300),
  location: String(job.location || '').slice(0, 300),
  remote: Boolean(job.remote),
  description: job.description || '',
  employment_type: job.employmentType || '',
  department: String(job.department || '').slice(0, 200),
  apply_link: job.applyLink,
  date_posted: job.datePosted || null,
  last_seen_at: now,
  closed_at: null,
});

// Which stored jobs left the feed. An empty feed for a company that had jobs looks like
// a moved or broken board, so nothing is closed until it comes back or is removed.
function jobsToClose(openIds, feedIds) {
  if (!feedIds.size && openIds.length > 0) return [];
  return openIds.filter((id) => !feedIds.has(id));
}

async function syncCompany(company, now) {
  const jobs = (await fetchCompanyJobs(company)).filter((j) => !NOT_A_JOB.test(j.title));
  const rows = jobs.map((j) => toRow(company, j, now));
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from('direct_jobs').upsert(rows.slice(i, i + BATCH), { onConflict: 'id' });
    if (error) throw error;
  }
  const { data: open, error: openError } = await supabase.from('direct_jobs').select('id')
    .eq('ats', company.ats).eq('company_slug', company.slug).is('closed_at', null).limit(5000);
  if (openError) throw openError;
  const gone = jobsToClose((open || []).map((r) => r.id), new Set(rows.map((r) => r.id)));
  for (let i = 0; i < gone.length; i += BATCH) {
    const { error } = await supabase.from('direct_jobs').update({ closed_at: now }).in('id', gone.slice(i, i + BATCH));
    if (error) throw error;
  }
  return { saved: rows.length, closed: gone.length };
}

async function syncAll(companies = COMPANIES) {
  const now = new Date().toISOString();
  const summary = { companies: companies.length, ok: 0, failed: 0, saved: 0, closed: 0, errors: [] };
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < companies.length) {
      const company = companies[next++];
      try {
        const { saved, closed } = await syncCompany(company, now);
        summary.ok += 1;
        summary.saved += saved;
        summary.closed += closed;
      } catch (err) {
        summary.failed += 1;
        summary.errors.push(`${company.ats}/${company.slug}: ${String(err.message).slice(0, 120)}`);
      }
    }
  }));
  return summary;
}

module.exports = { syncAll, syncCompany, jobsToClose, toRow, NOT_A_JOB };
