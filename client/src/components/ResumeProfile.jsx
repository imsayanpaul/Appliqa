import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowUp, ArrowDown, Copy, Check, Plus, Trash2, Pencil, X, Globe, Link2 } from 'lucide-react';
import { FiGithub } from 'react-icons/fi';
import {
    normalizeProfile, formatRange, formatMonth, formatScore,
    safeUrl, newId, EXPERIENCE_TYPES, EDUCATION_LEVELS, SCORE_TYPES,
    LANGUAGE_LEVELS, parseLanguage, formatLanguage,
} from '../lib/resumeProfile';

// ---------------------------------------------------------------------------
// Small form primitives (styled by the design system)
// ---------------------------------------------------------------------------

function Field({ label, hint, children, span }) {
    return (
        <label className={`block ${span ? 'sm:col-span-2' : ''}`}>
            <span className="ds-label">{label}</span>
            {children}
            {hint && <span className="ds-mono ds-mono-muted block mt-1.5">{hint}</span>}
        </label>
    );
}

const inputCls = 'resume-input-field';

function TextInput({ value, onChange, ...rest }) {
    return <input type="text" className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

function MonthInput({ value, onChange, disabled }) {
    return <input type="month" className={inputCls} value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
}

function Select({ value, onChange, options }) {
    return (
        <select className="ds-select w-full !h-[46px] !bg-white" value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
        </select>
    );
}

function Checkbox({ checked, onChange, label }) {
    return (
        <label className="inline-flex items-center gap-2.5 cursor-pointer text-[15px] select-none">
            <input type="checkbox" className="w-4 h-4 accent-[#CA3C0A]" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );
}

function TagEditor({ values, onChange, placeholder }) {
    const [input, setInput] = useState('');
    const add = () => {
        const next = input.split(',').map((s) => s.trim()).filter((s) => s && !values.includes(s));
        if (next.length) onChange([...values, ...next]);
        setInput('');
    };
    return (
        <div className="skills-container flex flex-wrap items-center gap-1.5 !p-2">
            {values.map((v) => (
                <span key={v} className="skill-badge inline-flex items-center gap-1.5">
                    {v}
                    <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="bg-transparent border-0 p-0 cursor-pointer text-[#6F6A65] hover:text-[#171717] inline-flex">
                        <X size={12} />
                    </button>
                </span>
            ))}
            <input
                type="text"
                value={input}
                onChange={(e) => {
                    // Commas commit tags even when no key event fires (paste, mobile keyboards)
                    const v = e.target.value;
                    if (!v.includes(',')) return setInput(v);
                    const parts = v.split(',');
                    const rest = parts.pop();
                    const next = parts.map((s) => s.trim()).filter((s) => s && !values.includes(s));
                    if (next.length) onChange([...values, ...new Set(next)]);
                    setInput(rest);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
                    else if (e.key === 'Backspace' && !input && values.length) onChange(values.slice(0, -1));
                }}
                onBlur={add}
                placeholder={values.length ? 'Add more…' : placeholder}
                className="flex-1 min-w-[140px] h-8 px-1 bg-transparent border-0 outline-none text-[15px]"
            />
        </div>
    );
}

function ExternalLink({ href, icon: Icon, children }) {
    const url = safeUrl(href);
    if (!url) return null;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#171717] hover:text-[#CA3C0A] no-underline">
            <Icon size={14} /> {children} <ArrowUpRight size={13} />
        </a>
    );
}

// Reorder / remove controls for an entry being edited
function EntryControls({ index, count, onMove, onRemove, label }) {
    const btn = 'w-9 h-9 inline-flex items-center justify-center bg-white border border-[#D8D4CC] hover:border-[#171717] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';
    return (
        <div className="flex">
            <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={`Move ${label} up`}><ArrowUp size={14} /></button>
            <button type="button" className={`${btn} border-l-0`} disabled={index === count - 1} onClick={() => onMove(index, 1)} aria-label={`Move ${label} down`}><ArrowDown size={14} /></button>
            <button type="button" className={`${btn} border-l-0 hover:!border-[#B91C1C] hover:text-[#B91C1C]`} onClick={() => onRemove(index)} aria-label={`Remove ${label}`}><Trash2 size={14} /></button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Entry factories
// ---------------------------------------------------------------------------

const blank = {
    experience: () => ({ id: newId(), role: '', company: '', type: 'Internship', location: '', startDate: '', endDate: '', current: false, bullets: [] }),
    projects: () => ({ id: newId(), name: '', description: '', tech: [], liveUrl: '', repoUrl: '', startDate: '', endDate: '', current: false }),
    education: () => ({ id: newId(), level: 'degree', degree: '', field: '', school: '', board: '', startDate: '', endDate: '', current: false, scoreType: 'cgpa', score: '', scoreMax: '' }),
    certifications: () => ({ id: newId(), name: '', provider: '', issueDate: '', credentialId: '', credentialUrl: '' }),
    languages: () => ({ id: newId(), name: '', level: 'Fluent' }),
};

const SECTION_LABELS = {
    summary: 'summary',
    experience: 'experience',
    projects: 'projects',
    education: 'education',
    certifications: 'certifications',
    achievements: 'achievements',
    skills: 'skills',
    languages: 'languages',
};

// Section shell: view mode with Edit/Add, or the editor with Save/Cancel
function Section({ id, count, canAdd, children, editor, className = '', actions, ctx }) {
    const { editing, saving, error, startEdit, cancel, save } = ctx;
    const isEditing = editing === id;
    const busy = editing && !isEditing;
    return (
        <section className={`border-0 border-b border-[#D8D4CC] ${isEditing ? 'bg-white' : ''} ${className}`} aria-labelledby={`rp-${id}`}>
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-2">
                <h3 id={`rp-${id}`} className="ds-mono ds-mono-muted m-0">
                    {SECTION_LABELS[id]}{typeof count === 'number' ? ` · ${count}` : ''}
                </h3>
                {!isEditing && (
                    <div className="flex">
                        {actions}
                        {canAdd && (
                            <button type="button" disabled={busy} onClick={() => startEdit(id, true)} className="h-8 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium bg-transparent border border-[#D8D4CC] hover:border-[#171717] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                                <Plus size={13} /> Add
                            </button>
                        )}
                        <button type="button" disabled={busy} onClick={() => startEdit(id)} className={`h-8 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium bg-transparent border border-[#D8D4CC] hover:border-[#171717] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${canAdd || actions ? 'border-l-0' : ''}`}>
                            <Pencil size={13} /> Edit
                        </button>
                    </div>
                )}
            </div>
            <div className="px-5 sm:px-6 pb-5">
                {isEditing ? (
                    <div>
                        {typeof editor === 'function' ? editor() : editor}
                        {error && <p role="alert" className="m-0 mt-4 text-[14px] text-[#991B1B]">{error}</p>}
                        <div className="mt-5 grid grid-cols-2 border border-[#D8D4CC]">
                            <button type="button" onClick={cancel} disabled={saving} className="ds-btn !min-h-[48px] bg-transparent text-[#171717] hover:bg-[#F7F5F2]">
                                Cancel <X size={16} />
                            </button>
                            <button type="button" onClick={save} disabled={saving} className="ds-btn ds-btn-accent !min-h-[48px]">
                                {saving ? 'Saving…' : 'Save'} <Check size={16} />
                            </button>
                        </div>
                    </div>
                ) : children}
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ResumeProfile({ source, onSave, title, embedded = false, suggestedRoles = [], onFindJobs, onSearchRole }) {
    const [profile, setProfile] = useState(() => normalizeProfile(source));
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [savedAt, setSavedAt] = useState(null);
    const [copied, setCopied] = useState(false);

    // Follow the source when it changes (new upload, or saved elsewhere) unless mid-edit
    useEffect(() => {
        if (!editing) setProfile(normalizeProfile(source));
    }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

    const startEdit = (section, addNew = false) => {
        const current = profile[section];
        let value = Array.isArray(current) ? current.map((x) => (typeof x === 'object' ? { ...x, ...(x.bullets ? { bullets: [...x.bullets] } : {}), ...(x.tech ? { tech: [...x.tech] } : {}) } : x)) : current;
        if (section === 'languages') value = value.map((l) => ({ id: newId(), ...parseLanguage(l) }));
        if (addNew && blank[section]) value = [...value, blank[section]()];
        setDraft(value);
        setEditing(section);
        setError('');
    };

    const cancel = () => { setEditing(null); setDraft(null); setError(''); };

    const clean = (section, value) => {
        switch (section) {
            case 'experience': return value.filter((e) => e.role.trim() || e.company.trim()).map((e) => ({ ...e, bullets: e.bullets.map((b) => b.trim()).filter(Boolean), endDate: e.current ? '' : e.endDate }));
            case 'projects': return value.filter((p) => p.name.trim());
            case 'education': return value.filter((e) => e.degree.trim() || e.school.trim());
            case 'certifications': return value.filter((c) => c.name.trim());
            case 'achievements': return value.map((a) => a.trim()).filter(Boolean);
            case 'languages': return [...new Set(value.map(formatLanguage).filter(Boolean))];
            case 'summary': return value.trim();
            default: return value;
        }
    };

    const save = async () => {
        const next = { ...profile, [editing]: clean(editing, draft) };
        // Light validation for links and scores
        if (editing === 'projects') {
            const bad = next.projects.find((p) => (p.liveUrl && !safeUrl(p.liveUrl)) || (p.repoUrl && !safeUrl(p.repoUrl)));
            if (bad) return setError(`Check the links for “${bad.name}”. They should look like https://example.com`);
        }
        if (editing === 'education') {
            const bad = next.education.find((e) => {
                if (!e.score) return false;
                const n = Number(e.score);
                const max = Number(e.scoreMax) || SCORE_TYPES.find((t) => t.value === e.scoreType)?.max || 100;
                return Number.isNaN(n) || n < 0 || n > max;
            });
            if (bad) return setError(`The score for “${bad.degree || bad.school}” should be a number between 0 and its maximum.`);
        }

        setSaving(true);
        setError('');
        try {
            await onSave(next);
            setProfile(next);
            setEditing(null);
            setDraft(null);
            setSavedAt(Date.now());
        } catch (err) {
            console.error('Saving resume profile failed:', err);
            setError('Couldn’t save just now. Check your connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    // Draft helpers for list sections
    const updateItem = (index, patch) => setDraft((d) => d.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    const moveItem = (index, dir) => setDraft((d) => {
        const copy = [...d];
        const [item] = copy.splice(index, 1);
        copy.splice(index + dir, 0, item);
        return copy;
    });
    const removeItem = (index) => setDraft((d) => d.filter((_, i) => i !== index));
    const addItem = (section) => setDraft((d) => [...d, blank[section]()]);

    const handleCopySummary = () => {
        navigator.clipboard.writeText(profile.summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        if (!savedAt) return;
        const t = setTimeout(() => setSavedAt(null), 2500);
        return () => clearTimeout(t);
    }, [savedAt]);

    const ctx = { editing, saving, error, startEdit, cancel, save };

    const empty = (text) => <p className="m-0 text-[15px] text-[#6F6A65]">{text}</p>;
    const addAnother = (section, label) => (
        <button type="button" onClick={() => addItem(section)} className="resume-add-entry-btn w-full mt-3 inline-flex items-center justify-center gap-2 cursor-pointer">
            <Plus size={15} /> {label}
        </button>
    );
    const entryBox = 'border border-[#D8D4CC] bg-[#F7F5F2] p-4 sm:p-5';

    // =======================================================================
    return (
        <div className={embedded ? 'bg-[#F7F5F2]' : 'mt-10 border border-[#D8D4CC] bg-[#F7F5F2]'}>
            {/* Header */}
            <div className="flex items-stretch justify-between border-0 border-b border-[#D8D4CC] min-h-14">
                <span className="ds-mono self-center px-5 sm:px-6 py-3 truncate flex items-center gap-2" aria-live="polite">
                    {savedAt ? <><span className="ds-square" /> saved</> : (title || 'your resume')}
                </span>
                <button type="button" onClick={onFindJobs} className="ds-btn ds-btn-accent shrink-0 !min-h-14 !px-5 sm:!px-6 !text-[14px]">
                    Find matching jobs <ArrowUpRight size={16} className="ds-btn-arrow" />
                </button>
            </div>

            {/* Summary */}
            <Section
                ctx={ctx}
                id="summary"
                className="bg-white"
                actions={profile.summary && (
                    <button type="button" onClick={handleCopySummary} className="h-8 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium bg-transparent border border-[#D8D4CC] hover:border-[#171717] cursor-pointer">
                        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                )}
                editor={() => (
                    <Field label="professional summary" hint={`${(draft || '').length} characters · 2–4 sentences works best`}>
                        <textarea className={`${inputCls} resize-y`} rows={5} value={draft || ''} onChange={(e) => setDraft(e.target.value)} placeholder="Who you are, what you’re good at, and what you’re looking for." />
                    </Field>
                )}
            >
                {profile.summary
                    ? <p className="m-0 text-[17px] sm:text-[19px] leading-relaxed text-[#171717] max-w-4xl">{profile.summary}</p>
                    : empty('No summary yet. Add two or three sentences about you.')}
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-7 border-0 lg:border-r border-[#D8D4CC]">
                    {/* Experience */}
                    <Section
                        ctx={ctx}
                        id="experience"
                        count={profile.experience.length}
                        canAdd
                        editor={() => (
                            <div className="space-y-3">
                                {(draft || []).map((e, i) => (
                                    <div key={e.id} className={entryBox}>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="ds-mono text-[#CA3C0A]">{String(i + 1).padStart(2, '0')}</span>
                                            <EntryControls index={i} count={draft.length} onMove={moveItem} onRemove={removeItem} label={e.role || 'entry'} />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Field label="role / title"><TextInput value={e.role} onChange={(v) => updateItem(i, { role: v })} placeholder="e.g. Software Engineering Intern" /></Field>
                                            <Field label="company / organisation"><TextInput value={e.company} onChange={(v) => updateItem(i, { company: v })} placeholder="e.g. Acme Labs" /></Field>
                                            <Field label="type"><Select value={e.type} onChange={(v) => updateItem(i, { type: v })} options={EXPERIENCE_TYPES} /></Field>
                                            <Field label="location"><TextInput value={e.location} onChange={(v) => updateItem(i, { location: v })} placeholder="e.g. Kolkata · Remote" /></Field>
                                            <Field label="start"><MonthInput value={e.startDate} onChange={(v) => updateItem(i, { startDate: v })} /></Field>
                                            <Field label="end"><MonthInput value={e.endDate} onChange={(v) => updateItem(i, { endDate: v })} disabled={e.current} /></Field>
                                            <div className="sm:col-span-2"><Checkbox checked={e.current} onChange={(v) => updateItem(i, { current: v })} label="I currently work here" /></div>
                                            <Field span label="what you did" hint="one point per line · start with a verb and add a number where you can">
                                                <textarea
                                                    className={`${inputCls} resize-y`}
                                                    rows={4}
                                                    value={e.bullets.join('\n')}
                                                    onChange={(ev) => updateItem(i, { bullets: ev.target.value.split('\n') })}
                                                    placeholder={'Built an internal dashboard used by 40 analysts\nCut API response time by 35% with caching'}
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                ))}
                                {addAnother('experience', 'Add job or internship')}
                            </div>
                        )}
                    >
                        {profile.experience.length ? (
                            <ul className="list-none m-0 p-0">
                                {profile.experience.map((e) => (
                                    <li key={e.id} className="py-3.5 border-0 border-t border-[#D8D4CC] first:border-t-0">
                                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                            <span className="text-[16px] font-semibold text-[#171717]">
                                                {e.role}
                                                {e.type && <span className="ds-mono ds-mono-muted font-normal ml-2">{e.type.toLowerCase()}</span>}
                                            </span>
                                            <span className="ds-mono ds-mono-muted shrink-0">{formatRange(e.startDate, e.endDate, e.current).toLowerCase()}</span>
                                        </div>
                                        <p className="m-0 mt-0.5 text-[14px] text-[#4A4540]">{[e.company, e.location].filter(Boolean).join(' · ')}</p>
                                        {e.bullets.length > 0 && <ul className="ds-list mt-2">{e.bullets.map((b, j) => <li key={j} className="!text-[14px] !py-1.5">{b}</li>)}</ul>}
                                    </li>
                                ))}
                            </ul>
                        ) : empty('No experience yet. Add jobs, internships or freelance work.')}
                    </Section>

                    {/* Projects */}
                    <Section
                        ctx={ctx}
                        id="projects"
                        count={profile.projects.length}
                        canAdd
                        editor={() => (
                            <div className="space-y-3">
                                {(draft || []).map((p, i) => (
                                    <div key={p.id} className={entryBox}>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="ds-mono text-[#CA3C0A]">{String(i + 1).padStart(2, '0')}</span>
                                            <EntryControls index={i} count={draft.length} onMove={moveItem} onRemove={removeItem} label={p.name || 'project'} />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Field span label="project name"><TextInput value={p.name} onChange={(v) => updateItem(i, { name: v })} placeholder="e.g. Appliqa: AI job search" /></Field>
                                            <Field span label="what it does and your part">
                                                <textarea className={`${inputCls} resize-y`} rows={3} value={p.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="The problem it solves, what you built, and any results." />
                                            </Field>
                                            <Field span label="tech used" hint="press enter or comma after each">
                                                <TagEditor values={p.tech} onChange={(v) => updateItem(i, { tech: v })} placeholder="React, Node.js, PostgreSQL" />
                                            </Field>
                                            <Field label="live link"><TextInput value={p.liveUrl} onChange={(v) => updateItem(i, { liveUrl: v })} placeholder="https://myproject.com" inputMode="url" /></Field>
                                            <Field label="github / source link"><TextInput value={p.repoUrl} onChange={(v) => updateItem(i, { repoUrl: v })} placeholder="https://github.com/you/repo" inputMode="url" /></Field>
                                            <Field label="start (optional)"><MonthInput value={p.startDate} onChange={(v) => updateItem(i, { startDate: v })} /></Field>
                                            <Field label="end (optional)"><MonthInput value={p.endDate} onChange={(v) => updateItem(i, { endDate: v })} disabled={p.current} /></Field>
                                            <div className="sm:col-span-2"><Checkbox checked={p.current} onChange={(v) => updateItem(i, { current: v })} label="Still working on this" /></div>
                                        </div>
                                    </div>
                                ))}
                                {addAnother('projects', 'Add project')}
                            </div>
                        )}
                    >
                        {profile.projects.length ? (
                            <ul className="list-none m-0 p-0">
                                {profile.projects.map((p) => (
                                    <li key={p.id} className="py-3.5 border-0 border-t border-[#D8D4CC] first:border-t-0">
                                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                            <span className="text-[16px] font-semibold text-[#171717]">{p.name}</span>
                                            {(p.startDate || p.current) && <span className="ds-mono ds-mono-muted shrink-0">{formatRange(p.startDate, p.endDate, p.current, 'Ongoing').toLowerCase()}</span>}
                                        </div>
                                        {p.description && <p className="m-0 mt-1 text-[14px] leading-relaxed text-[#4A4540]">{p.description}</p>}
                                        {p.tech.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{p.tech.map((t) => <span key={t} className="ds-tag !h-6 !text-[11px]">{t}</span>)}</div>}
                                        {(safeUrl(p.liveUrl) || safeUrl(p.repoUrl)) && (
                                            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
                                                <ExternalLink href={p.liveUrl} icon={Globe}>Live</ExternalLink>
                                                <ExternalLink href={p.repoUrl} icon={FiGithub}>Source</ExternalLink>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : empty('No projects yet. Projects with live and GitHub links stand out, especially early in your career.')}
                    </Section>

                    {/* Education */}
                    <Section
                        ctx={ctx}
                        id="education"
                        count={profile.education.length}
                        canAdd
                        editor={() => (
                            <div className="space-y-3">
                                {(draft || []).map((e, i) => {
                                    const isSchool = e.level === 'class10' || e.level === 'class12';
                                    const scoreType = SCORE_TYPES.find((t) => t.value === e.scoreType);
                                    return (
                                        <div key={e.id} className={entryBox}>
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="ds-mono text-[#CA3C0A]">{String(i + 1).padStart(2, '0')}</span>
                                                <EntryControls index={i} count={draft.length} onMove={moveItem} onRemove={removeItem} label={e.degree || 'entry'} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <Field span label="level">
                                                    <Select
                                                        value={e.level}
                                                        onChange={(v) => updateItem(i, { level: v, ...(v === 'class10' || v === 'class12' ? { scoreType: 'percentage' } : {}) })}
                                                        options={EDUCATION_LEVELS}
                                                    />
                                                </Field>
                                                <Field label={isSchool ? 'qualification' : 'degree'}>
                                                    <TextInput value={e.degree} onChange={(v) => updateItem(i, { degree: v })} placeholder={isSchool ? (e.level === 'class10' ? 'e.g. Secondary (Class 10)' : 'e.g. Higher Secondary (Class 12)') : 'e.g. Bachelor of Computer Applications'} />
                                                </Field>
                                                <Field label={isSchool ? 'stream (optional)' : 'major / field'}>
                                                    <TextInput value={e.field} onChange={(v) => updateItem(i, { field: v })} placeholder={isSchool ? 'e.g. Science (PCM)' : 'e.g. Computer Science'} />
                                                </Field>
                                                <Field label={isSchool ? 'school' : 'college / university'}>
                                                    <TextInput value={e.school} onChange={(v) => updateItem(i, { school: v })} placeholder={isSchool ? 'e.g. St. Xavier’s Institution' : 'e.g. Guru Nanak Institute of Technology'} />
                                                </Field>
                                                <Field label={isSchool ? 'board' : 'affiliated university (optional)'}>
                                                    <TextInput value={e.board} onChange={(v) => updateItem(i, { board: v })} placeholder={isSchool ? 'e.g. CBSE, ICSE, WBBSE' : 'e.g. MAKAUT'} />
                                                </Field>
                                                <Field label="start"><MonthInput value={e.startDate} onChange={(v) => updateItem(i, { startDate: v })} /></Field>
                                                <Field label={e.current ? 'expected completion' : 'end'}><MonthInput value={e.endDate} onChange={(v) => updateItem(i, { endDate: v })} /></Field>
                                                <div className="sm:col-span-2"><Checkbox checked={e.current} onChange={(v) => updateItem(i, { current: v })} label="Currently pursuing" /></div>
                                                <Field label="grade type">
                                                    <Select value={e.scoreType} onChange={(v) => updateItem(i, { scoreType: v, scoreMax: '' })} options={[{ value: '', label: 'Not shown' }, ...SCORE_TYPES]} />
                                                </Field>
                                                {e.scoreType && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Field label={e.scoreType === 'percentage' ? 'percentage' : 'score'}>
                                                            <input type="number" step="0.01" min="0" className={inputCls} value={e.score} onChange={(ev) => updateItem(i, { score: ev.target.value })} placeholder={e.scoreType === 'percentage' ? '86.4' : '8.4'} />
                                                        </Field>
                                                        {e.scoreType !== 'percentage' && (
                                                            <Field label="out of">
                                                                <input type="number" step="0.1" min="1" className={inputCls} value={e.scoreMax} onChange={(ev) => updateItem(i, { scoreMax: ev.target.value })} placeholder={String(scoreType?.max || 10)} />
                                                            </Field>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {addAnother('education', 'Add education')}
                            </div>
                        )}
                    >
                        {profile.education.length ? (
                            <ul className="list-none m-0 p-0">
                                {profile.education.map((e) => (
                                    <li key={e.id} className="py-3.5 border-0 border-t border-[#D8D4CC] first:border-t-0">
                                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                            <span className="text-[16px] font-semibold text-[#171717]">{[e.degree, e.field].filter(Boolean).join(', ')}</span>
                                            <span className="ds-mono ds-mono-muted shrink-0">
                                                {e.current
                                                    ? `pursuing${e.endDate ? ` · until ${formatMonth(e.endDate).toLowerCase()}` : ''}`
                                                    : formatRange(e.startDate, e.endDate, false).toLowerCase()}
                                            </span>
                                        </div>
                                        <p className="m-0 mt-0.5 text-[14px] text-[#4A4540]">{[e.school, e.board].filter(Boolean).join(' · ')}</p>
                                        {formatScore(e) && <p className="ds-mono m-0 mt-1.5 text-[#171717]">{formatScore(e).toLowerCase()}</p>}
                                    </li>
                                ))}
                            </ul>
                        ) : empty('No education yet.')}
                    </Section>

                    {/* Certifications */}
                    <Section
                        ctx={ctx}
                        id="certifications"
                        count={profile.certifications.length}
                        canAdd
                        className="lg:border-b-0"
                        editor={() => (
                            <div className="space-y-3">
                                {(draft || []).map((c, i) => (
                                    <div key={c.id} className={entryBox}>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="ds-mono text-[#CA3C0A]">{String(i + 1).padStart(2, '0')}</span>
                                            <EntryControls index={i} count={draft.length} onMove={moveItem} onRemove={removeItem} label={c.name || 'certification'} />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Field span label="certification name"><TextInput value={c.name} onChange={(v) => updateItem(i, { name: v })} placeholder="e.g. AWS Certified Cloud Practitioner" /></Field>
                                            <Field label="issued by"><TextInput value={c.provider} onChange={(v) => updateItem(i, { provider: v })} placeholder="e.g. Amazon Web Services, Udemy, Coursera" /></Field>
                                            <Field label="issue date"><MonthInput value={c.issueDate} onChange={(v) => updateItem(i, { issueDate: v })} /></Field>
                                            <Field label="credential id (optional)"><TextInput value={c.credentialId} onChange={(v) => updateItem(i, { credentialId: v })} placeholder="e.g. UC-1a2b3c" /></Field>
                                            <Field label="credential link (optional)"><TextInput value={c.credentialUrl} onChange={(v) => updateItem(i, { credentialUrl: v })} placeholder="https://…" inputMode="url" /></Field>
                                        </div>
                                    </div>
                                ))}
                                {addAnother('certifications', 'Add certification')}
                            </div>
                        )}
                    >
                        {profile.certifications.length ? (
                            <ul className="list-none m-0 p-0">
                                {profile.certifications.map((c) => (
                                    <li key={c.id} className="py-3 border-0 border-t border-[#D8D4CC] first:border-t-0">
                                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                            <span className="text-[15px] font-semibold text-[#171717]">{c.name}</span>
                                            {c.issueDate && <span className="ds-mono ds-mono-muted shrink-0">{formatMonth(c.issueDate).toLowerCase()}</span>}
                                        </div>
                                        {(c.provider || c.credentialId) && (
                                            <p className="m-0 mt-0.5 text-[14px] text-[#4A4540]">{[c.provider, c.credentialId && `ID ${c.credentialId}`].filter(Boolean).join(' · ')}</p>
                                        )}
                                        {safeUrl(c.credentialUrl) && <div className="mt-1.5"><ExternalLink href={c.credentialUrl} icon={Link2}>View credential</ExternalLink></div>}
                                    </li>
                                ))}
                            </ul>
                        ) : empty('No certifications yet.')}
                    </Section>
                </div>

                <div className="lg:col-span-5 border-0 border-t lg:border-t-0 border-[#D8D4CC]">
                    {suggestedRoles.length > 0 && (
                        <section className="border-0 border-b border-[#D8D4CC]">
                            <h3 className="ds-mono ds-mono-muted m-0 px-5 sm:px-6 pt-5 pb-3">roles that fit</h3>
                            <ul className="list-none m-0 p-0">
                                {suggestedRoles.map((role) => (
                                    <li key={role} className="border-0 border-t border-[#D8D4CC]">
                                        <button type="button" onClick={() => onSearchRole(role)} className="w-full px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 bg-transparent hover:bg-white border-0 cursor-pointer text-left text-[15px] font-medium text-[#171717] group">
                                            {role}
                                            <ArrowUpRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Skills */}
                    <Section
                        ctx={ctx}
                        id="skills"
                        count={profile.skills.length}
                        editor={() => (<Field label="skills" hint="press enter or comma after each · backspace removes the last"><TagEditor values={draft || []} onChange={setDraft} placeholder="e.g. React" /></Field>)}
                    >
                        {profile.skills.length
                            ? <div className="flex flex-wrap gap-2">{profile.skills.map((s) => <span key={s} className="ds-tag !font-sans !text-[13px]">{s}</span>)}</div>
                            : empty('No skills yet.')}
                    </Section>

                    {/* Achievements */}
                    <Section
                        ctx={ctx}
                        id="achievements"
                        count={profile.achievements.length}
                        editor={() => (
                            <Field label="achievements & awards" hint="one per line · hackathons, ranks, scholarships, publications">
                                <textarea className={`${inputCls} resize-y`} rows={4} value={(draft || []).join('\n')} onChange={(e) => setDraft(e.target.value.split('\n'))} placeholder={'Winner, Smart India Hackathon 2025\nTop 5% in college coding contest'} />
                            </Field>
                        )}
                    >
                        {profile.achievements.length
                            ? <ul className="ds-list">{profile.achievements.map((a, i) => <li key={i} className="!text-[14px]">{a}</li>)}</ul>
                            : empty('Hackathons, ranks, scholarships or awards.')}
                    </Section>

                    {/* Languages */}
                    <Section
                        ctx={ctx}
                        id="languages"
                        count={profile.languages.length}
                        className="border-b-0"
                        canAdd
                        editor={() => (
                            <div>
                                <div className="hidden sm:grid grid-cols-[1fr_200px_36px] gap-2 mb-2">
                                    <span className="ds-label !mb-0">language</span>
                                    <span className="ds-label !mb-0">fluency</span>
                                </div>
                                <ul className="list-none m-0 p-0 space-y-2">
                                    {(draft || []).map((l, i) => (
                                        <li key={l.id} className="grid grid-cols-[1fr_36px] sm:grid-cols-[1fr_150px_36px] gap-2 items-center">
                                            <TextInput value={l.name} onChange={(v) => updateItem(i, { name: v })} placeholder="e.g. English" aria-label={`Language ${i + 1}`} />
                                            <div className="col-span-1 row-start-2 sm:row-start-auto">
                                                <Select value={l.level} onChange={(v) => updateItem(i, { level: v })} options={[{ value: '', label: 'Not specified' }, ...LANGUAGE_LEVELS]} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(i)}
                                                aria-label={`Remove ${l.name || 'language'}`}
                                                className="w-9 h-[46px] inline-flex items-center justify-center bg-white border border-[#D8D4CC] hover:border-[#B91C1C] hover:text-[#B91C1C] cursor-pointer"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                {addAnother('languages', 'Add language')}
                            </div>
                        )}
                    >
                        {profile.languages.length ? (
                            <ul className="list-none m-0 p-0">
                                {profile.languages.map((text) => {
                                    const { name, level } = parseLanguage(text);
                                    return (
                                        <li key={text} className="py-2.5 flex items-baseline justify-between gap-3 border-0 border-t border-[#D8D4CC] first:border-t-0">
                                            <span className="text-[15px] font-medium text-[#171717]">{name}</span>
                                            {level && <span className="ds-mono ds-mono-muted shrink-0">{level.toLowerCase()}</span>}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : empty('Languages you speak, and how well.')}
                    </Section>
                </div>
            </div>
        </div>
    );
}
