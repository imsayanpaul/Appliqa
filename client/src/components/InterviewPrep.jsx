import { useState, useEffect } from 'react';
import { FiX, FiCopy, FiCheck, FiZap, FiBookOpen, FiTarget, FiMessageCircle } from 'react-icons/fi';
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
        behavioral: { bg: 'rgba(234, 88, 12, 0.08)', border: 'rgba(234, 88, 12, 0.25)', color: '#ff7c33' },
        technical: { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)', color: '#f97316' },
        situational: { bg: 'rgba(253, 186, 116, 0.08)', border: 'rgba(253, 186, 116, 0.25)', color: '#fdba74' }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
                <button className="modal-close" onClick={onClose}><FiX /></button>

                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(249, 115, 22, 0.15)', borderRadius: 10, padding: 10, display: 'flex', flexShrink: 0 }}>
                            <FiZap size={20} color="#f97316" />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <h2 style={{ fontSize: 20, margin: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>Interview Prep</h2>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {job.title} at {job.company}
                            </div>
                        </div>
                    </div>
                    {prepData && !loading && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button className="btn btn-secondary btn-sm" onClick={handleCopyAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }}>
                                {copied ? <><FiCheck size={12} /> Copied!</> : <><FiCopy size={12} /> Copy All</>}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>

                        {/* Questions */}
                        {prepData.questions?.length > 0 && (
                            <div className="ui-card prep-section-card">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 16, fontWeight: 700 }}>
                                    <FiMessageCircle size={18} color="#f97316" /> Likely Questions
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {prepData.questions.map((q, i) => {
                                        const colors = typeColors[q.type] || typeColors.behavioral;
                                        return (
                                            <div key={i} className="prep-question-card">
                                                {/* Header with tag */}
                                                <div className="prep-question-header">
                                                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                                                        {i + 1}. {q.question}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 10, 
                                                        fontWeight: 600,
                                                        letterSpacing: '0.03em',
                                                        textTransform: 'uppercase',
                                                        padding: '4px 10px', 
                                                        borderRadius: 8,
                                                        background: colors.bg, 
                                                        border: `1px solid ${colors.border}`,
                                                        color: colors.color, 
                                                        whiteSpace: 'nowrap', 
                                                        flexShrink: 0
                                                    }}>
                                                        {q.type}
                                                    </span>
                                                </div>
 
                                                {/* Talking Points */}
                                                {q.talkingPoints?.length > 0 && (
                                                    <div style={{ marginTop: 4 }}>
                                                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                                            Key talking points
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            {q.talkingPoints.map((tp, j) => (
                                                                <div key={j} style={{ 
                                                                    fontSize: 13, 
                                                                    color: 'var(--text-secondary)', 
                                                                    paddingLeft: 12, 
                                                                    borderLeft: '2px solid rgba(249, 115, 22, 0.3)',
                                                                    lineHeight: 1.4
                                                                }}>
                                                                    {tp}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
 
                                                {/* Sample Answer Box */}
                                                {q.sampleAnswer && (
                                                    <div style={{ 
                                                        marginTop: 6, 
                                                        background: 'rgba(249, 115, 22, 0.04)', 
                                                        borderRadius: 10, 
                                                        padding: '12px 16px',
                                                        borderLeft: '3px solid #ea580c',
                                                        borderTop: '1px solid rgba(249, 115, 22, 0.08)',
                                                        borderRight: '1px solid rgba(249, 115, 22, 0.08)',
                                                        borderBottom: '1px solid rgba(249, 115, 22, 0.08)',
                                                    }}>
                                                        <div style={{ 
                                                            fontSize: 10, 
                                                            fontWeight: 800, 
                                                            color: '#ff7c33', 
                                                            textTransform: 'uppercase', 
                                                            letterSpacing: '0.06em',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 5,
                                                            marginBottom: 6
                                                        }}>
                                                            <span>💡</span> Suggested Answer Framework
                                                        </div>
                                                        <div style={{ 
                                                            fontSize: 13.5, 
                                                            color: 'var(--text-secondary)', 
                                                            lineHeight: 1.5,
                                                            fontStyle: 'italic'
                                                        }}>
                                                            "{q.sampleAnswer}"
                                                        </div>
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
                            <div className="ui-card prep-section-card-sm">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 15 }}>
                                    <FiBookOpen size={16} color="#f97316" /> Technical Topics to Review
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {prepData.technicalTopics.map((t, i) => (
                                        <div key={i} className="prep-topic-item">
                                            <span style={{
                                                fontSize: 11, padding: '2px 8px', borderRadius: 6, flexShrink: 0, marginTop: 2,
                                                background: t.importance === 'high' ? 'rgba(234, 88, 12, 0.12)' : 'rgba(253, 186, 116, 0.08)',
                                                color: t.importance === 'high' ? '#ff7c33' : '#fdba74',
                                                border: `1px solid ${t.importance === 'high' ? 'rgba(234, 88, 12, 0.3)' : 'rgba(253, 186, 116, 0.2)'}`
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
                        <div className="prep-insights-grid">
                            {prepData.companyInsights?.length > 0 && (
                                <div className="ui-card prep-section-card-sm">
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 15 }}>
                                        <FiTarget size={16} color="#f97316" /> Company Insights
                                    </h3>
                                    {prepData.companyInsights.map((c, i) => (
                                        <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 12, borderLeft: '2px solid rgba(249, 115, 22, 0.3)' }}>
                                            {c}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {prepData.tips?.length > 0 && (
                                <div className="ui-card prep-section-card-sm">
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 15 }}>
                                        <FiZap size={16} color="#f97316" /> Pro Tips
                                    </h3>
                                    {prepData.tips.map((t, i) => (
                                        <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 12, borderLeft: '2px solid rgba(249, 115, 22, 0.3)' }}>
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
