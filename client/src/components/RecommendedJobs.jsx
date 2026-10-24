import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiRefreshCw, FiZap, FiMail } from 'react-icons/fi';
import { getJobFeed, getSavedJobs, dismissFeedJob, restoreFeedJob, rankJobs, createOrUpdateUser } from '../services/api';
import { searchCity } from '../data/cities';
import JobCard from './JobCard';
const JobDetail = lazy(() => import('./JobDetail'));

const FEED_TTL = 10 * 60 * 1000;
const FIRST_PAGE = 6;

const readCache = (key) => {
    try {
        const cached = JSON.parse(sessionStorage.getItem(key) || 'null');
        return cached && Date.now() - cached.at < FEED_TTL ? cached.data : null;
    } catch {
        return null;
    }
};
const writeCache = (key, data) => {
    try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch { /* storage full */ }
};

const TYPES = { INTERN: 'internships', CONTRACTOR: 'contract', PARTTIME: 'part time' };

// "For you": jobs from searches built on the profile (target role, resume roles,
// city, level), without saved or hidden ones, ranked by skill match and freshness.
// Daily job emails, switched on or off right under the feed
function AlertsLine({ user, onUpdateUser }) {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const country = user?.preferences?.country;
    const on = !!user?.preferences?.jobAlerts && !!country;

    const toggle = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await createOrUpdateUser({ preferences: { jobAlerts: !on, country } });
            onUpdateUser?.(res.data.user);
        } catch {
            setError('Couldn’t save that. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="ds-rule-t px-6 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 bg-white">
            <p className="m-0 text-[15px] text-[#2A2622] flex items-center gap-3">
                <FiMail size={16} className="text-[#CA3C0A] shrink-0" aria-hidden="true" />
                {error || (on ? 'Daily job emails are on. New matches arrive every morning.' : 'Get new jobs like these by email every morning.')}
            </p>
            {country ? (
                <button type="button" onClick={toggle} disabled={saving} className={`ds-btn !min-h-[40px] !text-[14px] ${on ? 'ds-btn-line' : 'ds-btn-accent'}`}>
                    {saving ? 'Saving…' : on ? 'Turn off' : 'Turn on'}
                </button>
            ) : (
                <button type="button" onClick={() => navigate('/profile')} className="ds-btn ds-btn-line !min-h-[40px] !text-[14px]">
                    Add your country first <FiArrowRight size={14} />
                </button>
            )}
        </div>
    );
}

function RecommendedJobs({ user, resumeData, onUpdateUser }) {
    const navigate = useNavigate();
    const city = searchCity(user?.preferences?.location, user?.preferences?.country);
    const cacheKey = `appliqa_feed_${user?.id || 'anon'}_${city}`;

    const [feed, setFeed] = useState(() => readCache(cacheKey));
    const [loading, setLoading] = useState(!feed);
    const [error, setError] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const [hidden, setHidden] = useState(null); // last dismissed job, for undo
    const [savedJobs, setSavedJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [ranking, setRanking] = useState(false);
    const [rankError, setRankError] = useState(null);

    const load = useCallback(async ({ force = false } = {}) => {
        if (!force) {
            const cached = readCache(cacheKey);
            if (cached) {
                setFeed(cached);
                setLoading(false);
                return;
            }
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getJobFeed(city);
            const data = { jobs: res.data?.jobs || [], meta: res.data?.meta || {} };
            setFeed(data);
            writeCache(cacheKey, data);
        } catch (err) {
            setError(err?.response?.status === 429 ? 'Too many refreshes. Try again in a minute.' : 'Couldn’t load your jobs right now.');
        } finally {
            setLoading(false);
        }
    }, [cacheKey, city]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!user) return;
        getSavedJobs().then((res) => setSavedJobs(res.data?.jobs || [])).catch(() => {});
    }, [user]);

    // One place for saved state, shared by the job cards and the detail panel
    const handleToggleSave = (jobId, isSavedVal, dbId) => {
        setSavedJobs((prev) => {
            const rest = prev.filter((sj) => sj.jobId !== jobId);
            return isSavedVal ? [...rest, { jobId, _id: dbId }] : rest;
        });
    };

    const updateJobs = (fn) => setFeed((prev) => {
        const next = { ...prev, jobs: fn(prev?.jobs || []) };
        writeCache(cacheKey, next);
        return next;
    });

    const handleDismiss = (job) => {
        const index = (feed?.jobs || []).findIndex((j) => j.id === job.id);
        updateJobs((jobs) => jobs.filter((j) => j.id !== job.id));
        setHidden({ job, index });
        dismissFeedJob(job.id).catch(() => {
            // Put it back if the server couldn't record it
            updateJobs((jobs) => (jobs.some((j) => j.id === job.id) ? jobs : [...jobs.slice(0, index), job, ...jobs.slice(index)]));
            setHidden(null);
        });
    };

    // One AI call scores every job in the feed against the full profile, then the list is re-ordered
    const handleRank = async () => {
        const list = feed?.jobs || [];
        if (!list.length) return;
        setRanking(true);
        setRankError(null);
        try {
            const res = await rankJobs({
                jobs: list.map((j) => ({ id: j.id, title: j.title, company: j.company, description: (j.description || '').slice(0, 1600) })),
                resumeData,
                preferences: { name: user?.name, ...user?.preferences },
            });
            const scores = res.data?.scores || {};
            updateJobs((jobs) => jobs
                .map((j) => (scores[j.id] ? { ...j, aiFit: scores[j.id] } : j))
                .sort((a, b) => (b.aiFit?.score ?? -1) - (a.aiFit?.score ?? -1)));
            setShowAll(true);
        } catch (err) {
            setRankError(err?.response?.data?.error || 'Couldn’t rank these jobs right now.');
        } finally {
            setRanking(false);
        }
    };

    const handleUndo = () => {
        if (!hidden) return;
        const { job, index } = hidden;
        updateJobs((jobs) => [...jobs.slice(0, index), job, ...jobs.slice(index)]);
        setHidden(null);
        restoreFeedJob(job.id).catch(() => {});
    };

    const meta = feed?.meta || {};
    const jobs = feed?.jobs || [];
    const visible = showAll ? jobs : jobs.slice(0, FIRST_PAGE);
    const targetRole = meta.roles?.[0] || user?.preferences?.desiredRole || resumeData?.suggestedRoles?.[0] || '';
    const summary = [
        (meta.roles || []).join(', '),
        meta.location,
        meta.experience,
        TYPES[meta.employmentType],
    ].filter(Boolean).join(' · ').toLowerCase();

    return (
        <div style={{ minHeight: '380px' }}>
            <div className="ds-cell ds-rule-b flex flex-wrap items-end justify-between gap-4 !pt-14">
                <div className="min-w-0">
                    <h2 className="ds-slash m-0">for-you</h2>
                    <p className="ds-mono ds-mono-muted mt-3 mb-0">
                        {summary || 'jobs picked from your profile'}
                        {meta.newCount > 0 && <span className="text-[#CA3C0A]"> · {meta.newCount} new</span>}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-5">
                    {jobs.length > 1 && !jobs.every((j) => j.aiFit) && (
                        <button
                            type="button"
                            onClick={handleRank}
                            disabled={ranking}
                            className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#CA3C0A] hover:text-[#171717] bg-transparent border-none cursor-pointer p-0 disabled:opacity-50 disabled:cursor-default"
                        >
                            <FiZap size={15} aria-hidden="true" /> {ranking ? 'Ranking…' : 'Rank with AI'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => load({ force: true })}
                        disabled={loading}
                        className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#171717] hover:text-[#CA3C0A] bg-transparent border-none cursor-pointer p-0 disabled:opacity-40 disabled:cursor-default"
                    >
                        <FiRefreshCw size={15} aria-hidden="true" className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    {targetRole && (
                        <button
                            type="button"
                            onClick={() => navigate(`/search?query=${encodeURIComponent(targetRole)}`)}
                            className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#171717] hover:text-[#CA3C0A] bg-transparent border-none cursor-pointer p-0"
                        >
                            Search all <FiArrowRight size={16} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {(rankError || meta.blockedCount > 0) && (
                <p className="ds-rule-b m-0 px-6 sm:px-8 py-3 text-[14px] text-[#4A4540] bg-white">
                    {rankError || <>Hid {meta.blockedCount} job{meta.blockedCount === 1 ? '' : 's'} that hit your deal-breakers. <button type="button" onClick={() => navigate('/profile')} className="ds-mono text-[#CA3C0A] underline underline-offset-2 bg-transparent border-none cursor-pointer p-0">edit</button></>}
                </p>
            )}

            {hidden && (
                <div role="status" className="ds-rule-b px-6 sm:px-8 py-3 flex items-center justify-between gap-4 bg-white">
                    <span className="text-[14px] text-[#4A4540] truncate">Hidden “{hidden.job.title}”. You won’t see it here again.</span>
                    <button type="button" onClick={handleUndo} className="ds-mono text-[#CA3C0A] underline underline-offset-2 bg-transparent border-none cursor-pointer shrink-0">undo</button>
                </div>
            )}

            {loading && !jobs.length ? (
                <div className="ds-gridlines grid-cols-1 md:grid-cols-3" aria-hidden="true">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-6 min-h-[230px] flex flex-col animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-11 h-11 bg-[#E7E3DC]" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <div className="h-4 w-4/5 bg-[#E7E3DC]" />
                                    <div className="h-3 w-1/3 bg-[#EFECE6]" />
                                </div>
                            </div>
                            <div className="h-3 w-full bg-[#EFECE6] mt-6" />
                            <div className="h-3 w-2/3 bg-[#EFECE6] mt-2" />
                            <div className="h-4 w-1/3 bg-[#E7E3DC] mt-auto" />
                        </div>
                    ))}
                </div>
            ) : meta.needsCountry ? (
                <div className="ds-cell !py-14 text-center">
                    <p className="m-0 text-[20px] font-medium tracking-[-0.015em]">Add your country to see jobs near you.</p>
                    <p className="ds-body mt-2 mb-0">Without one, job searches only cover the US.</p>
                    <button type="button" onClick={() => navigate('/profile')} className="ds-btn ds-btn-ink mt-6">
                        Set your country <FiArrowRight size={16} className="ds-btn-arrow" />
                    </button>
                </div>
            ) : meta.needsProfile ? (
                <div className="ds-cell !py-14 text-center">
                    <p className="m-0 text-[20px] font-medium tracking-[-0.015em]">Tell us the role you want and we’ll find jobs for you.</p>
                    <p className="ds-body mt-2 mb-0">Add a target role in your profile, or upload your resume.</p>
                    <button type="button" onClick={() => navigate('/profile')} className="ds-btn ds-btn-ink mt-6">
                        Set your target role <FiArrowRight size={16} className="ds-btn-arrow" />
                    </button>
                </div>
            ) : error && !jobs.length ? (
                <div className="ds-cell !py-14 text-center">
                    <p className="m-0 text-[20px] font-medium tracking-[-0.015em]">{error}</p>
                    <button type="button" onClick={() => load({ force: true })} className="ds-btn ds-btn-ink mt-6">Try again</button>
                </div>
            ) : jobs.length > 0 ? (
                <>
                    <ul className="ds-gridlines grid-cols-1 md:grid-cols-3 list-none m-0 p-0">
                        {visible.map((job, i) => {
                            const saved = savedJobs.find((sj) => sj.jobId === job.id);
                            return (
                                <li key={job.id || i}>
                                    <JobCard
                                        job={job}
                                        user={user}
                                        onClick={() => setSelectedJob(job)}
                                        initialSaved={!!saved}
                                        initialSavedId={saved?._id}
                                        onToggleSave={handleToggleSave}
                                        onDismiss={handleDismiss}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                    {jobs.length > FIRST_PAGE && (
                        <button
                            type="button"
                            onClick={() => setShowAll(!showAll)}
                            className="ds-btn ds-btn-line w-full !min-h-14 !border-x-0 !border-b-0"
                        >
                            {showAll ? 'Show fewer' : `Show ${jobs.length - FIRST_PAGE} more`}
                        </button>
                    )}
                </>
            ) : (
                <div className="ds-cell !py-14 text-center">
                    <p className="m-0 text-[20px] font-medium tracking-[-0.015em]">You’re all caught up.</p>
                    <p className="ds-body mt-2 mb-0">Nothing new from your searches this week. Check back tomorrow, or widen your search.</p>
                    {targetRole && (
                        <button type="button" onClick={() => navigate(`/search?query=${encodeURIComponent(targetRole)}`)} className="ds-btn ds-btn-ink mt-6">
                            Search {targetRole} jobs <FiArrowRight size={16} className="ds-btn-arrow" />
                        </button>
                    )}
                </div>
            )}

            {user && !meta.needsProfile && <AlertsLine user={user} onUpdateUser={onUpdateUser} />}

            {selectedJob && (
                <Suspense fallback={null}>
                    <JobDetail
                        job={selectedJob}
                        user={user}
                        resumeData={resumeData}
                        initialSaved={savedJobs.some((sj) => sj.jobId === selectedJob.id)}
                        initialSavedId={savedJobs.find((sj) => sj.jobId === selectedJob.id)?._id || null}
                        onToggleSave={handleToggleSave}
                        onClose={() => setSelectedJob(null)}
                    />
                </Suspense>
            )}
        </div>
    );
}

export default RecommendedJobs;
