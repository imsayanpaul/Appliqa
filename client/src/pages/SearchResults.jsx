import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiBriefcase, FiZap, FiArrowRight, FiArrowDown, FiLoader, FiHome, FiAward, FiCheckCircle, FiFilter } from 'react-icons/fi';
import JobCard from '../components/JobCard';
import JobDetail from '../components/JobDetail';
import { Dropdown } from '../components/ui/Dropdown';
import { searchJobs, smartSearch, getSavedJobs, rankJobs } from '../services/api';
import { sortJobs, unscoredBatches } from '../lib/sortJobs';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import citiesByCountry, { searchCity } from '../data/cities';

function SearchResults({ user, resumeData }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [jobs, setJobs] = useState([]);
    const [savedJobs, setSavedJobs] = useState([]);
    // One place for saved state, shared by the job cards and the detail panel
    const handleToggleSave = (jobId, isSavedVal, dbId) => {
        setSavedJobs(prev => {
            const rest = prev.filter(sj => sj.jobId !== jobId);
            return isSavedVal ? [...rest, { jobId, _id: dbId }] : rest;
        });
    };
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [query, setQuery] = useState(searchParams.get('query') || '');
    const [aiMode, setAiMode] = useState(false);
    const [page, setPage] = useState(1);
    const [error, setError] = useState(null);
    const [sort, setSort] = useState('relevance');
    const [fitScores, setFitScores] = useState({});
    const [scoring, setScoring] = useState(false);
    const [sortNote, setSortNote] = useState(null);

    // "Match score" asks the AI to score the jobs on screen; scores are kept, so each job is scored once
    const hasProfile = Boolean(resumeData?.skills?.length || user?.preferences?.skills?.length);
    useEffect(() => {
        if (sort !== 'match') {
            setSortNote(null);
            return undefined;
        }
        if (!hasProfile) {
            setSortNote(user ? 'Add your resume or skills to your profile to sort by match score.' : 'Sign in and add your resume to sort by match score.');
            return undefined;
        }
        setSortNote(null);
        const batches = unscoredBatches(jobs, fitScores);
        if (!batches.length) return undefined;
        let active = true;
        setScoring(true);
        (async () => {
            try {
                for (const batch of batches) {
                    const res = await rankJobs({
                        jobs: batch.map((j) => ({ id: j.id, title: j.title, company: j.company, description: (j.description || '').slice(0, 1600) })),
                        resumeData,
                        preferences: { name: user?.name, ...user?.preferences },
                    });
                    if (!active) return;
                    setFitScores((prev) => ({ ...prev, ...(res.data?.scores || {}) }));
                }
            } catch (err) {
                if (active) setSortNote(err?.response?.data?.error || 'Couldn\u2019t score these jobs right now. Please try again.');
            } finally {
                if (active) setScoring(false);
            }
        })();
        return () => { active = false; };
    // Re-run for new results, not for each score that arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sort, jobs, hasProfile]);

    const visibleJobs = sortJobs(jobs, sort, fitScores);

    useEffect(() => {
        if (user) {
            getSavedJobs()
                .then(res => {
                    setSavedJobs(res.data.jobs || []);
                })
                .catch(err => console.error('Error fetching saved jobs:', err));
        } else {
            setSavedJobs([]);
        }
    }, [user]);

    // Filters
    const [filters, setFilters] = useState({
        // A saved full address would match no jobs; search by its city instead
        location: searchParams.get('location') || searchCity(user?.preferences?.location, searchParams.get('country') || user?.preferences?.country),
        country: searchParams.get('country') || user?.preferences?.country || '',
        employmentType: searchParams.get('employmentType') || '',
        // "today" was renamed "24h"; keep old links and saved searches working
        datePosted: searchParams.get('datePosted') === 'today' ? '24h' : (searchParams.get('datePosted') || ''),
        remote: searchParams.get('remote') || '',
        experience: searchParams.get('experience') || ''
    });

    useEffect(() => {
        const q = searchParams.get('query');
        if (q) {
            setQuery(q);
            fetchJobs(q, filters);
        }
    }, [searchParams]);

    const fetchJobs = async (searchQuery, filterParams = filters, pageNum = 1, append = false) => {
        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setError(null);
            setPage(1);
        }
        try {
            const res = await searchJobs({
                query: searchQuery,
                page: pageNum,
                ...filterParams
            });
            const newJobs = res.data.jobs || [];
            setJobs(prev => append ? [...prev, ...newJobs] : newJobs);
        } catch (err) {
            console.error('Search failed:', err);
            if (err?.response?.status === 429) {
                setError("You've reached the free JSearch API limit. Please upgrade your RapidAPI plan or try again next month.");
            } else {
                setError("Failed to fetch jobs. Please try again.");
            }
            if (!append) setJobs([]);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        if (aiMode) {
            setLoading(true);
            try {
                const res = await smartSearch(query, resumeData);
                const params = res.data.searchParams;
                const newFilters = {
                    ...filters,
                    location: params.location || filters.location || '',
                    employmentType: params.employmentType || '',
                    remote: params.remote ? 'true' : '',
                    datePosted: ''
                };
                setFilters(newFilters);
                await fetchJobs(params.query, newFilters);
            } catch {
                await fetchJobs(query);
            }
        } else {
            await fetchJobs(query);
        }
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        if (query) fetchJobs(query, newFilters);
    };

    return (
        <div className="bg-[#F7F5F2] min-h-screen text-[#171717] pb-24">
            <section className="ds-frame ds-rule-b">
                <div className="ds-rule-b px-6 sm:px-8 h-14 flex items-center justify-between gap-4">
                    <span className="ds-mono truncate">search{query ? ` / ${query.toLowerCase()}` : ''}</span>
                    <span className="ds-mono ds-mono-muted shrink-0 flex items-center gap-2" aria-live="polite">
                        {loading ? 'searching…' : `${jobs.length} results`}
                        <span className={`ds-square ${loading ? 'animate-pulse' : ''}`} />
                    </span>
                </div>

                <div className="ds-cell">
                    <h1 className="sr-only">Job search</h1>
                    <form onSubmit={handleSearch} role="search">
                        <label htmlFor="job-search" className="ds-mono ds-mono-muted block mb-2">
                            {aiMode ? 'describe the job you want' : 'job title, skill or company'}
                        </label>
                        <div className="ds-search">
                            <FiSearch className="self-center ml-4 text-[#6F6A65] shrink-0" size={18} aria-hidden="true" />
                            <input
                                id="job-search"
                                type="search"
                                autoComplete="off"
                                placeholder={aiMode ? 'Remote React role, mid-level, fintech' : 'e.g. Product designer'}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button type="button" className="ds-toggle" aria-pressed={aiMode} onClick={() => setAiMode(!aiMode)}>
                                <span className="ds-toggle-box" aria-hidden="true" /><span>ai<span className="hidden sm:inline"> search</span></span>
                            </button>
                            <button type="submit" disabled={loading} className="ds-btn ds-btn-accent !min-h-0 !px-6">
                                <span className="hidden sm:inline">Search</span>
                                <FiArrowRight size={16} aria-hidden="true" />
                            </button>
                        </div>
                    </form>

                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <span className="ds-mono ds-mono-muted mr-1">filter</span>
                    <Dropdown
                        options={[
                            { value: "", label: "All Types" },
                            { value: "FULLTIME", label: "Full Time" },
                            { value: "PARTTIME", label: "Part Time" },
                            { value: "CONTRACTOR", label: "Contract" },
                            { value: "INTERN", label: "Internship" }
                        ]}
                        value={filters.employmentType}
                        onChange={(val) => handleFilterChange('employmentType', val)}
                        placeholder="All Types"
                    />

                    <Dropdown
                        options={[
                            { value: "", label: "Any Time" },
                            { value: "24h", label: "Past 24 Hours" },
                            { value: "3days", label: "Last 3 Days" },
                            { value: "week", label: "This Week" },
                            { value: "month", label: "This Month" }
                        ]}
                        value={filters.datePosted}
                        onChange={(val) => handleFilterChange('datePosted', val)}
                        placeholder="Any Time"
                    />

                    <button
                        type="button" aria-pressed={filters.remote === 'true'} className={`ds-chip ${filters.remote === 'true' ? '!bg-[#171717] !text-white !border-[#171717]' : ''}`}
                        onClick={() => handleFilterChange('remote', filters.remote === 'true' ? '' : 'true')}
                    >
                        Remote only
                    </button>

                    <button
                        type="button" aria-pressed={filters.employmentType === 'INTERN'} className={`ds-chip ${filters.employmentType === 'INTERN' ? '!bg-[#171717] !text-white !border-[#171717]' : ''}`}
                        onClick={() => handleFilterChange('employmentType', filters.employmentType === 'INTERN' ? '' : 'INTERN')}
                    >
                        Internships
                    </button>

                    <button
                        type="button" aria-pressed={filters.experience === 'fresher'} className={`ds-chip ${filters.experience === 'fresher' ? '!bg-[#171717] !text-white !border-[#171717]' : ''}`}
                        onClick={() => handleFilterChange('experience', filters.experience === 'fresher' ? '' : 'fresher')}
                        title="Entry-level roles for freshers and recent graduates"
                    >
                        Freshers
                    </button>

                    <Dropdown
                        options={[
                            { value: "", label: "Any Country" },
                            { value: "India", label: "India" },
                            { value: "United States", label: "United States" },
                            { value: "United Kingdom", label: "United Kingdom" },
                            { value: "Canada", label: "Canada" },
                            { value: "Germany", label: "Germany" },
                            { value: "Australia", label: "Australia" },
                            { value: "Singapore", label: "Singapore" },
                            { value: "UAE", label: "UAE" },
                            { value: "Netherlands", label: "Netherlands" },
                            { value: "Japan", label: "Japan" }
                        ]}
                        value={filters.country || ''}
                        onChange={(val) => {
                            const newFilters = { ...filters, country: val, location: '' };
                            setFilters(newFilters);
                            if (query) fetchJobs(query, newFilters);
                        }}
                        placeholder="Any Country"
                    />

                    <Dropdown
                        options={[
                            { value: "", label: filters.country ? 'All Cities' : 'Select country first' },
                            ...(citiesByCountry[filters.country] || []).map(city => ({ value: city, label: city }))
                        ]}
                        value={filters.location || ''}
                        onChange={(val) => handleFilterChange('location', val)}
                        disabled={!filters.country}
                        placeholder={filters.country ? 'All Cities' : 'Select country first'}
                    />

                    <span className="ds-mono ds-mono-muted ml-1 mr-1">sort</span>
                    <Dropdown
                        options={[
                            { value: "relevance", label: "Relevance" },
                            { value: "recent", label: "Most recent" },
                            { value: "match", label: "Match score" }
                        ]}
                        value={sort}
                        onChange={setSort}
                        placeholder="Relevance"
                    />
                    {scoring && <span className="ds-mono ds-mono-muted animate-pulse" aria-live="polite">scoring jobs…</span>}
                    </div>
                    {sortNote && <p role="status" className="m-0 mt-3 text-[14px] text-[#7C2D12]">{sortNote}</p>}
                </div>
            </section>

            <section className="ds-frame ds-rule-b" aria-busy={loading}>
                {error && (
                    <div role="alert" className="ds-cell ds-rule-b bg-[#FEF2F2] text-[#991B1B] text-[15px]">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="ds-gridlines grid-cols-1 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="p-6 min-h-[230px] flex flex-col animate-pulse">
                                <div className="flex gap-4">
                                    <div className="w-11 h-11 bg-[#E7E3DC]" />
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="h-4 w-4/5 bg-[#E7E3DC]" />
                                        <div className="h-3 w-1/3 bg-[#EFECE6]" />
                                    </div>
                                </div>
                                <div className="h-3 w-1/2 bg-[#EFECE6] mt-6" />
                                <div className="h-3 w-full bg-[#EFECE6] mt-4" />
                                <div className="h-3 w-3/4 bg-[#EFECE6] mt-2" />
                                <div className="h-4 w-1/3 bg-[#E7E3DC] mt-auto" />
                            </div>
                        ))}
                    </div>
                ) : jobs.length > 0 ? (
                    <ul className="ds-gridlines grid-cols-1 md:grid-cols-2 lg:grid-cols-3 list-none m-0 p-0">
                        {visibleJobs.map((job, i) => {
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
                    <div className="ds-cell !py-20 text-center">
                        <p className="ds-mono ds-mono-muted m-0 mb-3">{query ? 'no results' : 'start here'}</p>
                        <p className="m-0 text-[24px] font-medium tracking-[-0.02em]">
                            {query ? 'No jobs matched that search.' : 'Search for a role, skill or company.'}
                        </p>
                        <p className="ds-body mt-2 mb-0">
                            {query ? 'Try fewer keywords, or remove a filter.' : 'Turn on AI search to describe the job in your own words.'}
                        </p>
                    </div>
                )}

                {jobs.length >= 10 && !loading && (
                    <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => {
                            const nextPage = page + 1;
                            setPage(nextPage);
                            fetchJobs(query, filters, nextPage, true);
                        }}
                        className="ds-btn ds-btn-ink w-full !min-h-[72px] !px-6 sm:!px-8 hover:!bg-[#CA3C0A] disabled:!opacity-100 disabled:cursor-wait"
                    >
                        <span className="flex items-center gap-3">
                            {loadingMore ? 'Loading more jobs…' : 'Load more jobs'}
                            <span className="ds-mono !text-white/60 hidden sm:inline">showing {jobs.length}</span>
                        </span>
                        {loadingMore
                            ? <FiLoader size={18} className="animate-spin" aria-hidden="true" />
                            : <FiArrowDown size={18} aria-hidden="true" />}
                    </button>
                )}
            </section>

            {/* Job Detail Modal */}
                {selectedJob && (
                    <JobDetail
                        job={selectedJob}
                        user={user}
                        resumeData={resumeData}
                        initialSaved={savedJobs.some(sj => sj.jobId === selectedJob.id)}
                        initialSavedId={savedJobs.find(sj => sj.jobId === selectedJob.id)?._id || null}
                        onToggleSave={handleToggleSave}
                        onClose={() => setSelectedJob(null)}
                    />
                )}
        </div>
    );
}

export default SearchResults;
