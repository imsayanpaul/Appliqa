// Reads a resume in two layers:
//  1. A rule-based parser in the browser (instant, free, works when the AI is down)
//  2. The AI, only to add suggested roles, experience level and skills the
//     parser missed. If the AI fails, the parsed result is still used.
import { analyzeResume } from '../services/api';
import { parseResumeText, hasUsefulParse } from './parseResume';

const AI_TIMEOUT_MS = 30000;

const uniqCI = (list) => {
    const seen = new Set();
    return list.filter((x) => {
        const k = String(x || '').trim().toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
    });
};

const expLine = (e) => `${[e.role, e.company].filter(Boolean).join(' at ')}${e.dates ? ` (${e.dates})` : ''}`;
const eduLine = (e) => `${[e.degree, e.school].filter(Boolean).join(' from ')}${e.dates ? ` (${e.dates})` : ''}`;

const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
]);

export async function analyzeResumeText(text, { onStatus } = {}) {
    onStatus?.('Reading sections…');
    const local = parseResumeText(text);
    const localOk = hasUsefulParse(local);

    let ai = null;
    try {
        onStatus?.(localOk ? 'Adding suggested roles…' : 'Reading with AI…');
        const res = await withTimeout(analyzeResume(text), AI_TIMEOUT_MS);
        ai = res?.data?.analysis || null;
    } catch (err) {
        console.warn('AI resume reading unavailable, using the parsed result:', err?.message || err);
    }

    if (!ai && !localOk) {
        throw new Error('We couldn’t find the sections in this resume, and the AI reader is busy right now. Try again in a minute, or upload a PDF with selectable text.');
    }

    const experience = local.experience.length ? local.experience : [];
    const education = local.education.length ? local.education : [];

    return {
        summary: local.summary || ai?.summary || '',
        skills: uniqCI([...local.skills, ...(ai?.skills || [])]).slice(0, 80),
        // Plain lines for older readers (server prompts, stored columns)
        experience: experience.length ? experience.map(expLine) : (ai?.experience || []),
        education: education.length ? education.map(eduLine) : (ai?.education || []),
        certifications: local.certifications.length ? local.certifications : (ai?.certifications || []),
        languages: local.languages.length ? local.languages : (ai?.languages || []),
        achievements: local.achievements,
        suggestedRoles: ai?.suggestedRoles?.length ? ai.suggestedRoles : local.suggestedRoles,
        experienceLevel: ai?.experienceLevel || local.experienceLevel,
        industries: ai?.industries || [],
        expertise: ai?.expertise || [],
        personalInfo: local.personalInfo,
        // Full entries (bullets, scores, links) for the profile and resume builder
        structured: {
            ...(experience.length ? { experience } : {}),
            ...(education.length ? { education } : {}),
            ...(local.projects.length ? { projects: local.projects } : {}),
        },
        readBy: ai ? (localOk ? 'parser+ai' : 'ai') : 'parser',
    };
}

// The analysis with structured entries in place of the plain lines
export const expandAnalysis = (analysis) => (analysis?.structured ? { ...analysis, ...analysis.structured } : analysis);
