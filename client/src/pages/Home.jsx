import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiArrowUpRight, FiArrowRight, FiX, FiCheck, FiMinus } from 'react-icons/fi';
const ResumeUpload = lazy(() => import('../components/ResumeUpload'));
import RecommendedJobs from '../components/RecommendedJobs';
import { smartSearch, getSearchHistory, deleteSearchHistory, clearAllSearchHistory, getSuggestedRoles } from '../services/api';

const STEPS = [
    {
        title: 'Scan your resume',
        body: 'Upload a PDF. We pull out your skills, experience and education, then score it against the roles you want.',
        cta: 'Scan a resume',
        target: 'scan',
    },
    {
        title: 'Find matching jobs',
        body: 'Search live listings from LinkedIn, Indeed and Glassdoor, or describe the job you want in plain English.',
        cta: 'Search jobs',
        target: 'search',
    },
    {
        title: 'Tailor the application',
        body: 'Generate a cover letter and a short recruiter message written for that specific posting.',
        cta: 'Open resume builder',
        target: '/resume-creator',
    },
    {
        title: 'Prepare and track',
        body: 'Practice likely interview questions, then move each job from saved to applied to offer.',
        cta: 'Open tracker',
        target: '/saved',
    },
];

const FEATURES = [
    { title: 'Job search', body: 'Live listings with filters for location, remote, job type and date posted.' },
    { title: 'Plain-English search', body: 'Type “remote React role, mid-level” and we turn it into a structured search.' },
    { title: 'Resume scanner', body: 'Extracts skills, experience and education from your PDF in the browser.' },
    { title: 'Match score', body: 'See how well your resume fits a job, and which keywords are missing.' },
    { title: 'Cover letters', body: 'A first draft written for the job and company, ready for you to edit.' },
    { title: 'Interview prep', body: 'Questions, model answers and talking points generated from the job post.' },
    { title: 'Career path', body: 'Likely next roles, the skills to get there and typical salary steps.' },
    { title: 'Application tracker', body: 'Every saved job in one board, from saved to offer.' },
];

const REPORT_ROWS = [
    { keyword: 'react', resume: true, job: true },
    { keyword: 'typescript', resume: true, job: true },
    { keyword: 'graphql', resume: false, job: true },
    { keyword: 'jest / testing', resume: true, job: true },
    { keyword: 'aws', resume: false, job: true },
];

const DEFAULT_ROLES = ['React Developer', 'Python Engineer', 'Data Scientist', 'UI/UX Designer', 'DevOps Engineer', 'Full Stack', 'Machine Learning'];

function ExampleReport() {
    const score = 74;
    return (
        <div className="relative h-full bg-[#171717] text-white flex flex-col" aria-label="Example ATS report">
            <div className="flex items-center justify-between px-6 sm:px-8 h-14 border-b border-white/15">
                <span className="ds-mono text-white/70">example report</span>
                <span className="ds-mono text-white/70 flex items-center gap-2">
                    <span className="ds-square" /> ats audit
                </span>
            </div>

            <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-white/15">
                <p className="ds-mono text-white/60 mb-3">frontend engineer · fintech · remote</p>
                <div className="flex items-end gap-3">
                    <span className="font-[900] leading-none tracking-[-0.04em]" style={{ fontSize: 'clamp(64px, 8vw, 112px)', fontStretch: '125%' }}>
                        {score}
                    </span>
                    <span className="ds-mono text-white/60 pb-3">/100 match</span>
                </div>
                <div className="mt-5 h-2 bg-white/10" role="img" aria-label={`${score} out of 100`}>
                    <div className="h-full bg-[#CA3C0A] report-bar" style={{ width: `${score}%` }} />
                </div>
            </div>

            <table className="w-full text-left">
                <thead>
                    <tr className="ds-mono text-white/50">
                        <th className="font-normal px-6 sm:px-8 py-3">keyword</th>
                        <th className="font-normal py-3 w-24">resume</th>
                        <th className="font-normal py-3 pr-6 sm:pr-8 w-24">job post</th>
                    </tr>
                </thead>
                <tbody>
                    {REPORT_ROWS.map((row) => (
                        <tr key={row.keyword} className="border-t border-white/10">
                            <td className="px-6 sm:px-8 py-3 text-[15px]">
                                {row.keyword}
                                {!row.resume && <span className="ml-3 ds-mono text-[#FF8A5B]">missing</span>}
                            </td>
                            <td className="py-3">
                                {row.resume ? <FiCheck aria-label="yes" /> : <FiMinus className="text-white/40" aria-label="no" />}
                            </td>
                            <td className="py-3 pr-6 sm:pr-8"><FiCheck aria-label="yes" /></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-auto px-6 sm:px-8 py-5 border-t border-white/15">
                <p className="ds-mono text-white/50 mb-1">suggested fix</p>
                <p className="text-[15px] text-white/90 leading-snug">
                    Add a bullet showing where you built or consumed a GraphQL API, with the result.
                </p>
            </div>
        </div>
    );
}

function Home({ user, resumeData, onResumeAnalyzed }) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [aiMode, setAiMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [recentSearches, setRecentSearches] = useState([]);
    const [suggestedRoles, setSuggestedRoles] = useState(DEFAULT_ROLES);

    // Search is the next page most visitors open: fetch its code while idle
    useEffect(() => {
        const prefetch = () => import('./SearchResults');
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(prefetch, { timeout: 4000 });
            return () => window.cancelIdleCallback(id);
        }
        const t = setTimeout(prefetch, 2000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        getSuggestedRoles()
            .then(res => {
                if (res.data?.success && res.data.roles?.length) setSuggestedRoles(res.data.roles);
            })
            .catch(err => console.error('Failed to fetch suggested roles:', err));
    }, []);

    // Search history: API for signed-in users, localStorage for guests
    useEffect(() => {
        const dedupe = (list) => {
            const seen = new Set();
            const out = [];
            for (const q of list) {
                const clean = q?.trim();
                if (clean && !seen.has(clean.toLowerCase())) {
                    seen.add(clean.toLowerCase());
                    out.push(clean);
                }
                if (out.length >= 8) break;
            }
            return out;
        };

        if (user) {
            getSearchHistory()
                .then(res => setRecentSearches(dedupe((res.data?.history || []).map(h => h.query))))
                .catch(err => console.error('Failed to fetch search history from API:', err));
        } else {
            try {
                setRecentSearches(dedupe(JSON.parse(localStorage.getItem('appliqa_recent_searches') || '[]')));
            } catch { }
        }
    }, [user]);

    const handleDeleteSearch = async (queryToDelete) => {
        const target = queryToDelete?.trim().toLowerCase();
        setRecentSearches(prev => prev.filter(q => q.trim().toLowerCase() !== target));
        try {
            const current = JSON.parse(localStorage.getItem('appliqa_recent_searches') || '[]');
            localStorage.setItem('appliqa_recent_searches', JSON.stringify(current.filter(q => q.trim().toLowerCase() !== target)));
            if (user) await deleteSearchHistory(queryToDelete);
        } catch (err) {
            console.error('Failed to delete search history item:', err);
        }
    };

    const handleClearAllSearches = async () => {
        setRecentSearches([]);
        try {
            localStorage.removeItem('appliqa_recent_searches');
            sessionStorage.removeItem('appliqa_search_history');
            if (user) await clearAllSearchHistory();
        } catch (err) {
            console.error('Failed to clear all search history:', err);
        }
    };

    const goSearch = (q) => navigate(`/search?query=${encodeURIComponent(q)}`);

    const handleSearch = async (e) => {
        e?.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        setError(null);

        try {
            const current = JSON.parse(localStorage.getItem('appliqa_recent_searches') || '[]');
            const updated = [trimmed, ...current.filter(q => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
            localStorage.setItem('appliqa_recent_searches', JSON.stringify(updated));
            setRecentSearches(updated);
        } catch { }

        if (!aiMode) return goSearch(trimmed);

        setLoading(true);
        try {
            const res = await smartSearch(trimmed, resumeData);
            const params = res.data.searchParams;
            navigate(`/search?${new URLSearchParams({
                query: params.query,
                location: params.location || '',
                remote: params.remote ? 'true' : '',
                employmentType: params.employmentType || ''
            })}`);
        } catch (err) {
            if (err?.response?.status === 429) {
                setError('AI search is busy right now. Turn off AI search to search normally, or try again in a minute.');
                return;
            }
            goSearch(trimmed);
        } finally {
            setLoading(false);
        }
    };

    const handleStep = (target) => {
        if (target === 'search') {
            const role = user?.preferences?.desiredRole || resumeData?.suggestedRoles?.[0];
            return role ? goSearch(role) : navigate('/search');
        }
        if (target === 'scan') {
            if (!user) return navigate('/profile');
            return document.getElementById('resume-scan')?.scrollIntoView({ behavior: 'smooth' });
        }
        navigate(target);
    };

    const searchForm = (
        <div>
            <form onSubmit={handleSearch} role="search">
                <label htmlFor="home-search" className="ds-mono ds-mono-muted block mb-2">
                    {aiMode ? 'describe the job you want' : 'job title, skill or company'}
                </label>
                <div className="ds-search">
                    <FiSearch className="self-center ml-4 text-[#6F6A65] shrink-0" size={18} aria-hidden="true" />
                    <input
                        id="home-search"
                        type="search"
                        autoComplete="off"
                        placeholder={aiMode ? 'Remote React role, mid-level, fintech' : 'e.g. Product designer'}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="button" className="ds-toggle" aria-pressed={aiMode} onClick={() => setAiMode(!aiMode)}>
                        <span className="ds-toggle-box" aria-hidden="true" /><span>ai<span className="hidden sm:inline"> search</span></span>
                    </button>
                    <button type="submit" disabled={loading || !query.trim()} className="ds-btn ds-btn-ink !min-h-0 !px-5" aria-label="Search">
                        {loading ? <span className="ds-mono text-white">…</span> : <FiArrowRight size={18} />}
                    </button>
                </div>
            </form>
            {error && <p role="alert" className="mt-3 text-sm text-[#B91C1C]">{error}</p>}

            {recentSearches.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="ds-mono ds-mono-muted mr-1">recent</span>
                    {recentSearches.slice(0, 4).map((q) => (
                        <span key={q} className="ds-chip !pr-1 !cursor-default">
                            <button type="button" className="bg-transparent border-none p-0 cursor-pointer text-inherit" onClick={() => { setQuery(q); goSearch(q); }}>
                                {q}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteSearch(q)}
                                className="w-6 h-6 inline-flex items-center justify-center bg-transparent border-none cursor-pointer text-[#6F6A65] hover:text-[#171717]"
                                aria-label={`Remove ${q} from recent searches`}
                            >
                                <FiX size={12} />
                            </button>
                        </span>
                    ))}
                    <button type="button" onClick={handleClearAllSearches} className="ds-mono ds-mono-muted underline underline-offset-2 bg-transparent border-none cursor-pointer">
                        clear
                    </button>
                </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="ds-mono ds-mono-muted mr-1">trending</span>
                {suggestedRoles.slice(0, 6).map((tag, idx) => (
                    <button key={tag} type="button" className="ds-chip" onClick={() => goSearch(tag)}>
                        <span className="ds-chip-rank">{String(idx + 1).padStart(2, '0')}</span>
                        {tag}
                    </button>
                ))}
            </div>
        </div>
    );

    const howItWorks = (
        <section aria-labelledby="how-heading" className="ds-frame ds-rule-b">
            <div className="ds-cell ds-rule-b flex flex-wrap items-end justify-between gap-4 !pt-16 sm:!pt-24">
                <h2 id="how-heading" className="ds-slash m-0">how-it-works</h2>
                <p className="ds-mono ds-mono-muted m-0">four steps, one place</p>
            </div>
            <ol className="ds-gridlines grid-cols-1 md:grid-cols-2 xl:grid-cols-4 list-none m-0 p-0">
                {STEPS.map((step, i) => (
                    <li key={step.title} className="ds-cell ds-cell-hover flex flex-col min-h-[300px]">
                        <span className="ds-mono text-[#CA3C0A]">0{i + 1}</span>
                        <h3 className="mt-10 mb-3 text-[26px] font-semibold tracking-[-0.02em] leading-tight">{step.title}</h3>
                        <p className="ds-body m-0">{step.body}</p>
                        <button
                            type="button"
                            onClick={() => handleStep(step.target)}
                            className="mt-auto pt-8 self-start inline-flex items-center gap-2 text-[15px] font-semibold text-[#171717] bg-transparent border-none cursor-pointer p-0 hover:text-[#CA3C0A] group"
                        >
                            {step.cta}
                            <FiArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </button>
                    </li>
                ))}
            </ol>
        </section>
    );

    const features = (
        <section aria-labelledby="features-heading" className="ds-frame ds-rule-b">
            <div className="ds-cell ds-rule-b flex flex-wrap items-end justify-between gap-4 !pt-16 sm:!pt-24">
                <h2 id="features-heading" className="ds-slash m-0">features</h2>
                <p className="ds-mono ds-mono-muted m-0">everything included free to start</p>
            </div>
            <ul className="ds-gridlines grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 list-none m-0 p-0">
                {FEATURES.map((f, i) => (
                    <li key={f.title} className="ds-cell ds-cell-hover min-h-[200px]">
                        <span className="ds-mono ds-mono-muted">{String(i + 1).padStart(2, '0')}</span>
                        <h3 className="mt-8 mb-2 text-[20px] font-semibold tracking-[-0.015em]">{f.title}</h3>
                        <p className="ds-body m-0">{f.body}</p>
                    </li>
                ))}
            </ul>
        </section>
    );

    // ---- Signed-out landing ----
    if (!user) {
        return (
            <div className="bg-[#F7F5F2] text-[#171717]">
                <section className="ds-frame ds-rule-b overflow-hidden">
                    <p aria-hidden="true" className="ds-display m-0 px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 select-none ds-rise whitespace-nowrap" style={{ fontSize: 'calc((min(100vw, 1440px) - 80px) / 5.14)' }}>
                        Appliqa<span className="text-[#CA3C0A]">.</span>
                    </p>
                </section>

                <section className="ds-frame ds-rule-b grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-7 order-2 lg:order-1 lg:border-r border-[#D8D4CC] min-h-[520px] ds-rise ds-rise-2">
                        <ExampleReport />
                    </div>

                    <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col">
                        <div className="ds-rule-b px-6 sm:px-8 h-14 flex items-center justify-between gap-4">
                            <span className="ds-mono">ai job search / resume audit</span>
                            <span className="ds-mono hidden sm:flex items-center gap-2">free to start <span className="ds-square" /></span>
                        </div>
                        <div className="ds-cell ds-rule-b ds-rise ds-rise-1">
                            <h1 className="ds-lede m-0 !font-medium" style={{ fontSize: 'clamp(26px, 2.6vw, 36px)', lineHeight: 1.15 }}>
                                Find the right job, get your resume past the filters, and write the application, all in one place.
                            </h1>
                        </div>
                        <div className="ds-cell ds-rule-b flex-1">{searchForm}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2">
                            <button type="button" className="ds-btn ds-btn-accent !min-h-[64px] sm:!min-h-[72px] !px-6 sm:!px-8" onClick={() => navigate('/profile')}>
                                Create free account <FiArrowUpRight size={18} className="ds-btn-arrow" />
                            </button>
                            <button type="button" className="ds-btn !min-h-[64px] sm:!min-h-[72px] !px-6 sm:!px-8 bg-transparent text-[#171717] hover:bg-white border-0 border-t sm:border-t-0 sm:border-l border-[#D8D4CC]" onClick={() => navigate('/search')}>
                                Browse jobs <FiArrowRight size={18} className="ds-btn-arrow" />
                            </button>
                        </div>
                    </div>
                </section>

                {howItWorks}
                {features}

                <section className="ds-frame grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-7 ds-cell !py-16 sm:!py-24 lg:border-r border-[#D8D4CC]">
                        <h2 className="ds-slash m-0">start-now</h2>
                        <p className="ds-lede mt-6 mb-0 max-w-xl">
                            Upload your resume once. Every search, score and cover letter after that is built around it.
                        </p>
                    </div>
                    <div className="lg:col-span-5 flex flex-col justify-end border-t lg:border-t-0 border-[#D8D4CC]">
                        <button type="button" className="ds-btn ds-btn-accent !min-h-[88px] !px-8 !text-lg" onClick={() => navigate('/profile')}>
                            Create free account <FiArrowUpRight size={20} className="ds-btn-arrow" />
                        </button>
                        <button type="button" className="ds-btn !min-h-[72px] !px-8 bg-transparent text-[#171717] hover:bg-white ds-rule-t" onClick={() => navigate('/pricing')}>
                            See pricing <FiArrowRight size={18} className="ds-btn-arrow" />
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    // ---- Signed-in home ----
    const firstName = user?.name?.trim()?.split(' ')[0];
    const shortcuts = [
        { label: 'Resume builder', desc: 'write and tailor', path: '/resume-creator' },
        { label: 'Tracker', desc: 'saved to offer', path: '/saved' },
        { label: 'Career path', desc: 'next roles and skills', path: '/career' },
        { label: 'Advisor', desc: 'ask a career question', path: '/advisor' },
    ];

    return (
        <div className="bg-[#F7F5F2] text-[#171717]">
            <section className="ds-frame ds-rule-b grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-8 lg:border-r border-[#D8D4CC] flex flex-col">
                    <div className="ds-rule-b px-6 sm:px-8 h-14 flex items-center justify-between gap-4">
                        <span className="ds-mono">{firstName ? `welcome back, ${firstName.toLowerCase()}` : 'welcome back'}</span>
                        {resumeData?.fileName ? (
                            <span className="ds-mono ds-mono-muted hidden sm:flex items-center gap-2 truncate">resume on file <span className="ds-square" /></span>
                        ) : (
                            <a href="#resume-scan" className="ds-mono text-[#CA3C0A] hidden sm:inline">add your resume →</a>
                        )}
                    </div>
                    <div className="ds-cell !py-10 sm:!py-14 flex-1">
                        <h1 className="m-0 mb-8 font-semibold tracking-[-0.03em] leading-[1.02]" style={{ fontSize: 'clamp(36px, 4.4vw, 64px)' }}>
                            What job are you<br className="hidden sm:block" /> looking for?
                        </h1>
                        {searchForm}
                    </div>
                </div>

                <nav aria-label="Shortcuts" className="lg:col-span-4 ds-gridlines grid-cols-2 lg:grid-cols-1 border-t lg:border-t-0 border-[#D8D4CC]">
                    {shortcuts.map((s) => (
                        <button
                            key={s.path}
                            type="button"
                            onClick={() => navigate(s.path)}
                            className="ds-cell ds-cell-hover text-left border-0 cursor-pointer flex items-start justify-between gap-4 group"
                        >
                            <span>
                                <span className="block text-[20px] font-semibold tracking-[-0.015em] text-[#171717]">{s.label}</span>
                                <span className="ds-mono ds-mono-muted block mt-1">{s.desc}</span>
                            </span>
                            <FiArrowUpRight size={20} className="text-[#171717] shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </button>
                    ))}
                </nav>
            </section>

            <section className="ds-frame ds-rule-b">
                <RecommendedJobs user={user} resumeData={resumeData} />
            </section>

            <section id="resume-scan" aria-labelledby="scan-heading" className="ds-frame ds-rule-b scroll-mt-20">
                <div className="ds-cell ds-rule-b flex flex-wrap items-end justify-between gap-4 !pt-14">
                    <h2 id="scan-heading" className="ds-slash m-0">resume-scan</h2>
                    <p className="ds-mono ds-mono-muted m-0">pdf or image · read in your browser</p>
                </div>
                <div className="ds-cell">
                    <Suspense fallback={<div className="h-[220px] border border-dashed border-[#D8D4CC]" />}>
                        <ResumeUpload onResumeAnalyzed={onResumeAnalyzed} existingData={resumeData} user={user} />
                    </Suspense>
                </div>
            </section>
        </div>
    );
}

export default Home;
