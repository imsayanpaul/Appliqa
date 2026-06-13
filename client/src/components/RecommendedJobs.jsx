import { useState, useEffect } from 'react';
import { searchJobs, getSavedJobs } from '../services/api';
import JobCard from './JobCard';
import JobDetail from './JobDetail';

function RecommendedJobs({ user, resumeData }) {
    const [jobs, setJobs] = useState([]);
    const [savedJobs, setSavedJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const profileRole = user?.preferences?.desiredRole;
    const resumeRole = resumeData?.suggestedRoles?.[0];
    const targetRole = profileRole || resumeRole;
    const userLocation = user?.preferences?.location;

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
        if (!targetRole) return;

        // If the user has a location preference, append it to the search
        const searchQuery = userLocation ? `${targetRole} in ${userLocation}` : targetRole;
        const cacheKey = `appliqa_recs_${searchQuery.replace(/\s+/g, '_')}`;

        const fetchRecs = async () => {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                setJobs(JSON.parse(cached));
                return;
            }

            setLoading(true);
            try {
                const res = await searchJobs({ query: searchQuery, page: 1 });
                const fetchedJobs = (res.data.jobs || []).slice(0, 3);
                setJobs(fetchedJobs);
                sessionStorage.setItem(cacheKey, JSON.stringify(fetchedJobs));
            } catch (err) {
                console.error("Failed to fetch recommended jobs", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecs();
    }, [targetRole]);

    if (!targetRole) {
        return null;
    }

    return (
        <div className="page-section" style={{ marginTop: 60 }}>
            <div 
                className="section-header"
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'baseline',
                    gap: isMobile ? 8 : 12,
                    marginBottom: 24
                }}
            >
                <h2>Recommended For You</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                    Based on your {profileRole ? 'profile preference' : 'resume role'}: <span style={{ color: 'var(--accent-primary)' }}>{targetRole} {userLocation && ` in ${userLocation}`}</span>
                </p>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
            ) : jobs.length > 0 ? (
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
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
                <p style={{ color: 'var(--text-muted)' }}>No recommendations found right now. Try searching manually!</p>
            )}

            {selectedJob && (
                <JobDetail
                    job={selectedJob}
                    user={user}
                    resumeData={resumeData}
                    onClose={() => setSelectedJob(null)}
                />
            )}
        </div>
    );
}

export default RecommendedJobs;
