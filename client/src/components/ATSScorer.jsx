import { useState, useEffect } from 'react';
import { FiX, FiCheck, FiAlertCircle, FiRefreshCw, FiFileText } from 'react-icons/fi';
import { FileCheck } from 'lucide-react';
import { getATSScore } from '../services/api';

function ATSScorer({ job, resumeData, onClose }) {
    const [atsData, setAtsData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        handleAnalyze();
    }, []);

    const handleAnalyze = async () => {
        if (!resumeData?.rawText) {
            setError('We need your raw resume text to perform an ATS scan. Please upload a PDF or TXT resume on the Home page first.');
            return;
        }

        setLoading(true);
        setError('');
        setAtsData(null);
        
        try {
            const res = await getATSScore({
                resumeText: resumeData.rawText,
                jobTitle: job.title,
                jobDescription: job.description
            });
            setAtsData(res.data.atsResult);
        } catch (err) {
            console.error('ATS scoring failed:', err.response?.data || err);
            const serverMsg = err.response?.data?.error || err.response?.data?.message;
            setError(serverMsg ? `Score failed: ${serverMsg}` : 'Failed to analyze resume for ATS compatibility. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getScoreTier = (score) => {
        if (score >= 75) return { label: 'High Alignment', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
        if (score >= 50) return { label: 'Moderate Match', color: 'text-[#F45B25]', bg: 'bg-[#FFF0E8] border-[#F45B25]/30' };
        return { label: 'Low Match', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' };
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 780 }}>
                <button className="modal-close" onClick={onClose} aria-label="Close modal">
                    <FiX size={15} />
                </button>

                {/* Header */}
                <div className="modal-header pb-4 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-[#FFF0E8] text-[#F45B25] flex items-center justify-center flex-shrink-0 border border-[#F45B25]/20">
                            <FileCheck size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25] block mb-0.5">
                                [ ATS Compatibility Diagnostic ]
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight leading-tight m-0">
                                Resume ATS Audit & Keyword Match
                            </h2>
                            <p className="text-xs text-neutral-500 font-medium mt-1 truncate">
                                {job.title} <span className="text-neutral-300">·</span> {job.company}
                            </p>
                        </div>
                    </div>

                    {atsData && !loading && (
                        <div className="mt-3.5 flex items-center gap-2">
                            <button 
                                onClick={handleAnalyze}
                                className="h-8 px-3.5 rounded-md bg-[#FAF8F5] hover:bg-neutral-200 text-[#171717] text-xs font-bold border border-[#D8D4CC] flex items-center gap-1.5 cursor-pointer transition-all"
                                style={{ boxShadow: 'none' }}
                            >
                                <FiRefreshCw size={12} /> Re-scan Resume
                            </button>
                        </div>
                    )}
                </div>

                {/* Error State */}
                {error && (
                    <div className="py-6 text-center">
                        <div className="bg-rose-50 text-rose-700 border border-rose-200 px-4 py-3 rounded-md inline-flex items-center gap-2 text-xs font-medium">
                            <FiAlertCircle size={16} className="shrink-0" /> {error}
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-16 px-4">
                        <div className="w-10 h-10 border-3 border-neutral-200 border-t-[#F45B25] rounded-full animate-spin mx-auto mb-4" />
                        <h3 className="text-base font-bold text-[#171717]">Scanning resume through ATS parser...</h3>
                        <p className="text-xs text-neutral-500 mt-1">Simulating keyword extraction, semantic density, and quantifiable impact metrics.</p>
                    </div>
                )}

                {/* Results View */}
                {atsData && !loading && (
                    <div className="space-y-5 pt-4">
                        
                        {/* Top Overview: Overall Score + Sub Scores */}
                        <div className="bg-[#FAF8F5] rounded-lg p-5 sm:p-6 border border-[#D8D4CC]">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                {/* Verdict Memo */}
                                <div className="md:col-span-6 space-y-2">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                                        Executive Assessment
                                    </span>
                                    <p className="text-xs sm:text-[13px] text-neutral-800 leading-relaxed font-normal m-0">
                                        {atsData.verdict}
                                    </p>
                                </div>

                                {/* 3 Metric Columns */}
                                <div className="md:col-span-6 grid grid-cols-3 gap-2.5">
                                    {/* Overall Score */}
                                    <div className="bg-white rounded-md p-3 border border-[#D8D4CC] flex flex-col justify-between">
                                        <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                                            Overall Fit
                                        </span>
                                        <div>
                                            <span className="text-xl sm:text-2xl font-mono font-black text-[#171717] block leading-none">
                                                {atsData.atsScore || 0}%
                                            </span>
                                            <span className={`inline-block text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded mt-1.5 border ${getScoreTier(atsData.atsScore || 0).bg} ${getScoreTier(atsData.atsScore || 0).color}`}>
                                                {getScoreTier(atsData.atsScore || 0).label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Verbs */}
                                    <div className="bg-white rounded-md p-3 border border-[#D8D4CC] flex flex-col justify-between">
                                        <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                                            Action Verbs
                                        </span>
                                        <div>
                                            <span className="text-xl sm:text-2xl font-mono font-black text-[#171717] block leading-none">
                                                {atsData.actionVerbs?.score || 0}%
                                            </span>
                                            <span className={`inline-block text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded mt-1.5 border ${getScoreTier(atsData.actionVerbs?.score || 0).bg} ${getScoreTier(atsData.actionVerbs?.score || 0).color}`}>
                                                {atsData.actionVerbs?.score >= 65 ? 'Strong' : 'Review'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Metrics & Impact */}
                                    <div className="bg-white rounded-md p-3 border border-[#D8D4CC] flex flex-col justify-between">
                                        <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                                            Measurable
                                        </span>
                                        <div>
                                            <span className="text-xl sm:text-2xl font-mono font-black text-[#171717] block leading-none">
                                                {atsData.metrics?.score || 0}%
                                            </span>
                                            <span className={`inline-block text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded mt-1.5 border ${getScoreTier(atsData.metrics?.score || 0).bg} ${getScoreTier(atsData.metrics?.score || 0).color}`}>
                                                {atsData.metrics?.score >= 65 ? 'High' : 'Needs Work'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Keyword Density & Parsing Breakdown */}
                        <div className="bg-white rounded-lg p-5 border border-[#D8D4CC]">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-3.5 bg-[#F45B25] rounded-full" />
                                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#171717] m-0">
                                    Keyword Extraction & Density Analysis
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {/* Found in Resume */}
                                <div>
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 block mb-2">
                                        Found in Resume ({atsData.keywords?.found?.length || 0})
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(atsData.keywords?.found || []).map((kw, i) => (
                                            <span key={`f-${i}`} className="font-mono text-[11px] font-semibold bg-[#FAF8F5] text-neutral-800 border border-[#D8D4CC] rounded px-2 py-0.5 inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                                {kw}
                                            </span>
                                        ))}
                                        {(!atsData.keywords?.found || atsData.keywords.found.length === 0) && (
                                            <span className="text-xs text-neutral-400 font-mono">No direct keyword matches detected.</span>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-neutral-100" />

                                {/* Missing Keywords */}
                                <div>
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F45B25] block mb-2">
                                        Missing High-Priority Terms ({atsData.keywords?.missing?.length || 0})
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(atsData.keywords?.missing || []).map((kw, i) => (
                                            <span key={`m-${i}`} className="font-mono text-[11px] font-semibold bg-[#FFF0E8] text-[#F45B25] border border-[#F45B25]/25 rounded px-2 py-0.5 inline-flex items-center gap-1">
                                                + {kw}
                                            </span>
                                        ))}
                                        {(!atsData.keywords?.missing || atsData.keywords.missing.length === 0) && (
                                            <span className="text-xs text-neutral-500 font-mono">All required keyword terms identified in resume.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Verbs & Metrics Feedback (2 Columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-[#D8D4CC]">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#171717] block mb-1.5">
                                    Action Verbs & Impact
                                </span>
                                <p className="text-xs text-neutral-700 leading-relaxed m-0 font-normal">
                                    {atsData.actionVerbs?.feedback || "Sufficient action verbs utilized across experience bullets."}
                                </p>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-[#D8D4CC]">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#171717] block mb-1.5">
                                    Metrics & Quantifiable Data
                                </span>
                                <p className="text-xs text-neutral-700 leading-relaxed m-0 font-normal">
                                    {atsData.metrics?.feedback || "Quantifiable metrics and results detected in your bullet points."}
                                </p>
                            </div>
                        </div>

                        {/* Actionable Improvements */}
                        {atsData.improvements?.length > 0 && (
                            <div className="bg-white rounded-lg p-5 border border-[#D8D4CC]">
                                <div className="flex items-center gap-2 mb-3.5">
                                    <div className="w-1 h-3.5 bg-[#F45B25] rounded-full" />
                                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#171717] m-0">
                                        Targeted Resume Optimization Steps
                                    </h3>
                                </div>

                                <div className="space-y-3">
                                    {atsData.improvements.map((imp, i) => (
                                        <div key={i} className="bg-[#FAF8F5] rounded-md p-3.5 border border-[#D8D4CC] space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                                    imp.priority === 'high' 
                                                        ? 'bg-[#171717] text-white' 
                                                        : 'bg-neutral-200 text-neutral-700'
                                                }`}>
                                                    {imp.priority} Priority
                                                </span>
                                                <h4 className="text-xs sm:text-[13px] font-bold text-[#171717] m-0">
                                                    {imp.issue}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-neutral-700 pl-2.5 border-l-2 border-[#F45B25] leading-relaxed m-0 font-normal">
                                                <strong>Suggested Fix:</strong> {imp.fix}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                    </div>
                )}
            </div>
        </div>
    );
}

export default ATSScorer;
