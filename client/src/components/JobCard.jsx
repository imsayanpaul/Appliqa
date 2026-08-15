import { useState, useEffect } from 'react';
import { FiMapPin, FiClock, FiBookmark, FiDollarSign, FiArrowRight, FiHome, FiBriefcase, FiCheckCircle } from 'react-icons/fi';
import { saveJob, deleteSavedJob, getSavedJobs } from '../services/api';
import { Card } from './ui/Card';

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

    const hasSalary = job.salary && job.salary !== 'Not specified';

    return (
        <div 
            onClick={onClick}
            className="group relative bg-white rounded-lg p-5 border border-[#D8D4CC] hover:border-[#171717] transition-all duration-200 cursor-pointer flex flex-col justify-between"
            style={{ width: '100%', boxSizing: 'border-box', boxShadow: 'none' }}
        >
            <div>
                {/* Header section: Logo, Title, and Bookmark */}
                <div className="flex gap-4 items-start justify-between w-full mb-3.5">
                    <div className="flex gap-3 items-start flex-1 min-w-0">
                        {/* Modern Logo container */}
                        <div className="w-11 h-11 rounded-md border border-[#E0DCD6] bg-[#F7F5F2] p-1.5 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-[#66615C] font-semibold truncate">
                                    {job.company}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded">
                                    <FiCheckCircle size={10} /> Verified
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bookmark Button */}
                    <button
                        className={`w-8 h-8 rounded-md border border-neutral-200 bg-[#F7F5F2] hover:bg-[#FFF0E8] cursor-pointer transition-all flex items-center justify-center flex-shrink-0 ${
                            isSaved ? 'text-[#F45B25] bg-[#FFF0E8] border-[#F45B25]/30' : 'text-[#8A8580] hover:text-[#F45B25]'
                        }`}
                        onClick={handleSave}
                        title={isSaved ? 'Saved' : 'Save job'}
                        style={{ boxShadow: 'none' }}
                    >
                        <FiBookmark size={14} fill={isSaved ? 'currentColor' : 'none'} className="transition-transform duration-200 active:scale-90" />
                    </button>
                </div>

                {/* Sleek Pill Badges Row */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3.5 select-none">
                    {job.location && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md bg-[#F7F5F2] text-[#171717] font-medium border border-neutral-200">
                            <FiMapPin size={11} className="text-[#8A8580]" /> {job.location}
                        </span>
                    )}
                    {job.remote && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md bg-[#FFF0E8] text-[#F45B25] font-bold border border-[rgba(244,91,37,0.2)]">
                            <FiHome size={11} /> Remote
                        </span>
                    )}
                    {job.employmentType && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md bg-[#F7F5F2] text-[#66615C] font-medium border border-neutral-200">
                            <FiBriefcase size={11} className="text-[#8A8580]" /> {job.employmentType}
                        </span>
                    )}
                    {hasSalary && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
                            <FiDollarSign size={11} /> {job.salary}
                        </span>
                    )}
                    {job.datePosted && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#8A8580] ml-auto font-medium">
                            <FiClock size={11} /> {timeAgo(job.datePosted)}
                        </span>
                    )}
                </div>

                {/* Clean 2-Line Description Snippet */}
                <p className="text-xs text-[#66615C] leading-relaxed line-clamp-2 overflow-hidden mb-5 font-normal">
                    {stripHtml(job.description)?.substring(0, 180)}...
                </p>
            </div>

            {/* Footer with Skills and Action */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between w-full select-none mt-auto">
                <div className="flex gap-1.5 items-center flex-1 min-w-0 mr-2">
                    {job.requiredSkills && job.requiredSkills.length > 0 ? (
                        <>
                            {job.requiredSkills.slice(0, 2).map((skill, i) => (
                                <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-md border border-[rgba(244,91,37,0.2)] bg-[#FFF0E8] text-[#171717] font-semibold truncate max-w-[110px]" title={skill}>
                                    {skill}
                                </span>
                            ))}
                            {job.requiredSkills.length > 2 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-100 text-[#66615C] font-bold flex-shrink-0">
                                    +{job.requiredSkills.length - 2}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F7F5F2] text-[#66615C] font-medium">
                            Full Tech Stack
                        </span>
                    )}
                </div>

                {/* Details Trigger Button */}
                <div className="text-xs text-[#171717] font-bold flex items-center gap-1 transition-all duration-200 group-hover:text-[#F45B25] group-hover:translate-x-0.5 ease-out">
                    <span>View Role</span>
                    <FiArrowRight size={13} className="text-[#F45B25]" />
                </div>
            </div>
        </div>
    );
}

export default JobCard;
