import { useState, useEffect } from 'react';
import { FiTrendingUp, FiTarget, FiClock, FiCheck, FiRefreshCw, FiMap, FiFileText, FiChevronDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { getCareerPath } from '../services/api';

function CareerPath({ user, resumeData }) {
    const [pathData, setPathData] = useState(() => {
        const saved = localStorage.getItem('appliqa_career_path');
        return saved ? JSON.parse(saved) : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [allExpanded, setAllExpanded] = useState(false);
    const [saved, setSaved] = useState(!!localStorage.getItem('appliqa_career_path'));

    const currentRole = user?.preferences?.desiredRole || resumeData?.suggestedRoles?.[0];

    const fetchCareerPath = async () => {
        setLoading(true);
        setError('');
        setAllExpanded(false);
        setSaved(false);
        try {
            const res = await getCareerPath({
                resumeData,
                preferences: user?.preferences
            });
            const data = res.data.careerPath;
            setPathData(data);
            localStorage.setItem('appliqa_career_path', JSON.stringify(data));
            setSaved(true);
        } catch (err) {
            console.error('Career path failed:', err);
            setError('Failed to generate career path. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!pathData && (currentRole || resumeData?.skills?.length > 0)) {
            fetchCareerPath();
        }
    }, []);

    if (!currentRole && !resumeData?.skills?.length) {
        return (
            <motion.div 
                className="main-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="cp-empty">
                    <FiMap size={32} strokeWidth={1.5} />
                    <h2>Career Path Visualizer</h2>
                    <p>Upload your resume or set a desired role in Profile to generate your career roadmap.</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            className="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header */}
            <div className="cp-header">
                <div>
                    <h1 className="cp-title">Career Path</h1>
                    <p className="cp-subtitle">Based on your skills and experience</p>
                </div>
                {pathData && (
                    <button 
                        className="cp-regen" 
                        onClick={fetchCareerPath} 
                        disabled={loading}
                    >
                        <FiRefreshCw size={13} className={loading ? 'spinning' : ''} />
                        Regenerate
                    </button>
                )}
            </div>

            {loading ? (
                <div className="cp-loading">
                    <div className="spinner" style={{ margin: '0 auto 20px' }} />
                    <p>Analyzing your career trajectory...</p>
                </div>
            ) : error ? (
                <div className="cp-error-box">
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchCareerPath}>Try Again</button>
                </div>
            ) : pathData ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                >
                    {/* Current Position */}
                    <motion.div 
                        className="cp-current"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="cp-current-dot" />
                        <div>
                            <span className="cp-current-label">Current Position</span>
                            <h2 className="cp-current-role">{pathData.currentRole}</h2>
                            <span className="cp-current-level">{pathData.currentLevel} level</span>
                        </div>
                    </motion.div>

                    {/* Connector */}
                    <div className="cp-connector">
                        <div className="cp-connector-line" />
                    </div>

                    {/* Section label */}
                    <p className="cp-section-label">Where you could go next</p>

                    {/* Path Cards */}
                    <div className="cp-grid">
                        {pathData.paths?.map((path, i) => (
                            <motion.div
                                key={i}
                                className={`cp-card ${allExpanded ? 'cp-card--open' : ''}`}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 + i * 0.08 }}
                                onClick={() => setAllExpanded(!allExpanded)}
                            >
                                {/* Top bar */}
                                <div className="cp-card-bar" />

                                <div className="cp-card-inner">
                                    {/* Header */}
                                    <div className="cp-card-head">
                                        <div className="cp-card-head-text">
                                            <h3>{path.title}</h3>
                                            <p>{path.description}</p>
                                        </div>
                                        <div className="cp-card-match">
                                            {path.match_percent}%
                                        </div>
                                    </div>

                                    {/* Meta row */}
                                    <div className="cp-card-meta">
                                        <span><FiClock size={11} /> {path.timeline}</span>
                                        <span>₹ {path.salary_range}</span>
                                        <span className="cp-card-level">{path.level}</span>
                                    </div>

                                    {/* Expanded */}
                                    <AnimatePresence>
                                        {allExpanded && (
                                            <motion.div 
                                                className="cp-card-detail"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <div className="cp-card-detail-inner">
                                                    {path.skills_have?.length > 0 && (
                                                        <div className="cp-skill-block">
                                                            <span className="cp-skill-label"><FiCheck size={11} /> You have</span>
                                                            <div className="cp-pills">
                                                                {path.skills_have.map((s, j) => (
                                                                    <span key={j} className="cp-pill">{s}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {path.skills_needed?.length > 0 && (
                                                        <div className="cp-skill-block">
                                                            <span className="cp-skill-label cp-skill-label--gap"><FiTarget size={11} /> To learn</span>
                                                            <div className="cp-pills">
                                                                {path.skills_needed.map((s, j) => (
                                                                    <span key={j} className="cp-pill cp-pill--gap">{s}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Simple progress */}
                                                    <div className="cp-progress">
                                                        <div className="cp-progress-header">
                                                            <span>Readiness</span>
                                                            <span>{path.match_percent}%</span>
                                                        </div>
                                                        <div className="cp-progress-track">
                                                            <motion.div 
                                                                className="cp-progress-fill"
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${path.match_percent}%` }}
                                                                transition={{ duration: 0.8, delay: 0.15 }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Toggle */}
                                    <div className="cp-card-toggle">
                                        <motion.span
                                            animate={{ rotate: allExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.25 }}
                                            style={{ display: 'flex' }}
                                        >
                                            <FiChevronDown size={13} />
                                        </motion.span>
                                        {allExpanded ? 'Less' : 'Skills'}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Advice */}
                    {pathData.advice && (
                        <motion.div 
                            className="cp-advice"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <h3><FiTrendingUp size={15} /> Career Advice</h3>
                            <p>{pathData.advice}</p>
                        </motion.div>
                    )}
                </motion.div>
            ) : null}
        </motion.div>
    );
}

export default CareerPath;
