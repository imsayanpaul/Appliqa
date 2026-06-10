import { useState, useEffect } from 'react';
import { FiTrash2, FiBookmark, FiUser, FiGrid, FiSend, FiVideo, FiCheckCircle, FiXCircle, FiMapPin, FiDollarSign, FiZap, FiFileText, FiCopy, FiCheck, FiX } from 'react-icons/fi';
import { getSavedJobs, updateJobStatus, deleteSavedJob } from '../services/api';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import JobDetail from '../components/JobDetail';
import InterviewPrep from '../components/InterviewPrep';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
    saved: { label: 'Saved', color: 'var(--accent-blue)', icon: FiBookmark },
    applied: { label: 'Applied', color: 'var(--accent-orange)', icon: FiSend },
    interview: { label: 'Interview', color: 'var(--accent-purple)', icon: FiVideo },
    offer: { label: 'Offer', color: 'var(--accent-green)', icon: FiCheckCircle },
    rejected: { label: 'Rejected', color: 'var(--accent-red)', icon: FiXCircle }
};

// Premium Redesigned UI Animations
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06
        }
    }
};

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    }
};

function SavedJobs({ user, resumeData }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedJob, setSelectedJob] = useState(null);
    const [prepJob, setPrepJob] = useState(null);
    const [coverLetterJob, setCoverLetterJob] = useState(null);
    const [clCopied, setClCopied] = useState(false);

    useEffect(() => {
        if (user) fetchSavedJobs();
        else setLoading(false);
    }, [user]);

    const fetchSavedJobs = async () => {
        try {
            const res = await getSavedJobs();
            setJobs(res.data.jobs || []);
        } catch (err) {
            console.error('Failed to load saved jobs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (jobId, newStatus) => {
        try {
            await updateJobStatus(jobId, newStatus);
            setJobs(prev => prev.map(j => j._id === jobId ? { ...j, status: newStatus } : j));
        } catch (err) {
            console.error('Status update failed:', err);
        }
    };

    const handleDelete = async (jobId) => {
        try {
            await deleteSavedJob(jobId);
            setJobs(prev => prev.filter(j => j._id !== jobId));
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const filteredJobs = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

    const statusCounts = {
        all: jobs.length,
        saved: jobs.filter(j => j.status === 'saved').length,
        applied: jobs.filter(j => j.status === 'applied').length,
        interview: jobs.filter(j => j.status === 'interview').length,
        offer: jobs.filter(j => j.status === 'offer').length,
        rejected: jobs.filter(j => j.status === 'rejected').length
    };

    if (!user) {
        return (
            <div className="main-content">
                <EmptyState 
                    icon={FiUser} 
                    title="Set up your profile first"
                    description="Go to Profile to enter your details, then start saving jobs"
                />
            </div>
        );
    }

    return (
        <motion.div 
            className="main-content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div 
                className="section-header" 
                style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}
                variants={cardVariants}
            >
                <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Application Tracker</h2>
                <span className="results-count" style={{ color: 'var(--text-muted)' }}>{jobs.length} total jobs</span>
            </motion.div>

            {/* Status Tabs */}
            <motion.div className="segmented-control" variants={cardVariants}>
                {Object.entries({ all: { label: 'All', icon: FiGrid }, ...STATUS_CONFIG }).map(([key, val]) => {
                    const Icon = val.icon;
                    const isActive = filter === key;
                    return (
                        <button
                            key={key}
                            className={`segment-btn ${isActive ? 'active' : ''}`}
                            onClick={() => setFilter(key)}
                        >
                            <Icon size={14} color={isActive && val.color ? val.color : 'currentColor'} />
                            {val.label}
                            <span className="segment-badge">{statusCounts[key]}</span>
                        </button>
                    );
                })}
            </motion.div>

            {loading ? (
                <EmptyState loading title="Loading saved jobs..." />
            ) : filteredJobs.length > 0 ? (
                <motion.div className="results-grid" layout>
                    <AnimatePresence mode="popLayout">
                        {filteredJobs.map(job => {
                            const statusConfig = STATUS_CONFIG[job.status] || { label: job.status, color: 'var(--text-muted)' };
                            return (
                                <motion.div
                                    key={job._id}
                                    layout
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit={{ opacity: 0, scale: 0.9, y: 12 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                    <Card className={`job-card status-${job.status}`} onClick={() => setSelectedJob(job)}>
                                        <div className="job-card-status-badge">
                                            <span className="status-dot" />
                                            <span>{statusConfig.label}</span>
                                        </div>

                                        <div className="job-card-header">
                                            {job.companyLogo ? (
                                                <img src={job.companyLogo} alt="" className="company-logo" />
                                            ) : (
                                                <div className="company-logo-placeholder">
                                                    {(job.company || '?')[0]}
                                                </div>
                                            )}
                                            <div className="job-card-info flex-1 min-w-0" style={{ paddingRight: 75 }}>
                                                <h3 className="whitespace-normal line-clamp-2 break-words" title={job.title}>{job.title}</h3>
                                                <div className="job-card-company truncate" title={job.company}>{job.company}</div>
                                            </div>
                                        </div>

                                        <div className="job-card-meta">
                                            {job.location && <Badge><FiMapPin size={12} style={{ marginRight: 4 }} /> {job.location}</Badge>}
                                            {job.salary && job.salary !== 'Not specified' && (
                                                <Badge><FiDollarSign size={12} style={{ marginRight: 4 }} /> {job.salary}</Badge>
                                            )}
                                        </div>

                                        {/* Status Selector & Footer */}
                                        <div className="job-card-footer-custom" onClick={(e) => e.stopPropagation()}>
                                            <Dropdown
                                                options={Object.entries(STATUS_CONFIG).map(([key, val]) => ({ value: key, label: val.label }))}
                                                value={job.status}
                                                onChange={(val) => handleStatusChange(job._id, val)}
                                                placeholder="Select Status"
                                                variant="ghost"
                                            />

                                            <div className="job-card-actions">
                                                {/* Interview Prep button */}
                                                {job.status === 'interview' && (
                                                    <button
                                                        className="btn btn-sm prep-btn-custom"
                                                        onClick={(e) => { e.stopPropagation(); setPrepJob(job); }}
                                                    >
                                                        <FiZap size={12} /> {job.interviewPrep ? 'View Prep' : 'Prep'}
                                                    </button>
                                                )}
                                                {/* Cover Letter badge */}
                                                {job.coverLetter && (
                                                    <button
                                                        className="btn btn-sm letter-btn-custom"
                                                        onClick={(e) => { e.stopPropagation(); setCoverLetterJob(job); }}
                                                        title="View saved cover letter"
                                                    >
                                                        <FiFileText size={12} /> Letter
                                                    </button>
                                                )}
                                                {job.applyLink && (
                                                    <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="apply-btn-custom">
                                                        Apply
                                                    </a>
                                                )}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(job._id); }} 
                                                    title="Remove" 
                                                    className="trash-btn-custom"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <EmptyState 
                    icon={FiBookmark} 
                    title={filter === 'all' ? 'No saved jobs yet' : `No ${filter} jobs`}
                    description="Search for jobs and click the bookmark icon to save them here"
                />
            )}

            {/* Job Detail Modal */}
            {selectedJob && (
                <JobDetail
                    job={selectedJob}
                    user={user}
                    resumeData={resumeData}
                    onClose={() => setSelectedJob(null)}
                />
            )}

            {/* Interview Prep Modal */}
            {prepJob && (
                <InterviewPrep
                    job={prepJob}
                    user={user}
                    resumeData={resumeData}
                    onClose={() => setPrepJob(null)}
                />
            )}

            {/* Cover Letter Viewer Modal */}
            {coverLetterJob && (
                <div className="modal-overlay" onClick={() => setCoverLetterJob(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <button className="modal-close" onClick={() => setCoverLetterJob(null)}><FiX /></button>
                        <div className="modal-header">
                            <h2 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FiFileText size={18} /> Saved Cover Letter
                            </h2>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                {coverLetterJob.title} at {coverLetterJob.company}
                            </div>
                        </div>
                        <div style={{ whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: 8, padding: 20, border: '1px solid var(--glass-border)', marginBottom: 16 }}>
                            {coverLetterJob.coverLetter}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(coverLetterJob.coverLetter);
                                    setClCopied(true);
                                    setTimeout(() => setClCopied(false), 2000);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
                            >
                                {clCopied ? <><FiCheck size={12} /> Copied!</> : <><FiCopy size={12} /> Copy</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default SavedJobs;
