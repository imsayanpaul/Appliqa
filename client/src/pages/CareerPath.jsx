import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FiTrendingUp, 
    FiTarget, 
    FiClock, 
    FiCheck, 
    FiRefreshCw, 
    FiMap, 
    FiChevronDown, 
    FiChevronUp,
    FiArrowRight, 
    FiAward, 
    FiDollarSign,
    FiBriefcase,
    FiZap
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { getCareerPath } from '../services/api';

function CareerPath({ user, resumeData }) {
    const navigate = useNavigate();
    const [pathData, setPathData] = useState(() => {
        const saved = localStorage.getItem('appliqa_career_path');
        return saved ? JSON.parse(saved) : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedCards, setExpandedCards] = useState({});
    const [allExpanded, setAllExpanded] = useState(true);

    const currentRole = user?.preferences?.desiredRole || resumeData?.suggestedRoles?.[0];

    const fetchCareerPath = async () => {
        setLoading(true);
        setError('');
        setAllExpanded(true);
        setExpandedCards({});
        try {
            const res = await getCareerPath({
                resumeData,
                preferences: user?.preferences
            });
            const data = res.data.careerPath;
            setPathData(data);
            localStorage.setItem('appliqa_career_path', JSON.stringify(data));
            // Auto-expand all cards
            if (data?.paths) {
                const expanded = {};
                data.paths.forEach((_, idx) => { expanded[idx] = true; });
                setExpandedCards(expanded);
            }
        } catch (err) {
            console.error('Career path failed:', err);
            setError('Failed to generate career path. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!pathData && (currentRole || resumeData?.skills?.length > 0)) {
            fetchCareerPath();
        }
    }, []);

    const toggleCard = (index) => {
        setExpandedCards(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const toggleAll = () => {
        const nextState = !allExpanded;
        setAllExpanded(nextState);
        if (pathData?.paths) {
            const updated = {};
            pathData.paths.forEach((_, idx) => {
                updated[idx] = nextState;
            });
            setExpandedCards(updated);
        }
    };

    const getMatchColor = (percent) => {
        if (percent >= 80) return {
            bg: 'bg-[#FFF0E8] text-[#F45B25] border-[#F45B25]/30',
            bar: 'bg-[#F45B25]',
            text: 'text-[#F45B25]'
        };
        if (percent >= 65) return {
            bg: 'bg-[#FFF8F5] text-[#F45B25] border-[#F45B25]/20',
            bar: 'bg-[#F45B25]',
            text: 'text-[#F45B25]'
        };
        return {
            bg: 'bg-neutral-100 text-[#171717] border-neutral-200',
            bar: 'bg-neutral-800',
            text: 'text-neutral-800'
        };
    };

    if (!currentRole && !resumeData?.skills?.length) {
        return (
            <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] flex items-center justify-center p-4 sm:p-6">
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-lg w-full bg-white rounded-lg p-6 sm:p-8 border border-[#D8D4CC] shadow-md text-center"
                >
                    {/* Category Eyebrow */}
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#F45B25] mb-4">
                        [ Pathway Intelligence Engine ]
                    </p>

                    {/* Visual Icon Badge */}
                    <div className="w-14 h-14 rounded-lg bg-[#FFF0E8] border border-[#F45B25]/20 text-[#F45B25] flex items-center justify-center mx-auto mb-4">
                        <FiMap size={26} strokeWidth={2} />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight mb-2">
                        Career Path Visualizer
                    </h2>

                    <p className="text-xs sm:text-sm text-[#66615C] leading-relaxed mb-6 max-w-md mx-auto">
                        Upload your resume or set your target role in your Profile to generate a personalized multi-tier career progression roadmap, benchmark compensations, and identify skill bridges.
                    </p>

                    {/* Feature Highlights Bento Box */}
                    <div className="bg-[#FAF8F5] border border-[#D8D4CC]/70 rounded-md p-3.5 mb-6 text-left space-y-2">
                        <div className="flex items-center gap-2.5 text-xs text-[#171717] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F45B25] shrink-0" />
                            <span><strong>Role Trajectory Map:</strong> Multi-tier promotion ladder & next logical roles</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-[#171717] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F45B25] shrink-0" />
                            <span><strong>Compensation Benchmarks:</strong> Live market salary brackets per level</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-[#171717] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F45B25] shrink-0" />
                            <span><strong>Skill Gap Bridges:</strong> High-impact skills & credentials to unlock each tier</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/profile')}
                            className="w-full py-3 px-5 rounded-md bg-[#171717] hover:bg-[#F45B25] text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border-none cursor-pointer shadow-xs"
                        >
                            <span>Set Up Profile & Resume</span>
                            <FiArrowRight size={15} />
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-2.5 px-5 rounded-md bg-transparent hover:bg-[#FAF8F5] text-[#66615C] hover:text-[#171717] font-semibold text-xs transition-all border border-transparent hover:border-[#D8D4CC] cursor-pointer"
                        >
                            Back to Home
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-64px)] bg-[#FAF8F5] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                            Career Path & Trajectory
                        </h1>
                        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                            Algorithmic analysis of your current role, transferable skill set, and high-impact promotion paths.
                        </p>
                    </div>

                    {pathData && (
                        <div className="flex items-center gap-2.5 self-start sm:self-auto">
                            <button
                                onClick={fetchCareerPath}
                                disabled={loading}
                                className="px-4 py-2.5 rounded-xl bg-[#171717] hover:bg-neutral-900 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 border-none cursor-pointer disabled:opacity-50"
                            >
                                <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                                <span>{loading ? 'Analyzing...' : 'Regenerate'}</span>
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-6 animate-pulse">
                        {/* Current Position Baseline Skeleton */}
                        <div className="bg-white rounded-xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-neutral-200/80 shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-32 bg-neutral-200/60 rounded" />
                                    <div className="h-6 w-64 bg-neutral-200/90 rounded-md" />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-7 w-24 bg-neutral-200/50 rounded-lg" />
                                ))}
                            </div>
                        </div>

                        {/* Trajectory Skeletons */}
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-7 border border-neutral-200/80 shadow-xs space-y-5">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-neutral-200/80" />
                                        <div className="space-y-1.5">
                                            <div className="h-5 w-52 bg-neutral-200/80 rounded-md" />
                                            <div className="h-3 w-36 bg-neutral-200/50 rounded" />
                                        </div>
                                    </div>
                                    <div className="h-8 w-28 bg-neutral-200/70 rounded-full" />
                                </div>
                                <div className="space-y-2.5 pt-2">
                                    <div className="h-3.5 bg-neutral-200/50 rounded w-full" />
                                    <div className="h-3.5 bg-neutral-200/50 rounded w-4/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200 shadow-sm">
                        <p className="text-sm font-semibold text-[#F45B25] mb-4">{error}</p>
                        <button
                            onClick={fetchCareerPath}
                            className="px-6 py-2.5 rounded-xl bg-[#F45B25] text-white text-xs font-bold border-none cursor-pointer"
                        >
                            Try Again
                        </button>
                    </div>
                ) : pathData ? (
                    <div className="space-y-8">
                        {/* Current Position Baseline Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl p-6 sm:p-7 border border-neutral-200 shadow-sm relative overflow-hidden"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start sm:items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#FFF0E8] text-[#F45B25] flex items-center justify-center shrink-0 shadow-sm">
                                        <FiBriefcase size={22} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#F45B25]">
                                                Current Baseline Role
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold uppercase">
                                                {pathData.currentLevel || 'Mid'} Level
                                            </span>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
                                            {pathData.currentRole || currentRole}
                                        </h2>
                                    </div>
                                </div>
                            </div>

                            {/* Skills Snapshot if available */}
                            {resumeData?.skills?.length > 0 && (
                                <div className="mt-5 pt-4 border-t border-neutral-100 flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-bold text-neutral-500 mr-1.5">Active Profile Skills:</span>
                                    {resumeData.skills.slice(0, 8).map((skill, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2.5 py-1 rounded-lg bg-neutral-50 text-[#171717] text-xs font-medium border border-neutral-200"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                    {resumeData.skills.length > 8 && (
                                        <span className="text-xs text-neutral-400 font-medium">
                                            +{resumeData.skills.length - 8} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </motion.div>

                        {/* Progression Grid */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    
                                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                                        Recommended Next Horizons
                                    </h3>
                                    <span className="hidden md:inline-block text-neutral-300">|</span>
                                    <span className="text-xs text-neutral-400 font-normal hidden md:inline-block">
                                        Ranked by transferable skill synergy
                                    </span>
                                </div>

                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
                                {pathData.paths?.map((path, i) => {
                                    const matchStyle = getMatchColor(path.match_percent);

                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.05 * i }}
                                            className="h-full bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all flex flex-col justify-between overflow-hidden"
                                            style={{ boxShadow: 'none' }}
                                        >
                                            <div className="p-5 flex flex-col flex-1">
                                                {/* Role Title & Match Badge */}
                                                <div className="flex items-start justify-between gap-3 mb-3 min-h-[48px]">
                                                    <h4 className="text-base font-bold text-[#171717] leading-snug line-clamp-2 m-0">
                                                        {path.title}
                                                    </h4>
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border shrink-0 ${matchStyle.bg}`}>
                                                        {path.match_percent}%
                                                    </span>
                                                </div>

                                                {/* Description */}
                                                <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3 mb-4 font-normal min-h-[54px] m-0">
                                                    {path.description}
                                                </p>

                                                {/* Meta Stats Badges */}
                                                <div className="flex flex-wrap items-start content-start gap-1.5 mb-4 min-h-[54px]">
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-50 border border-neutral-200/80 text-[11px] font-semibold text-neutral-700">
                                                        <FiClock size={11} className="text-neutral-400" />
                                                        <span>{path.timeline}</span>
                                                    </div>
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-50 border border-neutral-200/80 text-[11px] font-semibold text-neutral-700">
                                                        <FiAward size={11} className="text-neutral-400" />
                                                        <span className="capitalize">{path.level}</span>
                                                    </div>
                                                    {path.salary_range && (
                                                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFF8F5] border border-[#F45B25]/20 text-[11px] font-bold text-[#F45B25]">
                                                            <span>₹ {path.salary_range}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Readiness Progress Bar */}
                                                <div className="mt-auto mb-4">
                                                    <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 mb-1">
                                                        <span>Skill Readiness</span>
                                                        <span className="text-[#F45B25] font-bold">{path.match_percent}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${path.match_percent}%` }}
                                                            transition={{ duration: 0.7, delay: 0.1 * i }}
                                                            className="h-full rounded-full bg-[#F45B25]"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Skills Breakdown (always visible) */}
                                                <div className="pt-3 border-t border-neutral-100 space-y-3">
                                                    {path.skills_have?.length > 0 && (
                                                        <div>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#171717] flex items-center gap-1 mb-1.5">
                                                                <FiCheck size={11} className="text-[#F45B25]" /> Skills You Master
                                                            </span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {path.skills_have.map((s, j) => (
                                                                    <span key={j} className="px-2 py-0.5 rounded bg-neutral-100 text-[#171717] text-[11px] font-medium border border-neutral-200">
                                                                        {s}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {path.skills_needed?.length > 0 && (
                                                        <div>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#F45B25] flex items-center gap-1 mb-1.5">
                                                                <FiTarget size={11} /> Skills to Bridge Gap
                                                            </span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {path.skills_needed.map((s, j) => (
                                                                    <span key={j} className="px-2 py-0.5 rounded bg-[#FFF0E8] text-[#F45B25] text-[11px] font-medium border border-[#F45B25]/20">
                                                                        {s}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Footer Actions */}
                                            <div className="p-4 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-end gap-2">

                                                <button
                                                    onClick={() => navigate(`/search?query=${encodeURIComponent(path.title)}`)}
                                                    className="px-3 py-1.5 rounded-md bg-white hover:bg-neutral-100 text-[#171717] text-xs font-bold border border-neutral-200 shadow-sm transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                                    title={`Search ${path.title} jobs`}
                                                >
                                                    <span>View Roles</span>
                                                    <FiArrowRight size={12} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Executive Career Advice Card */}
                        {pathData.advice && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white rounded-xl p-6 sm:p-8 border border-neutral-200 shadow-sm"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#F45B25] text-white flex items-center justify-center shrink-0 shadow-md">
                                        <FiTrendingUp size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base sm:text-lg font-black text-[#171717] tracking-tight mb-2 flex items-center gap-2">
                                            <span>Executive Strategy & Career Advisory</span>
                                        </h3>
                                        <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal">
                                            {pathData.advice}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default CareerPath;
