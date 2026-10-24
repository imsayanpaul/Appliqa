import { useState } from 'react';
import { FiGithub, FiPlus, FiCheck } from 'react-icons/fi';

// Reads someone's public GitHub repos (languages and topics) and suggests skills
// they haven't listed yet. Runs in the browser against GitHub's public API.
const TOPIC_NAMES = {
    react: 'React', reactjs: 'React', nextjs: 'Next.js', 'next-js': 'Next.js', nodejs: 'Node.js', 'node-js': 'Node.js', expressjs: 'Express.js',
    express: 'Express.js', mongodb: 'MongoDB', postgresql: 'PostgreSQL', postgres: 'PostgreSQL', mysql: 'MySQL', tailwindcss: 'Tailwind CSS',
    tailwind: 'Tailwind CSS', docker: 'Docker', kubernetes: 'Kubernetes', aws: 'AWS', firebase: 'Firebase', supabase: 'Supabase', django: 'Django',
    flask: 'Flask', fastapi: 'FastAPI', 'machine-learning': 'Machine Learning', 'deep-learning': 'Deep Learning', tensorflow: 'TensorFlow',
    pytorch: 'PyTorch', 'scikit-learn': 'scikit-learn', pandas: 'pandas', numpy: 'NumPy', opencv: 'OpenCV', redux: 'Redux', vue: 'Vue.js',
    vuejs: 'Vue.js', angular: 'Angular', graphql: 'GraphQL', 'rest-api': 'REST APIs', redis: 'Redis', 'spring-boot': 'Spring Boot',
    flutter: 'Flutter', 'react-native': 'React Native', gemini: 'Gemini API', openai: 'OpenAI API', llm: 'LLMs', langchain: 'LangChain',
    vite: 'Vite', jest: 'Jest', 'github-actions': 'GitHub Actions', 'ci-cd': 'CI/CD', linux: 'Linux', websocket: 'WebSockets', websockets: 'WebSockets',
};
const SKIP_LANGS = new Set(['HTML', 'CSS', 'Shell', 'Batchfile', 'PowerShell', 'Makefile', 'Dockerfile', 'Procfile', 'Jupyter Notebook', 'SCSS', 'Less']);

const usernameFrom = (value) => {
    const v = String(value || '').trim();
    const m = v.match(/github\.com\/([A-Za-z0-9-]{1,39})/i);
    if (m) return m[1];
    return /^[A-Za-z0-9-]{1,39}$/.test(v) ? v : '';
};

function GitHubSkills({ githubValue, currentSkills, onAdd }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [found, setFound] = useState(null); // [{ skill, repos }]
    const have = new Set(String(currentSkills || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
    const username = usernameFrom(githubValue);

    const scan = async () => {
        if (!username) {
            setError('Add your GitHub username or profile link in the Portfolio section first.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, {
                headers: { Accept: 'application/vnd.github+json' },
            });
            if (res.status === 404) throw new Error(`No GitHub user called “${username}”.`);
            if (res.status === 403) throw new Error('GitHub is limiting requests right now. Try again in an hour.');
            if (!res.ok) throw new Error('Couldn’t reach GitHub.');
            const repos = (await res.json()).filter((r) => !r.fork && !r.archived);
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
        } catch (err) {
            setError(err.message || 'Couldn’t read your GitHub.');
        } finally {
            setLoading(false);
        }
    };

    const missing = (found || []).filter((f) => !have.has(f.skill.toLowerCase()));

    return (
        <div className="border border-[#D8D4CC] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="m-0 text-[15px] font-semibold text-[#171717]">Find skills in your GitHub</p>
                    <p className="ds-mono ds-mono-muted m-0 mt-1">reads your public repos’ languages and topics</p>
                </div>
                <button type="button" onClick={scan} disabled={loading} className="ds-btn ds-btn-line !min-h-[40px] !text-[14px]">
                    <FiGithub size={15} /> {loading ? 'Reading…' : found ? 'Scan again' : 'Scan GitHub'}
                </button>
            </div>
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
