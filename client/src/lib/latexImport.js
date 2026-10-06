// LaTeX source -> resume builder data. Reads the structure Appliqa generates
// (and similar hand-written resumes): \section{} blocks, "\textbf{Title} \hfill
// Date" rows, itemize bullets and \href links. Plain text inside each section is
// handed to the same rule-based parsers the file import uses.
import { SECTION_ALIASES, sectionOf, parseSection, parseResumeText } from './parseResume';
import { BUILT_IN_SECTIONS, newCustomId, placeLine } from './resumeDesign';

const FORMAT_CMDS = 'textbf|textit|emph|underline|textsc|texttt|textsf|textrm|textup|textmd|MakeUppercase|MakeLowercase|uppercase|mbox|text';

// Remove `\name` together with its next `nargs` brace groups (balanced)
function stripCommand(src, name, nargs) {
    let out = src;
    const re = new RegExp(`\\\\${name}\\*?(?:\\[[^\\]]*\\])?`, 'g');
    let m;
    while ((m = re.exec(out))) {
        let i = m.index + m[0].length;
        for (let a = 0; a < nargs; a++) {
            while (out[i] === ' ') i++;
            if (out[i] !== '{') break;
            let depth = 0;
            for (; i < out.length; i++) {
                if (out[i] === '\\') { i++; continue; }
                if (out[i] === '{') depth++;
                else if (out[i] === '}' && --depth === 0) { i++; break; }
            }
        }
        out = out.slice(0, m.index) + out.slice(i);
        re.lastIndex = m.index;
    }
    return out;
}

const shortUrl = (u) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

// One LaTeX fragment -> plain lines ("- " bullets, "   " where \hfill was)
function toText(src) {
    let s = src;
    s = stripCommand(s, 'IfFileExists', 3);
    s = stripCommand(s, 'includegraphics', 1);
    // Layout commands whose arguments are settings, not resume text
    for (const [name, n] of [['pagestyle', 1], ['thispagestyle', 1], ['setlength', 2], ['addtolength', 2], ['label', 1], ['hypersetup', 1], ['titlerule', 0], ['setstretch', 1], ['linespread', 1]]) s = stripCommand(s, name, n);
    s = s.replace(/\\(?:begin|end)\{[^}]*\}(?:\[[^\]]*\])?(?:\{[^}]*\})?/g, '\n');
    // placeholders for escaped characters so brace/tilde handling can't eat them
    s = s.replace(/\\textasciitilde(\{\})?/g, '\u0001').replace(/\$\\sim\$/g, '\u0001')
        .replace(/\\textless(\{\})?|\$<\$/g, '\u0002').replace(/\\textgreater(\{\})?|\$>\$/g, '\u0003')
        .replace(/\\\{/g, '\u0004').replace(/\\\}/g, '\u0005')
        .replace(/\\\$/g, '\u0006')
        .replace(/\\([&%#_])/g, '$1');
    // links: keep the address when the text is a label like [Live Demo]
    s = s.replace(/\\href\{([^}]*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (_, url, text) => {
        const u = url.replace(/\\([%#&_])/g, '$1');
        if (/^mailto:/i.test(u)) return u.slice(7);
        const label = text.replace(/\\[a-zA-Z]+|[{}[\]]/g, '').trim();
        if (!label || /^(live\s*demo|demo|github|code|link|website|portfolio|view)$/i.test(label) || shortUrl(u) === shortUrl(label)) return `\u0007 ${u} \u0007`;
        return `\u0007${label}\u0007`;
    });
    s = s.replace(/\\url\{([^}]*)\}/g, ' $1 ');
    // Unwrapped text keeps a separator (\u0007) so "\noindent\textbf{Indian…}"
    // doesn't become "\noindentIndian…" and lose its first word below
    s = s.replace(/\\textcolor\{[^}]*\}\{([^{}]*)\}/g, '\u0007$1\u0007');
    for (let k = 0; k < 6; k++) s = s.replace(new RegExp(`\\\\(?:${FORMAT_CMDS})\\{([^{}]*)\\}`, 'g'), '\u0007$1\u0007');
    s = s.replace(/\\item\b\s*/g, '\n- ')
        .replace(/\\\\(\*)?(\[[^\]]*\])?/g, '\n')
        .replace(/\\newline\b|\\par\b/g, '\n')
        .replace(/\\hfill\b/g, '   ')
        .replace(/\\(?:vspace|hspace|vskip|hskip)\*?\{[^}]*\}/g, ' ')
        .replace(/\\textbar(\{\})?\\?\s?/g, ' | ')
        .replace(/\\textbullet(\{\})?\\?\s?/g, ' • ')
        .replace(/\\textperiodcentered(\{\})?\\?\s?/g, ' · ')
        .replace(/\\(?:color|rule)(\[[^\]]*\])?\{[^}]*\}(\{[^}]*\})?/g, '')
        .replace(/\\[a-zA-Z]+\*?/g, '') // remaining declarations (\noindent, \LARGE, \centering…)
        .replace(/[{}\u0007]/g, '')
        .replace(/---/g, '—').replace(/--/g, '–').replace(/``/g, '“').replace(/''/g, '”')
        .replace(/~/g, ' ').replace(/\$/g, '')
        .replace(/\u0001/g, '~').replace(/\u0002/g, '<').replace(/\u0003/g, '>').replace(/\u0004/g, '{').replace(/\u0005/g, '}').replace(/\u0006/g, '$');
    return s.split('\n').map((l) => l.replace(/[ \t]+$/, '').replace(/^\s+(?=-)/, '')).map((l) => (l.startsWith('- ') ? l : l.trim())).filter((l) => l.trim());
}

const toInches = (value, unit) => {
    const v = parseFloat(value);
    if (!Number.isFinite(v)) return null;
    return { in: v, cm: v / 2.54, mm: v / 25.4, pt: v / 72.27 }[unit] ?? null;
};

function readDesign(preamble) {
    const patch = {};
    const hex = preamble.match(/\\definecolor\{primary\}\{HTML\}\{([0-9a-f]{6})\}/i);
    const rgb = preamble.match(/\\definecolor\{primary\}\{RGB\}\{\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\}/i);
    if (hex) patch.accent = `#${hex[1].toUpperCase()}`;
    else if (rgb) patch.accent = `#${rgb.slice(1, 4).map((n) => Math.min(255, +n).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    const geo = preamble.match(/\\geometry\{([^}]*)\}|\\usepackage\[([^\]]*)\]\{geometry\}/);
    if (geo) {
        const opts = geo[1] || geo[2];
        const get = (k) => { const m = opts.match(new RegExp(`\\b${k}\\s*=\\s*([\\d.]+)\\s*(in|cm|mm|pt)`)); return m ? toInches(m[1], m[2]) : null; };
        const margin = get('margin');
        const top = get('top') ?? margin;
        const left = get('left') ?? margin;
        if (top) patch.marginY = Math.round(top * 100) / 100;
        if (left) patch.marginX = Math.round(left * 100) / 100;
    }
    const size = preamble.match(/\\documentclass\[[^\]]*?(\d{2})pt/);
    if (size) patch.bodySize = Number(size[1]);
    const fontPt = patch.bodySize || 10;

    // Spacing, using the same scale the generator writes (see resumeLatex.js)
    const stretch = preamble.match(/\\setstretch\{([\d.]+)\}/) || preamble.match(/\\linespread\{([\d.]+)\}/);
    if (stretch) patch.lineHeight = round2(parseFloat(stretch[1]) * 1.3);
    const ts = preamble.match(/\\titlespacing\*?\{\\section\}\{[^}]*\}\{([^}]*)\}\{([^}]*)\}/);
    if (ts) {
        const before = toPt(ts[1], fontPt);
        const after = toPt(ts[2], fontPt);
        if (before !== null) patch.sectionGap = round2(before / 0.55);
        if (after !== null) patch.titleGap = round2(after / 0.6);
    }
    const list = preamble.match(/\\setlist\[itemize\]\{([^}]*)\}/);
    const itemsep = list?.[1].match(/itemsep\s*=\s*(-?[\d.]+\s*(?:pt|em|ex|mm))/);
    if (itemsep) { const v = toPt(itemsep[1], fontPt); if (v !== null) patch.itemGap = round2(v * 2); }
    return patch;
}

const round2 = (n) => Math.round(n * 100) / 100;
// "4pt", "0.5em", "1ex", "2mm" -> points at the document's font size
function toPt(value, fontPt) {
    const m = String(value).trim().match(/^(-?[\d.]+)\s*(pt|em|ex|mm|cm|in)?/);
    if (!m) return null;
    const v = parseFloat(m[1]);
    const unit = m[2] || 'pt';
    return { pt: v, em: v * fontPt, ex: v * fontPt * 0.43, mm: v * 2.845, cm: v * 28.45, in: v * 72.27 }[unit];
}

// Gap between entries: the most common positive \vspace inside the sections;
// a global \small or \footnotesize shrinks the body text
function readBodySpacing(body, fontPt) {
    const patch = {};
    const sections = body.slice(Math.max(0, body.search(/\\section\*?\{/)));
    const gaps = [...sections.matchAll(/\\vspace\*?\{([^}]*)\}/g)].map((m) => toPt(m[1], fontPt)).filter((v) => v !== null && v > 0);
    if (gaps.length) {
        const counts = new Map();
        for (const g of gaps) counts.set(g, (counts.get(g) || 0) + 1);
        const common = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        patch.blockGap = round2(common / 0.5);
    }
    const shrink = body.match(/^\s*(?:\\pagestyle\{[^}]*\}\s*)?\\(small|footnotesize|scriptsize)\b/);
    if (shrink) patch.bodySize = round2(fontPt * { small: 0.9, footnotesize: 0.8, scriptsize: 0.7 }[shrink[1]]);
    return patch;
}

const norm = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

// \section title -> builder section key (or null for a custom section)
function keyForTitle(title, design) {
    const n = norm(title);
    for (const [key, renamed] of Object.entries(design.titles || {})) if (norm(renamed) === n) return key;
    const builtIn = BUILT_IN_SECTIONS.find((s) => norm(s.label) === n);
    if (builtIn) return builtIn.key;
    if (/^(areas of )?expertise$|^core competencies$/.test(n)) return 'expertise';
    const viaAlias = sectionOf(title);
    if (viaAlias && SECTION_ALIASES[viaAlias]) return viaAlias;
    return null;
}

// "Title   Date" rows with bullets -> custom section entries
function customEntries(lines) {
    const items = [];
    let cur = null;
    for (const line of lines) {
        if (line.startsWith('- ')) {
            if (!cur) { cur = { id: newCustomId(), title: '', subtitle: '', date: '', description: '' }; items.push(cur); }
            cur.description += `${cur.description ? '\n' : ''}${line}`;
            continue;
        }
        if (!cur || cur.description || (cur.title && cur.subtitle)) {
            cur = { id: newCustomId(), title: '', subtitle: '', date: '', description: '' };
            items.push(cur);
        }
        const [left, right] = line.split(/\s{3,}/);
        if (!cur.title) { cur.title = left.trim(); cur.date = (right || '').trim(); } else cur.subtitle = line.trim();
    }
    return items;
}

export function latexToResume(code, { design, customSections = [], personalInfo = {} }) {
    const src = String(code || '').split('\n').map((l) => l.replace(/(^|[^\\])%.*$/, '$1')).join('\n');
    const begin = src.indexOf('\\begin{document}');
    const end = src.indexOf('\\end{document}');
    if (begin < 0) throw new Error('No \\begin{document} found, so there is nothing to read.');
    const preamble = src.slice(0, begin);
    const body = src.slice(begin + '\\begin{document}'.length, end > begin ? end : undefined);

    const parts = body.split(/\\section\*?\{([^}]*)\}/);
    const headerLines = toText(parts[0]);
    const sections = [];
    for (let i = 1; i < parts.length; i += 2) sections.push({ title: toText(parts[i]).join(' ').trim() || parts[i], lines: toText(parts[i + 1] || '') });
    if (!sections.length && !headerLines.length) throw new Error('No resume content found in the code.');

    // ---- header: name, title, contact
    const head = parseResumeText(headerLines.join('\n')).personalInfo;
    const urls = headerLines.join(' ').match(/https?:\/\/[^\s|]+/g) || [];
    const website = urls.find((u) => !/linkedin\.com|github\.com/i.test(u)) || '';
    const currentPlace = placeLine(personalInfo);
    const place = head.location || '';
    const info = {
        ...personalInfo,
        ...Object.fromEntries(Object.entries({ name: head.name, title: head.title, email: head.email, phone: head.phone, linkedin: head.linkedin, github: head.github, website }).filter(([, v]) => v)),
        // Same address line as before: keep its parts; otherwise take it as the location
        ...(place && place !== currentPlace ? { location: place, address: '', country: '' } : {}),
    };

    // ---- sections
    const data = {
        personalInfo: info,
        summary: '', experience: [], education: [], projects: [], skills: [], expertise: [],
        certifications: [], achievements: [], languages: [], customSections: [],
    };
    const order = [];
    const titles = { ...(design.titles || {}) };
    for (const { title, lines } of sections) {
        const key = keyForTitle(title, design);
        if (key) {
            if (key === 'expertise') data.expertise = parseSection('skills', lines.map((l) => l.replace(/\s*•\s*/g, ', ')));
            else data[key] = parseSection(key, lines) ?? data[key];
            order.push(key);
            const label = BUILT_IN_SECTIONS.find((s) => s.key === key)?.label;
            if (label && norm(label) !== norm(title)) titles[key] = title; else delete titles[key];
        } else {
            const existing = customSections.find((c) => norm(c.title) === norm(title));
            const hasRows = lines.some((l) => !l.startsWith('- ') && /\s{3,}/.test(l));
            const kind = existing?.kind || (hasRows ? 'entries' : 'text');
            const section = kind === 'entries'
                ? { id: existing?.id || newCustomId(), kind, title, items: customEntries(lines) }
                : { id: existing?.id || newCustomId(), kind: 'text', title, text: lines.join('\n') };
            data.customSections.push(section);
            order.push(section.id);
        }
    }

    const fromPreamble = readDesign(preamble);
    const designPatch = {
        ...fromPreamble,
        ...readBodySpacing(body, fromPreamble.bodySize || 10),
        sectionOrder: order,
        titles,
        hidden: (design.hidden || []).filter((k) => !order.includes(k)),
    };
    return { data, designPatch, sectionCount: sections.length };
}
