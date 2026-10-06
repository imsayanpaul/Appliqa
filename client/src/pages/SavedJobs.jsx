import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../lib/useEscapeKey';
import { formatSalary } from '../lib/format';
import { FiTrash2, FiUser, FiVideo, FiFileText, FiCopy, FiCheck, FiX, FiPlus, FiEdit2, FiArrowUpRight } from 'react-icons/fi';
import { getSavedJobs, updateJobStatus, deleteSavedJob, saveJob, updateSavedJob } from '../services/api';
import { EmptyState } from '../components/ui/EmptyState';
import JobDetail from '../components/JobDetail';
import { CompanyMark } from '../components/JobCard';
import InterviewPrep from '../components/InterviewPrep';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
    saved: { label: 'Saved', text: 'text-[#4A4540]', dot: 'bg-[#8A8580]' },
    applied: { label: 'Applied', text: 'text-[#171717]', dot: 'bg-[#171717]' },
    interview: { label: 'Interview', text: 'text-[#CA3C0A]', dot: 'bg-[#CA3C0A]' },
    offer: { label: 'Offer', text: 'text-[#047857]', dot: 'bg-[#047857]' },
    rejected: { label: 'Rejected', text: 'text-[#6F6A65]', dot: 'bg-[#D8D4CC]' },
};

function SavedJobs({ user, resumeData }) {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedJob, setSelectedJob] = useState(null);
    const [prepJob, setPrepJob] = useState(null);
    const [coverLetterJob, setCoverLetterJob] = useState(null);
    useEscapeKey(() => setCoverLetterJob(null), !!coverLetterJob);
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
    useEscapeKey(() => setShowAddCustomModal(false), showAddCustomModal);

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

    const iconBtn = 'relative z-10 h-9 w-9 shrink-0 inline-flex items-center justify-center border border-[#D8D4CC] bg-transparent text-[#171717] hover:border-[#171717] cursor-pointer transition-colors';

    return (
        <div className="bg-[#F7F5F2] min-h-screen text-[#171717] pb-24">
            <section className="ds-frame ds-rule-b">
                <div className="ds-rule-b px-6 sm:px-8 h-14 flex items-center justify-between gap-4">
                    <span className="ds-mono truncate">tracker / {filter === 'all' ? 'all jobs' : STATUS_CONFIG[filter].label.toLowerCase()}</span>
                    <span className="ds-mono ds-mono-muted shrink-0 flex items-center gap-2">
                        {loading ? 'loading…' : `${filteredJobs.length} of ${jobs.length}`}
                        <span className={`ds-square ${loading ? 'animate-pulse' : ''}`} />
                    </span>
                </div>

                <div className="ds-cell !pt-12 sm:!pt-16 !pb-8 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <h1 className="ds-slash m-0">tracker</h1>
                        <p className="ds-body mt-4 mb-0 max-w-md">Every job you've saved, from first look to offer. Change a status to move it along.</p>
                    </div>
                    <button type="button" onClick={handleOpenAddModal} className="ds-btn ds-btn-ink w-full sm:w-auto">
                        Add a job manually <FiPlus size={18} className="ds-btn-arrow" aria-hidden="true" />
                    </button>
                </div>

                <div role="tablist" aria-label="Filter by status" className="flex overflow-x-auto">
                    {Object.entries({ all: { label: 'All' }, ...STATUS_CONFIG }).map(([key, val]) => {
                        const selected = filter === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => setFilter(key)}
                                className={`h-14 px-5 sm:px-6 shrink-0 flex items-center gap-3 text-[15px] font-medium cursor-pointer border-0 border-t border-r border-[#D8D4CC] ${selected ? 'bg-white text-[#171717]' : 'bg-[#EFECE6] text-[#4A4540] hover:bg-white'}`}
                            >
                                {val.label}
                                <span className={`ds-mono ${selected ? 'text-[#CA3C0A]' : 'ds-mono-muted'}`}>{statusCounts[key]}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="ds-frame ds-rule-b" aria-busy={loading}>
                {loading ? (
                    <div className="ds-gridlines grid-cols-1 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="p-6 min-h-[230px] flex flex-col animate-pulse">
                                <div className="flex gap-4">
                                    <div className="w-11 h-11 bg-[#E7E3DC]" />
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="h-4 w-4/5 bg-[#E7E3DC]" />
                                        <div className="h-3 w-1/3 bg-[#EFECE6]" />
                                    </div>
                                </div>
                                <div className="h-3 w-1/2 bg-[#EFECE6] mt-6" />
                                <div className="h-3 w-1/3 bg-[#EFECE6] mt-4" />
                                <div className="h-9 w-full bg-[#EFECE6] mt-auto" />
                            </div>
                        ))}
                    </div>
                ) : filteredJobs.length > 0 ? (
                    <ul className="ds-gridlines grid-cols-1 md:grid-cols-2 lg:grid-cols-3 list-none m-0 p-0">
                        {filteredJobs.map(job => {
                            const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.saved;
                            const salary = formatSalary(job.salary);
                            const isCustomJob = Boolean(job.jobId?.startsWith('custom_') || job.job_id?.startsWith('custom_') || String(job._id)?.startsWith('temp_'));
                            const meta = [job.location, job.employmentType?.toLowerCase().replace(/_/g, '-')].filter(Boolean);

                            return (
                                <li key={job._id}>
                                    <article className="group relative h-full flex flex-col bg-[#F7F5F2] hover:bg-white transition-colors duration-150 p-6">
                                        <div className="flex items-start gap-4">
                                            <CompanyMark logo={job.companyLogo} company={job.company} />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="m-0 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-[#171717]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedJob(job)}
                                                        className="text-left bg-transparent border-none p-0 cursor-pointer text-inherit line-clamp-2 group-hover:text-[#CA3C0A] after:absolute after:inset-0 after:content-['']"
                                                    >
                                                        {job.title}
                                                    </button>
                                                </h3>
                                                <p className="m-0 mt-1 text-[14px] text-[#4A4540] truncate">{job.company}</p>
                                            </div>
                                        </div>

                                        <p className="ds-mono mt-5 mb-0 flex items-center gap-2 min-w-0">
                                            <span className={`w-2 h-2 shrink-0 ${status.dot}`} aria-hidden="true" />
                                            <span className={`shrink-0 ${status.text}`}>{status.label.toLowerCase()}</span>
                                            {meta.length > 0 && <span className="ds-mono-muted truncate">· {meta.join(' · ')}</span>}
                                        </p>

                                        <p className="mt-3 mb-0 text-[14px] font-semibold text-[#171717] truncate">
                                            {salary || <span className="ds-mono ds-mono-muted font-normal">salary not listed</span>}
                                        </p>

                                        <div className="mt-auto pt-6 flex flex-wrap items-center gap-2">
                                            <label className="relative z-10 flex-1 min-w-[130px]">
                                                <span className="sr-only">Status for {job.title}</span>
                                                <select
                                                    value={job.status}
                                                    onChange={(e) => handleStatusChange(job._id, e.target.value)}
                                                    className="ds-select w-full"
                                                >
                                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                        <option key={k} value={k}>{v.label}</option>
                                                    ))}
                                                </select>
                                            </label>

                                            {job.status === 'interview' && (
                                                <button type="button" className={iconBtn} onClick={() => setPrepJob(job)} aria-label={`Interview prep for ${job.title}`} title="Interview prep">
                                                    <FiVideo size={15} />
                                                </button>
                                            )}
                                            {job.coverLetter && (
                                                <button type="button" className={iconBtn} onClick={() => setCoverLetterJob(job)} aria-label={`Cover letter for ${job.title}`} title="Cover letter">
                                                    <FiFileText size={15} />
                                                </button>
                                            )}
                                            {isCustomJob && (
                                                <button type="button" className={iconBtn} onClick={() => handleOpenEditModal(job)} aria-label={`Edit ${job.title}`} title="Edit">
                                                    <FiEdit2 size={14} />
                                                </button>
                                            )}
                                            <button type="button" className={`${iconBtn} hover:!border-[#B91C1C] hover:text-[#B91C1C]`} onClick={() => handleDelete(job._id)} aria-label={`Remove ${job.title} from tracker`} title="Remove">
                                                <FiTrash2 size={14} />
                                            </button>
                                            {job.applyLink && (
                                                <a
                                                    href={job.applyLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="relative z-10 ds-btn ds-btn-accent !min-h-0 h-9 !px-3 !text-[14px] !gap-2 no-underline shrink-0"
                                                >
                                                    Apply <FiArrowUpRight size={15} aria-hidden="true" />
                                                </a>
                                            )}
                                        </div>
                                    </article>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="ds-cell !py-20 text-center">
                        <p className="ds-mono ds-mono-muted m-0 mb-3">{filter === 'all' ? 'nothing saved yet' : `no ${STATUS_CONFIG[filter].label.toLowerCase()} jobs`}</p>
                        <p className="m-0 text-[24px] font-medium tracking-[-0.02em]">
                            {filter === 'all' ? 'Save jobs from search to track them here.' : 'Nothing in this column right now.'}
                        </p>
                        {filter === 'all' && (
                            <button type="button" onClick={() => navigate('/search')} className="ds-btn ds-btn-accent mt-8">
                                Search jobs <FiArrowUpRight size={18} className="ds-btn-arrow" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                )}
            </section>

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
                        <div className="modal-content max-w-2xl bg-white rounded-3xl p-8 border border-neutral-200 shadow-2xl" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} data-lenis-prevent>
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
                                    {clCopied ? <FiCheck size={14} className="text-[#CA3C0A]" /> : <FiCopy size={14} />}
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
                                            <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-[#CA3C0A] leading-normal block mb-0.5">
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
                                                        className="text-[10.5px] font-bold text-[#CA3C0A] hover:underline bg-transparent border-none cursor-pointer"
                                                    >
                                                        Auto-Fill Fields →
                                                    </button>
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    value={rawPasteText}
                                                    onChange={(e) => setRawPasteText(e.target.value)}
                                                    placeholder="Paste job description or details here, then click Auto-Fill..."
                                                    className="w-full text-xs p-2.5 rounded-[5px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] resize-none focus:outline-none focus:border-[#CA3C0A] focus:ring-1 focus:ring-[#CA3C0A]/20"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#66615C]">
                                                        Job Title / Role <span className="text-[#CA3C0A]">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={customJob.title}
                                                        onChange={(e) => setCustomJob({ ...customJob, title: e.target.value })}
                                                        placeholder="e.g. Senior Frontend Architect"
                                                        className="w-full h-10 px-3 text-xs rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] focus:outline-none focus:border-[#CA3C0A] focus:ring-1 focus:ring-[#CA3C0A]/20 transition-all shadow-2xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#66615C]">
                                                        Company Name <span className="text-[#CA3C0A]">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={customJob.company}
                                                        onChange={(e) => setCustomJob({ ...customJob, company: e.target.value })}
                                                        placeholder="e.g. Stripe, Google, Startup"
                                                        className="w-full h-10 px-3 text-xs rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] focus:outline-none focus:border-[#CA3C0A] focus:ring-1 focus:ring-[#CA3C0A]/20 transition-all shadow-2xs"
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
                                                        className="w-full h-10 px-3 text-xs rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] focus:outline-none focus:border-[#CA3C0A] focus:ring-1 focus:ring-[#CA3C0A]/20 transition-all shadow-2xs"
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
                                                        className="w-full h-10 px-3 text-xs rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] focus:outline-none focus:border-[#CA3C0A] focus:ring-1 focus:ring-[#CA3C0A]/20 transition-all shadow-2xs"
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
                                                    className="w-full h-10 px-3 text-xs rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] focus:outline-none focus:border-[#CA3C0A] focus:ring-1 focus:ring-[#CA3C0A]/20 transition-all shadow-2xs"
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
                                                    className="w-full text-xs p-3 rounded-[6px] bg-white border border-[#D8D4CC] text-[#171717] placeholder:text-[#99948E] resize-none focus:outline-none focus:border-[#CA3C0A] focus:ring-1 focus:ring-[#CA3C0A]/20 transition-all shadow-2xs"
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
                                                className="h-9 px-5 rounded-[6px] bg-[#CA3C0A] hover:bg-[#B73609] text-white text-xs font-bold transition-all border border-[#CA3C0A] cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.98] flex items-center gap-1.5"
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
    );
}

export default SavedJobs;
