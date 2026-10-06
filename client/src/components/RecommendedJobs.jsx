import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { searchJobs, getSavedJobs } from '../services/api';
import { searchCity } from '../data/cities';
import JobCard from './JobCard';
const JobDetail = lazy(() => import('./JobDetail'));

function RecommendedJobs({ user, resumeData }) {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [savedJobs, setSavedJobs] = useState([]);
    // One place for saved state, shared by the job cards and the detail panel
    const handleToggleSave = (jobId, isSavedVal, dbId) => {
        setSavedJobs(prev => {
            const rest = prev.filter(sj => sj.jobId !== jobId);
            return isSavedVal ? [...rest, { jobId, _id: dbId }] : rest;
        });
    };
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const activeReqRef = useRef(0);

    const profileRole = user?.preferences?.desiredRole;
    const resumeRole = resumeData?.suggestedRoles?.[0];
    const targetRole = profileRole || resumeRole || 'React Developer';
    // City only: a full postal address in the query returns no jobs
    const userLocation = searchCity(user?.preferences?.location, user?.preferences?.country);
    const isPersonalized = Boolean(profileRole || resumeRole);

    useEffect(() => {
        if (user) {
            getSavedJobs()
                .then(res => setSavedJobs(res.data.jobs || []))
                .catch(() => {});
        } else {
            setSavedJobs([]);
        }
    }, [user]);

    useEffect(() => {
        const requestId = ++activeReqRef.current;
        const searchQuery = userLocation ? `${targetRole} in ${userLocation}` : targetRole;
        const cacheKey = `appliqa_recs_${searchQuery.replace(/\s+/g, '_')}`;

        // 1. Instant Cache Check
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setJobs(parsed);
                    setLoading(false);
                    return;
                }
            } catch {
                sessionStorage.removeItem(cacheKey);
            }
        }

        // 2. Fresh Network Fetch with Safe Timeout
        setLoading(true);

        const fetchRecs = async () => {
            try {
                const res = await searchJobs({ query: searchQuery, page: 1 }, { record: false });
                // Discard if a newer request was dispatched
                if (requestId !== activeReqRef.current) return;

                const fetchedJobs = (res.data?.jobs || []).slice(0, 3);
                setJobs(fetchedJobs);
                if (fetchedJobs.length > 0) {
                    sessionStorage.setItem(cacheKey, JSON.stringify(fetchedJobs));
                }
            } catch (err) {
                if (requestId !== activeReqRef.current) return;
                console.error("Failed to fetch recommended jobs", err);
            } finally {
                if (requestId === activeReqRef.current) {
                    setLoading(false);
                }
            }
        };

        fetchRecs();
    }, [targetRole, userLocation]);

    return (
        <div style={{ minHeight: '380px' }}>
            <div className="ds-cell ds-rule-b flex flex-wrap items-end justify-between gap-4 !pt-14">
                <div>
                    <h2 className="ds-slash m-0">for-you</h2>
                    <p className="ds-mono ds-mono-muted mt-3 mb-0">
                        {isPersonalized ? `${targetRole}${userLocation ? ` · ${userLocation}` : ''}`.toLowerCase() : 'popular roles right now'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate(`/search?query=${encodeURIComponent(targetRole)}`)}
                    className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#171717] hover:text-[#CA3C0A] bg-transparent border-none cursor-pointer p-0"
                >
                    See all results <FiArrowRight size={16} aria-hidden="true" />
                </button>
            </div>

            {loading ? (
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
            ) : jobs.length > 0 ? (
                <ul className="ds-gridlines grid-cols-1 md:grid-cols-3 list-none m-0 p-0">
                    {jobs.map((job, i) => {
                        const saved = savedJobs.find(sj => sj.jobId === job.id);
                        return (
                            <li key={job.id || i}>
                                <JobCard
                                    job={job}
                                    user={user}
                                    onClick={() => setSelectedJob(job)}
                                    initialSaved={!!saved}
                                    initialSavedId={saved?._id}
                                    onToggleSave={handleToggleSave}
                                />
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="ds-cell !py-14 text-center">
                    <p className="m-0 text-[20px] font-medium tracking-[-0.015em]">No recommendations right now.</p>
                    <button
                        type="button"
                        onClick={() => navigate(`/search?query=${encodeURIComponent(targetRole)}`)}
                        className="ds-btn ds-btn-ink mt-6"
                    >
                        Search {targetRole} jobs <FiArrowRight size={16} className="ds-btn-arrow" />
                    </button>
                </div>
            )}

            {selectedJob && (
                <Suspense fallback={null}>
                    <JobDetail
                        job={selectedJob}
                        user={user}
                        resumeData={resumeData}
                        initialSaved={savedJobs.some(sj => sj.jobId === selectedJob.id)}
                        initialSavedId={savedJobs.find(sj => sj.jobId === selectedJob.id)?._id || null}
                        onToggleSave={handleToggleSave}
                        onClose={() => setSelectedJob(null)}
                    />
                </Suspense>
            )}
        </div>
    );
}

export default RecommendedJobs;
