// Multiple named resumes stored inside `builderData`:
//   { ...primary resume fields (mirrored for older readers), profiles: [...], primaryId }
// Each profile: { id, name, createdAt, updatedAt, data } where `data` has the same
// shape the resume builder already saves (personalInfo, summary, experience, ...).

import { newId, normalizeProfile, toBuilderData, profileToText, formatRange, formatScore, educationDates, certificationLabel } from './resumeProfile';

export const MAX_PROFILES = 10;
export const MAX_NAME_LENGTH = 60;

const RESUME_KEYS = [
    'personalInfo', 'summary', 'skills', 'expertise', 'languages', 'achievements',
    'experience', 'education', 'projects', 'certifications', 'rawText',
    'suggestedRoles', 'experienceLevel', 'fileName', 'profileUpdatedAt',
];

export function stripCollection(data) {
    if (!data) return {};
    const { profiles, primaryId, ...rest } = data; // eslint-disable-line no-unused-vars
    return rest;
}

function pickResume(data) {
    const out = {};
    for (const k of RESUME_KEYS) if (data?.[k] !== undefined) out[k] = data[k];
    return out;
}

export function hasResumeContent(data) {
    if (!data) return false;
    return Boolean(
        data.summary?.trim?.() ||
        ['skills', 'experience', 'education', 'projects', 'certifications'].some((k) => Array.isArray(data[k]) && data[k].length)
    );
}

// Read the collection, migrating a single legacy resume into "Main resume"
export function readProfiles(builderData) {
    const list = Array.isArray(builderData?.profiles) ? builderData.profiles.filter((p) => p && p.id) : [];
    if (list.length) {
        const primaryId = list.some((p) => p.id === builderData.primaryId) ? builderData.primaryId : list[0].id;
        return { profiles: list, primaryId };
    }
    if (hasResumeContent(builderData)) {
        const legacy = {
            id: 'main',
            name: 'Main resume',
            createdAt: builderData.profileUpdatedAt || null,
            updatedAt: builderData.profileUpdatedAt || null,
            data: pickResume(builderData),
        };
        return { profiles: [legacy], primaryId: 'main' };
    }
    return { profiles: [], primaryId: null };
}

// Serialise back. Older parts of the app read the top-level fields, so the
// primary resume is mirrored there; stale top-level resume fields are cleared.
export function writeProfiles(existing, profiles, primaryId) {
    const primary = profiles.find((p) => p.id === primaryId) || profiles[0] || null;
    const base = stripCollection(existing);
    for (const k of RESUME_KEYS) delete base[k];
    return {
        ...base,
        ...(primary ? pickResume(primary.data) : {}),
        profiles,
        primaryId: primary?.id || null,
        profileUpdatedAt: primary?.updatedAt || new Date().toISOString(),
    };
}

export function cleanName(name) {
    return String(name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

export function uniqueName(name, profiles, exceptId) {
    const base = cleanName(name) || 'Untitled resume';
    const taken = new Set(profiles.filter((p) => p.id !== exceptId).map((p) => p.name.toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let i = 2; i < 100; i++) {
        const candidate = `${base} (${i})`;
        if (!taken.has(candidate.toLowerCase())) return candidate;
    }
    return `${base} (${Date.now().toString(36)})`;
}

export function makeProfile(name, data, profiles = []) {
    const now = new Date().toISOString();
    return { id: `r_${newId()}`, name: uniqueName(name, profiles), createdAt: now, updatedAt: now, data: data || {} };
}

// Resume data from an AI-parsed upload, in the stored shape
export function dataFromAnalysis(analysis, personalInfo) {
    const normalized = normalizeProfile(analysis || {});
    const data = toBuilderData(normalized, personalInfo ? { personalInfo } : {});
    data.rawText = analysis?.rawText || profileToText(normalized, personalInfo || {});
    if (analysis?.suggestedRoles) data.suggestedRoles = analysis.suggestedRoles;
    if (analysis?.experienceLevel) data.experienceLevel = analysis.experienceLevel;
    if (analysis?.fileName) data.fileName = analysis.fileName;
    return stripCollection(data);
}

export function nameFromFile(fileName) {
    const base = String(fileName || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
    return cleanName(base) || 'Uploaded resume';
}

export function formatUpdated(iso) {
    if (!iso) return 'not saved yet';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'updated today';
    if (days === 1) return 'updated yesterday';
    if (days < 30) return `updated ${days}d ago`;
    return `updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase()}`;
}

// Resume shape used by the AI features (match score, ATS, interview prep,
// career path, advisor). The server joins experience/education as text, so
// structured entries are flattened into readable lines.
export function toAIResume(data, uploaded = null, name = '') {
    const p = normalizeProfile(data || {});
    const experience = [
        ...p.experience.map((e) => {
            const head = `${e.role}${e.company ? ` at ${e.company}` : ''}${e.type && e.type !== 'Full-time' ? ` (${e.type})` : ''}`;
            const when = formatRange(e.startDate, e.endDate, e.current);
            const bullets = e.bullets.length ? `: ${e.bullets.join('; ')}` : '';
            return `${head}${when ? ` (${when})` : ''}${bullets}`;
        }),
        ...p.projects.map((pr) => `Project: ${pr.name}${pr.tech.length ? ` (${pr.tech.join(', ')})` : ''}${pr.description ? `: ${pr.description}` : ''}`),
    ];
    const education = p.education.map((e) => {
        const details = [formatScore(e), educationDates(e)].filter(Boolean).join(', ');
        return `${[e.degree, e.field].filter(Boolean).join(', ')}${e.school ? ` from ${e.school}` : ''}${details ? ` (${details})` : ''}`;
    });
    return {
        ...(uploaded || {}),
        fileName: name || uploaded?.fileName || '',
        summary: p.summary || uploaded?.summary || '',
        skills: p.skills.length ? p.skills : (uploaded?.skills || []),
        experience: experience.length ? experience : (uploaded?.experience || []),
        education: education.length ? education : (uploaded?.education || []),
        certifications: p.certifications.map(certificationLabel),
        languages: p.languages,
        projects: p.projects,
        rawText: data?.rawText || uploaded?.rawText || profileToText(p, data?.personalInfo || {}),
        suggestedRoles: uploaded?.suggestedRoles?.length ? uploaded.suggestedRoles : (data?.suggestedRoles || []),
        experienceLevel: uploaded?.experienceLevel || data?.experienceLevel || '',
    };
}
