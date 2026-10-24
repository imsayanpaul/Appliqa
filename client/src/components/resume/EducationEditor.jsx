import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
import { EDUCATION_LEVELS, SCORE_TYPES, guessLevel, newId } from '../../lib/resumeProfile';

const blankEducation = () => ({ id: newId(), level: 'degree', degree: '', field: '', school: '', board: '', dates: '', scoreType: '', score: '', scoreMax: '' });
const isSchoolLevel = (level) => level === 'class10' || level === 'class12';

// The same fields as the profile's education editor, so boards, streams and
// scores reach the resume. Dates stay free text: that is what the resume prints.
export function EducationEditor({ education, onChange }) {
    const update = (i, patch) => onChange(education.map((e, j) => (j === i ? { ...e, ...patch } : e)));
    const move = (i, to) => {
        if (to < 0 || to >= education.length) return;
        const next = [...education];
        const [item] = next.splice(i, 1);
        next.splice(to, 0, item);
        onChange(next);
    };

    return (
        <div className="space-y-4">
            {education.length === 0 && (
                <p className="m-0 text-[14px] text-[#4A4540]">No education yet. Add your degree, then Class 12 and Class 10 with their boards.</p>
            )}

            {education.map((e, i) => {
                const key = e.id || i;
                const level = e.level || guessLevel(`${e.degree || ''} ${e.board || ''}`);
                const isSchool = isSchoolLevel(level);
                const scoreType = SCORE_TYPES.find((t) => t.value === e.scoreType);
                const title = [e.degree, e.field].filter(Boolean).join(', ') || e.school || 'Untitled entry';
                return (
                    <div key={key} className="bg-white border border-[#D8D4CC]">
                        <div className="flex items-stretch border-0 border-b border-[#D8D4CC]">
                            <span className="ds-mono self-center px-4 text-[#CA3C0A]">{String(i + 1).padStart(2, '0')}</span>
                            <span className="flex-1 min-w-0 self-center text-[15px] font-semibold text-[#171717] truncate">{title}</span>
                            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move entry up" className="w-10 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer hover:bg-[#F7F5F2] disabled:opacity-30 disabled:cursor-default">
                                <ChevronUp size={15} />
                            </button>
                            <button type="button" onClick={() => move(i, i + 1)} disabled={i === education.length - 1} aria-label="Move entry down" className="w-10 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer hover:bg-[#F7F5F2] disabled:opacity-30 disabled:cursor-default">
                                <ChevronDown size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => { if (!(e.degree || e.school) || window.confirm(`Remove “${title}”?`)) onChange(education.filter((_, j) => j !== i)); }}
                                aria-label={`Remove ${title}`}
                                className="w-11 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#6F6A65] hover:text-[#B91C1C] hover:bg-[#FEF2F2]"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-4 grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="resume-input-label" htmlFor={`ed-level-${key}`}>Level</label>
                                <select
                                    id={`ed-level-${key}`}
                                    value={level}
                                    onChange={(ev) => update(i, { level: ev.target.value, ...(isSchoolLevel(ev.target.value) && !e.scoreType ? { scoreType: 'percentage' } : {}) })}
                                    className="resume-input-field"
                                >
                                    {EDUCATION_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="resume-input-label" htmlFor={`ed-degree-${key}`}>{isSchool ? 'Qualification' : 'Degree'}</label>
                                <input id={`ed-degree-${key}`} type="text" value={e.degree || ''} onChange={(ev) => update(i, { degree: ev.target.value })} className="resume-input-field" placeholder={isSchool ? (level === 'class10' ? 'e.g. Secondary (Class 10)' : 'e.g. Higher Secondary (Class 12)') : 'e.g. Bachelor of Computer Applications'} />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="resume-input-label" htmlFor={`ed-field-${key}`}>{isSchool ? 'Stream (optional)' : 'Major / field'}</label>
                                <input id={`ed-field-${key}`} type="text" value={e.field || ''} onChange={(ev) => update(i, { field: ev.target.value })} className="resume-input-field" placeholder={isSchool ? 'e.g. Science (PCM)' : 'e.g. Computer Science'} />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="resume-input-label" htmlFor={`ed-school-${key}`}>{isSchool ? 'School' : 'College / university'}</label>
                                <input id={`ed-school-${key}`} type="text" value={e.school || ''} onChange={(ev) => update(i, { school: ev.target.value })} className="resume-input-field" placeholder={isSchool ? 'e.g. St. Xavier’s Institution' : 'e.g. Guru Nanak Institute of Technology'} />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="resume-input-label" htmlFor={`ed-board-${key}`}>{isSchool ? 'Board' : 'Affiliated university (optional)'}</label>
                                <input id={`ed-board-${key}`} type="text" value={e.board || ''} onChange={(ev) => update(i, { board: ev.target.value })} className="resume-input-field" placeholder={isSchool ? 'e.g. CBSE, ICSE, WBBSE' : 'e.g. MAKAUT'} />
                            </div>
                            <div className="col-span-2">
                                <label className="resume-input-label" htmlFor={`ed-dates-${key}`}>Dates</label>
                                <input id={`ed-dates-${key}`} type="text" value={e.dates || ''} onChange={(ev) => update(i, { dates: ev.target.value })} className="resume-input-field" placeholder={isSchool ? 'e.g. 2023' : 'e.g. 2023 – 2027 (expected)'} />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="resume-input-label" htmlFor={`ed-gtype-${key}`}>Grade type</label>
                                <select id={`ed-gtype-${key}`} value={e.scoreType || ''} onChange={(ev) => update(i, { scoreType: ev.target.value, scoreMax: '' })} className="resume-input-field">
                                    <option value="">Not shown</option>
                                    {SCORE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            {e.scoreType && (
                                <div className="col-span-2 sm:col-span-1 grid grid-cols-2 gap-3">
                                    <div className={e.scoreType === 'percentage' ? 'col-span-2' : ''}>
                                        <label className="resume-input-label" htmlFor={`ed-score-${key}`}>{e.scoreType === 'percentage' ? 'Percentage' : 'Score'}</label>
                                        <input id={`ed-score-${key}`} type="number" step="0.01" min="0" value={e.score || ''} onChange={(ev) => update(i, { score: ev.target.value })} className="resume-input-field" placeholder={e.scoreType === 'percentage' ? '86.4' : '8.4'} />
                                    </div>
                                    {e.scoreType !== 'percentage' && (
                                        <div>
                                            <label className="resume-input-label" htmlFor={`ed-max-${key}`}>Out of</label>
                                            <input id={`ed-max-${key}`} type="number" step="0.1" min="1" value={e.scoreMax || ''} onChange={(ev) => update(i, { scoreMax: ev.target.value })} className="resume-input-field" placeholder={String(scoreType?.max || 10)} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            <button type="button" onClick={() => onChange([...education, blankEducation()])} className="ds-btn ds-btn-line w-full !min-h-12 !text-[14px]">
                Add education <Plus size={15} />
            </button>
        </div>
    );
}
