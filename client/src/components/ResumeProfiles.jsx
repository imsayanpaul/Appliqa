import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Copy, Star, Trash2, ArrowUpRight, X, Check, FileUp } from 'lucide-react';
import ResumeProfile from './ResumeProfile';
import { createOrUpdateUser } from '../services/api';
import { toBuilderData, profileToText } from '../lib/resumeProfile';
import {
    readProfiles, writeProfiles, makeProfile, uniqueName, cleanName, dataFromAnalysis,
    nameFromFile, formatUpdated, stripCollection, MAX_PROFILES, MAX_NAME_LENGTH,
} from '../lib/resumeProfiles';

const actionBtn = 'h-9 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium bg-white border border-[#D8D4CC] hover:border-[#171717] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

export default function ResumeProfiles({ user, onUpdateUser, analysis, uploadedAt, suggestedRoles, onFindJobs, onSearchRole }) {
    const navigate = useNavigate();
    const { profiles, primaryId } = useMemo(() => readProfiles(user?.builderData), [user?.builderData]);

    // Before anything is saved, show the parsed upload as an unsaved "Main resume"
    const virtual = !profiles.length;
    const list = virtual
        ? [{ id: 'main', name: 'Main resume', updatedAt: null, data: analysis ? dataFromAnalysis(analysis) : {}, unsaved: true }]
        : profiles;
    const effectivePrimary = virtual ? 'main' : primaryId;

    const [selectedId, setSelectedId] = useState(effectivePrimary);
    const selected = list.find((p) => p.id === selectedId) || list.find((p) => p.id === effectivePrimary) || list[0];

    const [panel, setPanel] = useState(null); // 'new' | 'rename' | 'delete'
    const [nameInput, setNameInput] = useState('');
    const [newFrom, setNewFrom] = useState('copy');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [dismissedUpload, setDismissedUpload] = useState(null);
    const nameRef = useRef(null);

    useEffect(() => { if (panel === 'new' || panel === 'rename') nameRef.current?.focus(); }, [panel]);

    // A resume uploaded after the latest saved edit can be imported or used to replace one
    const latestEdit = Math.max(0, ...profiles.map((p) => new Date(p.updatedAt || 0).getTime() || 0));
    const showImport = !virtual && analysis && uploadedAt && uploadedAt > latestEdit && dismissedUpload !== uploadedAt;

    const persist = async (nextProfiles, nextPrimaryId) => {
        const builderData = writeProfiles(user?.builderData, nextProfiles, nextPrimaryId);
        const res = await createOrUpdateUser({ builderData });
        if (res.data?.user) onUpdateUser?.(res.data.user);
    };

    const run = async (fn) => {
        setBusy(true);
        setError('');
        try {
            await fn();
            setPanel(null);
        } catch (err) {
            console.error('Resume update failed:', err);
            setError('Couldn’t save just now. Check your connection and try again.');
        } finally {
            setBusy(false);
        }
    };

    const baseList = virtual ? [] : profiles;
    const now = () => new Date().toISOString();

    // Saving from the section editor writes into the selected resume
    const handleSaveSelected = async (normalized) => {
        const data = stripCollection(toBuilderData(normalized, selected.data));
        data.rawText = profileToText(normalized, data.personalInfo || { name: user?.name });
        if (virtual) {
            const first = { ...makeProfile('Main resume', data), id: 'main' };
            await persist([first], first.id);
            setSelectedId(first.id);
            return;
        }
        const next = profiles.map((p) => (p.id === selected.id ? { ...p, data, updatedAt: now() } : p));
        await persist(next, primaryId);
    };

    const openPanel = (name) => {
        setError('');
        setPanel(name);
        if (name === 'rename') setNameInput(selected.name);
        if (name === 'new') { setNameInput(''); setNewFrom(virtual && !analysis ? 'blank' : 'copy'); }
    };

    const createResume = () => run(async () => {
        if (baseList.length >= MAX_PROFILES) throw new Error('limit');
        // Materialise the unsaved upload first so it isn't lost
        const existing = virtual ? [{ ...makeProfile('Main resume', selected.data), id: 'main' }] : baseList;
        const data = newFrom === 'copy'
            ? JSON.parse(JSON.stringify(selected.data || {}))
            : { personalInfo: selected.data?.personalInfo || { name: user?.name || '', email: user?.email || '' } };
        const created = makeProfile(nameInput || (newFrom === 'copy' ? `${selected.name} copy` : 'New resume'), data, existing);
        await persist([...existing, created], virtual ? 'main' : primaryId);
        setSelectedId(created.id);
    });

    const duplicate = () => run(async () => {
        if (baseList.length >= MAX_PROFILES) throw new Error('limit');
        const existing = virtual ? [{ ...makeProfile('Main resume', selected.data), id: 'main' }] : baseList;
        const copy = makeProfile(`${selected.name} copy`, JSON.parse(JSON.stringify(selected.data || {})), existing);
        await persist([...existing, copy], virtual ? 'main' : primaryId);
        setSelectedId(copy.id);
    });

    const rename = () => run(async () => {
        const name = uniqueName(nameInput, list, selected.id);
        if (virtual) {
            const first = { ...makeProfile(name, selected.data), id: 'main', name };
            return persist([first], 'main');
        }
        await persist(profiles.map((p) => (p.id === selected.id ? { ...p, name } : p)), primaryId);
    });

    const makePrimary = () => run(() => persist(profiles, selected.id));

    const remove = () => run(async () => {
        if (profiles.length <= 1) return;
        const next = profiles.filter((p) => p.id !== selected.id);
        const nextPrimary = selected.id === primaryId ? next[0].id : primaryId;
        await persist(next, nextPrimary);
        setSelectedId(nextPrimary);
    });

    const importUpload = (mode) => run(async () => {
        if (mode === 'new') {
            if (profiles.length >= MAX_PROFILES) throw new Error('limit');
            const created = makeProfile(nameFromFile(analysis.fileName), dataFromAnalysis(analysis, selected.data?.personalInfo), profiles);
            await persist([...profiles, created], primaryId);
            setSelectedId(created.id);
        } else {
            const data = dataFromAnalysis(analysis, selected.data?.personalInfo);
            await persist(profiles.map((p) => (p.id === selected.id ? { ...p, data, updatedAt: now() } : p)), primaryId);
        }
        setDismissedUpload(uploadedAt);
    });

    const atLimit = baseList.length >= MAX_PROFILES;
    const isPrimary = selected.id === effectivePrimary;

    return (
        <div className="mt-10 border border-[#D8D4CC] bg-[#F7F5F2]">
            {/* Resume tabs */}
            <div role="tablist" aria-label="Your resumes" className="flex overflow-x-auto overflow-y-hidden border-0 border-b border-[#D8D4CC] bg-[#EFECE6]" style={{ scrollbarWidth: 'thin' }}>
                {list.map((p) => {
                    const active = p.id === selected.id;
                    const primary = p.id === effectivePrimary;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => { setSelectedId(p.id); setPanel(null); setError(''); }}
                            className={`relative shrink-0 min-w-[160px] max-w-[240px] h-16 px-4 text-left border-0 border-r border-[#D8D4CC] cursor-pointer ${active ? 'bg-white' : 'bg-transparent hover:bg-white/60'}`}
                        >
                            <span className="block text-[15px] font-semibold text-[#171717] truncate">{p.name}</span>
                            <span className="ds-mono ds-mono-muted flex items-center gap-1.5 mt-0.5">
                                {primary && <><span className="ds-square" /><span className="text-[#CA3C0A]">primary</span><span aria-hidden="true">·</span></>}
                                {p.unsaved ? 'not saved' : formatUpdated(p.updatedAt)}
                            </span>
                            {active && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#CA3C0A]" />}
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={() => openPanel('new')}
                    disabled={atLimit || busy}
                    title={atLimit ? `You can keep up to ${MAX_PROFILES} resumes` : 'Create another resume'}
                    className="shrink-0 h-16 px-5 inline-flex items-center gap-2 text-[14px] font-medium text-[#171717] bg-transparent hover:bg-white border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Plus size={16} /> New resume
                </button>
            </div>

            {/* Actions for the selected resume */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3 border-0 border-b border-[#D8D4CC] bg-white">
                <p className="ds-mono ds-mono-muted m-0">
                    {isPrimary ? 'primary · used for match scores, ats checks and the advisor' : 'not primary'}
                </p>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={actionBtn} onClick={() => openPanel('rename')} disabled={busy}><Pencil size={13} /> Rename</button>
                    <button type="button" className={actionBtn} onClick={duplicate} disabled={busy || atLimit}><Copy size={13} /> Duplicate</button>
                    {!isPrimary && <button type="button" className={actionBtn} onClick={makePrimary} disabled={busy}><Star size={13} /> Set as primary</button>}
                    <button type="button" className={actionBtn} onClick={() => navigate(`/resume-creator${virtual ? '' : `?resume=${encodeURIComponent(selected.id)}`}`)}>
                        <ArrowUpRight size={13} /> Open in builder
                    </button>
                    {!virtual && profiles.length > 1 && (
                        <button type="button" className={`${actionBtn} hover:!border-[#B91C1C] hover:text-[#B91C1C]`} onClick={() => openPanel('delete')} disabled={busy}><Trash2 size={13} /> Delete</button>
                    )}
                </div>
            </div>

            {/* Inline panels */}
            {panel && (
                <div className="px-5 sm:px-6 py-5 border-0 border-b border-[#D8D4CC] bg-white">
                    {panel === 'delete' ? (
                        <>
                            <p className="m-0 text-[16px] font-medium">Delete “{selected.name}”?</p>
                            <p className="m-0 mt-1 text-[14px] text-[#4A4540]">
                                This can’t be undone.{isPrimary ? ` “${profiles.find((p) => p.id !== selected.id)?.name}” will become your primary resume.` : ''}
                            </p>
                            <div className="mt-4 grid grid-cols-2 border border-[#D8D4CC] max-w-md">
                                <button type="button" onClick={() => setPanel(null)} className="ds-btn !min-h-[46px] bg-transparent text-[#171717] hover:bg-[#F7F5F2]">Keep it <X size={16} /></button>
                                <button type="button" onClick={remove} disabled={busy} className="ds-btn !min-h-[46px] bg-[#B91C1C] text-white hover:bg-[#991B1B]">{busy ? 'Deleting…' : 'Delete'} <Trash2 size={15} /></button>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); panel === 'new' ? createResume() : rename(); }} className="max-w-xl">
                            <label htmlFor="resume-name" className="ds-label">{panel === 'new' ? 'name the new resume' : 'rename resume'}</label>
                            <input
                                id="resume-name"
                                ref={nameRef}
                                type="text"
                                maxLength={MAX_NAME_LENGTH}
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder={panel === 'new' ? 'e.g. Backend roles, Data analyst, Razorpay application' : ''}
                                className="resume-input-field"
                            />
                            {panel === 'new' && (
                                <fieldset className="mt-4 border-0 p-0 m-0">
                                    <legend className="ds-label">start from</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 border border-[#D8D4CC]">
                                        {[
                                            { value: 'copy', title: `A copy of “${selected.name}”`, desc: 'then tailor it' },
                                            { value: 'blank', title: 'A blank resume', desc: 'keeps your name and contact details' },
                                        ].map((o, i) => (
                                            <label key={o.value} className={`flex items-start gap-3 px-4 py-3 cursor-pointer ${i ? 'border-0 border-t sm:border-t-0 sm:border-l border-[#D8D4CC]' : ''} ${newFrom === o.value ? 'bg-[#F7F5F2]' : 'bg-white'}`}>
                                                <input type="radio" name="resume-start" value={o.value} checked={newFrom === o.value} onChange={() => setNewFrom(o.value)} className="mt-1 accent-[#CA3C0A]" />
                                                <span>
                                                    <span className="block text-[15px] font-medium">{o.title}</span>
                                                    <span className="ds-mono ds-mono-muted block mt-0.5">{o.desc}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            )}
                            <div className="mt-4 grid grid-cols-2 border border-[#D8D4CC]">
                                <button type="button" onClick={() => setPanel(null)} className="ds-btn !min-h-[46px] bg-transparent text-[#171717] hover:bg-[#F7F5F2]">Cancel <X size={16} /></button>
                                <button type="submit" disabled={busy || (panel === 'rename' && !cleanName(nameInput))} className="ds-btn ds-btn-accent !min-h-[46px]">
                                    {busy ? 'Saving…' : panel === 'new' ? 'Create resume' : 'Save name'} <Check size={16} />
                                </button>
                            </div>
                        </form>
                    )}
                    {error && <p role="alert" className="m-0 mt-3 text-[14px] text-[#991B1B]">{error}</p>}
                </div>
            )}
            {!panel && error && <p role="alert" className="m-0 px-5 sm:px-6 py-3 text-[14px] text-[#991B1B] bg-[#FEF2F2] border-0 border-b border-[#D8D4CC]">{error}</p>}

            {/* New upload */}
            {showImport && (
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-0 border-b border-[#D8D4CC] bg-[#FFF0E8]">
                    <p className="m-0 text-[15px] flex items-start gap-2.5">
                        <FileUp size={18} className="shrink-0 mt-0.5 text-[#CA3C0A]" />
                        <span>You uploaded <strong>{analysis.fileName || 'a new resume'}</strong>. Keep your saved resumes as they are and import it, or replace “{selected.name}” with it.</span>
                    </p>
                    <div className="flex flex-wrap gap-2 shrink-0">
                        <button type="button" className={actionBtn} onClick={() => importUpload('new')} disabled={busy || profiles.length >= MAX_PROFILES}>Import as new</button>
                        <button type="button" className={actionBtn} onClick={() => importUpload('replace')} disabled={busy}>Replace “{selected.name}”</button>
                        <button type="button" className={actionBtn} onClick={() => setDismissedUpload(uploadedAt)}>Dismiss</button>
                    </div>
                </div>
            )}

            <ResumeProfile
                key={selected.id}
                embedded
                title={`resume / ${selected.name.toLowerCase()}`}
                source={selected.data}
                onSave={handleSaveSelected}
                suggestedRoles={suggestedRoles}
                onFindJobs={onFindJobs}
                onSearchRole={onSearchRole}
            />
        </div>
    );
}
