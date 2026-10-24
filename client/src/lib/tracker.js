// Tracker helpers: how long an application has been waiting, whether it needs a
// follow-up, and the funnel numbers (how many applications turned into interviews).
import { applySource } from './format';

const DAY = 86400000;
export const QUIET_DAYS = 7;
export const MAX_FOLLOW_UPS = 2;

export const daysSince = (date) => {
    const t = new Date(date).getTime();
    return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / DAY);
};

export const appliedDate = (job) => job.appliedAt || (job.status !== 'saved' ? job.statusUpdatedAt || job.createdAt : null);

// Applied a week or more ago, no reply recorded since, and fewer than two follow-ups
export function needsFollowUp(job) {
    if (job.status !== 'applied') return false;
    const sinceApplied = daysSince(appliedDate(job));
    const sinceChange = daysSince(job.statusUpdatedAt || appliedDate(job));
    const sinceFollowUp = job.lastFollowUpAt ? daysSince(job.lastFollowUpAt) : Infinity;
    return sinceApplied !== null && sinceApplied >= QUIET_DAYS
        && (sinceChange === null || sinceChange >= QUIET_DAYS)
        && (job.followUpCount || 0) < MAX_FOLLOW_UPS
        && sinceFollowUp >= QUIET_DAYS;
}

export const jobSource = (job) => job.source || applySource(job) || 'other';

const REACHED = { applied: 1, interview: 2, offer: 3, rejected: 1 };

// Applications, the share that reached an interview and an offer, and the best source
export function funnel(jobs) {
    const applied = jobs.filter((j) => REACHED[j.status]);
    const interviews = applied.filter((j) => REACHED[j.status] >= 2);
    const offers = applied.filter((j) => j.status === 'offer');
    const pct = (n, d) => (d ? Math.round((n / d) * 100) : null);

    const bySource = new Map();
    for (const j of applied) {
        const s = jobSource(j);
        const row = bySource.get(s) || { source: s, applied: 0, interviews: 0 };
        row.applied += 1;
        if (REACHED[j.status] >= 2) row.interviews += 1;
        bySource.set(s, row);
    }
    const sources = [...bySource.values()].sort((a, b) => b.interviews - a.interviews || b.applied - a.applied);

    const byResume = new Map();
    for (const j of applied) {
        const name = j.resumeSnapshot?.name;
        if (!name) continue;
        const row = byResume.get(name) || { name, applied: 0, interviews: 0 };
        row.applied += 1;
        if (REACHED[j.status] >= 2) row.interviews += 1;
        byResume.set(name, row);
    }

    return {
        applied: applied.length,
        interviews: interviews.length,
        offers: offers.length,
        interviewRate: pct(interviews.length, applied.length),
        offerRate: pct(offers.length, applied.length),
        sources,
        resumes: [...byResume.values()].sort((a, b) => b.interviews - a.interviews || b.applied - a.applied),
        quiet: jobs.filter(needsFollowUp).length,
    };
}
