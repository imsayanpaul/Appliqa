import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiZap, FiUpload, FiArrowRight, FiFileText, FiBarChart2, FiClock, FiTrendingUp } from 'react-icons/fi';
import ResumeUpload from '../components/ResumeUpload';
import RecommendedJobs from '../components/RecommendedJobs';
import { smartSearch, getSearchHistory, deleteSearchHistory, getSuggestedRoles } from '../services/api';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Features } from '../components/ui/features-9';
import { LampContainer } from '@/components/ui/lamp';
import { Hero } from '../components/ui/animated-hero';

function Home({ user, resumeData, onResumeAnalyzed }) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [aiMode, setAiMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [recentSearches, setRecentSearches] = useState([]);
    const [suggestedRoles, setSuggestedRoles] = useState([
        'React Developer', 'Python Engineer', 'Data Scientist', 'UI/UX Designer',
        'DevOps Engineer', 'Full Stack', 'Machine Learning'
    ]);

    // Fetch suggested roles from database
    useEffect(() => {
        getSuggestedRoles()
            .then(res => {
                if (res.data && res.data.success && res.data.roles) {
                    setSuggestedRoles(res.data.roles);
                }
            })
            .catch(err => console.error('Failed to fetch suggested roles:', err));
    }, []);

    // Fetch search history
    useEffect(() => {
        if (user) {
            getSearchHistory()
                .then(res => {
                    const unique = [];
                    const seen = new Set();
                    for (const item of (res.data.history || [])) {
                        const q = item.query?.trim();
                        if (q && !seen.has(q.toLowerCase())) {
                            seen.add(q.toLowerCase());
                            unique.push(q);
                        }
                        if (unique.length >= 8) break;
                    }
                    setRecentSearches(unique);
                })
                .catch(() => {});
        }
    }, [user]);

    const handleDeleteSearch = async (e, queryToDelete) => {
        e.stopPropagation();
        setRecentSearches(prev => prev.filter(q => q !== queryToDelete));
        try {
            await deleteSearchHistory(queryToDelete);
        } catch (err) {
            console.error('Failed to delete search history item:', err);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setError(null);

        if (aiMode) {
            setLoading(true);
            try {
                const res = await smartSearch(query, resumeData);
                const params = res.data.searchParams;
                const searchParams = new URLSearchParams({
                    query: params.query,
                    location: params.location || '',
                    remote: params.remote ? 'true' : '',
                    employmentType: params.employmentType || ''
                });
                navigate(`/search?${searchParams}`);
            } catch (err) {
                if (err?.response?.status === 429) {
                    setError("API limit reached. Please try normal search or upgrade your rapidAPI JSearch plan.");
                    setLoading(false);
                    return;
                }
                // Fallback to regular search
                navigate(`/search?query=${encodeURIComponent(query)}`);
            } finally {
                setLoading(false);
            }
        } else {
            navigate(`/search?query=${encodeURIComponent(query)}`);
        }
    };

    if (!user) {
        return (
            <div className="fade-in" style={{ paddingBottom: '60px' }}>
                <Hero />
                <Features />
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Hero */}
            <LampContainer>
                <div className="hero-badge">
                    <FiZap size={14} />
                    Al Career Navigator & Optimization
                </div>
                <h1 className="display-lg text-white">
                    Outsmart the<br />
                    <span className="gradient-text">Hiring Algorithm</span>
                </h1>
                <p className="max-w-2xl text-center text-zinc-400 mb-9 text-base sm:text-lg">
                    Upload your resume to instantly bridge skill gaps, lock in ATS keyword optimization, and auto-generate flawless cover letters alongside tailored recruiter DMs.
                </p>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '8px', color: '#fca5a5', marginBottom: '16px', maxWidth: 680, margin: '0 auto 16px', textAlign: 'center', fontSize: 14 }}>
                        {error}
                    </div>
                )}

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="omnibar w-full max-w-[720px] mx-auto">
                    <div className="search-input-group">
                        <FiSearch className="search-icon" size={18} />
                        <Input
                            variant="search"
                            type="text"
                            placeholder={aiMode ? 'Try: "remote React jobs paying over 100k"' : 'Job title, skills, or company...'}
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
                        {loading ? 'Searching...' : 'Search'}
                        <FiArrowRight size={16} />
                    </Button>
                </form>
            </LampContainer>

            <div className="main-content">
                {/* Suggested / Trending Searches */}
                <div className="page-section" style={{ marginTop: '-24px', marginBottom: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                        <FiTrendingUp size={14} color="#f97316" />
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Trending Searches</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {suggestedRoles.map((tag, index) => {
                            const isTop3 = index < 3;
                            const rankText = index === 0 ? '1st' : index === 1 ? '2nd' : '3rd';
                            return (
                                <button
                                    key={tag}
                                    className="suggested-role-chip"
                                    onClick={() => navigate(`/search?query=${encodeURIComponent(tag)}`)}
                                    style={isTop3 ? { paddingLeft: 8 } : {}}
                                >
                                    {isTop3 && (
                                        <span className="trending-rank-badge">
                                            {rankText}
                                        </span>
                                    )}
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                    <div className="page-section" style={{ marginBottom: 40 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <FiClock size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Recent Searches</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {recentSearches.map(q => (
                                <div key={q} className="recent-search-chip">
                                    <span 
                                        className="recent-search-text"
                                        onClick={() => navigate(`/search?query=${encodeURIComponent(q)}`)}
                                    >
                                        {q}
                                    </span>
                                    <button 
                                        className="recent-search-delete"
                                        onClick={(e) => handleDeleteSearch(e, q)}
                                        title="Delete search"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Resume Upload Section */}
                <div className="page-section">
                    <div style={{ marginBottom: 20 }}>
                        <p className="text-xs tracking-widest text-zinc-500 uppercase mb-2">[ Scanner ]</p>
                        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                            Resume Scanner
                        </h2>
                    </div>
                    <ResumeUpload
                        onResumeAnalyzed={onResumeAnalyzed}
                        existingData={resumeData}
                    />
                </div>

                {/* Recommended Jobs */}
                <RecommendedJobs user={user} resumeData={resumeData} />

                {/* Features Grid */}
                <Features />
            </div>
        </div>
    );
}

export default Home;
