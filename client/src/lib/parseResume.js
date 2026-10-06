// Rule-based resume reader: no AI, runs in the browser.
// Finds contact details and the usual sections, then splits each section into
// entries. Output matches the shape the AI analysis returns, so the rest of the
// app can use either.

const SECTION_ALIASES = {
    summary: ['summary', 'professional summary', 'profile', 'professional profile', 'about', 'about me', 'objective', 'career objective', 'career summary'],
    experience: ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'internship', 'internships', 'internship experience', 'experience and internships'],
    education: ['education', 'academic background', 'academics', 'academic details', 'educational qualifications', 'education and training', 'qualifications'],
    skills: ['skills', 'technical skills', 'key skills', 'core skills', 'core competencies', 'competencies', 'tech stack', 'technologies', 'tools', 'skills and tools', 'technical expertise'],
    projects: ['projects', 'personal projects', 'academic projects', 'key projects', 'selected projects', 'project experience'],
    certifications: ['certifications', 'certification', 'certificates', 'licenses and certifications', 'courses', 'courses and certifications', 'training'],
    achievements: ['achievements', 'awards', 'honors', 'honours', 'accomplishments', 'awards and achievements', 'achievements and awards', 'extracurricular activities', 'extracurriculars'],
    languages: ['languages', 'languages known', 'language'],
};

const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE = `(?:${MONTH}\\.?,?\\s*(?:'|’)?\\d{2,4}|\\d{1,2}[/.-]\\d{2,4}|(?:19|20)\\d{2})`;
const END = `(?:${DATE}|present|current|now|ongoing|till date|pursuing)`;
const RANGE_RE = new RegExp(`(${DATE})\\s*(?:–|—|-|to|till)\\s*(${END})(\\s*\\(expected\\))?`, 'i');
const SINGLE_DATE_RE = new RegExp(`\\b(${MONTH}\\.?\\s*(?:19|20)\\d{2}|(?:19|20)\\d{2})\\b`, 'i');
const BULLET_RE = /^\s*(?:[-•▪●◦○■□➢➤►*·–]|\d+[.)])\s+/;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,5}/;
// Real domain endings only, so "Node.js" or "Next.js" are not taken for links
const URL_SRC = String.raw`\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|in|io|dev|xyz|org|net|app|co|ai|me|tech|site|page|cloud|live|edu)\b(?:\/[^\s|,)\]]*)?`;
const URL_RE = new RegExp(URL_SRC, 'gi');
const HAS_URL = new RegExp(URL_SRC, 'i');
const ROLE_WORDS = /\b(developer|engineer|analyst|designer|manager|intern|scientist|consultant|architect|administrator|specialist|lead|associate|executive|officer|tester|programmer|trainee|researcher|coordinator|marketer|accountant|student)\b/i;
const SCHOOL_WORDS = /\b(university|college|institute|institution|school|academy|vidyalaya|polytechnic|iit|nit|iiit|campus)\b/i;
const DEGREE_WORDS = /\b(b\.?\s?tech|m\.?\s?tech|b\.?\s?e\b|m\.?\s?e\b|b\.?\s?sc|m\.?\s?sc|bca|mca|bba|mba|b\.?\s?com|m\.?\s?com|b\.?a\b|m\.?a\b|bachelor|master|ph\.?d|doctorate|diploma|class\s*(?:x|xii|10|12)|10th|12th|higher secondary|secondary|ssc|hsc|icse|isc|cbse|matric|intermediate)\b/i;

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const stripBullet = (s) => clean(String(s).replace(BULLET_RE, ''));
const norm = (s) => clean(s).toLowerCase().replace(/[^a-z& ]/g, '').replace(/&/g, 'and').replace(/\s+/g, ' ').trim();

function sectionOf(line) {
    const raw = clean(line).replace(/[:|]+$/, '');
    // "Languages: JavaScript, Python" is content, not a heading
    if (!raw || raw.length > 42 || /[.,;]$/.test(raw) || /:\s*\S/.test(raw) || EMAIL_RE.test(raw)) return null;
    const n = norm(raw);
    if (!n || n.split(' ').length > 5) return null;
    for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
        if (aliases.includes(n)) return key;
    }
    // "Technical Skills & Tools", "Work Experience (Internships)"
    for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
        if (aliases.some((a) => a.length > 4 && n.startsWith(a))) return key;
    }
    return null;
}

const uniq = (list) => {
    const seen = new Set();
    return list.filter((x) => {
        const k = x.toLowerCase();
        if (!x || seen.has(k)) return false;
        seen.add(k);
        return true;
    });
};

// Join wrapped lines back onto the bullet or line they continue
function joinWrapped(lines) {
    const out = [];
    for (const line of lines) {
        const prev = out[out.length - 1];
        const isBullet = BULLET_RE.test(line);
        if (prev && !isBullet && /^[a-z(]/.test(line) && !RANGE_RE.test(line)) {
            // "pre-" + "dictive" -> "predictive"
            out[out.length - 1] = /[a-z]-$/.test(prev) ? `${prev.slice(0, -1)}${line}` : `${prev} ${line}`;
        }
        else out.push(line);
    }
    return out;
}

function findDates(line) {
    const m = line.match(RANGE_RE);
    if (m) return { text: clean(m[0]), rest: clean(line.replace(m[0], '').replace(/[|,–—-]\s*$/, '').replace(/^\s*[|,–—-]/, '')) };
    const s = line.match(SINGLE_DATE_RE);
    if (s && line.length < 60) return { text: clean(s[0]), rest: clean(line.replace(s[0], '').replace(/[|,–—-]\s*$/, '').replace(/^\s*[|,–—-]/, '')) };
    return null;
}

// Split "Company | Role", "Role at Company", "Role, Company, City"
function splitHeader(parts) {
    const pieces = parts.flatMap((p) => p.split(/\s+(?:\||–|—)\s+|\s+at\s+|\s+@\s+/i)).map(clean).filter(Boolean);
    return pieces;
}

function parseExperience(lines) {
    const entries = [];
    let cur = null;
    const start = () => { cur = { header: [], bullets: [], dates: '' }; entries.push(cur); };
    for (const line of joinWrapped(lines)) {
        if (BULLET_RE.test(line)) {
            if (!cur) start();
            cur.bullets.push(stripBullet(line));
            continue;
        }
        const d = findDates(line);
        // A non-bullet line after bullets, or a second dated line, starts a new entry
        if (!cur || cur.bullets.length || (d && cur.dates)) start();
        if (d) {
            cur.dates = d.text;
            if (d.rest) cur.header.push(d.rest);
        } else {
            // A long sentence with no bullet marker is still a bullet
            if (cur.header.length >= 2 && line.length > 70) cur.bullets.push(line);
            else cur.header.push(line);
        }
    }
    return entries.filter((e) => e.header.length || e.bullets.length).map((e) => {
        const pieces = splitHeader(e.header);
        const roleIdx = pieces.findIndex((p) => ROLE_WORDS.test(p));
        const role = roleIdx >= 0 ? pieces[roleIdx] : (pieces[1] || pieces[0] || '');
        const rest = pieces.filter((_, i) => i !== (roleIdx >= 0 ? roleIdx : (pieces[1] ? 1 : 0)));
        const company = rest[0] || '';
        const location = rest.slice(1).find((p) => p.length < 40 && !ROLE_WORDS.test(p)) || '';
        return {
            role,
            company,
            location,
            dates: e.dates,
            type: /intern/i.test(role) ? 'Internship' : 'Full-time',
            bullets: e.bullets,
        };
    });
}

function parseScore(text) {
    const cgpa = text.match(/\b(c?gpa|sgpa)\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)(?:\s*\/\s*(\d{1,2}(?:\.\d)?))?/i)
        || text.match(/(\d{1,2}\.\d{1,2})\s*(?:\/\s*(10|4(?:\.0)?))?\s*(c?gpa|sgpa)/i);
    if (cgpa) {
        const [type, score, max] = /gpa/i.test(cgpa[1] || '') ? [cgpa[1], cgpa[2], cgpa[3]] : [cgpa[3], cgpa[1], cgpa[2]];
        const t = String(type).toLowerCase();
        return { scoreType: t === 'sgpa' ? 'sgpa' : t === 'gpa' && Number(max) === 4 ? 'gpa' : 'cgpa', score, scoreMax: max || '' };
    }
    const pct = text.match(/(\d{2}(?:\.\d{1,2})?)\s*%/);
    if (pct) return { scoreType: 'percentage', score: pct[1], scoreMax: '' };
    return null;
}

function parseEducation(lines) {
    const entries = [];
    let cur = null;
    for (const line of joinWrapped(lines)) {
        const text = stripBullet(line);
        const isSchool = SCHOOL_WORDS.test(text);
        const isDegree = DEGREE_WORDS.test(text);
        // Each school or degree line that the current entry already has starts a new one
        if (!cur || (isSchool && cur.school) || (isDegree && cur.degree && !isSchool)) {
            cur = { school: '', degree: '', dates: '', extra: [] };
            entries.push(cur);
        }
        const d = findDates(text);
        let rest = d ? d.rest : text;
        if (d && !cur.dates) cur.dates = d.text;
        const score = parseScore(rest);
        if (score) {
            Object.assign(cur, score);
            rest = clean(rest.replace(/\b(c?gpa|sgpa)\s*[:\-]?\s*[\d./]+|[\d./]+\s*(c?gpa|sgpa)|\d{2}(?:\.\d{1,2})?\s*%/gi, '').replace(/[|,–—-]\s*$/, ''));
        }
        const parts = rest.split(/\s+\|\s+|\s+–\s+|\s+—\s+/).map(clean).filter(Boolean);
        for (const p of parts) {
            if (!cur.school && SCHOOL_WORDS.test(p)) cur.school = p;
            else if (!cur.degree && DEGREE_WORDS.test(p)) cur.degree = p;
            else if (p.length > 1) cur.extra.push(p);
        }
    }
    return entries.filter((e) => e.school || e.degree).map((e) => ({
        school: e.school || e.extra.shift() || '',
        degree: e.degree || e.extra.shift() || '',
        dates: e.dates,
        ...(e.score ? { scoreType: e.scoreType, score: e.score, scoreMax: e.scoreMax } : {}),
    }));
}

function parseProjects(lines) {
    const entries = [];
    let cur = null;
    for (const line of joinWrapped(lines)) {
        if (BULLET_RE.test(line)) {
            if (!cur) { cur = { header: [], bullets: [] }; entries.push(cur); }
            cur.bullets.push(stripBullet(line));
            continue;
        }
        if (!cur || cur.bullets.length) { cur = { header: [], bullets: [] }; entries.push(cur); }
        cur.header.push(line);
    }
    return entries.filter((e) => e.header.length).map((e) => {
        const [first, ...more] = e.header;
        const d = findDates(first);
        const titleLine = d ? d.rest : first;
        const urls = e.header.join(' ').match(URL_RE) || [];
        const repoUrl = urls.find((u) => /github|gitlab|bitbucket/i.test(u)) || '';
        const liveUrl = urls.find((u) => u !== repoUrl && !/linkedin/i.test(u)) || '';
        const name = clean(titleLine.replace(URL_RE, '').replace(/\[?(live demo|github|demo|link|code)\]?/gi, '').replace(/[|·]\s*$/, ''));
        const techLine = more.find((m) => (m.match(/,/g) || []).length >= 1 && m.length < 140) || '';
        const descLines = more.filter((m) => m !== techLine);
        const range = d ? d.text.split(/\s*(?:–|—|-|to)\s*/i) : [];
        return {
            name,
            tech: techLine ? techLine.replace(/^(tech(nologies)?|stack|tools)\s*[:\-]\s*/i, '').split(/\s*[,|]\s*/).map(clean).filter(Boolean) : [],
            description: [...descLines, ...e.bullets.map((b) => `- ${b}`)].join('\n'),
            liveUrl: liveUrl ? (/^https?:/i.test(liveUrl) ? liveUrl : `https://${liveUrl}`) : '',
            repoUrl: repoUrl ? (/^https?:/i.test(repoUrl) ? repoUrl : `https://${repoUrl}`) : '',
            startDate: '',
            endDate: '',
            current: /present|ongoing|current/i.test(range[1] || ''),
        };
    });
}

function parseSkills(lines) {
    const out = [];
    for (const line of lines) {
        const text = stripBullet(line);
        const body = text.includes(':') ? text.slice(text.indexOf(':') + 1) : text;
        for (const piece of body.split(/\s*[,|•·;]\s*|\s{3,}/)) {
            const s = clean(piece.replace(/^and\s+/i, '').replace(/[.]$/, ''));
            if (s && s.length <= 40 && s.split(' ').length <= 5) out.push(s);
        }
    }
    return uniq(out);
}

function listItems(lines) {
    return uniq(joinWrapped(lines).map(stripBullet).filter((l) => l.length > 2));
}

function experienceLevel(experience) {
    let months = 0;
    for (const e of experience) {
        if (/intern/i.test(e.role)) continue;
        const years = (e.dates.match(/(19|20)\d{2}/g) || []).map(Number);
        const end = /present|current|now/i.test(e.dates) ? new Date().getFullYear() : years[1] || years[0];
        if (years[0] && end) months += Math.max(0, end - years[0]) * 12;
    }
    const y = months / 12;
    return y >= 9 ? 'lead' : y >= 5 ? 'senior' : y >= 2 ? 'mid' : 'entry';
}

export function parseResumeText(rawText) {
    const lines = String(rawText || '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const sections = { header: [] };
    let current = 'header';
    for (const line of lines) {
        const key = sectionOf(line);
        if (key) { current = key; sections[key] = sections[key] || []; continue; }
        (sections[current] = sections[current] || []).push(line);
    }

    // ---- Contact details from the header (or anywhere, as a fallback)
    const headerText = sections.header.join(' \n ');
    const allText = lines.join('\n');
    const email = (headerText.match(EMAIL_RE) || allText.match(EMAIL_RE) || [''])[0];
    const phoneMatch = (headerText.match(PHONE_RE) || [''])[0];
    const phone = phoneMatch.replace(/\D/g, '').length >= 10 ? clean(phoneMatch) : '';
    const urls = (allText.match(URL_RE) || []).filter((u) => !EMAIL_RE.test(u) && !u.includes('@'));
    const linkedin = urls.find((u) => /linkedin\.com/i.test(u)) || '';
    const github = urls.find((u) => /github\.com/i.test(u) && u.split('/').filter(Boolean).length <= 3) || '';
    const plain = sections.header.filter((l) => !EMAIL_RE.test(l) && !HAS_URL.test(l) && (l.match(/\d/g) || []).length < 9); // phone lines out, PIN codes stay
    const rawName = plain.find((l) => /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(l) && l.split(' ').length <= 5) || '';
    // "SAYAN PAUL" -> "Sayan Paul"
    const name = rawName === rawName.toUpperCase()
        ? rawName.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
        : rawName;
    const title = plain.find((l) => l !== rawName && ROLE_WORDS.test(l) && l.length < 70) || '';
    const location = plain.find((l) => l !== rawName && l !== title && /,/.test(l) && l.length < 90 && !ROLE_WORDS.test(l)) || '';

    const experience = parseExperience(sections.experience || []);
    const education = parseEducation(sections.education || []);
    const projects = parseProjects(sections.projects || []);
    const skills = parseSkills(sections.skills || []);
    const summary = clean((sections.summary || []).join(' '));
    const certifications = listItems(sections.certifications || []);
    const achievements = listItems(sections.achievements || []);
    const languages = parseSkills(sections.languages || []);

    const roles = uniq([title, ...experience.map((e) => e.role)].map((r) => clean(r.replace(/\(.*?\)/g, ''))).filter((r) => r && ROLE_WORDS.test(r) && r.length < 60)).slice(0, 4);

    return {
        personalInfo: { name, title, email, phone, location, linkedin, github },
        summary,
        skills,
        experience,
        education,
        projects,
        certifications,
        achievements,
        languages,
        expertise: [],
        industries: [],
        suggestedRoles: roles,
        experienceLevel: experience.length ? experienceLevel(experience) : 'entry',
    };
}

// Enough was found to be useful without the AI
export function hasUsefulParse(p) {
    return Boolean(p && (p.skills.length >= 3 || p.experience.length || p.education.length || p.projects.length));
}
