import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEscapeKey } from '../lib/useEscapeKey';
import { FiX, FiBookmark, FiFileText, FiCopy, FiCheck, FiMessageSquare, FiRefreshCw, FiArrowUpRight } from 'react-icons/fi';
import { FileCheck } from 'lucide-react';
import { saveJob, getSavedJobs, getMatchScore, generateCoverLetter, generateRecruiterDM, saveCoverLetter, saveRecruiterDM, incrementStat } from '../services/api';
import ATSScorer from './ATSScorer';
import { CompanyMark } from './JobCard';
import { AddSkillTag, AddSkillHint } from '../lib/resumeSkills';
import { formatSalary } from '../lib/format';

function JobDetail({ job, user, resumeData, onClose }) {
    const navigate = useNavigate();
    const goToSignIn = () => { onClose?.(); navigate('/profile'); };
    const [matchData, setMatchData] = useState(null);
    const [loadingMatch, setLoadingMatch] = useState(false);
    const [isSaved, setIsSaved] = useState(!!job._id);
    const [savedJobId, setSavedJobId] = useState(job._id || null);
    const [showATS, setShowATS] = useState(false);
    useEscapeKey(onClose);
    const [coverLetter, setCoverLetter] = useState(job.coverLetter || '');
    const [loadingCover, setLoadingCover] = useState(false);
    const [copied, setCopied] = useState(false);
    const [recruiterDM, setRecruiterDM] = useState(job.recruiterDM || job.recruiter_dm || '');
    const [loadingDM, setLoadingDM] = useState(false);
    const [copiedDM, setCopiedDM] = useState(false);

    useEffect(() => {
        // Skip fetching if matchDetails is already present (e.g. Saved Job pipeline)
        if (job.matchDetails || job.match_details) {
            setMatchData(job.matchDetails || job.match_details);
        } else if (resumeData?.skills?.length > 0 || user?.preferences?.skills?.length > 0) {
            fetchMatchScore();
        }
    }, []);

    const fetchMatchScore = async () => {
        setLoadingMatch(true);
        try {
            const res = await getMatchScore({
                resumeData,
                preferences: user?.preferences,
                jobDescription: job.description,
                jobTitle: job.title
            });
            setMatchData(res.data.match);
        } catch (err) {
            console.error('Match score failed:', err);
        } finally {
            setLoadingMatch(false);
        }
    };

    const handleSave = async () => {
        if (!user) return alert('Sign in to save jobs to your tracker.');
        try {
            await saveJob({ 
                ...job, 
                matchScore: matchData?.score || 0,
                matchDetails: matchData || null,
                coverLetter: coverLetter || null,
                recruiterDM: recruiterDM || null
            });
            setIsSaved(true);
            // Try to find the saved job ID for cover letter persistence
            try {
                const resp = await getSavedJobs();
                const match = resp.data.jobs?.find(j => j.jobId === job.id);
                if (match) setSavedJobId(match._id);
            } catch (_) {}
        } catch (err) {
            if (err.response?.status === 409) setIsSaved(true);
        }
    };

    const handleGenerateCoverLetter = async () => {
        setLoadingCover(true);
        setCoverLetter('');
        try {
            const res = await generateCoverLetter({
                resumeData,
                preferences: { name: user?.name, ...user?.preferences },
                jobTitle: job.title,
                jobCompany: job.company,
                jobDescription: job.description
            });
            setCoverLetter(res.data.coverLetter);
            // Increment cover letters generated count
            try { await incrementStat('cover_letters_generated_count'); } catch (_) {}
            // Auto-save cover letter if job is saved
            if (savedJobId) {
                try { await saveCoverLetter(savedJobId, res.data.coverLetter); } catch (_) {}
            }
        } catch (err) {
            console.error('Cover letter failed:', err);
            setCoverLetter('Failed to generate cover letter. Please try again.');
        } finally {
            setLoadingCover(false);
        }
    };

    const handleCopyCoverLetter = () => {
        navigator.clipboard.writeText(coverLetter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGenerateRecruiterDM = async () => {
        setLoadingDM(true);
        setRecruiterDM('');
        try {
            const res = await generateRecruiterDM({
                resumeData,
                preferences: { name: user?.name, ...user?.preferences },
                jobTitle: job.title,
                jobCompany: job.company,
                matchReasons: matchData?.reasons || []
            });
            setRecruiterDM(res.data.recruiterDM);
            // Increment recruiter DMs sent count
            try { await incrementStat('recruiter_dms_sent_count'); } catch (_) {}
            // Auto-save recruiter DM if job is saved
            if (savedJobId) {
                try { await saveRecruiterDM(savedJobId, res.data.recruiterDM); } catch (_) {}
            }
        } catch (err) {
            console.error('Recruiter DM failed:', err);
            setRecruiterDM('Failed to generate message. Please try again.');
        } finally {
            setLoadingDM(false);
        }
    };

    const handleCopyDM = () => {
        navigator.clipboard.writeText(recruiterDM);
        setCopiedDM(true);
        setTimeout(() => setCopiedDM(false), 2000);
    };

    // Format description keeping paragraphs
    const formatDescription = (desc) => {
        if (!desc) return '';
        return desc
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?p>/gi, '\n\n')
            .replace(/<li>/gi, '\n• ')
            .replace(/<\/?[^>]*>/g, '')
            .trim();
    };

    const salary = formatSalary(job.salary);
    const posted = job.datePosted ? new Date(job.datePosted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const meta = [job.location, job.remote ? 'Remote' : null, job.employmentType?.toLowerCase().replace(/_/g, '-'), posted && `posted ${posted}`].filter(Boolean);
    const score = matchData ? Math.min(100, Math.max(0, Number(matchData.score) || 0)) : 0;
    const fitLabel = score >= 70 ? 'strong fit' : score >= 40 ? 'moderate fit' : 'partial fit';
    const analysisFailed = matchData?.reasons?.[0]?.includes('Unable to analyze');

    const toolBtn = 'ds-cell-hover text-left bg-[#F7F5F2] border-0 cursor-pointer px-5 py-5 flex items-start justify-between gap-3 disabled:opacity-50 disabled:cursor-not-allowed';

    const renderOutput = ({ title, loading, loadingText, text, copiedState, onCopy, onRegenerate }) => (
        <section className="ds-sheet-section" aria-live="polite">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="ds-mono m-0 text-[#171717]">{title}</h3>
                {text && !loading && (
                    <div className="flex">
                        <button type="button" onClick={onCopy} className="h-9 px-3 inline-flex items-center gap-2 text-[13px] font-medium bg-transparent border border-[#D8D4CC] hover:border-[#171717] cursor-pointer">
                            {copiedState ? <><FiCheck size={13} /> Copied</> : <><FiCopy size={13} /> Copy</>}
                        </button>
                        <button type="button" onClick={onRegenerate} className="h-9 px-3 inline-flex items-center gap-2 text-[13px] font-medium bg-transparent border border-l-0 border-[#D8D4CC] hover:border-[#171717] cursor-pointer">
                            <FiRefreshCw size={13} /> Rewrite
                        </button>
                    </div>
                )}
            </div>
            {loading ? (
                <div className="ds-output">
                    <p className="ds-mono ds-mono-muted m-0 animate-pulse">{loadingText}</p>
                </div>
            ) : (
                <div className="ds-output">{text}</div>
            )}
        </section>
    );

    return (
        <div className="modal-overlay" onClick={onClose} data-lenis-prevent>
            <div
                className="modal-content ds-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="job-detail-title"
                onClick={(e) => e.stopPropagation()}
                data-lenis-prevent
            >
                <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                    <span className="ds-mono self-center px-6 sm:px-8 truncate">job / {(job.company || 'details').toLowerCase()}</span>
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
                    {/* Title */}
                    <header className="ds-sheet-section !pt-8">
                        <div className="flex items-start gap-4">
                            <CompanyMark logo={job.companyLogo} company={job.company} />
                            <div className="min-w-0">
                                <h2 id="job-detail-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#171717]">
                                    {job.title}
                                </h2>
                                <p className="m-0 mt-2 text-[16px] font-medium text-[#CA3C0A]">{job.company}</p>
                            </div>
                        </div>
                        {meta.length > 0 && <p className="ds-mono ds-mono-muted mt-5 mb-0">{meta.join(' · ')}</p>}
                        {salary && <p className="m-0 mt-2 text-[16px] font-semibold">{salary}</p>}
                    </header>

                    {/* Match analysis */}
                    {(loadingMatch || matchData) && (
                        <section className="ds-sheet-section bg-white" aria-busy={loadingMatch}>
                            <div className="flex items-end justify-between gap-6">
                                <div>
                                    <p className="ds-mono ds-mono-muted m-0 mb-2">your match</p>
                                    {loadingMatch ? (
                                        <p className="m-0 text-[40px] font-semibold leading-none text-[#D8D4CC] animate-pulse">—</p>
                                    ) : (
                                        <p className="m-0 flex items-baseline gap-2">
                                            <span className="font-[900] leading-none tracking-[-0.04em]" style={{ fontSize: 'clamp(48px, 7vw, 72px)', fontStretch: '125%' }}>{score}</span>
                                            <span className="ds-mono ds-mono-muted">/100</span>
                                        </p>
                                    )}
                                </div>
                                {!loadingMatch && !analysisFailed && (
                                    <span className="ds-mono flex items-center gap-2 pb-2">
                                        <span className="ds-square" /> {fitLabel}
                                    </span>
                                )}
                            </div>
                            <div className="mt-5 h-1.5 bg-[#EFECE6]">
                                {!loadingMatch && <div className="h-full bg-[#CA3C0A] report-bar" style={{ width: `${score}%` }} />}
                            </div>

                            {matchData && analysisFailed && (
                                <div className="mt-5 flex items-center justify-between gap-4">
                                    <p className="m-0 text-[15px] text-[#4A4540]">The match analysis is busy right now.</p>
                                    <button
                                        type="button"
                                        className="ds-btn ds-btn-line !min-h-[40px] !text-[14px]"
                                        onClick={() => { setMatchData(null); fetchMatchScore(); }}
                                        disabled={loadingMatch}
                                    >
                                        Try again <FiRefreshCw size={14} />
                                    </button>
                                </div>
                            )}

                            {matchData && !analysisFailed && (
                                <>
                                    {matchData.reasons?.length > 0 && (
                                        <ol className="list-none m-0 mt-6 p-0">
                                            {matchData.reasons.map((r, i) => (
                                                <li key={i} className="grid grid-cols-[32px_1fr] gap-2 py-3 border-0 border-t border-[#EFECE6] text-[15px] leading-relaxed text-[#2A2622]">
                                                    <span className="ds-mono text-[#CA3C0A] pt-0.5">0{i + 1}</span>
                                                    <span>{r}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}

                                    {matchData.missingSkills?.length > 0 && (
                                        <div className="mt-5">
                                            <p className="ds-mono ds-mono-muted m-0 mb-3">skills to add<AddSkillHint /></p>
                                            <div className="flex flex-wrap gap-2">
                                                {matchData.missingSkills.map((s, i) => (
                                                    <AddSkillTag key={i} skill={s} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {matchData.recommendation && (
                                        <div className="mt-6 pl-4 border-0 border-l-2 border-[#171717]">
                                            <p className="ds-mono ds-mono-muted m-0 mb-1">advice</p>
                                            <p className="m-0 text-[15px] leading-relaxed text-[#2A2622]">{matchData.recommendation}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>
                    )}

                    {/* AI tools */}
                    <section aria-label="Application tools" className="border-0 border-b border-[#D8D4CC]">
                        <div className={`ds-gridlines grid-cols-1 ${resumeData ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                            {resumeData && (
                                <button type="button" className={toolBtn} onClick={() => setShowATS(true)}>
                                    <span>
                                        <span className="block text-[16px] font-semibold text-[#171717]">ATS check</span>
                                        <span className="ds-mono ds-mono-muted block mt-1">score your resume</span>
                                    </span>
                                    <FileCheck size={18} className="shrink-0 text-[#CA3C0A]" />
                                </button>
                            )}
                            <button type="button" className={toolBtn} onClick={handleGenerateCoverLetter} disabled={loadingCover}>
                                <span>
                                    <span className="block text-[16px] font-semibold text-[#171717]">{coverLetter ? 'Rewrite cover letter' : 'Cover letter'}</span>
                                    <span className="ds-mono ds-mono-muted block mt-1">{loadingCover ? 'writing…' : 'draft for this job'}</span>
                                </span>
                                <FiFileText size={18} className="shrink-0 text-[#CA3C0A]" />
                            </button>
                            <button type="button" className={toolBtn} onClick={handleGenerateRecruiterDM} disabled={loadingDM}>
                                <span>
                                    <span className="block text-[16px] font-semibold text-[#171717]">{recruiterDM ? 'Rewrite message' : 'LinkedIn message'}</span>
                                    <span className="ds-mono ds-mono-muted block mt-1">{loadingDM ? 'writing…' : 'note to the recruiter'}</span>
                                </span>
                                <FiMessageSquare size={18} className="shrink-0 text-[#CA3C0A]" />
                            </button>
                        </div>
                    </section>

                    {(loadingCover || coverLetter) && (
                        renderOutput({ title: 'cover letter', loading: loadingCover, loadingText: 'writing your cover letter…', text: coverLetter, copiedState: copied, onCopy: handleCopyCoverLetter, onRegenerate: handleGenerateCoverLetter })
                    )}

                    {(loadingDM || recruiterDM) && (
                        renderOutput({ title: 'linkedin message', loading: loadingDM, loadingText: 'writing your message…', text: recruiterDM, copiedState: copiedDM, onCopy: handleCopyDM, onRegenerate: handleGenerateRecruiterDM })
                    )}

                    {/* Description */}
                    <section className="ds-sheet-section">
                        <h3 className="ds-mono ds-mono-muted m-0 mb-4">about the role</h3>
                        <div className="ds-prose">{formatDescription(job.description)}</div>
                    </section>

                    {job.highlights?.Qualifications?.length > 0 && (
                        <section className="ds-sheet-section">
                            <h3 className="ds-mono ds-mono-muted m-0 mb-2">qualifications</h3>
                            <ul className="ds-list">
                                {job.highlights.Qualifications.slice(0, 8).map((q, i) => <li key={i}>{q}</li>)}
                            </ul>
                        </section>
                    )}

                    {job.highlights?.Responsibilities?.length > 0 && (
                        <section className="ds-sheet-section">
                            <h3 className="ds-mono ds-mono-muted m-0 mb-2">responsibilities</h3>
                            <ul className="ds-list">
                                {job.highlights.Responsibilities.slice(0, 8).map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                        </section>
                    )}

                    {job.requiredSkills?.length > 0 && (
                        <section className="ds-sheet-section">
                            <h3 className="ds-mono ds-mono-muted m-0 mb-3">skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {job.requiredSkills.map((s, i) => <span key={i} className="ds-tag">{s}</span>)}
                            </div>
                        </section>
                    )}
                </div>

                {/* Pinned actions */}
                <div className="shrink-0 grid grid-cols-2 border-0 border-t border-[#D8D4CC]">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaved}
                        className="ds-btn !min-h-[64px] !px-6 sm:!px-8 bg-[#F7F5F2] text-[#171717] hover:bg-white disabled:!opacity-100"
                    >
                        {isSaved ? 'Saved to tracker' : 'Save job'}
                        <FiBookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                    {!user ? (
                        <button
                            type="button"
                            onClick={goToSignIn}
                            className="ds-btn ds-btn-accent !min-h-[64px] !px-6 sm:!px-8"
                        >
                            Sign in to apply <FiArrowUpRight size={18} className="ds-btn-arrow" />
                        </button>
                    ) : job.applyLink ? (
                        <a
                            href={job.applyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ds-btn ds-btn-accent !min-h-[64px] !px-6 sm:!px-8 no-underline"
                        >
                            Apply now <FiArrowUpRight size={18} className="ds-btn-arrow" />
                        </a>
                    ) : (
                        <span className="ds-btn !min-h-[64px] !px-6 sm:!px-8 bg-[#EFECE6] text-[#6F6A65] cursor-default">
                            No apply link
                        </span>
                    )}
                </div>
            </div>

            {showATS && (
                <ATSScorer
                    job={job}
                    resumeData={resumeData}
                    onClose={() => setShowATS(false)}
                />
            )}
        </div>
    );
}

export default JobDetail;
