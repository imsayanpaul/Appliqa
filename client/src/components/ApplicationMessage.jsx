import { useState } from 'react';
import { FiX, FiCopy, FiCheck, FiRefreshCw, FiSend } from 'react-icons/fi';
import { useEscapeKey } from '../lib/useEscapeKey';
import { draftFollowUp, markFollowUpSent } from '../services/api';
import { appliedDate, daysSince } from '../lib/tracker';

// Follow-up email for an application that's gone quiet, or a thank-you note after
// an interview. Written from the person's profile and the cover letter they sent.
function ApplicationMessage({ job, kind, user, resumeData, onClose, onSent }) {
    useEscapeKey(onClose, true);
    const isThanks = kind === 'thank-you';
    const [context, setContext] = useState('');
    const [text, setText] = useState('');
    const [review, setReview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [marked, setMarked] = useState(false);
    const waited = daysSince(appliedDate(job));

    const generate = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await draftFollowUp({
                kind,
                job: { title: job.title, company: job.company, appliedAt: appliedDate(job), coverLetter: job.coverLetter || '', status: job.status },
                resumeData,
                preferences: { name: user?.name, ...user?.preferences },
                context,
            });
            setText(res.data.text || '');
            setReview(res.data.review || null);
        } catch (err) {
            setError(err?.response?.data?.error || 'Couldn’t write the message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const markSent = async () => {
        try {
            const res = await markFollowUpSent(job._id);
            setMarked(true);
            onSent?.(job._id, res.data);
        } catch (err) {
            setError(err?.response?.data?.error || 'Couldn’t record it. Please try again.');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} data-lenis-prevent>
            <div className="modal-content ds-sheet" role="dialog" aria-modal="true" aria-labelledby="msg-title" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
                <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                    <span className="ds-mono self-center px-6 sm:px-8 truncate">{isThanks ? 'thank-you note' : 'follow-up'} / {(job.company || 'job').toLowerCase()}</span>
                    <button type="button" onClick={onClose} aria-label="Close" className="w-14 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-white">
                        <FiX size={18} />
                    </button>
                </div>

                <div className="ds-sheet-body" data-lenis-prevent>
                    <header className="ds-sheet-section !pt-8">
                        <h2 id="msg-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#171717]">
                            {isThanks ? 'Say thanks after the interview' : 'Follow up on your application'}
                        </h2>
                        <p className="ds-body mt-3 mb-0">
                            {isThanks
                                ? 'Send it within a day of the interview. It only mentions things from your profile and what you tell us below.'
                                : `${waited ? `You applied ${waited} day${waited === 1 ? '' : 's'} ago` : 'No reply yet'}. A short, polite note to the recruiter or hiring manager often gets things moving. It only uses points from your profile and the cover letter you sent.`}
                        </p>
                        {!isThanks && (job.followUpCount || 0) > 0 && (
                            <p className="ds-mono ds-mono-muted mt-3 mb-0">follow-ups sent: {job.followUpCount} of 2. After the second, it’s time to move on.</p>
                        )}
                    </header>

                    <section className="ds-sheet-section">
                        <label htmlFor="msg-context" className="ds-label">{isThanks ? 'what did you talk about? (optional)' : 'anything to add? (optional)'}</label>
                        <textarea
                            id="msg-context"
                            rows={3}
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder={isThanks ? 'e.g. Talked to Priya about the payments team and their move to TypeScript' : 'e.g. I finished the AWS certification since applying'}
                            className="resume-input-field resize-y"
                        />
                        <button type="button" onClick={generate} disabled={loading} className="ds-btn ds-btn-ink w-full mt-3 !min-h-[48px]">
                            {loading ? 'Writing, then checking…' : text ? <>Write it again <FiRefreshCw size={15} /></> : <>Write the message <FiSend size={15} /></>}
                        </button>
                        {error && <p role="alert" className="m-0 mt-3 text-[14px] text-[#B91C1C]">{error}</p>}
                    </section>

                    {text && (
                        <section className="ds-sheet-section" aria-live="polite">
                            <div className="ds-output whitespace-pre-wrap">{text}</div>
                            {review && (
                                <p className="ds-mono ds-mono-muted m-0 mt-3">
                                    {review.revised ? `checked by a second ai · fixed ${review.issues.length} issue${review.issues.length === 1 ? '' : 's'}` : 'checked by a second ai'}
                                </p>
                            )}
                        </section>
                    )}
                </div>

                {text && (
                    <div className={`shrink-0 grid ${isThanks ? 'grid-cols-1' : 'grid-cols-2'} border-0 border-t border-[#D8D4CC]`}>
                        <button type="button" onClick={copy} className="ds-btn ds-btn-ink !min-h-[64px] !px-6 sm:!px-8">
                            {copied ? 'Copied' : 'Copy'} {copied ? <FiCheck size={17} /> : <FiCopy size={17} />}
                        </button>
                        {!isThanks && (
                            <button type="button" onClick={markSent} disabled={marked} className="ds-btn ds-btn-accent !min-h-[64px] !px-6 sm:!px-8">
                                {marked ? 'Marked as sent' : 'I sent it'} <FiCheck size={17} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ApplicationMessage;
