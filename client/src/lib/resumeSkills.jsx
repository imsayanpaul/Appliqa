import { createContext, useContext, useState } from 'react';
import { Plus, Check, RefreshCw } from 'lucide-react';

// Lets any screen add a skill to the primary resume (ATS check, job detail,
// career path). Provided by App, which owns the user record.
export const ResumeSkillsContext = createContext({ canAdd: false, hasSkill: () => false, addSkills: async () => {} });

export const useResumeSkills = () => useContext(ResumeSkillsContext);

// AI suggestions sometimes carry commentary: "TypeScript proficiency (inferred as a
// specific requirement over generic JS)". Keep short qualifiers like "(AWS/GCP)".
export function cleanSkill(text) {
    let s = String(text || '').replace(/^\+\s*/, '').trim();
    s = s.replace(/\s*\(([^)]*)\)\s*$/, (m, inner) => (inner.trim().split(/\s+/).length >= 3 ? '' : m));
    s = s.replace(/\s+(proficiency|experience|skills?|knowledge|expertise)$/i, '');
    return s.trim();
}

export function AddSkillTag({ skill }) {
    const { canAdd, hasSkill, addSkills } = useResumeSkills();
    const [status, setStatus] = useState('idle'); // idle | saving | error
    const label = cleanSkill(skill);
    const added = hasSkill(label);

    if (!canAdd || !label) {
        return <span className="ds-tag !border-[#CA3C0A] !text-[#CA3C0A]">+ {label || skill}</span>;
    }

    const onClick = async () => {
        setStatus('saving');
        try {
            await addSkills([label]);
            setStatus('idle');
        } catch (err) {
            console.error('Adding skill failed:', err);
            setStatus('error');
        }
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={added || status === 'saving'}
            aria-label={added ? `${label} is in your primary resume` : `Add ${label} to your primary resume`}
            title={added ? 'In your primary resume' : status === 'error' ? 'Couldn’t save. Click to try again' : 'Add to your primary resume'}
            className={`ds-tag gap-1.5 ${
                added
                    ? '!bg-[#171717] !text-white !border-[#171717] cursor-default'
                    : status === 'error'
                    ? '!border-[#B91C1C] !text-[#B91C1C] cursor-pointer'
                    : '!border-[#CA3C0A] !text-[#CA3C0A] cursor-pointer hover:!bg-[#FFF0E8]'
            }`}
        >
            {added ? <Check size={11} /> : status === 'saving' ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
            {label}
        </button>
    );
}

export function AddSkillHint() {
    const { canAdd } = useResumeSkills();
    return canAdd ? <span className="ds-mono ds-mono-muted"> · click to add to your primary resume</span> : null;
}
