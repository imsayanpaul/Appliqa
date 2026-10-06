import { useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
import { newId } from '../../lib/resumeProfile';

const blankProject = () => ({ id: newId(), name: '', tech: [], description: '', liveUrl: '', repoUrl: '', startDate: '', endDate: '', current: false });

// Comma-separated tech list that keeps the trailing comma while typing
function TechInput({ value, onChange, id }) {
    const [draft, setDraft] = useState(() => value.join(', '));
    return (
        <input
            id={id}
            type="text"
            value={draft}
            onChange={(e) => {
                setDraft(e.target.value);
                onChange(e.target.value.split(',').map((t) => t.trim()).filter(Boolean));
            }}
            onBlur={() => setDraft(value.join(', '))}
            className="resume-input-field"
            placeholder="React, Node.js, PostgreSQL"
        />
    );
}

export function ProjectsEditor({ projects, onChange }) {
    const update = (id, patch) => onChange(projects.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const move = (i, to) => {
        if (to < 0 || to >= projects.length) return;
        const next = [...projects];
        const [item] = next.splice(i, 1);
        next.splice(to, 0, item);
        onChange(next);
    };

    return (
        <div className="space-y-4">
            {projects.length === 0 && (
                <p className="m-0 text-[14px] text-[#4A4540]">No projects yet. Add the ones that best show what you can build: a live link and the code make them far stronger.</p>
            )}

            {projects.map((p, i) => {
                const key = p.id || i;
                return (
                    <div key={key} className="bg-white border border-[#D8D4CC]">
                        <div className="flex items-stretch border-0 border-b border-[#D8D4CC]">
                            <span className="ds-mono self-center px-4 text-[#CA3C0A]">{String(i + 1).padStart(2, '0')}</span>
                            <span className="flex-1 min-w-0 self-center text-[15px] font-semibold text-[#171717] truncate">{p.name || 'Untitled project'}</span>
                            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move project up" className="w-10 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer hover:bg-[#F7F5F2] disabled:opacity-30 disabled:cursor-default">
                                <ChevronUp size={15} />
                            </button>
                            <button type="button" onClick={() => move(i, i + 1)} disabled={i === projects.length - 1} aria-label="Move project down" className="w-10 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer hover:bg-[#F7F5F2] disabled:opacity-30 disabled:cursor-default">
                                <ChevronDown size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => { if (!p.name || window.confirm(`Remove the project “${p.name}”?`)) onChange(projects.filter((x) => x.id !== p.id)); }}
                                aria-label={`Remove ${p.name || 'project'}`}
                                className="w-11 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#6F6A65] hover:text-[#B91C1C] hover:bg-[#FEF2F2]"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-4 grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="resume-input-label" htmlFor={`pj-name-${key}`}>Project name</label>
                                <input id={`pj-name-${key}`} type="text" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} className="resume-input-field" placeholder="e.g. Appliqa | AI career platform" />
                            </div>
                            <div className="col-span-2">
                                <label className="resume-input-label" htmlFor={`pj-tech-${key}`}>Tech used</label>
                                <TechInput id={`pj-tech-${key}`} value={p.tech || []} onChange={(tech) => update(p.id, { tech })} />
                            </div>
                            <div>
                                <label className="resume-input-label" htmlFor={`pj-start-${key}`}>Start</label>
                                <input id={`pj-start-${key}`} type="month" value={p.startDate || ''} onChange={(e) => update(p.id, { startDate: e.target.value })} className="resume-input-field" />
                            </div>
                            <div>
                                <label className="resume-input-label" htmlFor={`pj-end-${key}`}>End</label>
                                <input id={`pj-end-${key}`} type="month" value={p.current ? '' : (p.endDate || '')} disabled={p.current} onChange={(e) => update(p.id, { endDate: e.target.value })} className="resume-input-field disabled:opacity-50" />
                            </div>
                            <label className="col-span-2 inline-flex items-center gap-2 text-[14px] text-[#2A2622] cursor-pointer w-fit">
                                <input type="checkbox" checked={!!p.current} onChange={(e) => update(p.id, { current: e.target.checked })} className="w-4 h-4 accent-[#CA3C0A]" />
                                Still working on it
                            </label>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="resume-input-label" htmlFor={`pj-live-${key}`}>Live link</label>
                                <input id={`pj-live-${key}`} type="url" inputMode="url" value={p.liveUrl} onChange={(e) => update(p.id, { liveUrl: e.target.value })} className="resume-input-field" placeholder="https://myproject.com" />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="resume-input-label" htmlFor={`pj-repo-${key}`}>Code (GitHub)</label>
                                <input id={`pj-repo-${key}`} type="url" inputMode="url" value={p.repoUrl} onChange={(e) => update(p.id, { repoUrl: e.target.value })} className="resume-input-field" placeholder="https://github.com/you/project" />
                            </div>
                            <div className="col-span-2">
                                <label className="resume-input-label" htmlFor={`pj-desc-${key}`}>What you built</label>
                                <textarea
                                    id={`pj-desc-${key}`}
                                    rows={4}
                                    value={p.description}
                                    onChange={(e) => update(p.id, { description: e.target.value })}
                                    className="resume-input-field resize-y"
                                    placeholder={'- Built real-time job search with React and Express\n- Cut API calls by 90% with a two-level cache'}
                                />
                                <p className="ds-mono ds-mono-muted m-0 mt-1.5">start lines with "-" for bullets</p>
                            </div>
                        </div>
                    </div>
                );
            })}

            <button type="button" onClick={() => onChange([...projects, blankProject()])} className="ds-btn ds-btn-line w-full !min-h-12 !text-[14px]">
                Add project <Plus size={15} />
            </button>
        </div>
    );
}

export function AchievementsEditor({ achievements, onChange }) {
    const [draft, setDraft] = useState('');
    const add = (e) => {
        e.preventDefault();
        const v = draft.trim();
        if (v && !achievements.includes(v)) onChange([...achievements, v]);
        setDraft('');
    };
    return (
        <div className="space-y-4">
            <form onSubmit={add} className="flex gap-2">
                <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1 resume-input-field" placeholder="e.g. Winner, Smart India Hackathon 2024" aria-label="New achievement" />
                <button type="submit" className="resume-skill-add-btn" aria-label="Add achievement"><Plus size={15} /></button>
            </form>
            {achievements.length ? (
                <ol className="list-none m-0 p-0 border border-[#D8D4CC] bg-white">
                    {achievements.map((a, i) => (
                        <li key={i} className="flex items-stretch border-0 border-t first:border-t-0 border-[#D8D4CC]">
                            <span className="ds-mono self-center px-4 text-[#CA3C0A]">{String(i + 1).padStart(2, '0')}</span>
                            <input
                                type="text"
                                value={a}
                                onChange={(e) => onChange(achievements.map((x, j) => (j === i ? e.target.value : x)))}
                                onBlur={(e) => { if (!e.target.value.trim()) onChange(achievements.filter((_, j) => j !== i)); }}
                                aria-label={`Achievement ${i + 1}`}
                                className="flex-1 min-w-0 h-11 px-1 bg-transparent border-0 text-[14px] text-[#171717] outline-none focus:bg-[#F7F5F2]"
                            />
                            <button type="button" onClick={() => onChange(achievements.filter((_, j) => j !== i))} aria-label={`Remove achievement ${i + 1}`} className="w-11 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#6F6A65] hover:text-[#B91C1C] hover:bg-[#FEF2F2]">
                                <X size={14} />
                            </button>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="m-0 text-[14px] text-[#4A4540]">Awards, hackathon wins, rankings, scholarships: anything you can point to.</p>
            )}
        </div>
    );
}
