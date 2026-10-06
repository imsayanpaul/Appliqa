import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiRefreshCw, FiArrowUpRight, FiArrowRight } from 'react-icons/fi';
import { getCareerPath } from '../services/api';
import { AddSkillTag, AddSkillHint } from '../lib/resumeSkills';
import { monthlyFromCTC } from '../lib/format';

function CareerPath({ user, resumeData }) {
    const navigate = useNavigate();
    const [pathData, setPathData] = useState(() => {
        try {
            const saved = localStorage.getItem('appliqa_career_path');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const currentRole = user?.preferences?.desiredRole || resumeData?.suggestedRoles?.[0];

    const fetchCareerPath = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getCareerPath({ resumeData, preferences: user?.preferences });
            const data = res.data.careerPath;
            setPathData(data);
            try { localStorage.setItem('appliqa_career_path', JSON.stringify(data)); } catch { }
        } catch (err) {
            console.error('Career path failed:', err);
            setError('We couldn’t build your career path just now. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!pathData && (currentRole || resumeData?.skills?.length > 0)) {
            fetchCareerPath();
        }
    }, []);

    // ---- No role or resume yet ----
    if (!currentRole && !resumeData?.skills?.length) {
        return (
            <div className="bg-[#F7F5F2] text-[#171717] min-h-[calc(100vh-64px)]">
                <section className="ds-frame ds-rule-b">
                    <div className="ds-rule-b px-6 sm:px-8 h-14 flex items-center">
                        <span className="ds-mono">career path</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        <div className="lg:col-span-7 ds-cell !py-14 sm:!py-20 border-0 lg:border-r border-[#D8D4CC]">
                            <h1 className="ds-slash m-0" style={{ fontSize: 'clamp(44px, 6vw, 88px)' }}>career-path</h1>
                            <p className="ds-lede mt-6 mb-0 max-w-xl">
                                Add your resume or a target role, and we’ll map the roles you could move into next, what they pay, and the skills that get you there.
                            </p>
                        </div>
                        <div className="lg:col-span-5 flex flex-col border-0 border-t lg:border-t-0 border-[#D8D4CC]">
                            <ol className="list-none m-0 p-0 flex-1">
                                {['Next roles ranked by how ready you are', 'Typical salary for each step', 'The skills to learn for each move'].map((t, i) => (
                                    <li key={t} className="px-6 sm:px-8 py-5 border-0 border-b border-[#D8D4CC] flex gap-4">
                                        <span className="ds-mono text-[#CA3C0A] pt-0.5">0{i + 1}</span>
                                        <span className="text-[16px]">{t}</span>
                                    </li>
                                ))}
                            </ol>
                            <button type="button" onClick={() => navigate('/profile')} className="ds-btn ds-btn-accent !min-h-[72px] !px-6 sm:!px-8">
                                Add resume or role <FiArrowUpRight size={18} className="ds-btn-arrow" />
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    const role = pathData?.currentRole || currentRole;

    return (
        <div className="bg-[#F7F5F2] text-[#171717] min-h-[calc(100vh-64px)] pb-24">
            <section className="ds-frame ds-rule-b">
                <div className="ds-rule-b flex items-stretch justify-between">
                    <span className="ds-mono self-center px-6 sm:px-8 truncate">career path / {(role || '').toLowerCase()}</span>
                    {pathData && (
                        <button
                            type="button"
                            onClick={fetchCareerPath}
                            disabled={loading}
                            className="ds-btn !min-h-14 !px-5 sm:!px-6 !text-[14px] bg-transparent text-[#171717] hover:bg-white border-0 border-l border-[#D8D4CC] shrink-0"
                        >
                            {loading ? 'Rebuilding…' : 'Rebuild'}
                            <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-7 ds-cell !py-12 sm:!py-16 border-0 lg:border-r border-[#D8D4CC]">
                        <h1 className="ds-slash m-0" style={{ fontSize: 'clamp(44px, 6vw, 88px)' }}>career-path</h1>
                        <p className="ds-body mt-5 mb-0 max-w-lg">Roles you could move into next, ranked by how much of the skill set you already have.</p>
                    </div>
                    <div className="lg:col-span-5 ds-cell !py-12 sm:!py-16 border-0 border-t lg:border-t-0 border-[#D8D4CC] bg-white">
                        <p className="ds-mono ds-mono-muted m-0 mb-3 flex items-center gap-2"><span className="ds-square" /> you are here</p>
                        <p className="m-0 text-[28px] sm:text-[34px] font-semibold tracking-[-0.025em] leading-tight">{role}</p>
                        {pathData?.currentLevel && <p className="ds-mono ds-mono-muted mt-2 mb-0">{pathData.currentLevel.toLowerCase()} level</p>}
                        {resumeData?.skills?.length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2">
                                {resumeData.skills.slice(0, 10).map((skill) => <span key={skill} className="ds-tag !font-sans !text-[13px]">{skill}</span>)}
                                {resumeData.skills.length > 10 && <span className="ds-mono ds-mono-muted self-center">+{resumeData.skills.length - 10} more</span>}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {loading && !pathData?.paths?.length ? (
                <section className="ds-frame ds-rule-b" aria-busy="true">
                    <div className="ds-gridlines grid-cols-1 md:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="p-6 min-h-[360px] flex flex-col gap-4 animate-pulse">
                                <div className="h-3 w-1/3 bg-[#EFECE6]" />
                                <div className="h-5 w-4/5 bg-[#E7E3DC]" />
                                <div className="h-12 w-1/3 bg-[#E7E3DC] mt-4" />
                                <div className="h-1.5 w-full bg-[#EFECE6]" />
                                <div className="h-3 w-full bg-[#EFECE6] mt-4" />
                                <div className="h-3 w-2/3 bg-[#EFECE6]" />
                            </div>
                        ))}
                    </div>
                </section>
            ) : error ? (
                <section className="ds-frame ds-rule-b">
                    <div className="ds-cell !py-16 text-center">
                        <p role="alert" className="m-0 text-[18px] font-medium">{error}</p>
                        <button type="button" onClick={fetchCareerPath} className="ds-btn ds-btn-accent mt-6">
                            Try again <FiRefreshCw size={16} />
                        </button>
                    </div>
                </section>
            ) : pathData ? (
                <>
                    <section className="ds-frame ds-rule-b" aria-labelledby="next-heading">
                        <div className="ds-cell ds-rule-b flex flex-wrap items-end justify-between gap-4 !pt-14">
                            <h2 id="next-heading" className="ds-slash m-0">next-roles</h2>
                            <p className="ds-mono ds-mono-muted m-0">ranked by readiness</p>
                        </div>
                        <ol className="ds-gridlines grid-cols-1 md:grid-cols-2 xl:grid-cols-4 list-none m-0 p-0">
                            {pathData.paths?.map((path, i) => {
                                const pct = Math.min(100, Math.max(0, Number(path.match_percent) || 0));
                                return (
                                    <li key={i} className="flex flex-col">
                                        <div className="px-6 pt-6 pb-5 flex flex-col flex-1">
                                            <p className="ds-mono ds-mono-muted m-0">
                                                <span className="text-[#CA3C0A]">{String(i + 1).padStart(2, '0')}</span>
                                                {path.level ? ` · ${path.level.toLowerCase()}` : ''}
                                            </p>
                                            <h3 className="m-0 mt-4 text-[22px] font-semibold tracking-[-0.02em] leading-tight min-h-[56px]">{path.title}</h3>

                                            <p className="m-0 mt-4 flex items-baseline gap-2">
                                                <span className="text-[48px] font-semibold tracking-[-0.04em] leading-none">{pct}</span>
                                                <span className="ds-mono ds-mono-muted">% ready</span>
                                            </p>
                                            <div className="mt-3 h-1.5 bg-[#EFECE6]">
                                                <div className="h-full bg-[#CA3C0A] report-bar" style={{ width: `${pct}%`, animationDelay: `${0.1 * i}s` }} />
                                            </div>

                                            {path.description && <p className="m-0 mt-5 text-[15px] leading-relaxed text-[#4A4540]">{path.description}</p>}

                                            {(path.timeline || path.salary_range) && (
                                                <dl className="m-0 mt-5 grid grid-cols-2 gap-3">
                                                    {path.timeline && (
                                                        <div>
                                                            <dt className="ds-mono ds-mono-muted">timeline</dt>
                                                            <dd className="m-0 mt-1 text-[15px] font-medium">{path.timeline}</dd>
                                                        </div>
                                                    )}
                                                    {path.salary_range && (() => {
                                                        const monthly = monthlyFromCTC(path.salary_range);
                                                        const tipId = `ctc-tip-${i}`;
                                                        return (
                                                            <div>
                                                                <dt className="ds-mono ds-mono-muted">ctc · per year</dt>
                                                                <dd className="m-0 mt-1 text-[15px] font-medium">
                                                                    {monthly ? (
                                                                        <span
                                                                            tabIndex={0}
                                                                            aria-describedby={tipId}
                                                                            className="group relative inline-block cursor-help border-0 border-b border-dashed border-[#8A8580] outline-none focus-visible:border-[#CA3C0A]"
                                                                        >
                                                                            {path.salary_range}
                                                                            <span
                                                                                id={tipId}
                                                                                role="tooltip"
                                                                                className="pointer-events-none absolute left-0 bottom-full mb-2 z-20 w-max max-w-[240px] bg-[#171717] text-white px-3 py-2 opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus:opacity-100 group-focus:translate-y-0"
                                                                            >
                                                                                <span className="ds-mono !text-white/60 block">approx. monthly</span>
                                                                                <span className="block mt-0.5 text-[15px] font-semibold">{monthly}</span>
                                                                                <span className="block mt-0.5 text-[12px] text-white/60">gross, before tax and deductions</span>
                                                                            </span>
                                                                        </span>
                                                                    ) : path.salary_range}
                                                                </dd>
                                                            </div>
                                                        );
                                                    })()}
                                                </dl>
                                            )}

                                            {path.skills_have?.length > 0 && (
                                                <div className="mt-5">
                                                    <p className="ds-mono ds-mono-muted m-0 mb-2">you have</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {path.skills_have.map((s, j) => <span key={j} className="ds-tag">{s}</span>)}
                                                    </div>
                                                </div>
                                            )}
                                            {path.skills_needed?.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="ds-mono ds-mono-muted m-0 mb-2">to learn<AddSkillHint /></p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {path.skills_needed.map((s, j) => <AddSkillTag key={j} skill={s} />)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/search?query=${encodeURIComponent(path.title)}`)}
                                            className="ds-btn w-full !min-h-[56px] !px-6 bg-transparent text-[#171717] hover:bg-white border-0 border-t border-[#D8D4CC]"
                                        >
                                            See {path.title} jobs <FiArrowUpRight size={16} className="ds-btn-arrow shrink-0" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>
                    </section>

                    {pathData.advice && (
                        <section className="ds-frame ds-rule-b grid grid-cols-1 lg:grid-cols-12">
                            <div className="lg:col-span-4 ds-cell border-0 lg:border-r border-[#D8D4CC]">
                                <h2 className="ds-slash m-0" style={{ fontSize: 'clamp(30px, 3.4vw, 48px)' }}>advice</h2>
                            </div>
                            <div className="lg:col-span-8 ds-cell">
                                <p className="ds-lede m-0 max-w-3xl">{pathData.advice}</p>
                                <button type="button" onClick={() => navigate('/advisor')} className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-[#171717] hover:text-[#CA3C0A] bg-transparent border-none cursor-pointer p-0">
                                    Talk it through with the advisor <FiArrowRight size={16} />
                                </button>
                            </div>
                        </section>
                    )}
                </>
            ) : null}
        </div>
    );
}

export default CareerPath;
