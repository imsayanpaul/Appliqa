import { useState, useEffect } from 'react';
import { FiX, FiCheck, FiAlertCircle, FiTrendingUp, FiCrosshair, FiTarget, FiRefreshCw } from 'react-icons/fi';
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

    const getScoreColor = (score) => {
        if (score >= 80) return 'var(--accent-green)'; // #34d399
        if (score >= 60) return 'var(--accent-orange)'; // #fbbf24
        return 'var(--accent-red)'; // #ef4444
    };

    const CircularScore = ({ score, label, color }) => {
        const radius = 35;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (score / 100) * circumference;
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', width: 90, height: 90 }}>
                    <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="45" cy="45" r={radius} fill="none" stroke="var(--glass-border)" strokeWidth="6" />
                        <circle cx="45" cy="45" r={radius} fill="none" stroke={color} strokeWidth="6"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            style={{ strokeLinecap: 'round', transition: 'stroke-dashoffset 1s ease-out' }}
                        />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color }}>
                        {score}
                    </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
                <button className="modal-close" onClick={onClose}><FiX /></button>

                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ background: 'rgba(52, 211, 153, 0.15)', borderRadius: 10, padding: 10, display: 'flex' }}>
                            <FiTarget size={20} color="#34d399" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 20, margin: 0 }}>ATS Resume Scanner</h2>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                                Scoring your resume for {job.title} at {job.company}
                            </div>
                        </div>
                    </div>
                    {atsData && !loading && (
                        <div style={{ marginTop: 12 }}>
                            <button className="btn btn-secondary btn-sm" onClick={handleAnalyze} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }}>
                                <FiRefreshCw size={12} /> Re-scan Resume
                            </button>
                        </div>
                    )}
                </div>

                {/* Error State */}
                {error && (
                    <div style={{ padding: 20, textAlign: 'center' }}>
                        <div style={{ color: 'var(--accent-red)', background: 'rgba(239, 68, 68, 0.1)', padding: '16px 24px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <FiAlertCircle size={18} /> {error}
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px', width: 36, height: 36, borderTopColor: '#34d399' }} />
                        <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 500 }}>Scanning resume like an ATS...</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>Checking keyword density, formatting, and action verbs.</p>
                    </div>
                )}

                {/* Results View */}
                {atsData && !loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 10 }}>
                        
                        {/* Top Overview: Overall Score + Sub Scores */}
                        <div className="ui-card" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(145deg, var(--bg-primary), rgba(255,255,255,0.02))' }}>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: 18, marginBottom: 8 }}>Overall ATS Match</h3>
                                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 350 }}>
                                    {atsData.verdict}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 32 }}>
                                <CircularScore score={atsData.atsScore || 0} label="Match Score" color={getScoreColor(atsData.atsScore || 0)} />
                                <CircularScore score={atsData.actionVerbs?.score || 0} label="Action Verbs" color={getScoreColor(atsData.actionVerbs?.score || 0)} />
                                <CircularScore score={atsData.metrics?.score || 0} label="Measurable Impact" color={getScoreColor(atsData.metrics?.score || 0)} />
                            </div>
                        </div>

                        {/* Keyword Analysis */}
                        <div className="ui-card" style={{ padding: 20 }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 15 }}>
                                <FiCrosshair size={16} color="#60a5fa" /> Keyword Analysis
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                        Found in Resume ({atsData.keywords?.found?.length || 0})
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {(atsData.keywords?.found || []).map((kw, i) => (
                                            <span key={`f-${i}`} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '4px 10px', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <FiCheck size={10} /> {kw}
                                            </span>
                                        ))}
                                        {(!atsData.keywords?.found || atsData.keywords.found.length === 0) && (
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No exact keyword matches found.</span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ height: 1, background: 'var(--glass-border)' }} />
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                        Missing Keywords ({atsData.keywords?.missing?.length || 0})
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {(atsData.keywords?.missing || []).map((kw, i) => (
                                            <span key={`m-${i}`} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '4px 10px', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <FiX size={10} /> {kw}
                                            </span>
                                        ))}
                                        {(!atsData.keywords?.missing || atsData.keywords.missing.length === 0) && (
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>You hit all the key terms!</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Verbs & Metrics Feedback */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="ui-card" style={{ padding: 20 }}>
                                <h3 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-primary)' }}>Action Verbs Check</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    {atsData.actionVerbs?.feedback || "No feedback available."}
                                </p>
                            </div>
                            <div className="ui-card" style={{ padding: 20 }}>
                                <h3 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-primary)' }}>Metrics & Impact Check</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    {atsData.metrics?.feedback || "No feedback available."}
                                </p>
                            </div>
                        </div>

                        {/* Actionable Improvements */}
                        {atsData.improvements?.length > 0 && (
                            <div className="ui-card" style={{ padding: 20 }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 15 }}>
                                    <FiTrendingUp size={16} color="#fbbf24" /> Actionable Fixes
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {atsData.improvements.map((imp, i) => (
                                        <div key={i} style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <span style={{
                                                    fontSize: 10, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                                                    background: imp.priority === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                                    color: imp.priority === 'high' ? '#f87171' : '#fbbf24'
                                                }}>
                                                    {imp.priority} Priority
                                                </span>
                                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {imp.issue}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, paddingLeft: 4 }}>
                                                ↳ <strong>Fix:</strong> {imp.fix}
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
