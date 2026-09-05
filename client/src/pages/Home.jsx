import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiSearch, FiZap, FiUpload, FiArrowRight, FiFileText, FiBriefcase,
    FiClock, FiTrendingUp, FiGlobe, FiMessageSquare, FiShield, FiCheckCircle,
    FiStar, FiMapPin, FiLayers, FiSend, FiTarget, FiAward, FiX
} from 'react-icons/fi';
const ResumeUpload = lazy(() => import('../components/ResumeUpload'));
import RecommendedJobs from '../components/RecommendedJobs';
import { smartSearch, getSearchHistory, deleteSearchHistory, clearAllSearchHistory, getSuggestedRoles } from '../services/api';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Hero } from '../components/ui/animated-hero';

function Home({ user, session, authResolved, resumeData, onResumeAnalyzed }) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [aiMode, setAiMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [recentSearches, setRecentSearches] = useState([]);
    const [activeStep, setActiveStep] = useState(0);
    const [selectedTab, setSelectedTab] = useState('job-seekers');
    const [suggestedRoles, setSuggestedRoles] = useState([
        'React Developer', 'Python Engineer', 'Data Scientist', 'UI/UX Designer',
        'DevOps Engineer', 'Full Stack', 'Machine Learning'
    ]);

    const stepData = [
        {
            tabLabel: '1. Scan & Audit Resume',
            number: '1/4',
            title: 'Scan Resume & Fix Keyword Gaps',
            description: 'Upload your CV to instantly calculate your ATS keyword match score against live job algorithms, spot missing technical skills, and receive metric-boosted bullet point rewrites.',
            buttonText: 'Start Resume Scan →',
            action: () => scrollToResumeScanner(),
            candidate: {
                name: 'Alex Rivers',
                role: 'Senior Full-Stack Engineer',
                skills: ['React / Next.js', 'Node.js', 'System Design', 'Docker'],
                badge: '96% ATS Compatibility'
            }
        },
        {
            tabLabel: '2. Smart Role Matching',
            number: '2/4',
            title: 'Match With Verified High-Paying Roles',
            description: 'Search with conversational prompts like "Remote founding React engineer over $140k" and receive verified roles scored directly against your verified skill profile.',
            buttonText: 'Explore Matched Roles →',
            action: () => handleExploreMatchedRoles(),
            candidate: {
                name: 'Sofia Martinez',
                role: 'AI Product Specialist',
                skills: ['LLM Orchestration', 'Prompt Engineering', 'Product Strategy', 'Python'],
                badge: '98% Profile Match'
            }
        },
        {
            tabLabel: '3. Tailored Applications',
            number: '3/4',
            title: 'Auto-Generate Bespoke Letters & DMs',
            description: 'One click produces tailored cover letters matched to the exact tone and requirements of the job posting alongside high-converting LinkedIn introduction notes for hiring managers.',
            buttonText: 'Open Application Creator →',
            action: () => navigate('/resume-creator'),
            candidate: {
                name: 'Elena Rostova',
                role: 'Lead UI/UX Designer',
                skills: ['Design Systems', 'Figma', 'User Research', 'Interaction Design'],
                badge: 'Tailored Letters Ready'
            }
        },
        {
            tabLabel: '4. Interview & Offers',
            number: '4/4',
            title: 'Ace STAR Interviews & Track Offers',
            description: 'Practice with tailored behavioral and technical mock questions generated specifically for your saved jobs, master STAR talking points, and track your application pipeline to offer.',
            buttonText: 'Launch Career Advisor →',
            action: () => navigate('/advisor'),
            candidate: {
                name: 'Marcus Chen',
                role: 'Cloud Solutions Architect',
                skills: ['Kubernetes', 'AWS Solutions', 'Terraform', 'CI/CD Pipelines'],
                badge: 'Offer Received · $195k'
            }
        }
    ];

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

    // Fetch search history (API for logged-in user, localStorage for guests)
    useEffect(() => {
        const fetchHistory = async () => {
            const unique = [];
            const seen = new Set();

            if (user) {
                try {
                    const res = await getSearchHistory();
                    for (const item of (res.data?.history || [])) {
                        const q = item.query?.trim();
                        if (q && !seen.has(q.toLowerCase())) {
                            seen.add(q.toLowerCase());
                            unique.push(q);
                        }
                        if (unique.length >= 8) break;
                    }
                    setRecentSearches(unique);
                    return;
                } catch (err) {
                    console.error('Failed to fetch search history from API:', err);
                }
            } else {
                try {
                    const localHistory = JSON.parse(localStorage.getItem('appliqa_recent_searches') || '[]');
                    for (const q of localHistory) {
                        const clean = q?.trim();
                        if (clean && !seen.has(clean.toLowerCase())) {
                            seen.add(clean.toLowerCase());
                            unique.push(clean);
                        }
                        if (unique.length >= 8) break;
                    }
                    setRecentSearches(unique);
                } catch { }
            }
        };

        fetchHistory();
    }, [user]);

    const handleDeleteSearch = async (e, queryToDelete) => {
        e.stopPropagation();
        const target = queryToDelete?.trim().toLowerCase();
        setRecentSearches(prev => prev.filter(q => q.trim().toLowerCase() !== target));
        try {
            const current = JSON.parse(localStorage.getItem('appliqa_recent_searches') || '[]');
            const updated = current.filter(q => q.trim().toLowerCase() !== target);
            localStorage.setItem('appliqa_recent_searches', JSON.stringify(updated));
            await deleteSearchHistory(queryToDelete);
        } catch (err) {
            console.error('Failed to delete search history item:', err);
        }
    };

    const handleClearAllSearches = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setRecentSearches([]);
        try {
            localStorage.removeItem('appliqa_recent_searches');
            sessionStorage.removeItem('appliqa_search_history');
            await clearAllSearchHistory();
        } catch (err) {
            console.error('Failed to clear all search history:', err);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        setError(null);

        // Update local history cache
        try {
            const current = JSON.parse(localStorage.getItem('appliqa_recent_searches') || '[]');
            const updated = [trimmed, ...current.filter(q => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
            localStorage.setItem('appliqa_recent_searches', JSON.stringify(updated));
            setRecentSearches(updated);
        } catch { }

        if (aiMode) {
            setLoading(true);
            try {
                const res = await smartSearch(trimmed, resumeData);
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
                navigate(`/search?query=${encodeURIComponent(trimmed)}`);
            } finally {
                setLoading(false);
            }
        } else {
            navigate(`/search?query=${encodeURIComponent(trimmed)}`);
        }
    };

    const handleExploreMatchedRoles = () => {
        const targetQuery = user?.preferences?.desiredRole || resumeData?.suggestedRoles?.[0] || 'Software Engineer';
        const params = new URLSearchParams({ query: targetQuery });
        if (user?.preferences?.location) params.append('location', user.preferences.location);
        if (user?.preferences?.country) params.append('country', user.preferences.country);
        navigate(`/search?${params.toString()}`);
    };

    const scrollToResumeScanner = () => {
        const el = document.getElementById('resume-intelligence-section');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const currentStep = stepData[activeStep];

    const renderPipelineSection = () => (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 sm:pt-14 mb-24">
            <div className="text-center max-w-3xl mx-auto mb-10">

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#171717] leading-tight">
                    Accelerate Your Career in Four Intelligent Steps
                </h2>
                <p className="mt-3 text-base sm:text-lg text-[#66615C] leading-relaxed font-normal max-w-2xl mx-auto">
                    From algorithmic resume audit to offer negotiation, Appliqa automates and guides every stage of your job search pipeline.
                </p>
            </div>

            {/* Switcher Tabs / Step Indicators */}
            <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
                {stepData.map((step, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveStep(idx)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer transition-all ${activeStep === idx ? 'bg-[#171717] text-white shadow-md' : 'bg-white text-[#66615C] hover:text-[#171717] border border-neutral-200/80 shadow-2xs'
                            }`}
                    >
                        {step.tabLabel}
                    </button>
                ))}
            </div>

            {/* Layered Showcase Card with Burnt Orange Shelf */}
            <div className="relative">
                <div className="relative z-10 rounded-3xl bg-[#171717] p-8 sm:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden shadow-2xl">
                    <div className="flex-1 max-w-lg">
                        <span className="text-2xl sm:text-3xl font-mono font-black text-[#F45B25] tracking-widest block mb-4">
                            {currentStep.number}
                        </span>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                            {currentStep.title}
                        </h3>
                        <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal mb-6">
                            {currentStep.description}
                        </p>
                        <button
                            onClick={currentStep.action}
                            className="px-6 py-3 rounded-xl bg-[#F45B25] hover:bg-[#D94B1F] text-white text-xs font-bold transition-all border-none cursor-pointer shadow-lg shadow-[#F45B25]/20"
                        >
                            {currentStep.buttonText}
                        </button>
                    </div>

                    {/* Floating Profile / Candidate Preview Card */}
                    <div className="w-full md:w-auto flex-shrink-0">
                        <div className="rounded-2xl bg-white p-7 text-[#171717] shadow-2xl max-w-sm w-full border border-neutral-100">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-full bg-[#FFF0E8] border border-[rgba(244,91,37,0.3)] flex items-center justify-center text-[#F45B25] font-black text-xl">
                                    AP
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#66615C] uppercase tracking-wider block font-semibold">Verified Candidate</span>
                                    <h4 className="text-lg font-bold text-[#171717]">{currentStep.candidate.name}</h4>
                                    <p className="text-xs text-[#66615C]">{currentStep.candidate.role}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-5">
                                {currentStep.candidate.skills.map((skill, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-lg bg-[#FFF0E8] text-[#F45B25] text-xs font-semibold border border-[rgba(244,91,37,0.2)]">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
                                <span className="text-[#66615C] font-medium">ATS Optimization</span>
                                <span className="text-[#059669] font-bold">{currentStep.candidate.badge}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Orange Baseline Shadow Shelf */}
                <div className="absolute -bottom-3 left-4 right-4 h-6 rounded-2xl bg-[#F45B25] z-0" />
                <div className="absolute -bottom-6 left-8 right-8 h-6 rounded-2xl bg-[#D94B1F]/30 -z-10" />
            </div>
        </section>
    );

    const renderFeatureGridAndCta = () => (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-24">
            <div className="text-center max-w-3xl mx-auto mb-12">

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#171717] leading-tight">
                    Discover the Ultimate Platform for Finding & Optimizing Opportunities
                </h2>
                <p className="mt-3 text-base sm:text-lg text-[#66615C] leading-relaxed font-normal max-w-2xl mx-auto">
                    Revolutionizing the way you match skills, bypass automated filters, and land high-paying roles.
                </p>
            </div>

            {/* 8-Card Grid in Clean White with Divider Borders */}
            <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden border border-neutral-200/80 bg-white shadow-xs mb-8">
                {/* Item 1: Wide Range of Opportunities */}
                <div className="p-8 sm:p-10 border-b md:border-r border-neutral-200/80 hover:bg-[#FFF0E8]/20 transition-colors flex items-start gap-5 sm:gap-6">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-[#171717]">
                        <FiGlobe size={36} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-[#171717] mb-2 leading-snug">
                            Wide Range of Verified Roles
                        </h3>
                        <p className="text-sm text-[#66615C] leading-relaxed font-normal">
                            Access diverse tech and remote job listings across global industries, tailored directly to your verified skills and salary expectations.
                        </p>
                    </div>
                </div>

                {/* Item 2: Recruiter Outreach */}
                <div className="p-8 sm:p-10 border-b border-neutral-200/80 hover:bg-[#FFF0E8]/20 transition-colors flex items-start gap-5 sm:gap-6">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-[#171717]">
                        <FiMessageSquare size={36} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-[#171717] mb-2 leading-snug">
                            Recruiter DMs & Outreach
                        </h3>
                        <p className="text-sm text-[#66615C] leading-relaxed font-normal">
                            Connect directly with hiring managers using AI-crafted LinkedIn cold introduction notes and personalized follow-ups.
                        </p>
                    </div>
                </div>

                {/* Item 3: ATS Keyword Scanner & Fixer */}
                <div className="p-8 sm:p-10 border-b md:border-r border-neutral-200/80 hover:bg-[#FFF0E8]/20 transition-colors flex items-start gap-5 sm:gap-6">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-[#171717]">
                        <FiTarget size={36} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-[#171717] mb-2 leading-snug">
                            ATS Keyword Scanner & Fixer
                        </h3>
                        <p className="text-sm text-[#66615C] leading-relaxed font-normal">
                            Compare your resume against target job postings. Uncover missing hard skills, software proficiencies, and formatting penalties.
                        </p>
                    </div>
                </div>

                {/* Item 4: AI Resume Builder & Enhancer */}
                <div className="p-8 sm:p-10 border-b border-neutral-200/80 hover:bg-[#FFF0E8]/20 transition-colors flex items-start gap-5 sm:gap-6">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-[#171717]">
                        <FiFileText size={36} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-[#171717] mb-2 leading-snug">
                            AI Resume Builder & Enhancer
                        </h3>
                        <p className="text-sm text-[#66615C] leading-relaxed font-normal">
                            Build modern, ATS-proof PDF resumes with AI-generated executive summaries, bullet enhancers, and clean formatting.
                        </p>
                    </div>
                </div>

                {/* Item 5: Tailored Cover Letters */}
                <div className="p-8 sm:p-10 border-b md:border-r border-neutral-200/80 hover:bg-[#FFF0E8]/20 transition-colors flex items-start gap-5 sm:gap-6">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-[#171717]">
                        <FiSend size={36} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-[#171717] mb-2 leading-snug">
                            Tailored Cover Letter Generator
                        </h3>
                        <p className="text-sm text-[#66615C] leading-relaxed font-normal">
                            Instantly generate bespoke cover letters that match the tone, required tech stack, and culture of any target company.
                        </p>
                    </div>
                </div>

                {/* Item 6: STAR-Method Interview Prep Coach */}
                <div className="p-8 sm:p-10 border-b border-neutral-200/80 hover:bg-[#FFF0E8]/20 transition-colors flex items-start gap-5 sm:gap-6">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-[#171717]">
                        <FiAward size={36} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-[#171717] mb-2 leading-snug">
                            STAR Interview Prep Coach
                        </h3>
                        <p className="text-sm text-[#66615C] leading-relaxed font-normal">
                            Practice with tailored technical and behavioral mock interview questions with structured STAR-method talking points.
                        </p>
                    </div>
                </div>

                {/* Item 7: Interactive Career Path Visualizer */}
                <div className="p-8 sm:p-10 border-b md:border-b-0 md:border-r border-neutral-200/80 hover:bg-[#FFF0E8]/20 transition-colors flex items-start gap-5 sm:gap-6">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-[#171717]">
                        <FiTrendingUp size={36} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-[#171717] mb-2 leading-snug">
                            Career Path Visualizer
                        </h3>
                        <p className="text-sm text-[#66615C] leading-relaxed font-normal">
                            Map your career trajectory from Junior to Senior to Architect with verified skill benchmarks and compensation ladders.
                        </p>
                    </div>
                </div>

                {/* Item 8: Smart Application Pipeline Tracker */}
                <div className="p-8 sm:p-10 hover:bg-[#FFF0E8]/20 transition-colors flex items-start gap-5 sm:gap-6">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-[#171717]">
                        <FiBriefcase size={36} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-[#171717] mb-2 leading-snug">
                            Smart Application Tracker
                        </h3>
                        <p className="text-sm text-[#66615C] leading-relaxed font-normal">
                            Organize, bookmark, and track application stages seamlessly from Saved, Applied, Interview, to Offer in real-time.
                        </p>
                    </div>
                </div>
            </div>

            {/* Split CTA Banner */}
            <div className="grid grid-cols-1 md:grid-cols-12 rounded-2xl overflow-hidden shadow-xl border border-neutral-200/80">
                <div className="md:col-span-6 bg-[#171717] p-8 sm:p-12 text-white flex flex-col justify-between">
                    <div>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-4">
                            Ready to Fast-Track Your Career Breakthrough?
                        </h3>
                        <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal mb-8">
                            Join thousands of engineers, designers, and tech leaders using Appliqa to optimize applications, bypass ATS filters, and secure top-tier offers.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-fit px-6 py-3 rounded-xl bg-white text-[#171717] hover:bg-neutral-100 text-xs font-bold transition-all border-none cursor-pointer"
                    >
                        {user ? 'Edit Your Profile →' : 'Create Your Free Profile →'}
                    </button>
                </div>
                <div className="md:col-span-6 min-h-[260px] bg-[#EFECE6] relative overflow-hidden">
                    <picture>
                        <source srcSet="/workspace-desk.webp" type="image/webp" />
                        <img
                            src="/workspace-desk.jpg"
                            alt="Modern Workspace Desk"
                            className="w-full h-full object-cover object-center"
                            loading="lazy"
                            decoding="async"
                            width="1200"
                            height="800"
                        />
                    </picture>
                </div>
            </div>
        </section>
    );

    // Dedicated Get Started Landing Page before sign-in
    if (!user) {
        return (
            <div className="fade-in bg-[#F7F5F2] min-h-screen text-[#171717]">
                <Suspense fallback={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
                        <div className="spinner primary-spinner"></div>
                    </div>
                }>
                    <Hero />
                </Suspense>

                {/* ── 4-Stage Career Pipeline ── */}
                {renderPipelineSection()}

                {/* ── 8-Feature Grid & Split CTA ── */}
                {renderFeatureGridAndCta()}
            </div>
        );
    }

    return (
        <div className="fade-in bg-[#F7F5F2] min-h-screen text-[#171717]">
            {/* ── Mobile & Tablet Layout: Clean Wrapped Pills (Centered, Zero Cutoff) ── */}
            <div className="lg:hidden w-full pt-1.5 pb-1 px-3 sm:px-6 md:px-8 max-w-7xl mx-auto flex flex-col items-center justify-center text-center" style={{ minHeight: '68px', contain: 'layout style' }}>
                <div className="flex items-center justify-center gap-1.5 mb-1.5 px-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F45B25] animate-pulse shrink-0" />
                    <span className="text-[10.5px] uppercase tracking-wider font-bold text-[#66615C]">Trending Searches</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                    {suggestedRoles.map((tag, idx) => {
                        const isTop3 = idx < 3;
                        const rank = idx + 1;
                        return (
                            <button
                                key={tag}
                                type="button"
                                className="inline-flex items-center px-2.5 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold bg-white border border-[#D8D4CC] text-[#171717] active:scale-95 shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer"
                                onClick={() => navigate(`/search?query=${encodeURIComponent(tag)}`)}
                            >
                                {isTop3 && (
                                    <span
                                        className={`inline-flex items-center justify-center text-[8.5px] sm:text-[9px] font-black mr-1 sm:mr-1.5 px-1.5 py-0.5 rounded-[3px] leading-none shrink-0 ${
                                            rank === 1
                                                ? 'bg-[#F45B25] text-white'
                                                : 'bg-[#ECE8E1] text-[#171717]'
                                        }`}
                                    >
                                        #{rank}
                                    </span>
                                )}
                                <span>{tag}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Desktop Layout: Centered Squarish Glass Dock (1024px+) ── */}
            <div className="hidden lg:flex w-full pt-4 pb-1 px-6 max-w-7xl mx-auto items-center justify-center" style={{ minHeight: '48px', contain: 'layout style' }}>
                <div className="inline-flex items-center flex-wrap justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/95 backdrop-blur-md border border-[#D8D4CC] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#171717] mr-1 flex-shrink-0">
                        <span className="w-2 h-2 rounded-full bg-[#F45B25] animate-pulse" />
                        <span className="tracking-wide text-[11.5px] uppercase font-bold text-[#66615C]">Trending:</span>
                    </div>
                    {suggestedRoles.map((tag, idx) => {
                        const isTop3 = idx < 3;
                        const rank = idx + 1;
                        return (
                            <button
                                key={tag}
                                type="button"
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold active:scale-95 transition-all cursor-pointer shadow-none group ${
                                    isTop3
                                        ? 'bg-white text-[#171717] border border-[#D8D4CC] hover:border-[#171717] hover:bg-[#171717] hover:text-white'
                                        : 'bg-[#FAF8F5] text-[#171717] border border-[#D8D4CC] hover:bg-[#171717] hover:text-white'
                                }`}
                                onClick={() => navigate(`/search?query=${encodeURIComponent(tag)}`)}
                            >
                                {isTop3 && (
                                    <span
                                        className={`inline-flex items-center justify-center text-[9.5px] font-black mr-1.5 px-1.5 py-0.5 rounded-[3px] leading-none transition-colors ${
                                            rank === 1
                                                ? 'bg-[#F45B25] text-white group-hover:bg-white group-hover:text-[#F45B25]'
                                                : 'bg-[#ECE8E1] text-[#171717] group-hover:bg-white/20 group-hover:text-white'
                                        }`}
                                    >
                                        #{rank}
                                    </span>
                                )}
                                <span>{tag}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <section className="w-full pt-1.5 sm:pt-3 pb-8 sm:pb-12 px-3 sm:px-6 md:px-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl border border-neutral-200/80 lg:min-h-[520px]">
                    <div className="lg:col-span-7 bg-[#F45B25] p-5 sm:p-10 md:p-14 text-white flex flex-col justify-between relative h-full">
                        <div>
                            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-2 sm:mb-6">
                                Outsmart the ATS.<br />
                                Land Dream Roles.<br />
                                All in One Place.
                            </h1>
                            <p className="text-xs sm:text-base md:text-lg text-white/90 font-normal leading-normal sm:leading-relaxed mb-3.5 sm:mb-8 max-w-xl">
                                Bypass automated application filters, lock in 90%+ keyword optimization, and auto-generate bespoke cover letters alongside tailored recruiter outreach notes.
                            </p>
                        </div>

                        <div className="w-full">
                            <form onSubmit={handleSearch} className="w-full flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-2xl p-2.5 sm:p-1.5 shadow-xl border border-white/20 transition-all focus-within:ring-2 focus-within:ring-white gap-2 sm:gap-0">
                                <div className="flex items-center pl-2 sm:pl-3.5 pr-2 flex-1 min-w-0 pb-1 sm:pb-0 border-b border-neutral-100 sm:border-none">
                                    <FiSearch className="text-neutral-400 mr-2.5 shrink-0" size={18} />
                                    <input
                                        type="text"
                                        className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 font-medium py-1 sm:py-0"
                                        placeholder={aiMode ? 'Try: "Remote React engineer paying over $140k"' : 'Search job titles, required skills, or company...'}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setAiMode(!aiMode)}
                                        className={`flex-1 sm:flex-initial justify-center px-3 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${aiMode
                                                ? 'bg-[#FFF0E8] text-[#F45B25]'
                                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                            }`}
                                        title="Toggle AI Smart Search"
                                    >
                                        <FiZap size={13} className={aiMode ? 'text-[#F45B25]' : 'text-neutral-500'} />
                                        <span>AI Search</span>
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2.5 rounded-xl bg-[#171717] hover:bg-neutral-900 text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50 whitespace-nowrap"
                                    >
                                        <span>{loading ? '...' : 'Search'}</span>
                                        <FiArrowRight size={13} />
                                    </button>
                                </div>
                            </form>

                            {/* Recent Searches (if available) */}
                            {recentSearches.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 text-xs text-white/90 w-full mt-3.5 pt-0.5">
                                    <span className="flex items-center gap-1 font-bold text-white shrink-0">
                                        <FiClock size={12} />
                                        <span>Recent:</span>
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {recentSearches.slice(0, 3).map((q) => (
                                            <span
                                                key={q}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 backdrop-blur-sm text-white text-xs font-medium cursor-pointer transition-all border border-white/15 group shrink-0"
                                                onClick={() => {
                                                    setQuery(q);
                                                    navigate(`/search?query=${encodeURIComponent(q)}`);
                                                }}
                                            >
                                                <span>{q}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteSearch(e, q)}
                                                    className="hover:text-white/40 p-0.5 bg-transparent border-none cursor-pointer flex items-center text-white/70 group-hover:text-white"
                                                    title="Remove from history"
                                                >
                                                    <FiX size={11} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearAllSearches}
                                        className="text-[11px] text-white/80 hover:text-white underline cursor-pointer bg-transparent border-none shrink-0"
                                        title="Clear all search history"
                                    >
                                        Clear all
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-5 bg-[#EFECE6] relative min-h-[340px] lg:min-h-full overflow-hidden">
                        <picture>
                            <source srcSet="/hero-portrait.webp" type="image/webp" />
                            <img
                                src="/hero-portrait.jpg"
                                alt="Professional Tech Candidate"
                                className="w-full h-full object-cover object-center"
                                loading="eager"
                                fetchPriority="high"
                                decoding="async"
                                width="1200"
                                height="896"
                            />
                        </picture>
                    </div>
                </div>
            </section>

            {renderPipelineSection()}

            {renderFeatureGridAndCta()}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <RecommendedJobs user={user} resumeData={resumeData} />
            </div>

            {/* ── SECTION 5: Resume Intelligence Scanner Suite ── */}
            <section id="resume-intelligence-section" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-24">
                <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <p className="text-xs tracking-widest uppercase mb-1 font-bold text-[#F45B25]">[ Deep LLM & OCR Engine ]</p>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#171717]">
                            Resume Intelligence & ATS Audit
                        </h2>
                    </div>
                </div>
                <Suspense fallback={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                        <div className="spinner primary-spinner"></div>
                    </div>
                }>
                    <ResumeUpload
                        onResumeAnalyzed={onResumeAnalyzed}
                        existingData={resumeData}
                        user={user}
                    />
                </Suspense>
            </section>
        </div>
    );
}

export default Home;
