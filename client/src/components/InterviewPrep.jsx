import { useState, useEffect } from 'react';
import { useEscapeKey } from '../lib/useEscapeKey';
import { FiX, FiCopy, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { generateInterviewPrep, saveInterviewPrep } from '../services/api';

function InterviewPrep({ job, user, resumeData, onClose }) {
    const [prepData, setPrepData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    useEscapeKey(onClose);

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
                if (q.sampleAnswer) text += `   Example answer: ${q.sampleAnswer}\n`;
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
        <div className="modal-overlay" onClick={onClose} data-lenis-prevent>
            <div
                className="modal-content ds-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="prep-title"
                onClick={e => e.stopPropagation()}
                data-lenis-prevent
            >
                <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                    <span className="ds-mono self-center px-6 sm:px-8 truncate">interview prep / {(job.company || 'job').toLowerCase()}</span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="w-14 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-white"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="ds-sheet-body" data-lenis-prevent>
                    <header className="ds-sheet-section !pt-8">
                        <h2 id="prep-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#171717]">
                            Prepare for this interview
                        </h2>
                        <p className="ds-mono ds-mono-muted mt-3 mb-0 truncate">{job.title} · {job.company}</p>
                    </header>

                    {loading && (
                        <section className="ds-sheet-section !py-16" aria-busy="true">
                            <p className="ds-mono ds-mono-muted m-0 mb-4 animate-pulse">writing questions and talking points…</p>
                            <div className="h-1.5 bg-[#EFECE6] overflow-hidden">
                                <div className="h-full w-1/3 bg-[#CA3C0A] animate-pulse" />
                            </div>
                        </section>
                    )}

                    {prepData && !loading && (
                        <>
                            {prepData.questions?.length > 0 && (
                                <section className="ds-sheet-section">
                                    <h3 className="ds-mono ds-mono-muted m-0 mb-2">likely questions · {prepData.questions.length}</h3>
                                    <ol className="list-none m-0 p-0">
                                        {prepData.questions.map((q, i) => (
                                            <li key={i} className="grid grid-cols-[32px_1fr] gap-2 py-5 border-0 border-t border-[#D8D4CC] first:border-t-0">
                                                <span className="ds-mono text-[#CA3C0A] pt-1">{String(i + 1).padStart(2, '0')}</span>
                                                <div>
                                                    <p className="m-0 text-[17px] font-semibold leading-snug text-[#171717]">{q.question}</p>
                                                    <p className="ds-mono ds-mono-muted mt-1.5 mb-0">{(q.type || 'behavioral').toLowerCase()}</p>
                                                    {q.talkingPoints?.length > 0 && (
                                                        <ul className="ds-list mt-3">
                                                            {q.talkingPoints.map((tp, j) => <li key={j}>{tp}</li>)}
                                                        </ul>
                                                    )}
                                                    {q.sampleAnswer && (
                                                        <div className="mt-3 bg-white border border-[#D8D4CC] p-4">
                                                            <p className="ds-mono ds-mono-muted m-0 mb-1">example answer</p>
                                                            <p className="m-0 text-[15px] leading-relaxed text-[#2A2622]">{q.sampleAnswer}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </section>
                            )}

                            {prepData.technicalTopics?.length > 0 && (
                                <section className="border-0 border-b border-[#D8D4CC]">
                                    <h3 className="ds-mono ds-mono-muted m-0 px-6 sm:px-8 pt-6 pb-4">topics to review</h3>
                                    <ul className="ds-gridlines grid-cols-1 sm:grid-cols-2 list-none m-0 p-0 border-0 border-t border-[#D8D4CC]">
                                        {prepData.technicalTopics.map((t, i) => (
                                            <li key={i} className="px-6 sm:px-8 py-5">
                                                <p className="m-0 flex items-baseline justify-between gap-3">
                                                    <span className="text-[16px] font-semibold text-[#171717]">{t.topic}</span>
                                                    <span className={`ds-mono shrink-0 ${t.importance === 'high' ? 'text-[#CA3C0A]' : 'ds-mono-muted'}`}>{t.importance}</span>
                                                </p>
                                                <p className="m-0 mt-1.5 text-[15px] leading-relaxed text-[#4A4540]">{t.reviewTips}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {prepData.companyInsights?.length > 0 && (
                                <section className="ds-sheet-section">
                                    <h3 className="ds-mono ds-mono-muted m-0 mb-2">about the company</h3>
                                    <ul className="ds-list">
                                        {prepData.companyInsights.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                </section>
                            )}

                            {prepData.tips?.length > 0 && (
                                <section className="ds-sheet-section">
                                    <h3 className="ds-mono ds-mono-muted m-0 mb-2">tips</h3>
                                    <ul className="ds-list">
                                        {prepData.tips.map((t, i) => <li key={i}>{t}</li>)}
                                    </ul>
                                </section>
                            )}
                        </>
                    )}
                </div>

                {prepData && !loading && (
                    <div className="shrink-0 grid grid-cols-2 border-0 border-t border-[#D8D4CC]">
                        <button type="button" onClick={handleCopyAll} className="ds-btn !min-h-[64px] !px-6 sm:!px-8 bg-[#F7F5F2] text-[#171717] hover:bg-white">
                            {copied ? 'Copied' : 'Copy all'} {copied ? <FiCheck size={17} /> : <FiCopy size={17} />}
                        </button>
                        <button type="button" onClick={handleGenerate} className="ds-btn ds-btn-ink !min-h-[64px] !px-6 sm:!px-8">
                            Generate again <FiRefreshCw size={17} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InterviewPrep;
