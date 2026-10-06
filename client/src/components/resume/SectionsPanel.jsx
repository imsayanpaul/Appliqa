import { useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Plus, PencilLine, X } from 'lucide-react';
import { BUILT_IN_SECTIONS, newCustomId } from '../../lib/resumeDesign';

const newEntry = () => ({ id: newCustomId(), title: '', subtitle: '', date: '', description: '' });

function CustomEditor({ section, onChange }) {
    const update = (patch) => onChange({ ...section, ...patch });
    const items = section.items || [];
    const setItem = (id, patch) => update({ items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });

    return (
        <div className="px-5 pb-5 pt-1 space-y-4 bg-[#F7F5F2] border-0 border-t border-[#D8D4CC]">
            <div className="pt-4">
                <label className="resume-input-label" htmlFor={`cs-title-${section.id}`}>Section title</label>
                <input
                    id={`cs-title-${section.id}`}
                    type="text"
                    value={section.title}
                    maxLength={60}
                    onChange={(e) => update({ title: e.target.value })}
                    className="resume-input-field"
                    placeholder="e.g. Volunteering"
                />
            </div>

            {section.kind === 'text' ? (
                <div>
                    <label className="resume-input-label" htmlFor={`cs-text-${section.id}`}>Content</label>
                    <textarea
                        id={`cs-text-${section.id}`}
                        rows={5}
                        value={section.text || ''}
                        onChange={(e) => update({ text: e.target.value })}
                        className="resume-input-field resize-y"
                        placeholder={'Write a paragraph, or start lines with "-" for bullets.'}
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((it, i) => (
                        <div key={it.id} className="bg-white border border-[#D8D4CC]">
                            <div className="flex items-center justify-between border-0 border-b border-[#D8D4CC] pl-4">
                                <span className="ds-mono ds-mono-muted">entry {String(i + 1).padStart(2, '0')}</span>
                                <button
                                    type="button"
                                    onClick={() => update({ items: items.filter((x) => x.id !== it.id) })}
                                    aria-label={`Remove entry ${i + 1}`}
                                    className="w-10 h-10 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#6F6A65] hover:text-[#B91C1C]"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="resume-input-label">Title</label>
                                    <input type="text" value={it.title} onChange={(e) => setItem(it.id, { title: e.target.value })} className="resume-input-field" placeholder="e.g. Volunteer tutor" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="resume-input-label">Date</label>
                                    <input type="text" value={it.date} onChange={(e) => setItem(it.id, { date: e.target.value })} className="resume-input-field" placeholder="e.g. Jan 2024 – Present" />
                                </div>
                                <div className="col-span-2">
                                    <label className="resume-input-label">Subtitle</label>
                                    <input type="text" value={it.subtitle} onChange={(e) => setItem(it.id, { subtitle: e.target.value })} className="resume-input-field" placeholder="e.g. Organisation, place" />
                                </div>
                                <div className="col-span-2">
                                    <label className="resume-input-label">Details</label>
                                    <textarea rows={3} value={it.description} onChange={(e) => setItem(it.id, { description: e.target.value })} className="resume-input-field resize-y" placeholder={'Start lines with "-" for bullets.'} />
                                </div>
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => update({ items: [...items, newEntry()] })}
                        className="ds-btn ds-btn-line w-full !min-h-11 !text-[14px]"
                    >
                        Add entry <Plus size={15} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function SectionsPanel({ design, onDesignChange, customSections, onCustomChange, counts }) {
    const [openId, setOpenId] = useState(null);
    const [dragKey, setDragKey] = useState(null);
    const [overKey, setOverKey] = useState(null);
    const order = design.sectionOrder;

    const move = (key, to) => {
        const from = order.indexOf(key);
        if (from < 0 || to < 0 || to >= order.length || from === to) return;
        const next = [...order];
        next.splice(from, 1);
        next.splice(to, 0, key);
        onDesignChange({ sectionOrder: next });
    };

    const toggleHidden = (key) => {
        const hidden = design.hidden.includes(key) ? design.hidden.filter((k) => k !== key) : [...design.hidden, key];
        onDesignChange({ hidden });
    };

    const rename = (key, title) => onDesignChange({ titles: { ...design.titles, [key]: title } });

    const addCustom = (kind) => {
        const section = kind === 'text'
            ? { id: newCustomId(), kind: 'text', title: 'Custom section', text: '' }
            : { id: newCustomId(), kind: 'entries', title: 'Custom section', items: [newEntry()] };
        onCustomChange([...customSections, section]); // added to the end of the order
        setOpenId(section.id);
    };

    const removeCustom = (id) => {
        const cs = customSections.find((c) => c.id === id);
        if (!window.confirm(`Delete the section “${cs?.title || 'Custom section'}”?`)) return;
        onCustomChange(customSections.filter((c) => c.id !== id)); // order and hidden are tidied on normalise
        if (openId === id) setOpenId(null);
    };

    return (
        <div className="space-y-5">
            <div>
                <p className="ds-mono ds-mono-muted m-0 mb-1">section order</p>
                <p className="m-0 text-[14px] text-[#4A4540]">Drag a section, or use the arrows, to change where it sits. Your name and contact details always stay at the top.</p>
            </div>

            <ol className="list-none m-0 p-0 border border-[#D8D4CC] bg-white">
                {order.map((key, i) => {
                    const custom = customSections.find((c) => c.id === key);
                    const builtIn = BUILT_IN_SECTIONS.find((s) => s.key === key);
                    if (!custom && !builtIn) return null;
                    const hidden = design.hidden.includes(key);
                    const count = custom ? (custom.kind === 'text' ? (custom.text?.trim() ? 1 : 0) : (custom.items || []).length) : counts[key] || 0;
                    const title = custom ? custom.title : (design.titles[key] ?? builtIn.label);
                    return (
                        <li
                            key={key}
                            onDragOver={(e) => { e.preventDefault(); if (overKey !== key) setOverKey(key); }}
                            onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
                            onDrop={(e) => { e.preventDefault(); if (dragKey) move(dragKey, i); setDragKey(null); setOverKey(null); }}
                            className={`border-0 border-t first:border-t-0 border-[#D8D4CC] ${dragKey === key ? 'opacity-40' : ''} ${overKey === key && dragKey && dragKey !== key ? 'shadow-[inset_0_2px_0_#CA3C0A]' : ''}`}
                        >
                            <div className="flex items-stretch">
                                <span
                                    draggable
                                    onDragStart={(e) => {
                                        setDragKey(key);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', key);
                                        const row = e.currentTarget.closest('li');
                                        if (row) e.dataTransfer.setDragImage(row, 16, 24);
                                    }}
                                    onDragEnd={() => { setDragKey(null); setOverKey(null); }}
                                    title="Drag to reorder"
                                    className="w-9 shrink-0 inline-flex items-center justify-center text-[#8A8580] hover:text-[#171717] cursor-grab active:cursor-grabbing"
                                    aria-hidden="true"
                                >
                                    <GripVertical size={16} />
                                </span>
                                <span className={`ds-mono self-center w-7 shrink-0 ${hidden ? 'ds-mono-muted' : 'text-[#CA3C0A]'}`}>{String(i + 1).padStart(2, '0')}</span>
                                <input
                                    type="text"
                                    value={title}
                                    maxLength={60}
                                    onChange={(e) => (custom
                                        ? onCustomChange(customSections.map((c) => (c.id === key ? { ...c, title: e.target.value } : c)))
                                        : rename(key, e.target.value))}
                                    onBlur={(e) => { if (!custom && !e.target.value.trim()) rename(key, builtIn.label); }}
                                    aria-label={`Title for ${builtIn?.label || 'custom section'}`}
                                    className={`flex-1 min-w-0 h-12 px-2 bg-transparent border-0 text-[15px] font-medium outline-none focus:bg-[#F7F5F2] ${hidden ? 'text-[#8A8580] line-through' : 'text-[#171717]'}`}
                                />
                                <span className="ds-mono ds-mono-muted self-center px-2 shrink-0 hidden sm:inline">
                                    {custom ? (custom.kind === 'text' ? 'text' : `${count} entr${count === 1 ? 'y' : 'ies'}`) : count ? `${count}` : 'empty'}
                                </span>
                                {custom && (
                                    <button type="button" onClick={() => setOpenId(openId === key ? null : key)} aria-expanded={openId === key} aria-label={`Edit ${title}`} className={`w-10 shrink-0 inline-flex items-center justify-center border-0 border-l border-[#D8D4CC] cursor-pointer ${openId === key ? 'bg-[#171717] text-white' : 'bg-transparent text-[#171717] hover:bg-[#F7F5F2]'}`}>
                                        <PencilLine size={15} />
                                    </button>
                                )}
                                <button type="button" onClick={() => toggleHidden(key)} aria-pressed={!hidden} aria-label={hidden ? `Show ${title}` : `Hide ${title}`} title={hidden ? 'Hidden from the resume' : 'Shown on the resume'} className="w-10 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-[#F7F5F2]">
                                    {hidden ? <EyeOff size={15} className="text-[#8A8580]" /> : <Eye size={15} />}
                                </button>
                                <button type="button" onClick={() => move(key, i - 1)} disabled={i === 0} aria-label={`Move ${title} up`} className="w-9 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-[#F7F5F2] disabled:opacity-30 disabled:cursor-default">
                                    <ChevronUp size={15} />
                                </button>
                                <button type="button" onClick={() => move(key, i + 1)} disabled={i === order.length - 1} aria-label={`Move ${title} down`} className="w-9 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-[#F7F5F2] disabled:opacity-30 disabled:cursor-default">
                                    <ChevronDown size={15} />
                                </button>
                                {custom && (
                                    <button type="button" onClick={() => removeCustom(key)} aria-label={`Delete ${title}`} className="w-10 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#6F6A65] hover:text-[#B91C1C] hover:bg-[#FEF2F2]">
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                            {custom && openId === key && (
                                <CustomEditor section={custom} onChange={(next) => onCustomChange(customSections.map((c) => (c.id === key ? next : c)))} />
                            )}
                        </li>
                    );
                })}
            </ol>

            <div>
                <p className="ds-mono ds-mono-muted m-0 mb-2">add a custom section</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 border border-[#D8D4CC] bg-white">
                    <button type="button" onClick={() => addCustom('entries')} className="text-left px-4 py-4 bg-transparent border-0 cursor-pointer hover:bg-[#F7F5F2] group">
                        <span className="flex items-center justify-between text-[15px] font-semibold text-[#171717]">With entries <Plus size={16} className="text-[#CA3C0A]" /></span>
                        <span className="block mt-1 text-[13px] text-[#6F6A65]">Title, subtitle, date and bullets: volunteering, awards, training.</span>
                    </button>
                    <button type="button" onClick={() => addCustom('text')} className="text-left px-4 py-4 bg-transparent border-0 border-t sm:border-t-0 sm:border-l border-[#D8D4CC] cursor-pointer hover:bg-[#F7F5F2]">
                        <span className="flex items-center justify-between text-[15px] font-semibold text-[#171717]">Simple text <Plus size={16} className="text-[#CA3C0A]" /></span>
                        <span className="block mt-1 text-[13px] text-[#6F6A65]">One block of text or bullets: hobbies, interests, references.</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
