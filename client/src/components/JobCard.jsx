import { useState, useEffect } from 'react';
import { FiMapPin, FiClock, FiBookmark, FiDollarSign, FiArrowRight, FiHome } from 'react-icons/fi';
import { saveJob, deleteSavedJob, getSavedJobs } from '../services/api';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

function JobCard({ job, user, onClick, initialSaved = false, initialSavedId = null, onToggleSave }) {
    const [isSaved, setIsSaved] = useState(initialSaved);
    const [savedId, setSavedId] = useState(initialSavedId);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setIsSaved(initialSaved);
    }, [initialSaved]);

    useEffect(() => {
        setSavedId(initialSavedId);
    }, [initialSavedId]);

    const handleSave = async (e) => {
        e.stopPropagation();
        if (!user) {
            alert('Please set up your profile first to save jobs');
            return;
        }
        if (saving) return;

        setSaving(true);
        try {
            if (isSaved) {
                // Unsave
                if (savedId) {
                    await deleteSavedJob(savedId);
                    setIsSaved(false);
                    setSavedId(null);
                    if (onToggleSave) onToggleSave(job.id, false, null);
                } else {
                    const res = await getSavedJobs();
                    const matching = (res.data.jobs || []).find(sj => sj.jobId === job.id);
                    if (matching) {
                        await deleteSavedJob(matching._id);
                    }
                    setIsSaved(false);
                    setSavedId(null);
                    if (onToggleSave) onToggleSave(job.id, false, null);
                }
            } else {
                // Save
                const res = await saveJob(job);
                const dbId = res.data?.savedJob?.id;
                setIsSaved(true);
                setSavedId(dbId);
                if (onToggleSave) onToggleSave(job.id, true, dbId);
            }
        } catch (err) {
            console.error('Toggle save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        if (days < 30) return `${Math.floor(days / 7)}w ago`;
        return `${Math.floor(days / 30)}mo ago`;
    };

    const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    return (
        <Card 
            className="job-card group" 
            onClick={onClick}
            style={{
                minWidth: 0,
                maxWidth: '100%',
                boxSizing: 'border-box'
            }}
        >
            {/* Header section: Logo, Title, and Bookmark */}
            <div className="flex gap-4 items-start justify-between w-full mb-4">
                <div className="flex gap-4 items-start flex-1 min-w-0">
                    {/* Logo wrapper */}
                    <div className="w-12 h-12 rounded-xl border border-zinc-900/80 bg-zinc-950/40 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5">
                        {job.companyLogo ? (
                            <img src={job.companyLogo} alt="" className="w-full h-full object-contain object-center rounded-lg" />
                        ) : (
                            <span className="text-zinc-500 font-bold text-base select-none">
                                {(job.company || '?')[0].toUpperCase()}
                            </span>
                        )}
                    </div>
                    {/* Title & Company */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug group-hover:text-orange-500 transition-colors duration-200 pr-2 whitespace-normal line-clamp-2 break-words" title={job.title}>
                            {job.title}
                        </h3>
                        <p className="text-sm text-zinc-400 font-medium truncate mt-1">
                            {job.company}
                        </p>
                    </div>
                </div>

                {/* Minimal borderless save button */}
                <button
                    className={`p-1.5 rounded-lg border-0 bg-transparent cursor-pointer transition-colors outline-none focus:outline-none flex items-center justify-center flex-shrink-0 ${
                        isSaved ? 'text-orange-500' : 'text-zinc-600 hover:text-zinc-300'
                    }`}
                    onClick={handleSave}
                    title={isSaved ? 'Saved' : 'Save job'}
                >
                    <FiBookmark size={18} fill={isSaved ? 'currentColor' : 'none'} className="transition-transform duration-200 active:scale-95" />
                </button>
            </div>

            {/* Bullet-separated inline metadata row */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 mb-4 select-none">
                {job.location && (
                    <span className="flex items-center gap-1">
                        <FiMapPin size={11} className="text-zinc-500" /> {job.location}
                    </span>
                )}
                {job.location && (job.remote || job.employmentType || (job.salary && job.salary !== 'Not specified') || job.datePosted) && (
                    <span className="text-zinc-800">•</span>
                )}
                {job.remote && (
                    <span className="flex items-center gap-1 text-orange-500/90 font-semibold">
                        <FiHome size={11} /> Remote
                    </span>
                )}
                {job.remote && (job.employmentType || (job.salary && job.salary !== 'Not specified') || job.datePosted) && (
                    <span className="text-zinc-800">•</span>
                )}
                {job.employmentType && (
                    <span className="font-medium text-zinc-400">{job.employmentType}</span>
                )}
                {job.employmentType && ((job.salary && job.salary !== 'Not specified') || job.datePosted) && (
                    <span className="text-zinc-800">•</span>
                )}
                {job.salary && job.salary !== 'Not specified' && (
                    <span className="flex items-center gap-1 text-zinc-400">
                        <FiDollarSign size={11} className="text-zinc-500" /> {job.salary}
                    </span>
                )}
                {job.salary && job.salary !== 'Not specified' && job.datePosted && (
                    <span className="text-zinc-800">•</span>
                )}
                {job.datePosted && (
                    <span className="flex items-center gap-1">
                        <FiClock size={11} className="text-zinc-500" /> {timeAgo(job.datePosted)}
                    </span>
                )}
            </div>

            {/* Job description */}
            <div className="text-xs text-zinc-400/80 leading-relaxed line-clamp-2 overflow-hidden mb-5">
                {stripHtml(job.description)?.substring(0, 200)}
            </div>

            {/* Footer with clean bottom border and skills tokens */}
            <div className="pt-4 mt-auto border-t border-zinc-900/60 flex items-center justify-between w-full select-none">
                <div className="flex gap-1.5 items-center flex-1 min-w-0 mr-2">
                    {job.requiredSkills?.slice(0, 2).map((skill, i) => (
                        <span key={i} className="text-[10.5px] px-2 py-0.5 rounded-full border border-zinc-900/80 bg-zinc-950/40 text-zinc-400 font-medium truncate max-w-[100px]" title={skill}>
                            {skill}
                        </span>
                    ))}
                    {job.requiredSkills?.length > 2 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-900/40 text-zinc-500 font-bold flex-shrink-0">
                            +{job.requiredSkills.length - 2}
                        </span>
                    )}
                </div>
                {/* Details link with micro-interactive arrow */}
                <div className="text-xs text-white/90 font-medium flex items-center gap-1 transition-opacity duration-200 hover:text-orange-500 group-hover:translate-x-0.5 ease-out duration-300">
                    <span>Details</span>
                    <FiArrowRight size={13} className="text-zinc-500 group-hover:text-orange-500 transition-colors" />
                </div>
            </div>
        </Card>
    );
}

export default JobCard;
