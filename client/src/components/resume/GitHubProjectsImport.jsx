import { useState } from 'react';
import { Star, Check } from 'lucide-react';
import { FiGithub } from 'react-icons/fi';
import { newId } from '../../lib/resumeProfile';
import { usernameFrom, fetchRepos, repoToProject, projectName } from '../../lib/github';

const sameRepo = (project, repo) =>
    (project.repoUrl && project.repoUrl.replace(/\/+$/, '').toLowerCase() === String(repo.html_url).toLowerCase())
    || project.name?.trim().toLowerCase() === projectName(repo.name).toLowerCase();

const updated = (iso) => {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days < 1) return 'today';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
};

// Pick public repos and add them as resume projects: name, tech, the repo's own
// description, live and code links, and dates, all taken from GitHub as-is.
export function GitHubProjectsImport({ githubValue, projects, onAdd }) {
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState(githubValue || '');
    const [repos, setRepos] = useState(null);
    const [picked, setPicked] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [added, setAdded] = useState(0);

    const load = async (e) => {
        e?.preventDefault();
        const username = usernameFrom(typed);
        if (!username) {
            setError('Enter your GitHub username or profile link.');
            return;
        }
        setLoading(true);
        setError(null);
        setAdded(0);
        try {
            const list = (await fetchRepos(username))
                .filter((r) => r.name.toLowerCase() !== username.toLowerCase()) // the profile README repo
                .sort((a, b) => b.stargazers_count - a.stargazers_count || String(b.pushed_at).localeCompare(String(a.pushed_at)))
                .slice(0, 30);
            setRepos(list);
            // Start with the three most-starred repos that aren't on the resume yet
            setPicked(new Set(list.filter((r) => !projects.some((p) => sameRepo(p, r))).slice(0, 3).map((r) => r.id)));
            if (!list.length) setError('No public repos to import.');
        } catch (err) {
            setError(err.message || 'Couldn’t read your GitHub.');
        } finally {
            setLoading(false);
        }
    };

    const toggle = (id) => setPicked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const addPicked = () => {
        const chosen = (repos || []).filter((r) => picked.has(r.id) && !projects.some((p) => sameRepo(p, r)));
        if (!chosen.length) return;
        onAdd(chosen.map((r) => repoToProject(r, newId)));
        setAdded(chosen.length);
        setPicked(new Set());
    };

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)} className="ds-btn ds-btn-line w-full !min-h-12 !text-[14px]">
                <FiGithub size={15} /> Import projects from GitHub
            </button>
        );
    }

    return (
        <div className="bg-white border border-[#D8D4CC] p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="m-0 text-[15px] font-semibold text-[#171717]">Import projects from GitHub</p>
                    <p className="ds-mono ds-mono-muted m-0 mt-1">uses each repo's own description, tech and links. nothing is made up</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="ds-mono ds-mono-muted bg-transparent border-none cursor-pointer underline underline-offset-2 shrink-0">close</button>
            </div>

            <form onSubmit={load} className="flex gap-2">
                <label htmlFor="gh-import-user" className="sr-only">GitHub username or profile link</label>
                <input
                    id="gh-import-user"
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="GitHub username or link"
                    className="resume-input-field flex-1 min-w-0"
                />
                <button type="submit" disabled={loading || !typed.trim()} className="ds-btn ds-btn-ink !min-h-[40px] !text-[14px] shrink-0">
                    {loading ? 'Loading…' : repos ? 'Reload' : 'Show my repos'}
                </button>
            </form>

            {error && <p role="alert" className="m-0 text-[14px] text-[#B45309]">{error}</p>}
            {added > 0 && (
                <p role="status" className="m-0 text-[14px] text-[#047857] inline-flex items-center gap-2">
                    <Check size={14} /> Added {added} project{added === 1 ? '' : 's'}. Edit the descriptions below to say what you built.
                </p>
            )}

            {repos?.length > 0 && (
                <>
                    <ul className="list-none m-0 p-0 border border-[#D8D4CC] max-h-[340px] overflow-y-auto">
                        {repos.map((r) => {
                            const already = projects.some((p) => sameRepo(p, r));
                            const meta = [r.language, r.stargazers_count ? `★ ${r.stargazers_count}` : '', `updated ${updated(r.pushed_at)}`].filter(Boolean).join(' · ');
                            return (
                                <li key={r.id} className="border-0 border-t first:border-t-0 border-[#D8D4CC]">
                                    <label className={`flex items-start gap-3 px-3 py-2.5 ${already ? 'opacity-55 cursor-default' : 'cursor-pointer hover:bg-[#F7F5F2]'}`}>
                                        <input
                                            type="checkbox"
                                            checked={already || picked.has(r.id)}
                                            disabled={already}
                                            onChange={() => toggle(r.id)}
                                            className="mt-1 w-4 h-4 accent-[#CA3C0A] shrink-0"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-[14px] font-semibold text-[#171717] truncate">
                                                {projectName(r.name)}{already && <span className="ds-mono ds-mono-muted font-normal"> · on your resume</span>}
                                            </span>
                                            {r.description && <span className="block text-[13px] text-[#4A4540] line-clamp-2">{r.description}</span>}
                                            <span className="ds-mono ds-mono-muted block mt-0.5">{meta}</span>
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                    <button type="button" onClick={addPicked} disabled={!picked.size} className="ds-btn ds-btn-accent w-full !min-h-12 !text-[14px]">
                        {picked.size ? `Add ${picked.size} project${picked.size === 1 ? '' : 's'}` : 'Pick the repos to add'}
                    </button>
                    <p className="ds-mono ds-mono-muted m-0 flex items-center gap-1.5"><Star size={11} /> repos without a description come in with an empty description: add one line on what you built</p>
                </>
            )}
        </div>
    );
}
