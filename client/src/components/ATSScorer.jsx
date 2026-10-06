import { useState, useEffect } from 'react';
import { useEscapeKey } from '../lib/useEscapeKey';
import { FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { getATSScore } from '../services/api';
import { AddSkillTag, AddSkillHint } from '../lib/resumeSkills';

function ATSScorer({ job, resumeData, onClose }) {
    const [atsData, setAtsData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    useEscapeKey(onClose);

    useEffect(() => {
        handleAnalyze();
    }, []);

    const handleAnalyze = async () => {
        if (!resumeData?.rawText) {
            setError('Upload your resume (PDF or TXT) on your profile first, then run the ATS check.');
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

    const tier = (score) => (score >= 75 ? 'strong match' : score >= 50 ? 'partial match' : 'low match');
    const overall = Math.min(100, Math.max(0, Number(atsData?.atsScore) || 0));
    const subScores = atsData ? [
        { label: 'action verbs', value: atsData.actionVerbs?.score || 0, note: (atsData.actionVerbs?.score || 0) >= 65 ? 'strong' : 'needs work' },
        { label: 'measurable results', value: atsData.metrics?.score || 0, note: (atsData.metrics?.score || 0) >= 65 ? 'strong' : 'needs work' },
    ] : [];
    const found = atsData?.keywords?.found || [];
    const missing = atsData?.keywords?.missing || [];

    return (
        <div className="modal-overlay" onClick={onClose} data-lenis-prevent>
            <div
                className="modal-content ds-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ats-title"
                onClick={e => e.stopPropagation()}
                data-lenis-prevent
            >
                <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                    <span className="ds-mono self-center px-6 sm:px-8 truncate">ats check / {(job.company || 'job').toLowerCase()}</span>
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
                        <h2 id="ats-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#171717]">
                            How your resume scores for this job
                        </h2>
                        <p className="ds-mono ds-mono-muted mt-3 mb-0 truncate">{job.title} · {job.company}</p>
                    </header>

                    {error && (
                        <section className="ds-sheet-section">
                            <p role="alert" className="m-0 text-[15px] text-[#991B1B]">{error}</p>
                        </section>
                    )}

                    {loading && (
                        <section className="ds-sheet-section !py-16" aria-busy="true">
                            <p className="ds-mono ds-mono-muted m-0 mb-4 animate-pulse">scanning your resume…</p>
                            <div className="h-1.5 bg-[#EFECE6] overflow-hidden">
                                <div className="h-full w-1/3 bg-[#CA3C0A] animate-pulse" />
                            </div>
                        </section>
                    )}

                    {atsData && !loading && (
                        <>
                            <section className="ds-sheet-section bg-white">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-end">
                                    <div className="sm:col-span-6">
                                        <p className="ds-mono ds-mono-muted m-0 mb-2">overall fit</p>
                                        <p className="m-0 flex items-baseline gap-2">
                                            <span className="font-[900] leading-none tracking-[-0.04em]" style={{ fontSize: 'clamp(56px, 8vw, 88px)', fontStretch: '125%' }}>{overall}</span>
                                            <span className="ds-mono ds-mono-muted">/100</span>
                                        </p>
                                        <p className="ds-mono mt-3 mb-0 flex items-center gap-2"><span className="ds-square" /> {tier(overall)}</p>
                                    </div>
                                    <dl className="sm:col-span-6 ds-gridlines grid-cols-2 m-0 border border-[#D8D4CC]">
                                        {subScores.map((s) => (
                                            <div key={s.label} className="!bg-white px-4 py-4">
                                                <dt className="ds-mono ds-mono-muted">{s.label}</dt>
                                                <dd className="m-0 mt-3 text-[32px] font-semibold tracking-[-0.03em] leading-none">{s.value}<span className="text-[16px] text-[#6F6A65]">%</span></dd>
                                                <dd className="ds-mono m-0 mt-2 text-[#4A4540]">{s.note}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                                <div className="mt-6 h-1.5 bg-[#EFECE6]">
                                    <div className="h-full bg-[#CA3C0A] report-bar" style={{ width: `${overall}%` }} />
                                </div>
                                {atsData.verdict && (
                                    <p className="m-0 mt-6 text-[16px] leading-relaxed text-[#2A2622]">{atsData.verdict}</p>
                                )}
                            </section>

                            <section className="ds-sheet-section">
                                <h3 className="ds-mono ds-mono-muted m-0 mb-3">keywords in your resume · {found.length}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {found.map((kw, i) => <span key={`f-${i}`} className="ds-tag gap-2"><FiCheck size={12} className="text-[#047857]" />{kw}</span>)}
                                    {found.length === 0 && <p className="m-0 text-[15px] text-[#4A4540]">No direct keyword matches.</p>}
                                </div>

                                <h3 className="ds-mono ds-mono-muted m-0 mt-6 mb-3">missing keywords · {missing.length}<AddSkillHint /></h3>
                                <div className="flex flex-wrap gap-2">
                                    {missing.map((kw, i) => <AddSkillTag key={`m-${i}`} skill={kw} />)}
                                    {missing.length === 0 && <p className="m-0 text-[15px] text-[#4A4540]">Your resume covers the job's key terms.</p>}
                                </div>
                            </section>

                            <section className="border-0 border-b border-[#D8D4CC]">
                                <div className="ds-gridlines grid-cols-1 sm:grid-cols-2">
                                    <div className="px-6 sm:px-8 py-6">
                                        <h3 className="ds-mono ds-mono-muted m-0 mb-2">action verbs</h3>
                                        <p className="m-0 text-[15px] leading-relaxed text-[#2A2622]">{atsData.actionVerbs?.feedback || 'Your bullets use clear action verbs.'}</p>
                                    </div>
                                    <div className="px-6 sm:px-8 py-6">
                                        <h3 className="ds-mono ds-mono-muted m-0 mb-2">measurable results</h3>
                                        <p className="m-0 text-[15px] leading-relaxed text-[#2A2622]">{atsData.metrics?.feedback || 'Your bullets include numbers and results.'}</p>
                                    </div>
                                </div>
                            </section>

                            {atsData.improvements?.length > 0 && (
                                <section className="ds-sheet-section">
                                    <h3 className="ds-mono ds-mono-muted m-0 mb-2">what to fix</h3>
                                    <ol className="list-none m-0 p-0">
                                        {atsData.improvements.map((imp, i) => (
                                            <li key={i} className="grid grid-cols-[32px_1fr] gap-2 py-4 border-0 border-t border-[#D8D4CC] first:border-t-0">
                                                <span className="ds-mono text-[#CA3C0A] pt-1">0{i + 1}</span>
                                                <div>
                                                    <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                                        <span className="text-[16px] font-semibold text-[#171717]">{imp.issue}</span>
                                                        <span className={`ds-mono ${imp.priority === 'high' ? 'text-[#CA3C0A]' : 'ds-mono-muted'}`}>{imp.priority} priority</span>
                                                    </p>
                                                    <p className="m-0 mt-1.5 text-[15px] leading-relaxed text-[#4A4540]">{imp.fix}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </section>
                            )}
                        </>
                    )}
                </div>

                {(atsData || error) && !loading && resumeData?.rawText && (
                    <div className="shrink-0 border-0 border-t border-[#D8D4CC]">
                        <button type="button" onClick={handleAnalyze} className="ds-btn ds-btn-ink w-full !min-h-[64px] !px-6 sm:!px-8">
                            Scan again <FiRefreshCw size={17} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ATSScorer;
