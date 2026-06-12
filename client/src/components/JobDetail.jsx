import { useState, useEffect } from 'react';
import { FiX, FiExternalLink, FiBookmark, FiMapPin, FiDollarSign, FiClock, FiBriefcase, FiFileText, FiCopy, FiCheck, FiZap, FiHome, FiInfo, FiMessageSquare, FiTarget, FiRefreshCw } from 'react-icons/fi';
import { saveJob, getSavedJobs, getMatchScore, generateCoverLetter, generateRecruiterDM, saveCoverLetter, saveRecruiterDM, incrementStat } from '../services/api';
import ATSScorer from './ATSScorer';

function JobDetail({ job, user, resumeData, onClose }) {
    const [matchData, setMatchData] = useState(null);
    const [loadingMatch, setLoadingMatch] = useState(false);
    const [isSaved, setIsSaved] = useState(!!job._id);
    const [savedJobId, setSavedJobId] = useState(job._id || null);
    const [showATS, setShowATS] = useState(false);
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
        if (!user) return alert('Set up your profile first');
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

    const getScoreClass = (score) => {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <FiX />
                </button>

                {/* Header */}
                <div className="modal-header">
                    <div className="modal-logo-header">
                        {job.companyLogo ? (
                            <img src={job.companyLogo} alt="" className="company-logo" />
                        ) : (
                            <div className="company-logo-placeholder">
                                {(job.company || '?')[0].toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h2>{job.title}</h2>
                            <div className="company-name">{job.company}</div>
                        </div>
                    </div>

                    <div className="modal-tags">
                        {job.location && (
                            <span className="meta-tag"><FiMapPin size={12} /> {job.location}</span>
                        )}
                        {job.remote && <span className="meta-tag remote"><FiHome size={12} /> Remote</span>}
                        {job.employmentType && (
                            <span className="meta-tag"><FiBriefcase size={12} /> {job.employmentType}</span>
                        )}
                        {job.salary && job.salary !== 'Not specified' && (
                            <span className="meta-tag"><FiDollarSign size={12} /> {job.salary}</span>
                        )}
                        {job.datePosted && (
                            <span className="meta-tag"><FiClock size={12} /> {new Date(job.datePosted).toLocaleDateString()}</span>
                        )}
                    </div>
                </div>

                {/* AI Match Score */}
                {(loadingMatch || matchData) && (
                    <div className="ai-match-card-custom">
                        <h3>
                            <FiZap size={16} /> <span>AI Match Score</span>
                            {loadingMatch ? (
                                <span className="ai-analyzing-text">Analyzing...</span>
                            ) : matchData && (
                                <span className={`match-badge ${getScoreClass(matchData.score)}`}>
                                    <span className="badge-dot" />
                                    {matchData.score}% Match
                                </span>
                            )}
                        </h3>
                        {matchData && (
                            <div className="ai-match-body">
                                {matchData.reasons?.length > 0 && matchData.reasons[0]?.includes('Unable to analyze') ? (
                                    <div className="ai-match-retry-section">
                                        <p className="ai-match-error-text">Analysis failed — likely due to API rate limits.</p>
                                        <button
                                            className="ai-match-retry-btn"
                                            onClick={() => { setMatchData(null); fetchMatchScore(); }}
                                            disabled={loadingMatch}
                                        >
                                            <FiRefreshCw size={14} /> Retry Analysis
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {matchData.reasons?.length > 0 && (
                                            <div className="ai-match-reasons-list">
                                                {matchData.reasons.map((r, i) => (
                                                    <div key={i} className="ai-match-reason-item">
                                                        <span className="check-icon-wrap">
                                                            <FiCheck size={12} />
                                                        </span>
                                                        <span className="reason-text">{r}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {matchData.missingSkills?.length > 0 && (
                                            <div className="ai-missing-skills-section">
                                                <span className="section-label">Skills to improve:</span>
                                                <div className="skill-tags-to-improve">
                                                    {matchData.missingSkills.map((s, i) => (
                                                        <span key={i} className="skill-tag-missing">{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {matchData.recommendation && (
                                            <div className="ai-recommendation-alert">
                                                <FiInfo size={14} className="info-icon" />
                                                <span className="recommendation-text">{matchData.recommendation}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Description */}
                <div className="modal-section">
                    <h3>Job Description</h3>
                    <p className="job-description-paragraph">
                        {formatDescription(job.description)?.substring(0, 3000)}
                    </p>
                </div>

                {/* Highlights */}
                {job.highlights?.Qualifications?.length > 0 && (
                    <div className="modal-section qualifications-section">
                        <h3>Qualifications</h3>
                        <ul>
                            {job.highlights.Qualifications.slice(0, 8).map((q, i) => (
                                <li key={i}>{q}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {job.highlights?.Responsibilities?.length > 0 && (
                    <div className="modal-section responsibilities-section">
                        <h3>Responsibilities</h3>
                        <ul>
                            {job.highlights.Responsibilities.slice(0, 8).map((r, i) => (
                                <li key={i}>{r}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Required Skills */}
                {job.requiredSkills?.length > 0 && (
                    <div className="modal-section skills-required-section">
                        <h3>Required Skills</h3>
                        <div className="skill-tags-modal">
                            {job.requiredSkills.map((s, i) => (
                                <span key={i} className="skill-tag-modal-item">{s}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="modal-ai-actions">
                    {/* ATS Check */}
                    {resumeData ? (
                        <button
                            className="btn btn-secondary ats-check-btn-custom"
                            onClick={() => setShowATS(true)}
                        >
                            <FiTarget size={14} />
                            ATS Check
                        </button>
                    ) : null}
                    {/* Cover Letter Generator */}
                    {!coverLetter && !loadingCover ? (
                        <button
                            className="btn btn-secondary ai-action-btn-custom"
                            onClick={handleGenerateCoverLetter}
                            disabled={loadingCover}
                        >
                            <FiFileText size={14} />
                            Generate Cover Letter
                        </button>
                    ) : null}
                    {!recruiterDM && !loadingDM ? (
                        <button
                            className="btn btn-secondary ai-action-btn-custom"
                            onClick={handleGenerateRecruiterDM}
                            disabled={loadingDM}
                        >
                            <FiMessageSquare size={14} />
                            Generate LinkedIn DM
                        </button>
                    ) : null}
                </div>

                {/* Cover Letter Output */}
                {(loadingCover || coverLetter) && (
                    <div className="ai-result-card-custom">
                        <div className="ai-result-header">
                            <h3>
                                <FiFileText size={16} /> AI Cover Letter
                            </h3>
                            {coverLetter && !loadingCover && (
                                <div className="ai-result-actions">
                                    <button
                                        className="btn btn-secondary btn-sm copy-btn-custom"
                                        onClick={handleCopyCoverLetter}
                                    >
                                        {copied ? <><FiCheck size={12} /> Copied!</> : <><FiCopy size={12} /> Copy</>}
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm regenerate-btn-custom"
                                        onClick={handleGenerateCoverLetter}
                                    >
                                        Regenerate
                                    </button>
                                </div>
                            )}
                        </div>
                        {loadingCover ? (
                            <div className="ai-result-loading">
                                <div className="spinner" />
                                <p>Writing your personalized cover letter...</p>
                            </div>
                        ) : (
                            <div className="ai-result-text-area">
                                {coverLetter}
                            </div>
                        )}
                    </div>
                )}

                {/* Recruiter DM Output */}
                {(loadingDM || recruiterDM) && (
                    <div className="ai-result-card-custom">
                        <div className="ai-result-header">
                            <h3>
                                <FiMessageSquare size={16} /> LinkedIn DM
                            </h3>
                            {recruiterDM && !loadingDM && (
                                <div className="ai-result-actions">
                                    <button
                                        className="btn btn-secondary btn-sm copy-btn-custom"
                                        onClick={handleCopyDM}
                                    >
                                        {copiedDM ? <><FiCheck size={12} /> Copied!</> : <><FiCopy size={12} /> Copy</>}
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm regenerate-btn-custom"
                                        onClick={handleGenerateRecruiterDM}
                                    >
                                        Regenerate
                                    </button>
                                </div>
                            )}
                        </div>
                        {loadingDM ? (
                            <div className="ai-result-loading">
                                <div className="spinner" />
                                <p>Crafting your networking message...</p>
                            </div>
                        ) : (
                            <div className="ai-result-text-area">
                                {recruiterDM}
                            </div>
                        )}
                    </div>
                )}

                {/* Primary Actions */}
                <div className="modal-primary-actions">
                    {job.applyLink && (
                        <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary modal-apply-btn">
                            Apply Now <FiExternalLink size={14} />
                        </a>
                    )}
                    <button className="btn btn-secondary modal-save-btn" onClick={handleSave} disabled={isSaved}>
                        <FiBookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                        {isSaved ? 'Saved!' : 'Save Job'}
                    </button>
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
