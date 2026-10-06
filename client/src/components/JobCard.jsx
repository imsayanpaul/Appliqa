import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBookmark, FiArrowUpRight } from 'react-icons/fi';
import { saveJob, deleteSavedJob, getSavedJobs } from '../services/api';
import { formatSalary } from '../lib/format';

const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (Number.isNaN(days)) return '';
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
};

const snippet = (html, max = 170) => {
    const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

function CompanyMark({ logo, company }) {
    const [failed, setFailed] = useState(false);
    const initial = (company || '?').trim().charAt(0).toUpperCase();
    return (
        <div className="w-11 h-11 shrink-0 border border-[#D8D4CC] bg-white flex items-center justify-center overflow-hidden">
            {logo && !failed ? (
                <img
                    src={logo}
                    alt=""
                    width="44"
                    height="44"
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(true)}
                    className="w-full h-full object-contain p-1.5"
                />
            ) : (
                <span className="text-[15px] font-semibold text-[#171717]" aria-hidden="true">{initial}</span>
            )}
        </div>
    );
}

function JobCard({ job, user, onClick, initialSaved = false, initialSavedId = null, onToggleSave }) {
    const navigate = useNavigate();
    const [isSaved, setIsSaved] = useState(initialSaved);
    const [savedId, setSavedId] = useState(initialSavedId);
    const [saving, setSaving] = useState(false);

    useEffect(() => setIsSaved(initialSaved), [initialSaved]);
    useEffect(() => setSavedId(initialSavedId), [initialSavedId]);

    const handleSave = async (e) => {
        e.stopPropagation();
        if (!user) return navigate('/profile');
        if (saving) return;

        setSaving(true);
        try {
            if (isSaved) {
                let id = savedId;
                if (!id) {
                    const res = await getSavedJobs();
                    id = (res.data.jobs || []).find(sj => sj.jobId === job.id)?._id;
                }
                if (id) await deleteSavedJob(id);
                setIsSaved(false);
                setSavedId(null);
                onToggleSave?.(job.id, false, null);
            } else {
                const res = await saveJob(job);
                const dbId = res.data?.savedJob?.id;
                setIsSaved(true);
                setSavedId(dbId);
                onToggleSave?.(job.id, true, dbId);
            }
        } catch (err) {
            console.error('Toggle save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const salary = formatSalary(job.salary);
    const meta = [job.location, job.remote ? 'Remote' : null, job.employmentType?.toLowerCase().replace(/_/g, '-')].filter(Boolean);
    const posted = timeAgo(job.datePosted);

    return (
        <article className="group relative h-full flex flex-col bg-[#F7F5F2] hover:bg-white transition-colors duration-150 p-6">
            <div className="flex items-start gap-4">
                <CompanyMark logo={job.companyLogo} company={job.company} />
                <div className="flex-1 min-w-0">
                    <h3 className="m-0 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-[#171717]">
                        <button
                            type="button"
                            onClick={onClick}
                            className="text-left bg-transparent border-none p-0 cursor-pointer text-inherit line-clamp-2 group-hover:text-[#CA3C0A] after:absolute after:inset-0 after:content-['']"
                        >
                            {job.title}
                        </button>
                    </h3>
                    <p className="m-0 mt-1 text-[14px] text-[#4A4540] truncate">{job.company}</p>
                </div>
                <button
                    type="button"
                    className={`relative z-10 w-9 h-9 shrink-0 flex items-center justify-center border cursor-pointer transition-colors ${
                        isSaved ? 'bg-[#CA3C0A] border-[#CA3C0A] text-white' : 'bg-transparent border-[#D8D4CC] text-[#171717] hover:border-[#171717]'
                    }`}
                    onClick={handleSave}
                    disabled={saving}
                    aria-pressed={isSaved}
                    aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
                >
                    <FiBookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
            </div>

            {meta.length > 0 && (
                <p className="ds-mono ds-mono-muted mt-5 mb-0 truncate">{meta.join(' · ')}</p>
            )}

            {job.description && (
                <p className="mt-3 mb-0 text-[14px] leading-relaxed text-[#4A4540] line-clamp-2">{snippet(job.description)}</p>
            )}

            <div className="mt-auto pt-6 flex items-center justify-between gap-3">
                <span className="text-[14px] font-semibold text-[#171717] truncate">
                    {salary || <span className="ds-mono ds-mono-muted font-normal">salary not listed</span>}
                </span>
                <span className="ds-mono ds-mono-muted shrink-0 flex items-center gap-2">
                    {posted}
                    <FiArrowUpRight size={15} className="text-[#171717] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </span>
            </div>
        </article>
    );
}

export default JobCard;
