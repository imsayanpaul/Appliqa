import { useState, useEffect } from 'react';
import { 
    FiTrash2, FiBookmark, FiUser, FiGrid, FiSend, FiVideo, FiCheckCircle, 
    FiXCircle, FiMapPin, FiDollarSign, FiZap, FiFileText, FiCopy, FiCheck, 
    FiX, FiExternalLink, FiAward, FiClock 
} from 'react-icons/fi';
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
    saved: { 
        label: 'Saved', 
        badgeBg: 'bg-neutral-100', 
        badgeText: 'text-neutral-600', 
        badgeBorder: 'border-neutral-200',
        dotColor: 'bg-neutral-400',
        icon: FiBookmark 
    },
    applied: { 
        label: 'Applied', 
        badgeBg: 'bg-neutral-100', 
        badgeText: 'text-[#171717]', 
        badgeBorder: 'border-neutral-300',
        dotColor: 'bg-[#171717]',
        icon: FiSend 
    },
    interview: { 
        label: 'Interview', 
        badgeBg: 'bg-[#FFF0E8]', 
        badgeText: 'text-[#F45B25]', 
        badgeBorder: 'border-[#F45B25]/30',
        dotColor: 'bg-[#F45B25]',
        icon: FiVideo 
    },
    offer: { 
        label: 'Offer', 
        badgeBg: 'bg-[#171717]', 
        badgeText: 'text-white', 
        badgeBorder: 'border-[#171717]',
        dotColor: 'bg-[#F45B25]',
        icon: FiAward 
    },
    rejected: { 
        label: 'Rejected', 
        badgeBg: 'bg-neutral-100', 
        badgeText: 'text-neutral-500', 
        badgeBorder: 'border-neutral-200',
        dotColor: 'bg-neutral-400',
        icon: FiXCircle 
    }
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { type: "spring", stiffness: 120, damping: 18 }
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
            <div className="bg-[#FAF8F5] min-h-screen text-[#171717] py-20 px-4">
                <div className="max-w-md mx-auto">
                    <EmptyState 
                        icon={FiUser} 
                        title="Set up your profile first"
                        description="Sign in or create your profile to start tracking and managing your job applications."
                    />
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            className="fade-in bg-[#FAF8F5] min-h-screen text-[#171717] pb-24"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8">
                {/* Section Header */}
                <div className="mb-8">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#F45B25] mb-1">
                        [ Pipeline Intelligence ]
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#171717] leading-tight">
                        Application Tracker
                    </h1>
                </div>

                {/* Status Segmented Tabs Bar (2-Column Grid on Mobile, Inline Strip on Desktop) */}
                <motion.div 
                    className="grid grid-cols-2 sm:flex sm:flex-row w-full sm:w-fit bg-white rounded-lg p-1.5 sm:p-1 border border-[#D8D4CC] gap-1.5 sm:gap-1 mb-8"
                    variants={cardVariants}
                    style={{ boxShadow: 'none' }}
                >
                    {Object.entries({ all: { label: 'All', icon: FiGrid }, ...STATUS_CONFIG }).map(([key, val]) => {
                        const Icon = val.icon;
                        const isActive = filter === key;
                        const count = statusCounts[key];
                        return (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`w-full sm:w-auto px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-md text-xs font-bold flex items-center justify-between sm:justify-start gap-2 transition-all border cursor-pointer select-none ${
                                    isActive 
                                        ? 'bg-[#171717] text-white border-[#171717] shadow-xs' 
                                        : 'bg-[#FAF8F5] sm:bg-transparent text-[#66615C] border-[#D8D4CC]/50 sm:border-transparent hover:text-[#171717] hover:bg-neutral-100 sm:hover:bg-[#FAF8F5]'
                                }`}
                                style={{ boxShadow: 'none' }}
                            >
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <Icon size={14} className={isActive ? 'text-white' : 'text-[#8A8580]'} />
                                    <span>{val.label}</span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-white text-[#171717] border border-[#D8D4CC]'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </motion.div>

                {/* Main Content Grid */}
                {loading ? (
                    <EmptyState loading title="Loading application tracker..." />
                ) : filteredJobs.length > 0 ? (
                    <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" layout>
                        <AnimatePresence mode="popLayout">
                            {filteredJobs.map(job => {
                                const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.saved;
                                const StatusIcon = statusConfig.icon;
                                const hasSalary = job.salary && job.salary !== 'Not specified';

                                return (
                                    <motion.div
                                        key={job._id}
                                        layout
                                        variants={cardVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                        className="relative focus-within:z-50 hover:z-20"
                                    >
                                        <div 
                                            onClick={() => setSelectedJob(job)}
                                            className="group relative bg-white rounded-lg p-5 border border-[#D8D4CC] hover:border-[#171717] transition-all duration-200 cursor-pointer flex flex-col justify-between h-full"
                                            style={{ boxSizing: 'border-box', boxShadow: 'none' }}
                                        >
                                            <div>
                                                {/* Header: Logo, Title & Status Badge */}
                                                <div className="flex gap-3.5 items-start justify-between w-full mb-3.5">
                                                    <div className="flex gap-3 items-start flex-1 min-w-0">
                                                        {/* Logo container */}
                                                        <div className="w-11 h-11 rounded-md border border-[#E0DCD6] bg-[#FAF8F5] p-1.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                            {job.companyLogo ? (
                                                                <img src={job.companyLogo} alt="" className="w-full h-full object-contain object-center rounded-sm" />
                                                            ) : (
                                                                <div className="w-full h-full rounded-sm bg-[#FFF0E8] flex items-center justify-center text-[#F45B25] font-black text-sm">
                                                                    {(job.company || '?')[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Title & Company */}
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-base font-bold text-[#171717] tracking-tight leading-snug group-hover:text-[#F45B25] transition-colors duration-200 line-clamp-1" title={job.title}>
                                                                {job.title}
                                                            </h3>
                                                            <p className="text-xs text-neutral-500 font-semibold truncate mt-0.5">
                                                                {job.company}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Status Badge Pill */}
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border flex-shrink-0 ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`} style={{ boxShadow: 'none' }}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} animate-pulse`} />
                                                        <span>{statusConfig.label}</span>
                                                    </div>
                                                </div>

                                                {/* Metadata Row */}
                                                <div className="flex flex-wrap items-center gap-1.5 mb-4 select-none">
                                                    {job.location && (
                                                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md bg-[#FAF8F5] text-[#171717] font-medium border border-neutral-200">
                                                            <FiMapPin size={11} className="text-neutral-400" /> {job.location}
                                                        </span>
                                                    )}
                                                    {hasSalary && (
                                                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md bg-[#FFF8F5] text-[#F45B25] font-bold border border-[#F45B25]/20">
                                                            <FiDollarSign size={11} /> {job.salary}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Bottom Controls: Status Dropdown & Action Buttons */}
                                            <div 
                                                className="pt-3.5 border-t border-neutral-100 flex items-center justify-between gap-2 mt-auto"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Status Selector */}
                                                <Dropdown
                                                    options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
                                                    value={job.status}
                                                    onChange={(val) => handleStatusChange(job._id, val)}
                                                    placeholder="Select Status"
                                                    variant="filter"
                                                    direction="down"
                                                />

                                                {/* Actions */}
                                                <div className="flex items-center gap-1.5">
                                                    {/* Interview Prep button */}
                                                    {job.status === 'interview' && (
                                                        <button
                                                            className="h-8 w-8 rounded-md bg-[#FFF0E8] text-[#F45B25] hover:bg-[#F45B25] hover:text-white border border-[#F45B25]/20 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                                                            onClick={(e) => { e.stopPropagation(); setPrepJob(job); }}
                                                            title="Launch Interview Prep & STAR Questions"
                                                            style={{ boxShadow: 'none', boxSizing: 'border-box' }}
                                                        >
                                                            <FiVideo size={14} />
                                                        </button>
                                                    )}

                                                    {/* Cover Letter button */}
                                                    {job.coverLetter && (
                                                        <button
                                                            className="h-8 w-8 rounded-md bg-neutral-100 text-[#171717] hover:bg-neutral-200 border border-neutral-200/60 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                                                            onClick={(e) => { e.stopPropagation(); setCoverLetterJob(job); }}
                                                            title="View Saved Cover Letter"
                                                            style={{ boxShadow: 'none', boxSizing: 'border-box' }}
                                                        >
                                                            <FiFileText size={14} />
                                                        </button>
                                                    )}

                                                    {/* Apply link */}
                                                    {job.applyLink && (
                                                        <a 
                                                            href={job.applyLink} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="h-8 px-3.5 rounded-md bg-[#F45B25] hover:bg-[#D94B1F] text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 no-underline flex-shrink-0 leading-none"
                                                            style={{ boxShadow: 'none', boxSizing: 'border-box' }}
                                                        >
                                                            <span>Apply</span>
                                                            <FiExternalLink size={12} />
                                                        </a>
                                                    )}

                                                    {/* Delete */}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(job._id); }} 
                                                        title="Remove from Tracker" 
                                                        className="h-8 w-8 rounded-md bg-[#FAF8F5] hover:bg-neutral-200 text-neutral-400 hover:text-[#171717] border border-neutral-200/60 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                                                        style={{ boxShadow: 'none', boxSizing: 'border-box' }}
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <EmptyState 
                        icon={FiBookmark} 
                        title={filter === 'all' ? 'No applications tracked yet' : `No ${filter} opportunities`}
                        description="Bookmark opportunities from Search or Recommendations to manage your hiring pipeline here."
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

                {/* Cover Letter Modal */}
                {coverLetterJob && (
                    <div className="modal-overlay" onClick={() => setCoverLetterJob(null)}>
                        <div className="modal-content max-w-2xl bg-white rounded-3xl p-8 border border-neutral-200 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
                                <div>
                                    <h3 className="text-xl font-bold text-[#171717]">Saved Cover Letter</h3>
                                    <p className="text-xs text-neutral-500">{coverLetterJob.title} · {coverLetterJob.company}</p>
                                </div>
                                <button 
                                    onClick={() => setCoverLetterJob(null)} 
                                    className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#171717] flex items-center justify-center border-none cursor-pointer hover:bg-neutral-200"
                                >
                                    <FiX size={16} />
                                </button>
                            </div>
                            <div className="p-5 rounded-2xl bg-[#FAF8F5] text-[#171717] text-sm leading-relaxed whitespace-pre-wrap font-mono mb-6 max-h-96 overflow-y-auto border border-neutral-200/80">
                                {coverLetterJob.coverLetter}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(coverLetterJob.coverLetter);
                                        setClCopied(true);
                                        setTimeout(() => setClCopied(false), 2000);
                                    }}
                                    className="px-5 py-2.5 rounded-xl bg-[#171717] hover:bg-neutral-800 text-white text-xs font-bold inline-flex items-center gap-2 border-none cursor-pointer"
                                >
                                    {clCopied ? <FiCheck size={14} className="text-[#F45B25]" /> : <FiCopy size={14} />}
                                    {clCopied ? 'Copied to Clipboard!' : 'Copy Cover Letter'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default SavedJobs;
