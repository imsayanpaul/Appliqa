import { useState, useEffect } from 'react';
import { FiX, FiCopy, FiCheck, FiVideo, FiBookOpen, FiTarget, FiMessageCircle, FiAward } from 'react-icons/fi';
import { generateInterviewPrep, saveInterviewPrep } from '../services/api';

function InterviewPrep({ job, user, resumeData, onClose }) {
    const [prepData, setPrepData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // If job already has saved prep, load it
        if (job.interviewPrep) {
            try {
                const parsed = typeof job.interviewPrep === 'string'
                    ? JSON.parse(job.interviewPrep)
                    : job.interviewPrep;
                setPrepData(parsed);
            } catch {
                handleGenerate();
            }
        } else {
            handleGenerate();
        }
    }, []);

    const handleGenerate = async () => {
        setLoading(true);
        setPrepData(null);
        try {
            const res = await generateInterviewPrep({
                resumeData,
                preferences: { name: user?.name, ...user?.preferences },
                jobTitle: job.title,
                jobCompany: job.company,
                jobDescription: job.description
            });
            setPrepData(res.data.interviewPrep);
            // Auto-save to DB
            if (job._id) {
                try {
                    await saveInterviewPrep(job._id, JSON.stringify(res.data.interviewPrep));
                } catch (_) {}
            }
        } catch (err) {
            console.error('Interview prep failed:', err);
            setPrepData({
                questions: [],
                technicalTopics: [],
                companyInsights: [],
                tips: ['Failed to generate interview prep. Please try again.']
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyAll = () => {
        if (!prepData) return;
        let text = `Interview Prep: ${job.title} at ${job.company}\n\n`;

        if (prepData.questions?.length) {
            text += '── INTERVIEW QUESTIONS ──\n\n';
            prepData.questions.forEach((q, i) => {
                text += `${i + 1}. ${q.question}\n`;
                text += `   Type: ${q.type}\n`;
                q.talkingPoints?.forEach(tp => { text += `   • ${tp}\n`; });
                if (q.sampleAnswer) text += `   💡 ${q.sampleAnswer}\n`;
                text += '\n';
            });
        }

        if (prepData.technicalTopics?.length) {
            text += '── TECHNICAL TOPICS TO REVIEW ──\n\n';
            prepData.technicalTopics.forEach(t => {
                text += `• ${t.topic} (${t.importance})\n  ${t.reviewTips}\n\n`;
            });
        }

        if (prepData.companyInsights?.length) {
            text += '── COMPANY TALKING POINTS ──\n\n';
            prepData.companyInsights.forEach(c => { text += `• ${c}\n`; });
            text += '\n';
        }

        if (prepData.tips?.length) {
            text += '── TIPS ──\n\n';
            prepData.tips.forEach(t => { text += `• ${t}\n`; });
        }

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 740 }}>
                <button className="modal-close" onClick={onClose} aria-label="Close modal">
                    <FiX size={15} />
                </button>

                {/* Header */}
                <div className="modal-header pb-4 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-[#FFF0E8] text-[#F45B25] flex items-center justify-center flex-shrink-0 border border-[#F45B25]/20">
                            <FiVideo size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#F45B25] block mb-0.5 font-mono">
                                [ AI Interview Copilot ]
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight leading-tight m-0">
                                Interview Prep & STAR Guide
                            </h2>
                            <p className="text-xs text-neutral-500 font-medium mt-1 truncate">
                                {job.title} <span className="text-neutral-300">·</span> {job.company}
                            </p>
                        </div>
                    </div>

                    {prepData && !loading && (
                        <div className="mt-4 flex items-center gap-2">
                            <button 
                                onClick={handleCopyAll}
                                className="h-8 px-3.5 rounded-md bg-[#FAF8F5] hover:bg-neutral-200 text-[#171717] text-xs font-bold border border-[#D8D4CC] flex items-center gap-1.5 cursor-pointer transition-all"
                                style={{ boxShadow: 'none' }}
                            >
                                {copied ? <><FiCheck size={13} className="text-emerald-600" /> Copied All</> : <><FiCopy size={13} /> Copy All</>}
                            </button>
                        </div>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="text-center py-16 px-4">
                        <div className="w-10 h-10 border-3 border-neutral-200 border-t-[#F45B25] rounded-full animate-spin mx-auto mb-4" />
                        <h3 className="text-base font-bold text-[#171717]">Generating your tailored interview prep...</h3>
                        <p className="text-xs text-neutral-500 mt-1">Analyzing candidate resume synergies, behavioral STAR questions, and technical topics.</p>
                    </div>
                )}

                {/* Content */}
                {prepData && !loading && (
                    <div className="space-y-6 pt-5">

                        {/* Questions */}
                        {prepData.questions?.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3.5">
                                    <div className="w-1 h-3.5 bg-[#F45B25] rounded-full" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717] flex items-center gap-1.5 m-0 font-mono">
                                        <FiMessageCircle size={14} className="text-[#F45B25]" /> Likely Questions & STAR Frameworks
                                    </h3>
                                </div>

                                <div className="space-y-3.5">
                                    {prepData.questions.map((q, i) => (
                                        <div key={i} className="bg-white rounded-lg p-5 border border-[#D8D4CC] transition-all">
                                            {/* Header with tag */}
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <h4 className="text-sm sm:text-base font-bold text-[#171717] leading-snug m-0">
                                                    {i + 1}. {q.question}
                                                </h4>
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FFF0E8] text-[#F45B25] border border-[#F45B25]/20 shrink-0 font-mono">
                                                    {q.type || 'Behavioral'}
                                                </span>
                                            </div>

                                            {/* Talking Points */}
                                            {q.talkingPoints?.length > 0 && (
                                                <div className="mb-3">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono block mb-1.5">
                                                        Key Talking Points
                                                    </span>
                                                    <div className="pl-3 border-l-2 border-[#D8D4CC] space-y-1">
                                                        {q.talkingPoints.map((tp, j) => (
                                                            <p key={j} className="text-xs sm:text-[13px] text-neutral-700 leading-relaxed m-0 font-normal">
                                                                {tp}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Sample Answer Box */}
                                            {q.sampleAnswer && (
                                                <div className="bg-[#FAF8F5] rounded-md p-3.5 border border-[#D8D4CC] border-l-3 border-l-[#F45B25] mt-2.5">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#F45B25] font-mono mb-1 flex items-center gap-1.5">
                                                        <span>💡</span> Suggested Answer Framework
                                                    </div>
                                                    <p className="text-xs sm:text-[13px] text-neutral-800 leading-relaxed font-normal italic m-0">
                                                        "{q.sampleAnswer}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Technical Topics */}
                        {prepData.technicalTopics?.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3.5">
                                    <div className="w-1 h-3.5 bg-[#F45B25] rounded-full" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717] flex items-center gap-1.5 m-0 font-mono">
                                        <FiBookOpen size={14} className="text-[#F45B25]" /> Technical Concepts to Review
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {prepData.technicalTopics.map((t, i) => (
                                        <div key={i} className="bg-white rounded-lg p-4 border border-[#D8D4CC] flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <h4 className="text-xs sm:text-sm font-bold text-[#171717] m-0 truncate">
                                                        {t.topic}
                                                    </h4>
                                                    <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider shrink-0 ${
                                                        t.importance === 'high' 
                                                            ? 'bg-[#171717] text-white' 
                                                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                                                    }`}>
                                                        {t.importance}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-neutral-600 leading-relaxed m-0 font-normal">
                                                    {t.reviewTips}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Company Insights + Tips */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {prepData.companyInsights?.length > 0 && (
                                <div className="bg-white rounded-lg p-5 border border-[#D8D4CC]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-3 bg-[#F45B25] rounded-full" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717] flex items-center gap-1.5 m-0 font-mono">
                                            <FiTarget size={14} className="text-[#F45B25]" /> Company Insights
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {prepData.companyInsights.map((c, i) => (
                                            <div key={i} className="text-xs text-neutral-700 pl-2.5 border-l-2 border-[#D8D4CC] leading-relaxed">
                                                {c}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {prepData.tips?.length > 0 && (
                                <div className="bg-white rounded-lg p-5 border border-[#D8D4CC]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-3 bg-[#F45B25] rounded-full" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717] flex items-center gap-1.5 m-0 font-mono">
                                            <FiAward size={14} className="text-[#F45B25]" /> Interview Pro Tips
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {prepData.tips.map((t, i) => (
                                            <div key={i} className="text-xs text-neutral-700 pl-2.5 border-l-2 border-[#F45B25]/40 leading-relaxed">
                                                {t}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InterviewPrep;
