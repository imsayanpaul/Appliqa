import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiBriefcase, FiZap, FiArrowRight, FiHome } from 'react-icons/fi';
import JobCard from '../components/JobCard';
import JobDetail from '../components/JobDetail';
import { Dropdown } from '../components/ui/Dropdown';
import { searchJobs, smartSearch, getSavedJobs } from '../services/api';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import citiesByCountry from '../data/cities';

function SearchResults({ user, resumeData }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [jobs, setJobs] = useState([]);
    const [savedJobs, setSavedJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [query, setQuery] = useState(searchParams.get('query') || '');
    const [aiMode, setAiMode] = useState(false);
    const [page, setPage] = useState(1);
    const [error, setError] = useState(null);

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
        location: searchParams.get('location') || user?.preferences?.location || '',
        country: searchParams.get('country') || user?.preferences?.country || '',
        employmentType: searchParams.get('employmentType') || '',
        datePosted: searchParams.get('datePosted') || '',
        remote: searchParams.get('remote') || ''
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
        e.preventDefault();
        if (!query.trim()) return;

        if (aiMode) {
            setLoading(true);
            try {
                const res = await smartSearch(query, resumeData);
                const params = res.data.searchParams;
                const newFilters = {
                    location: params.location || '',
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
        <div className="main-content fade-in">
            {/* Search Bar - Omnibar */}
            <div className="search-section">
                <form onSubmit={handleSearch} className="omnibar">
                    <div className="search-input-group">
                        <FiSearch className="search-icon" size={18} />
                        <Input
                            variant="search"
                            type="text"
                            placeholder={aiMode ? 'Describe your ideal job in natural language...' : 'Job title, skills, or company...'}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            style={{ paddingLeft: 12, paddingRight: 12 }}
                        />
                    </div>
                    <button
                        type="button"
                        className={`ai-toggle ${aiMode ? 'active' : ''}`}
                        onClick={() => setAiMode(!aiMode)}
                        style={{ border: 'none', background: aiMode ? '' : 'transparent' }}
                    >
                        <FiZap size={14} />
                        AI Search
                    </button>
                    <Button type="submit" variant="primary" disabled={loading} style={{ borderRadius: 99 }}>
                        {loading ? '...' : 'Search'}
                    </Button>
                </form>

                {/* Filters */}
                <div className="filters-bar" style={{ justifyContent: 'center', maxWidth: 720, margin: '0 auto 40px' }}>
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
                            { value: "today", label: "Today" },
                            { value: "3days", label: "Last 3 Days" },
                            { value: "week", label: "This Week" },
                            { value: "month", label: "This Month" }
                        ]}
                        value={filters.datePosted}
                        onChange={(val) => handleFilterChange('datePosted', val)}
                        placeholder="Any Time"
                    />

                    <button
                        className={`filter-chip ${filters.remote === 'true' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('remote', filters.remote === 'true' ? '' : 'true')}
                    >
                        <FiHome size={14} style={{ marginRight: 6 }} /> Remote Only
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
                </div>
            </div>

            {/* Results */}
            <div className="results-header">
                <span className="results-count">
                    {loading ? 'Searching...' : `${jobs.length} jobs found`}
                </span>
            </div>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px', color: '#fca5a5', marginBottom: '24px', textAlign: 'center' }}>
                    <FiZap size={18} style={{ marginBottom: 4 }} /> <br/>
                    {error}
                </div>
            )}

            {loading ? (
                <EmptyState loading title="Searching for jobs..." />
            ) : jobs.length > 0 ? (
                 <div className="results-grid">
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
            ) : query ? (
                <EmptyState 
                    icon={FiSearch} 
                    title="No jobs found"
                    description="Try different keywords or adjust your filters" 
                />
            ) : (
                <EmptyState 
                    icon={FiBriefcase} 
                    title="Start searching"
                    description="Enter a job title, skill, or use AI search to find your perfect match" 
                />
            )}

            {/* Load More */}
            {jobs.length >= 10 && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    {loadingMore ? (
                        <div className="loading-spinner"><div className="spinner" /></div>
                    ) : (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                const nextPage = page + 1;
                                setPage(nextPage);
                                fetchJobs(query, filters, nextPage, true);
                            }}
                        >
                            Load More <FiArrowRight size={14} />
                        </Button>
                    )}
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
        </div>
    );
}

export default SearchResults;
