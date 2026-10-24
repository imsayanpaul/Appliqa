import { useState, useEffect, useRef } from 'react';
import { FiX, FiSend, FiRefreshCw } from 'react-icons/fi';
import { useEscapeKey } from '../lib/useEscapeKey';
import { mockInterview } from '../services/api';

// A practice interview for one job: the AI asks five questions one at a time,
// gives short feedback on each answer, then sums up strengths and what to improve.
function MockInterview({ job, user, resumeData, onClose }) {
    useEscapeKey(onClose, true);
    const [turns, setTurns] = useState([]); // { role: 'interviewer' | 'candidate', text, question?, feedback? }
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState({ number: 0, total: 5, done: false });
    const [summary, setSummary] = useState('');
    const endRef = useRef(null);

    const send = async (text = '', base = turns) => {
        setLoading(true);
        setError(null);
        const history = text ? [...base, { role: 'candidate', text }] : base;
        if (text) setTurns(history);
        setAnswer('');
        try {
            const res = await mockInterview({
                job: { title: job.title, company: job.company, description: (job.description || '').slice(0, 3000) },
                resumeData,
                preferences: { name: user?.name, ...user?.preferences },
                history: base,
                answer: text,
            });
            const d = res.data;
            const next = [...history];
            // The first reply's "feedback" is the interviewer's greeting
            if (d.feedback) next.push({ role: 'interviewer', text: d.feedback, feedback: Boolean(text) });
            if (d.question) next.push({ role: 'interviewer', text: d.question, question: true });
            setTurns(next);
            setProgress({ number: d.questionNumber, total: d.total, done: d.done });
            if (d.summary) setSummary(d.summary);
        } catch (err) {
            if (text) {
                setTurns(base);
                setAnswer(text);
            }
            setError(err?.response?.data?.error || 'The interviewer didn’t answer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { send(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns, summary]);

    const restart = () => {
        setTurns([]);
        setSummary('');
        setProgress({ number: 0, total: 5, done: false });
        send('', []);
    };

    return (
        <div className="modal-overlay" onClick={onClose} data-lenis-prevent>
            <div className="modal-content ds-sheet" role="dialog" aria-modal="true" aria-labelledby="mock-title" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
                <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                    <span className="ds-mono self-center px-6 sm:px-8 truncate">
                        mock interview / {(job.company || 'job').toLowerCase()}
                        {progress.number > 0 && !progress.done && <span className="text-[#CA3C0A]"> · question {progress.number} of {progress.total}</span>}
                    </span>
                    <button type="button" onClick={onClose} aria-label="Close" className="w-14 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-white">
                        <FiX size={18} />
                    </button>
                </div>

                <div className="ds-sheet-body" data-lenis-prevent aria-live="polite">
                    <header className="ds-sheet-section !pt-8">
                        <h2 id="mock-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#171717]">Practice the interview</h2>
                        <p className="ds-body mt-3 mb-0">Five questions for {job.title}, based on the job and your resume. Answer as you would out loud; you’ll get feedback after each one.</p>
                    </header>

                    <section className="ds-sheet-section space-y-4">
                        {turns.map((t, i) => (
                            <div key={i} className={t.role === 'candidate' ? 'pl-8' : ''}>
                                <p className={`ds-mono m-0 mb-1 ${t.role === 'candidate' ? 'ds-mono-muted text-right' : t.feedback ? 'text-[#047857]' : 'text-[#CA3C0A]'}`}>
                                    {t.role === 'candidate' ? 'you' : t.feedback ? 'feedback' : 'interviewer'}
                                </p>
                                <div className={`text-[15px] leading-relaxed whitespace-pre-wrap p-4 ${t.role === 'candidate' ? 'bg-[#171717] text-white' : t.feedback ? 'bg-[#ECFDF5] text-[#064E3B]' : 'bg-white border border-[#D8D4CC] text-[#171717]'}`}>
                                    {t.text}
                                </div>
                            </div>
                        ))}
                        {loading && <p className="ds-mono ds-mono-muted m-0 animate-pulse">{turns.length ? 'thinking about your answer…' : 'getting ready…'}</p>}
                        {summary && (
                            <div>
                                <p className="ds-mono text-[#171717] m-0 mb-1">how you did</p>
                                <div className="ds-output whitespace-pre-wrap">{summary}</div>
                            </div>
                        )}
                        {error && <p role="alert" className="m-0 text-[14px] text-[#B91C1C]">{error}</p>}
                        <div ref={endRef} />
                    </section>
                </div>

                <div className="shrink-0 border-0 border-t border-[#D8D4CC]">
                    {progress.done ? (
                        <button type="button" onClick={restart} className="ds-btn ds-btn-ink w-full !min-h-[64px]">
                            Practice again <FiRefreshCw size={17} />
                        </button>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); if (answer.trim()) send(answer.trim()); }} className="flex items-stretch m-0">
                            <label htmlFor="mock-answer" className="sr-only">Your answer</label>
                            <textarea
                                id="mock-answer"
                                rows={3}
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && answer.trim()) send(answer.trim()); }}
                                placeholder="Type your answer… (Ctrl+Enter to send)"
                                disabled={loading || !turns.length}
                                className="flex-1 min-w-0 resize-none border-0 px-6 py-4 text-[15px] bg-white outline-none"
                            />
                            <button type="submit" disabled={loading || !answer.trim()} className="ds-btn ds-btn-accent !min-h-0 !px-6 shrink-0" aria-label="Send answer">
                                <FiSend size={18} />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MockInterview;
