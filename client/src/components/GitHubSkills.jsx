import { useState } from 'react';
import { FiGithub, FiPlus, FiCheck, FiX } from 'react-icons/fi';

import { TOPIC_NAMES, SKIP_LANGS, usernameFrom, fetchRepos } from '../lib/github';

// Reads someone's public GitHub repos (languages and topics) and suggests skills
// they haven't listed yet. Runs in the browser against GitHub's public API.

// askUsername: show a box for the username when the profile has none (home page).
// onScan(username) runs after a successful scan; onClose shows a close button.
function GitHubSkills({ githubValue, currentSkills, onAdd, askUsername = false, onScan, onClose, compact = false }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [found, setFound] = useState(null); // [{ skill, repos }]
    const [typed, setTyped] = useState('');
    const have = new Set(String(currentSkills || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
    const username = usernameFrom(githubValue) || usernameFrom(typed);
    const needsInput = askUsername && !usernameFrom(githubValue);

    const scan = async (e) => {
        e?.preventDefault();
        if (!username) {
            setError(needsInput ? 'Enter your GitHub username or profile link.' : 'Add your GitHub username or profile link in the Portfolio section first.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const repos = await fetchRepos(username);
            const counts = new Map();
            const add = (skill, repo) => {
                const row = counts.get(skill) || { skill, repos: new Set() };
                row.repos.add(repo);
                counts.set(skill, row);
            };
            for (const r of repos) {
                if (r.language && !SKIP_LANGS.has(r.language)) add(r.language, r.name);
                for (const t of r.topics || []) if (TOPIC_NAMES[t]) add(TOPIC_NAMES[t], r.name);
            }
            const list = [...counts.values()]
                .map((r) => ({ skill: r.skill, repos: [...r.repos] }))
                .sort((a, b) => b.repos.length - a.repos.length);
            setFound(list);
            if (!list.length) setError('Your public repos don’t list languages or topics yet.');
            onScan?.(username);
        } catch (err) {
            setError(err.message || 'Couldn’t read your GitHub.');
        } finally {
            setLoading(false);
        }
    };

    const missing = (found || []).filter((f) => !have.has(f.skill.toLowerCase()));

    return (
        <div className={compact ? '' : 'border border-[#D8D4CC] bg-white p-4'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="m-0 text-[15px] font-semibold text-[#171717]">Find skills in your GitHub</p>
                    <p className="ds-mono ds-mono-muted m-0 mt-1">reads your public repos’ languages and topics</p>
                </div>
                {onClose && (
                    <button type="button" onClick={onClose} aria-label="Hide this suggestion" className="w-8 h-8 inline-flex items-center justify-center bg-transparent border-0 cursor-pointer text-[#6F6A65] hover:text-[#171717]">
                        <FiX size={15} />
                    </button>
                )}
                {!needsInput && (
                    <button type="button" onClick={scan} disabled={loading} className="ds-btn ds-btn-line !min-h-[40px] !text-[14px]">
                        <FiGithub size={15} /> {loading ? 'Reading…' : found ? 'Scan again' : 'Scan GitHub'}
                    </button>
                )}
            </div>
            {needsInput && (
                <form onSubmit={scan} className="mt-3 flex gap-2">
                    <input
                        type="text"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder="GitHub username or link"
                        aria-label="GitHub username or profile link"
                        className="resume-input-field flex-1 min-w-0"
                    />
                    <button type="submit" disabled={loading || !typed.trim()} className="ds-btn ds-btn-line !min-h-[40px] !text-[14px] shrink-0">
                        <FiGithub size={15} /> {loading ? 'Reading…' : 'Scan'}
                    </button>
                </form>
            )}
            {error && <p role="alert" className="m-0 mt-3 text-[14px] text-[#B45309]">{error}</p>}
            {found && !error && (
                missing.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {missing.slice(0, 16).map((f) => (
                            <button
                                key={f.skill}
                                type="button"
                                onClick={() => onAdd(f.skill)}
                                title={`Used in ${f.repos.slice(0, 4).join(', ')}`}
                                className="ds-chip"
                            >
                                <FiPlus size={12} /> {f.skill} <span className="ds-mono ds-mono-muted">{f.repos.length}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="m-0 mt-3 text-[14px] text-[#047857] inline-flex items-center gap-2"><FiCheck size={14} /> Every skill in your repos is already on your profile.</p>
                )
            )}
        </div>
    );
}

export default GitHubSkills;
