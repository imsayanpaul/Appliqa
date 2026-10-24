// Building blocks for the "for you" feed: which searches to run for a person,
// how well each job matches their skills, and the order to show them in.

const clean = (s) => String(s || '').trim().replace(/\s+/g, ' ');

// Up to three distinct roles: the role they asked for first, then what their resume suggests
function feedRoles(profile) {
  const seen = new Set();
  const roles = [];
  for (const r of [profile.desired_role, ...(profile.resume_suggested_roles || [])]) {
    const role = clean(r);
    if (!role || role.length > 60 || seen.has(role.toLowerCase())) continue;
    seen.add(role.toLowerCase());
    roles.push(role);
    if (roles.length === 3) break;
  }
  return roles;
}

const ENTRY = /\b(entry|fresher|junior|graduate|intern|student|0\s*-\s*[12])/i;
const isEntryLevel = (profile) =>
  profile.experience_level === 'entry' || (!profile.experience_level && ENTRY.test(profile.resume_experience_level || ''));

const JOB_TYPES = { intern: 'INTERN', contract: 'CONTRACTOR', parttime: 'PARTTIME' };

// The search filters a profile implies (full time and "any" stay unfiltered)
function feedFilters(profile) {
  return {
    experience: isEntryLevel(profile) ? 'fresher' : '',
    employmentType: JOB_TYPES[profile.job_type] || '',
  };
}

// A person's skills, deduped, from their preferences and their resume
function profileSkills(profile) {
  const seen = new Map();
  for (const s of [...(profile.skills || []), ...(profile.resume_skills || [])]) {
    const skill = clean(typeof s === 'string' ? s : s?.name);
    if (skill.length < 1 || skill.length > 40) continue;
    const key = skill.toLowerCase();
    if (!seen.has(key)) seen.set(key, skill);
  }
  return [...seen.values()].slice(0, 80);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "Node.js" also matches "NodeJS" and "node js"; "React.js" matches "React"
const skillVariants = (skill) => {
  const lower = skill.toLowerCase();
  const variants = new Set([lower]);
  if (/\.js$/.test(lower)) {
    const base = lower.slice(0, -3);
    variants.add(`${base}js`);
    variants.add(`${base} js`);
    if (base.length > 2) variants.add(base);
  }
  return [...variants];
};

// Whole-word match that still works for skills with symbols (C++, C#, .NET, CI/CD)
const skillPattern = (skill) => new RegExp(
  `(?<![a-z0-9+#])(?:${skillVariants(skill).map(escapeRe).join('|')})(?![a-z0-9+#])`,
  'i'
);

const jobText = (job) => [
  job.title,
  job.description,
  ...(job.requiredSkills || []),
  ...((job.highlights && job.highlights.Qualifications) || []),
].filter(Boolean).join('\n');

// Which of the person's skills a job mentions
function matchSkills(job, skills) {
  const text = jobText(job);
  if (!text) return [];
  return skills.filter((skill) => skillPattern(skill).test(text));
}

const DAY = 24 * 60 * 60 * 1000;
const titleWords = (role) => role.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 2);

// Higher is better: skill overlap first, then a title that fits a target role, then freshness
function rankScore(job, { matched, roles, isNew, prefersRemote }) {
  let score = Math.min(matched.length, 10) * 3;
  const title = (job.title || '').toLowerCase();
  if (roles.some((role) => titleWords(role).length && titleWords(role).every((w) => title.includes(w)))) score += 6;
  else if (roles.some((role) => titleWords(role).some((w) => title.includes(w)))) score += 2;
  const age = Date.now() - new Date(job.datePosted).getTime();
  if (age >= 0 && age < DAY) score += 4;
  else if (age >= 0 && age < 3 * DAY) score += 2;
  else if (age >= 0 && age < 7 * DAY) score += 1;
  if (isNew) score += 2;
  if (prefersRemote && job.remote) score += 1;
  return score;
}

// The same posting often appears under several queries or job boards
const sameJobKey = (job) => `${clean(job.company).toLowerCase()}|${clean(job.title).toLowerCase()}`;

module.exports = { feedRoles, feedFilters, profileSkills, matchSkills, rankScore, sameJobKey, isEntryLevel };
