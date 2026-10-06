import { createPortal } from 'react-dom';
import { FiArrowRight, FiCheck, FiLoader } from 'react-icons/fi';

const STATUSES = [
    { value: 'Working Professional', label: 'Working professional', hint: 'in a job now' },
    { value: 'College/University Student', label: 'College student', hint: 'studying for a degree' },
    { value: 'School Student', label: 'School student', hint: 'still in school' },
    { value: 'Self-Educated / Career Switcher', label: 'Career switcher', hint: 'self-taught or changing fields' },
];

const today = () => new Date().toISOString().slice(0, 10);

// First sign-in: two details that tune career paths and job matching
export default function OnboardingSheet({ form, setForm, saving, onSave, onSkip }) {
    const ready = Boolean(form.dob && form.educationStatus);

    return createPortal(
        <div className="modal-overlay" data-lenis-prevent>
            <div className="modal-content ds-sheet" role="dialog" aria-modal="true" aria-labelledby="onb-title" data-lenis-prevent>
                <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                    <span className="ds-mono self-center px-6 sm:px-8 truncate">welcome / set up</span>
                    <span className="ds-mono ds-mono-muted self-center px-6 sm:px-8 flex items-center gap-2">
                        {[form.dob, form.educationStatus].filter(Boolean).length} of 2 <span className="ds-square" />
                    </span>
                </div>

                <div className="ds-sheet-body" data-lenis-prevent>
                    <header className="ds-sheet-section !pt-8">
                        <h2 id="onb-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#171717]">
                            Two quick details
                        </h2>
                        <p className="ds-body mt-3 mb-0">
                            They tune your career path, salary ranges and job matches to where you are now. You can change them later on your profile.
                        </p>
                    </header>

                    <section className="ds-sheet-section">
                        <label htmlFor="onb-dob" className="ds-mono ds-mono-muted block mb-2">01 · date of birth</label>
                        <input
                            id="onb-dob"
                            type="date"
                            value={form.dob || ''}
                            min="1940-01-01"
                            max={today()}
                            onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))}
                            className="resume-input-field"
                        />
                    </section>

                    <section className="ds-sheet-section border-b-0">
                        <p id="onb-status" className="ds-mono ds-mono-muted m-0 mb-2">02 · where you are now</p>
                        <div role="radiogroup" aria-labelledby="onb-status" className="grid grid-cols-1 sm:grid-cols-2 border border-[#D8D4CC] bg-white">
                            {STATUSES.map((s, i) => {
                                const on = form.educationStatus === s.value;
                                return (
                                    <button
                                        key={s.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={on}
                                        onClick={() => setForm((prev) => ({ ...prev, educationStatus: s.value }))}
                                        className={`relative text-left px-4 py-4 border-0 cursor-pointer transition-colors
                                            ${i > 0 ? 'border-t sm:border-t-0' : ''} ${i >= 2 ? 'sm:border-t' : ''} ${i % 2 === 1 ? 'sm:border-l' : ''} border-[#D8D4CC]
                                            ${on ? 'bg-[#171717] text-white' : 'bg-white text-[#171717] hover:bg-[#F7F5F2]'}`}
                                    >
                                        <span className="block text-[15px] font-semibold">{s.label}</span>
                                        <span className={`ds-mono block mt-1 ${on ? '!text-white/60' : 'ds-mono-muted'}`}>{s.hint}</span>
                                        {on && <FiCheck size={16} className="absolute top-4 right-4 text-[#FF6A33]" aria-hidden="true" />}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="shrink-0 grid grid-cols-[1fr_auto] border-0 border-t border-[#D8D4CC]">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={!ready || saving}
                        className="ds-btn ds-btn-accent !min-h-[64px] !px-6 sm:!px-8 disabled:!bg-[#EFECE6] disabled:!text-[#8A8580] disabled:!opacity-100"
                    >
                        {saving ? 'Saving…' : 'Finish setup'}
                        {saving ? <FiLoader size={18} className="animate-spin" /> : <FiArrowRight size={18} />}
                    </button>
                    <button
                        type="button"
                        onClick={onSkip}
                        disabled={saving}
                        className="ds-btn !min-h-[64px] !px-6 sm:!px-8 bg-[#F7F5F2] text-[#4A4540] hover:bg-white hover:text-[#171717] border-0 border-l border-[#D8D4CC]"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
