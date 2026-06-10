import { useState, useEffect } from 'react';
import { FiX, FiCopy, FiCheck, FiZap, FiBookOpen, FiTarget, FiMessageCircle, FiRefreshCw } from 'react-icons/fi';
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

    const typeColors = {
        behavioral: { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)', color: '#818cf8' },
        technical: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)', color: '#34d399' },
        situational: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
                <button className="modal-close" onClick={onClose}><FiX /></button>

                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ background: 'rgba(139, 92, 246, 0.15)', borderRadius: 10, padding: 10, display: 'flex' }}>
                            <FiZap size={20} color="#a78bfa" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 20, margin: 0 }}>Interview Prep</h2>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                                {job.title} at {job.company}
                            </div>
                        </div>
                    </div>
                    {prepData && !loading && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button className="btn btn-secondary btn-sm" onClick={handleCopyAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }}>
                                {copied ? <><FiCheck size={12} /> Copied!</> : <><FiCopy size={12} /> Copy All</>}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={handleGenerate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }}>
                                <FiRefreshCw size={12} /> Regenerate
                            </button>
                        </div>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Generating your personalized interview prep...</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>This may take a moment</p>
                    </div>
                )}

                {/* Content */}
                {prepData && !loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* Questions */}
                        {prepData.questions?.length > 0 && (
                            <div className="ui-card" style={{ padding: 20 }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 15 }}>
                                    <FiMessageCircle size={16} color="#a78bfa" /> Likely Questions
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {prepData.questions.map((q, i) => {
                                        const colors = typeColors[q.type] || typeColors.behavioral;
                                        return (
                                            <div key={i} style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 16, border: '1px solid var(--glass-border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                                        {i + 1}. {q.question}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 11, padding: '2px 8px', borderRadius: 6,
                                                        background: colors.bg, border: `1px solid ${colors.border}`,
                                                        color: colors.color, whiteSpace: 'nowrap', flexShrink: 0
                                                    }}>
                                                        {q.type}
                                                    </span>
                                                </div>
                                                {q.talkingPoints?.length > 0 && (
                                                    <div style={{ marginTop: 8 }}>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Talking Points</span>
                                                        {q.talkingPoints.map((tp, j) => (
                                                            <div key={j} style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, paddingLeft: 12, borderLeft: '2px solid var(--glass-border)' }}>
                                                                {tp}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {q.sampleAnswer && (
                                                    <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(139, 92, 246, 0.05)', borderRadius: 6, padding: '8px 12px' }}>
                                                        💡 {q.sampleAnswer}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Technical Topics */}
                        {prepData.technicalTopics?.length > 0 && (
                            <div className="ui-card" style={{ padding: 20 }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 15 }}>
                                    <FiBookOpen size={16} color="#34d399" /> Technical Topics to Review
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {prepData.technicalTopics.map((t, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                                            <span style={{
                                                fontSize: 11, padding: '2px 8px', borderRadius: 6, flexShrink: 0, marginTop: 2,
                                                background: t.importance === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: t.importance === 'high' ? '#f87171' : '#fbbf24',
                                                border: `1px solid ${t.importance === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                                            }}>
                                                {t.importance}
                                            </span>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t.topic}</div>
                                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{t.reviewTips}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Company Insights + Tips in a two-column layout */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {prepData.companyInsights?.length > 0 && (
                                <div className="ui-card" style={{ padding: 20 }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 15 }}>
                                        <FiTarget size={16} color="#60a5fa" /> Company Insights
                                    </h3>
                                    {prepData.companyInsights.map((c, i) => (
                                        <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 12, borderLeft: '2px solid rgba(96, 165, 250, 0.3)' }}>
                                            {c}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {prepData.tips?.length > 0 && (
                                <div className="ui-card" style={{ padding: 20 }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 15 }}>
                                        <FiZap size={16} color="#fbbf24" /> Pro Tips
                                    </h3>
                                    {prepData.tips.map((t, i) => (
                                        <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 12, borderLeft: '2px solid rgba(251, 191, 36, 0.3)' }}>
                                            {t}
                                        </div>
                                    ))}
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
