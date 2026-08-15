import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiBriefcase, FiZap, FiArrowRight, FiHome, FiAward, FiCheckCircle, FiFilter } from 'react-icons/fi';
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
        if (e) e.preventDefault();
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
        <div className="fade-in bg-[#F7F5F2] min-h-screen text-[#171717] pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8">
                <h1 className="sr-only">Job Search Results — Appliqa</h1>
                {/* Search Bar - Omnibar */}
                <div className="w-full max-w-3xl mx-auto mb-6">
                    <form onSubmit={handleSearch} className="w-full bg-white rounded-2xl p-2.5 flex items-center gap-2 shadow-lg border border-neutral-200/80">
                        <div className="flex-1 flex items-center gap-2.5 pl-3">
                            <FiSearch className="text-[#66615C]" size={18} />
                            <input
                                type="text"
                                placeholder={aiMode ? 'Describe your dream tech role with natural language...' : 'Job title, skills, or target company...'}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-transparent border-none outline-none text-[#171717] text-sm placeholder-[#66615C] font-medium"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setAiMode(!aiMode)}
                            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border-none cursor-pointer whitespace-nowrap ${
                                aiMode ? 'bg-[#FFF0E8] text-[#F45B25]' : 'bg-neutral-100 text-[#66615C] hover:text-[#171717]'
                            }`}
                            title="Toggle AI Smart Search"
                        >
                            <FiZap size={13} className={aiMode ? 'text-[#F45B25]' : 'text-[#66615C]'} />
                            <span>AI Search</span>
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 sm:px-6 py-2.5 rounded-xl bg-[#F45B25] hover:bg-[#D94B1F] text-white text-xs font-bold flex items-center gap-1.5 transition-all border-none cursor-pointer shadow-md shadow-[#F45B25]/20 whitespace-nowrap"
                        >
                            <span>{loading ? '...' : 'Search'}</span>
                            <FiArrowRight size={14} />
                        </button>
                    </form>
                </div>

                {/* Filters Row */}
                <div className="flex items-center justify-center gap-2.5 flex-wrap max-w-4xl mx-auto mb-10">
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
                        Remote Only
                    </button>

                    <button
                        className={`filter-chip ${filters.employmentType === 'INTERN' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('employmentType', filters.employmentType === 'INTERN' ? '' : 'INTERN')}
                    >
                        Internships
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

                {/* Results Header */}
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-4 border-b border-neutral-200/80">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F45B25] animate-pulse" />
                        <span className="text-sm font-bold text-[#171717]">
                            {loading ? 'Searching opportunities...' : `${jobs.length} Opportunities Found ${query ? `for "${query}"` : ''}`}
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm mb-6 text-center">
                        <FiZap size={18} className="mb-1 inline-block" /> <br/>
                        {error}
                    </div>
                )}

                {/* Grid of Job Cards */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-[#D8D4CC] shadow-xs space-y-4 flex flex-col justify-between min-h-[230px]">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="w-12 h-12 rounded-xl bg-neutral-200/80 shrink-0" />
                                        <div className="h-5 w-16 bg-neutral-200/60 rounded-md" />
                                    </div>
                                    <div className="space-y-2 pt-1">
                                        <div className="h-5 w-4/5 bg-neutral-200/80 rounded-md" />
                                        <div className="h-3.5 w-1/2 bg-neutral-200/50 rounded" />
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <div className="h-6 w-20 bg-neutral-200/50 rounded-md" />
                                        <div className="h-6 w-24 bg-neutral-200/50 rounded-md" />
                                        <div className="h-6 w-16 bg-neutral-200/50 rounded-md" />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                                    <div className="h-4 w-28 bg-neutral-200/60 rounded" />
                                    <div className="h-8 w-24 bg-neutral-200/80 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : jobs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                        title="No opportunities found"
                        description="Try broadening your keywords or adjusting filter parameters." 
                    />
                ) : (
                    <EmptyState 
                        icon={FiBriefcase} 
                        title="Explore tech careers"
                        description="Enter a skill, role title, or activate AI Search to find verified opportunities." 
                    />
                )}

                {/* Load More Button */}
                {jobs.length >= 10 && (
                    <div className="flex justify-center items-center mt-12 mb-6">
                        {loadingMore ? (
                            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-[#D8D4CC] shadow-sm text-xs font-mono text-[#171717]">
                                <span className="w-3.5 h-3.5 rounded-full border-2 border-neutral-200 border-t-[#F45B25] animate-spin shrink-0" />
                                <span className="tracking-wider">FETCHING MORE ROLES...</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    const nextPage = page + 1;
                                    setPage(nextPage);
                                    fetchJobs(query, filters, nextPage, true);
                                }}
                                className="h-10 px-6 rounded-md bg-[#FAF8F5] hover:bg-[#171717] text-[#171717] hover:text-white border border-[#D8D4CC] hover:border-[#171717] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm group"
                            >
                                <span>Load More Roles</span>
                                <FiArrowRight size={13} className="text-[#F45B25] group-hover:text-white transition-colors" />
                            </button>
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
        </div>
    );
}

export default SearchResults;
