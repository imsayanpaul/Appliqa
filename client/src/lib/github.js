// Public GitHub data for the profile and resume builder: a person's repos, the
// skills they show, and repos turned into resume projects. Calls GitHub's public
// API straight from the browser (no token, 60 requests an hour per visitor).

export const TOPIC_NAMES = {
    react: 'React', reactjs: 'React', nextjs: 'Next.js', 'next-js': 'Next.js', nodejs: 'Node.js', 'node-js': 'Node.js', expressjs: 'Express.js',
    express: 'Express.js', mongodb: 'MongoDB', postgresql: 'PostgreSQL', postgres: 'PostgreSQL', mysql: 'MySQL', tailwindcss: 'Tailwind CSS',
    tailwind: 'Tailwind CSS', docker: 'Docker', kubernetes: 'Kubernetes', aws: 'AWS', firebase: 'Firebase', supabase: 'Supabase', django: 'Django',
    flask: 'Flask', fastapi: 'FastAPI', 'machine-learning': 'Machine Learning', 'deep-learning': 'Deep Learning', tensorflow: 'TensorFlow',
    pytorch: 'PyTorch', 'scikit-learn': 'scikit-learn', pandas: 'pandas', numpy: 'NumPy', opencv: 'OpenCV', redux: 'Redux', vue: 'Vue.js',
    vuejs: 'Vue.js', angular: 'Angular', graphql: 'GraphQL', 'rest-api': 'REST APIs', redis: 'Redis', 'spring-boot': 'Spring Boot',
    flutter: 'Flutter', 'react-native': 'React Native', gemini: 'Gemini API', openai: 'OpenAI API', llm: 'LLMs', langchain: 'LangChain',
    vite: 'Vite', jest: 'Jest', 'github-actions': 'GitHub Actions', 'ci-cd': 'CI/CD', linux: 'Linux', websocket: 'WebSockets', websockets: 'WebSockets',
    typescript: 'TypeScript', javascript: 'JavaScript', python: 'Python', java: 'Java', groq: 'Groq', whisper: 'Whisper', 'yt-dlp': 'yt-dlp',
};

// Languages that describe config or markup more than skills
export const SKIP_LANGS = new Set(['HTML', 'CSS', 'Shell', 'Batchfile', 'PowerShell', 'Makefile', 'Dockerfile', 'Procfile', 'Jupyter Notebook', 'SCSS', 'Less']);

export const usernameFrom = (value) => {
    const v = String(value || '').trim();
    const m = v.match(/github\.com\/([A-Za-z0-9-]{1,39})/i);
    if (m) return m[1];
    return /^[A-Za-z0-9-]{1,39}$/.test(v) ? v : '';
};

// Own public repos, newest activity first (forks and archived repos left out)
export async function fetchRepos(username) {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, {
        headers: { Accept: 'application/vnd.github+json' },
    });
    if (res.status === 404) throw new Error(`No GitHub user called “${username}”.`);
    if (res.status === 403) throw new Error('GitHub is limiting requests right now. Try again in an hour.');
    if (!res.ok) throw new Error('Couldn’t reach GitHub.');
    return (await res.json()).filter((r) => !r.fork && !r.archived);
}

const monthOf = (iso) => (iso ? String(iso).slice(0, 7) : '');

// "repo2resume" stays as is; "job-tracker_app" becomes "Job Tracker App"
export function projectName(repoName) {
    const name = String(repoName || '');
    if (!/[-_]/.test(name)) return name;
    return name.split(/[-_]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// A repo as a resume project, using only what's on GitHub (no AI, nothing invented)
export function repoToProject(repo, newId) {
    const tech = [
        ...(repo.language && !SKIP_LANGS.has(repo.language) ? [repo.language] : []),
        ...(repo.topics || []).map((t) => TOPIC_NAMES[t]).filter(Boolean),
    ];
    const recent = repo.pushed_at && Date.now() - new Date(repo.pushed_at).getTime() < 90 * 86400000;
    const homepage = String(repo.homepage || '').trim();
    return {
        id: newId(),
        name: projectName(repo.name),
        tech: [...new Set(tech)].slice(0, 6),
        description: repo.description ? `- ${repo.description.trim()}` : '',
        liveUrl: /^https?:\/\//i.test(homepage) ? homepage : homepage ? `https://${homepage}` : '',
        repoUrl: repo.html_url || '',
        startDate: monthOf(repo.created_at),
        endDate: recent ? '' : monthOf(repo.pushed_at),
        current: Boolean(recent),
    };
}
