import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import SelectMenu from '../ui/SelectMenu';
import { ACCENTS, FONTS, WEIGHTS, DEFAULT_DESIGN } from '../../lib/resumeDesign';

const TABS = [
    { id: 'style', label: 'Template & colour' },
    { id: 'text', label: 'Text' },
    { id: 'layout', label: 'Layout' },
];

function Group({ title, children, action }) {
    return (
        <section className="border-0 border-b border-[#D8D4CC] px-6 sm:px-8 py-5">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="ds-mono ds-mono-muted m-0 font-normal">{title}</h3>
                {action}
            </div>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function RangeRow({ label, value, min, max, step = 1, unit, onChange }) {
    const pct = ((value - min) / (max - min)) * 100;
    const shown = Number.isInteger(step) ? value : Number(value).toFixed(step < 0.1 ? 2 : 1);
    return (
        <label className="grid grid-cols-[minmax(0,140px)_1fr_76px] items-center gap-4">
            <span className="text-[14px] text-[#2A2622]">{label}</span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="ds-range"
                style={{ '--fill': `${pct}%` }}
            />
            <span className="h-9 inline-flex items-center justify-center border border-[#D8D4CC] bg-white font-mono text-[13px] text-[#171717]">
                {shown}{unit ? ` ${unit}` : ''}
            </span>
        </label>
    );
}

function Segment({ label, options, value, onChange, columns }) {
    return (
        <div>
            {label && <p className="text-[14px] text-[#2A2622] m-0 mb-2">{label}</p>}
            <div role="radiogroup" aria-label={label} className="grid border border-[#D8D4CC]" style={{ gridTemplateColumns: `repeat(${columns || options.length}, minmax(0, 1fr))` }}>
                {options.map((opt) => {
                    const on = opt.value === value;
                    return (
                        <button
                            key={String(opt.value)}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => onChange(opt.value)}
                            className={`min-h-11 px-3 py-2 text-[14px] font-medium border-0 border-l first:border-l-0 border-[#D8D4CC] cursor-pointer transition-colors ${on ? 'bg-[#171717] text-white' : 'bg-white text-[#171717] hover:bg-[#F7F5F2]'}`}
                        >
                            {opt.preview && <span className="block mb-1.5" aria-hidden="true">{opt.preview(on)}</span>}
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Tiny drawings of each template's section title style
const bar = (on, w = '70%') => <span className="block h-1" style={{ width: w, background: on ? '#FFFFFF66' : '#D8D4CC' }} />;
const templatePreview = (kind) => (on) => {
    const accent = on ? '#FFFFFF' : '#2163CA';
    return (
        <span className="block w-full px-2 py-2 space-y-1.5 text-left">
            <span className="block h-2 w-1/2" style={{ background: accent }} />
            {kind === 'modern' && <span className="block h-1.5" style={{ borderTop: `1px solid ${accent}`, borderBottom: `1px solid ${accent}` }} />}
            {kind === 'classic' && <span className="block h-1.5" style={{ borderBottom: `2px solid ${accent}` }} />}
            {kind === 'elegant' && <span className="block h-1.5 w-1/3" style={{ borderLeft: `3px solid ${accent}`, background: on ? '#FFFFFF33' : '#EFECE6' }} />}
            {bar(on)}{bar(on, '55%')}
        </span>
    );
};

export default function DesignPanel({ design, onChange, hasPhoto }) {
    const [tab, setTab] = useState('style');
    const set = (key) => (value) => onChange({ [key]: value });
    const hexOk = /^#[0-9a-f]{6}$/i.test(design.accent);
    const [hexDraft, setHexDraft] = useState(null);

    const resetKeys = (keys) => onChange(Object.fromEntries(keys.map((k) => [k, DEFAULT_DESIGN[k]])));
    const resetButton = (keys) => (
        <button type="button" onClick={() => resetKeys(keys)} className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer ds-mono text-[#6F6A65] hover:text-[#CA3C0A]">
            <RotateCcw size={12} /> reset
        </button>
    );

    return (
        <div>
            <div role="tablist" aria-label="Design" className="grid grid-cols-3 border-0 border-b border-[#D8D4CC] bg-[#F7F5F2] sticky top-0 z-10">
                {TABS.map((t) => {
                    const on = tab === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => setTab(t.id)}
                            className={`relative h-12 px-3 text-[14px] font-medium border-0 border-l first:border-l-0 border-[#D8D4CC] cursor-pointer ${on ? 'bg-white text-[#171717]' : 'bg-transparent text-[#4A4540] hover:bg-white/60'}`}
                        >
                            {t.label}
                            {on && <span className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-[#CA3C0A]" />}
                        </button>
                    );
                })}
            </div>

            {tab === 'style' && (
                <>
                    <Group title="template">
                        <Segment
                            options={['modern', 'classic', 'elegant'].map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1), preview: templatePreview(t) }))}
                            value={design.template}
                            onChange={set('template')}
                        />
                    </Group>

                    <Group title="accent colour" action={resetButton(['accent'])}>
                        <div className="flex flex-wrap items-center gap-2">
                            {ACCENTS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => { onChange({ accent: c }); setHexDraft(null); }}
                                    aria-label={`Accent ${c}`}
                                    aria-pressed={design.accent.toLowerCase() === c.toLowerCase()}
                                    className="w-9 h-9 border-0 p-0 cursor-pointer outline-offset-2"
                                    style={{ background: c, outline: design.accent.toLowerCase() === c.toLowerCase() ? '2px solid #171717' : '1px solid #D8D4CC' }}
                                />
                            ))}
                        </div>
                        <div className="flex items-stretch gap-0 border border-[#D8D4CC] bg-white w-fit">
                            <label className="relative w-11 h-11 cursor-pointer border-0 border-r border-[#D8D4CC]" title="Pick any colour">
                                <span className="absolute inset-1.5" style={{ background: hexOk ? design.accent : '#2163CA' }} />
                                <input
                                    type="color"
                                    value={hexOk ? design.accent : '#2163CA'}
                                    onChange={(e) => { onChange({ accent: e.target.value }); setHexDraft(null); }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    aria-label="Custom accent colour"
                                />
                            </label>
                            <span className="ds-mono ds-mono-muted self-center pl-3">hex</span>
                            <input
                                type="text"
                                value={hexDraft ?? design.accent}
                                onChange={(e) => {
                                    const v = e.target.value.trim();
                                    setHexDraft(v);
                                    const full = v.startsWith('#') ? v : `#${v}`;
                                    if (/^#[0-9a-f]{6}$/i.test(full)) onChange({ accent: full.toUpperCase() });
                                }}
                                onBlur={() => setHexDraft(null)}
                                maxLength={7}
                                spellCheck={false}
                                aria-label="Accent colour hex code"
                                className="w-28 h-11 px-2 border-0 bg-transparent font-mono text-[14px] uppercase text-[#171717] outline-none"
                            />
                        </div>
                    </Group>

                    <Group title="font">
                        <SelectMenu
                            ariaLabel="Resume font"
                            value={design.font}
                            onChange={set('font')}
                            options={FONTS.map((f) => ({ value: f.value, label: f.label }))}
                        />
                        <p className="m-0 text-[13px] text-[#6F6A65]">Arial, Calibri and Times New Roman are the safest for applicant tracking systems.</p>
                    </Group>

                    <Group title="photo" action={resetButton(['photoShow', 'photoSize', 'photoShape'])}>
                        {hasPhoto ? (
                            <>
                                <Segment label="Show photo" options={[{ value: true, label: 'Show' }, { value: false, label: 'Hide' }]} value={design.photoShow} onChange={set('photoShow')} />
                                <RangeRow label="Size" value={design.photoSize} min={48} max={140} unit="pt" onChange={set('photoSize')} />
                                <Segment label="Shape" options={[{ value: 'square', label: 'Square' }, { value: 'rounded', label: 'Rounded' }, { value: 'circle', label: 'Circle' }]} value={design.photoShape} onChange={set('photoShape')} />
                            </>
                        ) : (
                            <p className="m-0 text-[14px] text-[#4A4540]">No photo added. A photo is optional; add one under Content → Personal.</p>
                        )}
                    </Group>
                </>
            )}

            {tab === 'text' && (
                <>
                    <Group title="font size" action={resetButton(['nameSize', 'titleSize', 'sectionSize', 'headingSize', 'bodySize', 'lineHeight'])}>
                        <RangeRow label="Name" value={design.nameSize} min={16} max={40} unit="pt" onChange={set('nameSize')} />
                        <RangeRow label="Job title" value={design.titleSize} min={8} max={16} step={0.5} unit="pt" onChange={set('titleSize')} />
                        <RangeRow label="Section titles" value={design.sectionSize} min={9} max={18} step={0.5} unit="pt" onChange={set('sectionSize')} />
                        <RangeRow label="Entry headings" value={design.headingSize} min={9} max={16} step={0.5} unit="pt" onChange={set('headingSize')} />
                        <RangeRow label="Body" value={design.bodySize} min={8} max={13} step={0.5} unit="pt" onChange={set('bodySize')} />
                        <RangeRow label="Line height" value={design.lineHeight} min={1.1} max={1.8} step={0.05} onChange={set('lineHeight')} />
                    </Group>
                    <Group title="font weight" action={resetButton(['nameWeight', 'sectionWeight', 'headingWeight'])}>
                        {[
                            ['nameWeight', 'Name'],
                            ['sectionWeight', 'Section titles'],
                            ['headingWeight', 'Entry headings'],
                        ].map(([key, label]) => (
                            <div key={key} className="grid grid-cols-[minmax(0,140px)_1fr] items-center gap-4">
                                <span className="text-[14px] text-[#2A2622]">{label}</span>
                                <SelectMenu ariaLabel={`${label} weight`} value={design[key]} onChange={set(key)} options={WEIGHTS} />
                            </div>
                        ))}
                    </Group>
                </>
            )}

            {tab === 'layout' && (
                <>
                    <Group title="page margins" action={resetButton(['marginY', 'marginX'])}>
                        <RangeRow label="Top & bottom" value={design.marginY} min={0.2} max={1.2} step={0.05} unit="in" onChange={set('marginY')} />
                        <RangeRow label="Left & right" value={design.marginX} min={0.2} max={1.2} step={0.05} unit="in" onChange={set('marginX')} />
                    </Group>
                    <Group title="spacing" action={resetButton(['sectionGap', 'titleGap', 'blockGap', 'itemGap'])}>
                        <RangeRow label="Between sections" value={design.sectionGap} min={4} max={32} unit="pt" onChange={set('sectionGap')} />
                        <RangeRow label="Title to content" value={design.titleGap} min={0} max={16} unit="pt" onChange={set('titleGap')} />
                        <RangeRow label="Between entries" value={design.blockGap} min={0} max={24} unit="pt" onChange={set('blockGap')} />
                        <RangeRow label="Between lines" value={design.itemGap} min={0} max={10} step={0.5} unit="pt" onChange={set('itemGap')} />
                    </Group>
                    <Group title="alignment">
                        <Segment label="Header" options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} value={design.headerAlign} onChange={set('headerAlign')} />
                        <Segment label="Dates" options={[{ value: 'right', label: 'Right side' }, { value: 'inline', label: 'After the title' }]} value={design.dateAlign} onChange={set('dateAlign')} />
                    </Group>
                    <Group title="skills & education">
                        <Segment label="Skills" options={[{ value: 'inline', label: 'In a line' }, { value: 'columns', label: 'Columns' }]} value={design.skillsLayout} onChange={set('skillsLayout')} />
                        {design.skillsLayout === 'columns' && (
                            <RangeRow label="Columns" value={design.skillsColumns} min={2} max={5} onChange={set('skillsColumns')} />
                        )}
                        <Segment label="Education shows first" options={[{ value: 'institution', label: 'Institution' }, { value: 'degree', label: 'Degree' }]} value={design.educationFirst} onChange={set('educationFirst')} />
                    </Group>
                </>
            )}
        </div>
    );
}
