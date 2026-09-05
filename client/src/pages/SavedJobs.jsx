import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    FiTrash2, FiBookmark, FiUser, FiGrid, FiSend, FiVideo, FiCheckCircle, 
    FiXCircle, FiMapPin, FiDollarSign, FiZap, FiFileText, FiCopy, FiCheck, 
    FiX, FiExternalLink, FiAward, FiClock, FiPlus, FiEdit2
} from 'react-icons/fi';
import { getSavedJobs, updateJobStatus, deleteSavedJob, saveJob, updateSavedJob } from '../services/api';
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

    // Custom Job Modal State (Add & Edit)
    const [showAddCustomModal, setShowAddCustomModal] = useState(false);
    const [editingJobId, setEditingJobId] = useState(null);
    const [rawPasteText, setRawPasteText] = useState('');
    const [customJob, setCustomJob] = useState({
        title: '',
        company: '',
        location: '',
        salary: '',
        applyLink: '',
        status: 'saved',
        description: ''
    });
    const [savingCustom, setSavingCustom] = useState(false);

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

    const handleOpenAddModal = () => {
        setEditingJobId(null);
        setCustomJob({
            title: '',
            company: '',
            location: '',
            salary: '',
            applyLink: '',
            status: 'saved',
            description: ''
        });
        setRawPasteText('');
        setShowAddCustomModal(true);
    };

    const handleOpenEditModal = (job) => {
        setEditingJobId(job._id);
        setCustomJob({
            title: job.title || '',
            company: job.company || '',
            location: job.location || '',
            salary: job.salary && job.salary !== 'Not specified' ? job.salary : '',
            applyLink: job.applyLink || job.apply_link || '',
            status: job.status || 'saved',
            description: job.description || ''
        });
        setRawPasteText('');
        setShowAddCustomModal(true);
    };

    const handleAutoDetectFields = () => {
        if (!rawPasteText.trim()) return;
        const text = rawPasteText;
        
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        let title = lines[0] || '';
        let company = lines[1] || '';
        let location = '';
        let salary = '';
        let applyLink = '';

        const urlMatch = text.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) applyLink = urlMatch[0];

        const salaryMatch = text.match(/(\$|₹|INR|USD|EUR|£)\s?[0-9,]+(\s*-\s*(\$|₹|INR|USD|EUR|£)?\s?[0-9,]+)?(\s*(k|k\/yr|\/yr|per year|LPA|lpa))?/i);
        if (salaryMatch) salary = salaryMatch[0];

        const locMatch = text.match(/(Remote|Hybrid|On-site|New York|San Francisco|London|Bangalore|Kolkata|India|USA|UK|Canada|Germany)[^,\n]*/i);
        if (locMatch) location = locMatch[0];

        setCustomJob(prev => ({
            ...prev,
            title: title.length < 80 ? title : prev.title || title.substring(0, 80),
            company: company.length < 50 ? company : prev.company,
            location: location || prev.location,
            salary: salary || prev.salary,
            applyLink: applyLink || prev.applyLink,
            description: text
        }));
    };

    const handleSaveCustomJob = async (e) => {
        e.preventDefault();
        if (!customJob.title.trim()) return;

        setSavingCustom(true);
        try {
            if (editingJobId) {
                // Update existing job
                const updates = {
                    title: customJob.title.trim(),
                    company: customJob.company.trim() || 'Direct Employer',
                    location: customJob.location.trim(),
                    salary: customJob.salary.trim() || 'Not specified',
                    applyLink: customJob.applyLink.trim(),
                    status: customJob.status || 'saved',
                    description: customJob.description.trim()
                };

                await updateSavedJob(editingJobId, updates);
                setJobs(prev => prev.map(j => j._id === editingJobId ? {
                    ...j,
                    ...updates,
                    applyLink: updates.applyLink,
                    description: updates.description
                } : j));
            } else {
                // Create new custom job
                const payload = {
                    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    title: customJob.title.trim(),
                    company: customJob.company.trim() || 'Direct Employer',
                    location: customJob.location.trim(),
                    salary: customJob.salary.trim() || 'Not specified',
                    applyLink: customJob.applyLink.trim(),
                    status: customJob.status || 'saved',
                    description: customJob.description.trim(),
                    datePosted: new Date().toISOString()
                };

                const res = await saveJob(payload);
                const created = res.data?.savedJob ? {
                    _id: res.data.savedJob.id,
                    jobId: res.data.savedJob.job_id,
                    title: res.data.savedJob.title,
                    company: res.data.savedJob.company,
                    location: res.data.savedJob.location,
                    salary: res.data.savedJob.salary,
                    description: res.data.savedJob.description,
                    employmentType: res.data.savedJob.employment_type || 'Full-time',
                    applyLink: res.data.savedJob.apply_link,
                    status: res.data.savedJob.status || 'saved',
                    datePosted: res.data.savedJob.date_posted,
                    createdAt: res.data.savedJob.created_at
                } : {
                    _id: `temp_${Date.now()}`,
                    ...payload,
                    jobId: payload.id,
                    employmentType: 'Full-time'
                };

                setJobs(prev => [created, ...prev]);
            }

            setShowAddCustomModal(false);
            setEditingJobId(null);
            setRawPasteText('');
            setCustomJob({
                title: '',
                company: '',
                location: '',
                salary: '',
                applyLink: '',
                status: 'saved',
                description: ''
            });
        } catch (err) {
            console.error('Failed to save job details:', err);
            alert('Failed to save job: ' + (err.message || 'Unknown error'));
        } finally {
            setSavingCustom(false);
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
                <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#F45B25] mb-1">
                        [ Pipeline Intelligence ]
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#171717] leading-tight m-0">
                        Application Tracker
                    </h1>
                </div>

                {/* Toolbar: Status Segmented Tabs + Squarish Add Custom Job Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
                    {/* Status Segmented Tabs Bar (2-Column Grid on Mobile, Inline Strip on Desktop) */}
                    <motion.div 
                        className="grid grid-cols-2 sm:flex sm:flex-row w-full sm:w-fit bg-white rounded-lg p-1.5 sm:p-1 border border-[#D8D4CC] gap-1.5 sm:gap-1"
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

                    {/* Squarish, Refined "Add Custom Job" Action Button */}
                    <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="group h-[38px] px-3.5 rounded-lg bg-white hover:bg-[#FAF8F5] text-[#171717] hover:text-[#F45B25] text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2 border border-[#D8D4CC] hover:border-[#F45B25]/50 cursor-pointer shadow-xs active:scale-[0.98] shrink-0"
                    >
                        <span className="w-5 h-5 rounded-[4px] bg-[#FFF0E8] text-[#F45B25] border border-[#F45B25]/30 flex items-center justify-center transition-transform group-hover:scale-105">
                            <FiPlus size={13} className="stroke-[3]" />
                        </span>
                        <span>Add Custom Job</span>
                        <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-[3px] bg-[#FAF8F5] text-[#66615C] border border-[#D8D4CC] group-hover:border-[#F45B25]/30 group-hover:text-[#F45B25] transition-colors">
                            + NEW
                        </span>
                    </button>
                </div>

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
                                const isCustomJob = Boolean(job.jobId?.startsWith('custom_') || job.job_id?.startsWith('custom_') || String(job._id)?.startsWith('temp_'));

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

                                                    {/* Edit Button (Only for Custom Created Jobs) */}
                                                    {isCustomJob && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(job); }} 
                                                            title="Edit Custom Opportunity" 
                                                            className="h-8 w-8 rounded-md bg-[#FAF8F5] hover:bg-[#FFF0E8] text-neutral-400 hover:text-[#F45B25] border border-neutral-200/60 hover:border-[#F45B25]/30 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                                                            style={{ boxShadow: 'none', boxSizing: 'border-box' }}
                                                        >
                                                            <FiEdit2 size={13} />
                                                        </button>
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
                    <div className="modal-overlay" onClick={() => setCoverLetterJob(null)} data-lenis-prevent>
                        <div className="modal-content max-w-2xl bg-white rounded-3xl p-8 border border-neutral-200 shadow-2xl" onClick={e => e.stopPropagation()} data-lenis-prevent>
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

                {/* ── Custom Job Entry Modal (Mounted directly to document.body via Portal) ── */}
                {typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {showAddCustomModal && (
                            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                    className="bg-white rounded-xl w-full max-w-xl border border-[#D8D4CC] shadow-2xl overflow-hidden flex flex-col max-h-[82vh] h-auto my-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Fixed Modal Header */}
                                    <div className="px-6 py-4 border-b border-[#D8D4CC] flex items-center justify-between bg-[#FAF8F5] shrink-0">
                                        <div>
                                            <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-[#F45B25] leading-normal block mb-0.5">
                                                {editingJobId ? 'EDIT APPLICATION DETAILS' : 'MANUAL APPLICATION ENTRY'}
                                            </span>
                                            <h2 className="text-lg font-black text-[#171717] m-0 leading-tight">
                                                {editingJobId ? 'Edit Custom Job' : 'Add Custom Job to Tracker'}
                                            </h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCustomModal(false)}
                                            className="w-8 h-8 rounded-[6px] bg-white border border-[#D8D4CC] text-[#66615C] hover:text-[#171717] hover:bg-neutral-100 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                        >
                                            <FiX size={16} />
                                        </button>
                                    </div>

                                    {/* Form wrapping Scrollable Body & Fixed Footer */}
                                    <form onSubmit={handleSaveCustomJob} className="flex flex-col flex-1 min-h-0 overflow-hidden m-0">
                                        {/* Scrollable Form Body with thin custom scrollbar */}
                                        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 pb-6 custom-modal-scroll">
                                            {/* Smart Auto-Detect Paste Box */}
                                            <div className="p-3.5 rounded-[6px] bg-[#FAF8F5] border border-[#D8D4CC] space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-bold text-[#171717]">
                                                        Quick Paste Job Details (Optional)
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={handleAutoDetectFields}
                                                        className="text-[10.5px] font-bold text-[#F45B25] hover:underline bg-transparent border-none cursor-pointer"
                                                    >
                                                        Auto-Fill Fields →
                                                    </button>
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    value={rawPasteText}
                                                    onChange={(e) => setRawPasteText(e.target.value)}
                                                    placeholder="Paste job description or details here, then click Auto-Fill..."
                                                    className="w-full text-xs p-2.5 rounded-[5px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] resize-none focus:outline-none focus:border-[#F45B25] focus:ring-1 focus:ring-[#F45B25]/20"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#66615C]">
                                                        Job Title / Role <span className="text-[#F45B25]">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={customJob.title}
                                                        onChange={(e) => setCustomJob({ ...customJob, title: e.target.value })}
                                                        placeholder="e.g. Senior Frontend Architect"
                                                        className="w-full h-10 px-3 text-xs rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] focus:outline-none focus:border-[#F45B25] focus:ring-1 focus:ring-[#F45B25]/20 transition-all shadow-2xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#66615C]">
                                                        Company Name <span className="text-[#F45B25]">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={customJob.company}
                                                        onChange={(e) => setCustomJob({ ...customJob, company: e.target.value })}
                                                        placeholder="e.g. Stripe, Google, Startup"
                                                        className="w-full h-10 px-3 text-xs rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] focus:outline-none focus:border-[#F45B25] focus:ring-1 focus:ring-[#F45B25]/20 transition-all shadow-2xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#66615C]">
                                                        Location
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customJob.location}
                                                        onChange={(e) => setCustomJob({ ...customJob, location: e.target.value })}
                                                        placeholder="e.g. Remote, San Francisco, CA"
                                                        className="w-full h-10 px-3 text-xs rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] focus:outline-none focus:border-[#F45B25] focus:ring-1 focus:ring-[#F45B25]/20 transition-all shadow-2xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#66615C]">
                                                        Salary / Compensation
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customJob.salary}
                                                        onChange={(e) => setCustomJob({ ...customJob, salary: e.target.value })}
                                                        placeholder="e.g. $140,000 - $180,000 / yr"
                                                        className="w-full h-10 px-3 text-xs rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] focus:outline-none focus:border-[#F45B25] focus:ring-1 focus:ring-[#F45B25]/20 transition-all shadow-2xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-[#66615C]">
                                                    Application Link / Job URL
                                                </label>
                                                <input
                                                    type="url"
                                                    value={customJob.applyLink}
                                                    onChange={(e) => setCustomJob({ ...customJob, applyLink: e.target.value })}
                                                    placeholder="https://company.com/careers/job-123"
                                                    className="w-full h-10 px-3 text-xs rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] focus:outline-none focus:border-[#F45B25] focus:ring-1 focus:ring-[#F45B25]/20 transition-all shadow-2xs"
                                                />
                                            </div>

                                            {/* Pipeline Stage Selection */}
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-[#66615C]">
                                                    Initial Pipeline Stage
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(STATUS_CONFIG).map(([key, val]) => {
                                                        const isSelected = customJob.status === key;
                                                        return (
                                                            <button
                                                                key={key}
                                                                type="button"
                                                                onClick={() => setCustomJob({ ...customJob, status: key })}
                                                                className={`px-3 py-1.5 rounded-[5px] text-xs font-bold border transition-all cursor-pointer select-none ${
                                                                    isSelected
                                                                        ? 'bg-[#171717] text-white border-[#171717] shadow-2xs'
                                                                        : 'bg-[#FAF8F5] text-[#66615C] border-[#D8D4CC] hover:bg-neutral-100 hover:text-[#171717]'
                                                                }`}
                                                            >
                                                                {val.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-[#66615C]">
                                                    Job Description / Custom Notes
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={customJob.description}
                                                    onChange={(e) => setCustomJob({ ...customJob, description: e.target.value })}
                                                    placeholder="Key requirements, interview notes, recruiter contacts, or referral details..."
                                                    className="w-full text-xs p-3 rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] resize-none focus:outline-none focus:border-[#F45B25] focus:ring-1 focus:ring-[#F45B25]/20 transition-all shadow-2xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Fixed Bottom Action Buttons */}
                                        <div className="px-6 py-3.5 border-t border-[#D8D4CC] bg-[#FAF8F5] flex items-center justify-end gap-2.5 shrink-0 z-10">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddCustomModal(false)}
                                                className="h-9 px-4 rounded-[6px] bg-white hover:bg-neutral-100 text-[#66615C] hover:text-[#171717] text-xs font-bold border border-[#D8D4CC] cursor-pointer transition-colors shadow-2xs"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={savingCustom || !customJob.title.trim()}
                                                className="h-9 px-5 rounded-[6px] bg-[#F45B25] hover:bg-[#d94815] text-white text-xs font-bold transition-all border border-[#F45B25] cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.98] flex items-center gap-1.5"
                                            >
                                                {savingCustom ? (
                                                    <>
                                                        <FiZap size={13} className="animate-spin" />
                                                        <span>Saving...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiCheck size={13} className="stroke-[3]" />
                                                        <span>{editingJobId ? 'Save Changes' : 'Add to Tracker'}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>
        </motion.div>
    );
}

export default SavedJobs;
