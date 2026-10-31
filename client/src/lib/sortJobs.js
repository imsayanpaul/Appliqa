// Sort options for job lists. "relevance" keeps the order the search returned.
const BATCH_SIZE = 12;

const postedTime = (job) => {
  const t = new Date(job.datePosted).getTime();
  return Number.isNaN(t) ? -Infinity : t;
};

// A copy of the list in the chosen order. Jobs with no date or no score go last,
// and ties keep their original order.
export function sortJobs(jobs, sort, scores = {}) {
  if (sort === 'recent') return [...jobs].sort((a, b) => postedTime(b) - postedTime(a));
  if (sort === 'match') {
    return jobs
      .map((job) => (scores[job.id] ? { ...job, aiFit: scores[job.id] } : job))
      .sort((a, b) => (b.aiFit?.score ?? -1) - (a.aiFit?.score ?? -1));
  }
  return jobs;
}

// Jobs still needing a score, in groups the scoring endpoint accepts
export function unscoredBatches(jobs, scores = {}) {
  const missing = jobs.filter((job) => job.id && !scores[job.id]);
  const batches = [];
  for (let i = 0; i < missing.length; i += BATCH_SIZE) batches.push(missing.slice(i, i + BATCH_SIZE));
  return batches;
}
