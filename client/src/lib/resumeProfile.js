// Structured resume profile shared by the profile editor and the resume builder.
// Stored in `builderData` on the user record. Legacy fields the builder reads
// (`dates` on experience/education, string certifications) are kept in sync so
// both editors can open the same data.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const EXPERIENCE_TYPES = ['Full-time', 'Internship', 'Part-time', 'Contract', 'Freelance', 'Apprenticeship'];
export const EDUCATION_LEVELS = [
    { value: 'degree', label: 'University / college degree' },
    { value: 'diploma', label: 'Diploma' },
    { value: 'class12', label: 'Higher secondary (Class 12)' },
    { value: 'class10', label: 'Secondary (Class 10)' },
    { value: 'other', label: 'Other' },
];
export const SCORE_TYPES = [
    { value: 'cgpa', label: 'CGPA', max: 10 },
    { value: 'sgpa', label: 'SGPA', max: 10 },
    { value: 'gpa', label: 'GPA', max: 4 },
    { value: 'percentage', label: 'Percentage', max: 100 },
];

export const LANGUAGE_LEVELS = ['Native', 'Fluent', 'Professional', 'Conversational', 'Basic'];

// Languages are stored as plain strings ("English (Fluent)") so every reader,
// including the resume builder, keeps working. These convert to/from rows.
export function parseLanguage(text) {
    const s = String(text || '').trim();
    const m = s.match(/^(.*?)\s*[(\-–—:,]\s*([a-z ]+?)\s*\)?$/i);
    if (m) {
        const t = m[2].trim().toLowerCase();
        // Includes LinkedIn's scale: native or bilingual / full professional /
        // professional working / limited working / elementary
        const level = LANGUAGE_LEVELS.find((l) => l.toLowerCase() === t)
            || (/native|bilingual|mother|first/.test(t) ? 'Native'
                : /full professional|advanced|fluent/.test(t) ? 'Fluent'
                : /professional|business|working/.test(t) && !/limited/.test(t) ? 'Professional'
                : /limited|intermediate|conversational/.test(t) ? 'Conversational'
                : /elementary|beginner|basic/.test(t) ? 'Basic' : '');
        if (level) return { name: m[1].trim(), level };
    }
    return { name: s, level: '' };
}

export function formatLanguage({ name, level }) {
    const n = String(name || '').trim();
    return n && level ? `${n} (${level})` : n;
}

let idCounter = 0;
export const newId = () => `${Date.now().toString(36)}${(idCounter++).toString(36)}`;

// ---- Dates (stored as "YYYY-MM" or "YYYY") ----

export function formatMonth(value) {
    if (!value) return '';
    const [y, m] = String(value).split('-');
    if (!m) return y;
    const idx = parseInt(m, 10) - 1;
    return idx >= 0 && idx < 12 ? `${MONTH_LABELS[idx]} ${y}` : y;
}

export function formatRange(start, end, current, currentLabel = 'Present') {
    const a = formatMonth(start);
    const b = current ? currentLabel : formatMonth(end);
    if (a && b) return `${a} – ${b}`;
    return a || b || '';
}

function parseOneDate(token) {
    const t = token.trim().toLowerCase();
    if (!t) return '';
    const year = t.match(/(19|20)\d{2}/)?.[0];
    if (!year) return '';
    const month = MONTHS.findIndex((m) => t.includes(m));
    return month >= 0 ? `${year}-${String(month + 1).padStart(2, '0')}` : year;
}

// "Jun 2025 – Sept 2025", "2021 - Present", "2019-2023" -> { startDate, endDate, current }
export function parseDateRange(text) {
    if (!text) return { startDate: '', endDate: '', current: false };
    const parts = String(text).split(/\s*(?:–|—|-|to)\s*(?=[a-z0-9])/i);
    const endToken = parts[1] || '';
    const endIsNow = /present|current|now|ongoing|pursuing/i.test(endToken);
    // "Aug 2023 – Jun 2026 (expected)" is ongoing but keeps its end date
    const current = endIsNow || /expected/i.test(text);
    const startDate = parseOneDate(parts[0] || '');
    const endDate = endIsNow ? '' : parseOneDate(endToken);
    return { startDate, endDate, current };
}

// ---- Normalisers ----

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const cleanList = (v) => list(v).map((x) => str(x).trim()).filter(Boolean);

function withDates(item, rangeText) {
    // Prefer explicit fields; fall back to parsing the display string (the
    // builder edits `dates` as free text, so it wins when it disagrees).
    const parsed = parseDateRange(rangeText);
    const hasFields = item.startDate || item.endDate || item.current;
    if (hasFields && formatRange(item.startDate, item.endDate, item.current) === str(rangeText)) {
        return { startDate: str(item.startDate), endDate: str(item.endDate), current: !!item.current };
    }
    return rangeText ? parsed : { startDate: str(item.startDate), endDate: str(item.endDate), current: !!item.current };
}

function parseExperienceString(s) {
    const m1 = s.match(/^(.*?)\s+(?:at|@)\s+(.*?)(?:\s*\((.*?)\))?$/i);
    if (m1) return { role: m1[1].trim(), company: m1[2].trim(), dates: m1[3]?.trim() || '' };
    const m2 = s.match(/^(.*?)\s*\((.*?)\)$/);
    if (m2) return { role: m2[1].trim(), company: '', dates: m2[2].trim() };
    return { role: s, company: '', dates: '' };
}

function normalizeExperience(item) {
    const base = typeof item === 'string' ? parseExperienceString(item) : (item || {});
    const role = str(base.role || base.title);
    const dates = withDates(base, base.dates);
    const isIntern = /intern/i.test(role);
    return {
        id: base.id || newId(),
        role,
        company: str(base.company),
        type: str(base.type) || (isIntern ? 'Internship' : 'Full-time'),
        location: str(base.location),
        ...dates,
        bullets: cleanList(base.bullets).filter((b) => b !== 'Key achievement or responsibility.'),
    };
}

function parseEducationString(s) {
    const m = s.match(/^(.*?)\s+from\s+(.*)$/i);
    return m ? { degree: m[1].trim(), school: m[2].trim() } : { degree: s, school: '' };
}

function guessLevel(text) {
    const t = text.toLowerCase();
    if (/class\s*10|secondary examination|\bssc\b|\bicse\b|matric/.test(t) && !/higher/.test(t)) return 'class10';
    if (/class\s*12|higher secondary|\bhsc\b|\bisc\b|intermediate|senior secondary/.test(t)) return 'class12';
    if (/diploma/.test(t)) return 'diploma';
    return 'degree';
}

function normalizeEducation(item) {
    const base = typeof item === 'string' ? parseEducationString(item) : (item || {});
    const degree = str(base.degree);
    const dates = withDates(base, base.dates);
    const scoreType = SCORE_TYPES.some((t) => t.value === base.scoreType) ? base.scoreType : '';
    return {
        id: base.id || newId(),
        level: base.level || guessLevel(`${degree} ${str(base.board)}`),
        degree,
        field: str(base.field),
        school: str(base.school),
        board: str(base.board),
        ...dates,
        scoreType,
        score: str(base.score),
        scoreMax: str(base.scoreMax),
    };
}

function normalizeProject(item) {
    const base = item || {};
    return {
        id: base.id || newId(),
        name: str(base.name),
        description: str(base.description),
        tech: cleanList(base.tech),
        liveUrl: str(base.liveUrl),
        repoUrl: str(base.repoUrl),
        startDate: str(base.startDate),
        endDate: str(base.endDate),
        current: !!base.current,
    };
}

function normalizeCertification(item) {
    if (typeof item === 'string') {
        // "Name - Provider" / "Name (Provider)" from AI extraction
        const paren = item.match(/^(.*?)\s*\((.*?)\)\s*$/);
        // Split on the last spaced dash; issuers can contain hyphens ("NASSCOM IT-ITES SSC")
        const dash = item.match(/^(.*)\s+[–—-]\s+(.+)$/);
        const [name, provider] = paren ? [paren[1], paren[2]] : dash ? [dash[1], dash[2]] : [item, ''];
        return { id: newId(), name: name.trim(), provider: provider.trim(), issueDate: '', credentialId: '', credentialUrl: '' };
    }
    const base = item || {};
    return {
        id: base.id || newId(),
        name: str(base.name),
        provider: str(base.provider),
        issueDate: str(base.issueDate),
        credentialId: str(base.credentialId),
        credentialUrl: str(base.credentialUrl),
    };
}

export function normalizeProfile(data) {
    const d = data || {};
    return {
        summary: str(d.summary),
        experience: list(d.experience).map(normalizeExperience),
        projects: list(d.projects).map(normalizeProject),
        education: list(d.education).map(normalizeEducation),
        certifications: list(d.certifications).map(normalizeCertification),
        achievements: cleanList(d.achievements),
        skills: cleanList(d.skills),
        languages: cleanList(d.languages),
    };
}

// ---- Display helpers ----

// Ongoing study keeps its expected completion date: "Aug 2023 – Jun 2026 (expected)"
export function educationDates(e) {
    if (e.current && e.endDate) return `${formatRange(e.startDate, e.endDate, false)} (expected)`;
    return formatRange(e.startDate, e.endDate, e.current, 'Pursuing');
}

export function formatScore(edu) {
    if (!edu?.score) return '';
    const type = SCORE_TYPES.find((t) => t.value === edu.scoreType);
    if (!type) return edu.score;
    if (type.value === 'percentage') return `${edu.score}%`;
    return `${type.label} ${edu.score}/${edu.scoreMax || type.max}`;
}

export function certificationLabel(cert) {
    if (typeof cert === 'string') return cert;
    return [cert?.name, cert?.provider].filter(Boolean).join(' — ');
}

export function safeUrl(url) {
    const u = str(url).trim();
    if (!u) return '';
    const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    try {
        const parsed = new URL(withProto);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch {
        return '';
    }
}

// ---- Serialise back to builderData (keeps fields the resume builder reads) ----

export function toBuilderData(profile, existing = {}) {
    return {
        ...existing,
        summary: profile.summary,
        skills: profile.skills,
        languages: profile.languages,
        achievements: profile.achievements,
        experience: profile.experience.map((e) => ({
            ...e,
            dates: formatRange(e.startDate, e.endDate, e.current),
            bullets: e.bullets,
        })),
        education: profile.education.map((e) => ({
            ...e,
            dates: educationDates(e),
        })),
        projects: profile.projects,
        certifications: profile.certifications,
        profileUpdatedAt: new Date().toISOString(),
    };
}

// Plain-text version used for ATS scoring and match analysis
export function profileToText(profile, personal = {}) {
    const lines = [];
    if (personal.name) lines.push(personal.name);
    if (personal.title) lines.push(personal.title);
    if (profile.summary) lines.push('', profile.summary);
    if (profile.experience.length) {
        lines.push('', 'EXPERIENCE');
        profile.experience.forEach((e) => {
            lines.push(`${e.role}${e.company ? ` at ${e.company}` : ''} (${e.type}) ${formatRange(e.startDate, e.endDate, e.current)}`);
            e.bullets.forEach((b) => lines.push(`- ${b}`));
        });
    }
    if (profile.projects.length) {
        lines.push('', 'PROJECTS');
        profile.projects.forEach((p) => {
            lines.push(`${p.name}${p.tech.length ? ` (${p.tech.join(', ')})` : ''}`);
            if (p.description) lines.push(p.description);
        });
    }
    if (profile.education.length) {
        lines.push('', 'EDUCATION');
        profile.education.forEach((e) => lines.push([e.degree, e.field, e.school, formatScore(e), formatRange(e.startDate, e.endDate, e.current, 'Pursuing')].filter(Boolean).join(', ')));
    }
    if (profile.certifications.length) {
        lines.push('', 'CERTIFICATIONS');
        profile.certifications.forEach((c) => lines.push(certificationLabel(c)));
    }
    if (profile.achievements.length) {
        lines.push('', 'ACHIEVEMENTS');
        profile.achievements.forEach((a) => lines.push(`- ${a}`));
    }
    if (profile.skills.length) lines.push('', `SKILLS: ${profile.skills.join(', ')}`);
    if (profile.languages.length) lines.push(`LANGUAGES: ${profile.languages.join(', ')}`);
    return lines.join('\n');
}
