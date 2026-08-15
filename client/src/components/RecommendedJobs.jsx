import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiZap } from 'react-icons/fi';
import { searchJobs, getSavedJobs } from '../services/api';
import JobCard from './JobCard';
import JobDetail from './JobDetail';

function RecommendedJobs({ user, resumeData }) {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [savedJobs, setSavedJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);

    const profileRole = user?.preferences?.desiredRole;
    const resumeRole = resumeData?.suggestedRoles?.[0];
    const targetRole = profileRole || resumeRole || 'React Developer';
    const userLocation = user?.preferences?.location;
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
        // If the user has a location preference, append it to the search
        const searchQuery = userLocation ? `${targetRole} in ${userLocation}` : targetRole;
        const cacheKey = `appliqa_recs_${searchQuery.replace(/\s+/g, '_')}`;

        const fetchRecs = async () => {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                try {
                    setJobs(JSON.parse(cached));
                    return;
                } catch {
                    // ignore parse error
                }
            }

            setLoading(true);
            try {
                const res = await searchJobs({ query: searchQuery, page: 1 });
                const fetchedJobs = (res.data.jobs || []).slice(0, 3);
                setJobs(fetchedJobs);
                if (fetchedJobs.length > 0) {
                    sessionStorage.setItem(cacheKey, JSON.stringify(fetchedJobs));
                }
            } catch (err) {
                console.error("Failed to fetch recommended jobs", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecs();
    }, [targetRole, userLocation]);

    return (
        <section className="w-full mb-24">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                <div>
                    <p className="text-xs tracking-widest uppercase mb-1 font-bold text-[#F45B25]">
                        [ Live Opportunities ]
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#171717]">
                        High-Match Career Openings
                    </h2>
                    <p className="text-xs sm:text-sm text-[#66615C] mt-1 font-medium">
                        {isPersonalized ? (
                            <>
                                Tailored for your profile: <span className="text-[#F45B25] font-bold">{targetRole} {userLocation && `· ${userLocation}`}</span>
                            </>
                        ) : (
                            <>Live verified tech openings synced in real-time</>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => navigate(`/search?query=${encodeURIComponent(targetRole)}`)}
                    className="text-xs font-bold text-[#F45B25] hover:underline bg-transparent border-none cursor-pointer inline-flex items-center gap-1.5"
                >
                    View All Opportunities <FiArrowRight size={14} />
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-neutral-200/80 animate-pulse h-56 flex flex-col justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-neutral-200" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-neutral-200 rounded w-3/4" />
                                    <div className="h-3 bg-neutral-100 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-neutral-100 rounded w-full" />
                                <div className="h-3 bg-neutral-100 rounded w-2/3" />
                            </div>
                            <div className="h-9 bg-neutral-200 rounded-xl w-full" />
                        </div>
                    ))}
                </div>
            ) : jobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {jobs.map((job, i) => {
                        const isSaved = savedJobs.some(sj => sj.jobId === job.id);
                        const savedId = savedJobs.find(sj => sj.jobId === job.id)?._id;
                        return (
                            <JobCard
                                key={job.id || i}
                                job={job}
                                user={user}
                                onClick={() => setSelectedJob(job)}
                                initialSaved={isSaved}
                                initialSavedId={savedId}
                                onToggleSave={(jobId, isSavedVal, dbId) => {
                                    if (isSavedVal) {
                                        setSavedJobs(prev => [...prev, { jobId, _id: dbId }]);
                                    } else {
                                        setSavedJobs(prev => prev.filter(sj => sj.jobId !== jobId));
                                    }
                                }}
                            />
                        );
                    })}
                </div>
            ) : (
                <div className="p-8 rounded-2xl bg-white border border-neutral-200/80 text-center text-sm text-[#66615C]">
                    <FiZap className="mx-auto text-[#F45B25] mb-2" size={24} />
                    <p className="font-semibold text-[#171717]">No live recommendations cached at this moment.</p>
                    <button
                        onClick={() => navigate('/search?query=Software')}
                        className="mt-3 px-5 py-2 rounded-xl bg-[#171717] text-white text-xs font-bold border-none cursor-pointer"
                    >
                        Search All Opportunities
                    </button>
                </div>
            )}

            {/* Job Detail Modal */}
            {selectedJob && (
                <JobDetail
                    job={selectedJob}
                    user={user}
                    resumeData={resumeData}
                    onClose={() => setSelectedJob(null)}
                />
            )}
        </section>
    );
}

export default RecommendedJobs;
