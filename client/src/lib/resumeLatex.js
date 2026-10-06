// Resume -> LaTeX source (pdfLaTeX, standard packages only), following the
// builder's section order, titles and design settings.
import { certificationLabel, formatScore, formatRange, safeUrl } from './resumeProfile';
import { sectionTitle } from './resumeDesign';

const SPECIAL = {
    '\\': '\\textbackslash{}', '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#', '_': '\\_',
    '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
    '<': '\\textless{}', '>': '\\textgreater{}', '|': '\\textbar{}',
};

// Escape LaTeX specials and swap characters pdfLaTeX can't set
export function tex(value) {
    return String(value ?? '')
        .replace(/[\\&%$#_{}~^<>|]/g, (c) => SPECIAL[c])
        .replace(/₹/g, 'Rs.~')
        .replace(/[•·]/g, '\\textbullet{}')
        .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '') // emoji
        .replace(/\s+/g, ' ')
        .trim();
}

const url = (u) => String(u || '').replace(/[%#\\]/g, (c) => `\\${c}`);
const ensureHttp = (u) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `https://${u}`);
const shortUrl = (u) => String(u || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
const href = (u, text) => (u ? `\\href{${url(u)}}{${tex(text)}}` : tex(text));

const FONT_PACKAGES = {
    arial: '\\usepackage[scaled]{helvet}\n\\renewcommand\\familydefault{\\sfdefault}',
    calibri: '\\usepackage[scaled]{helvet}\n\\renewcommand\\familydefault{\\sfdefault}',
    mona: '\\usepackage[scaled]{helvet}\n\\renewcommand\\familydefault{\\sfdefault}',
    verdana: '\\usepackage[scaled]{helvet}\n\\renewcommand\\familydefault{\\sfdefault}',
    georgia: '\\usepackage{charter}',
    garamond: '\\usepackage{ebgaramond}',
    times: '\\usepackage{mathptmx}',
};

// Lines starting with "-" become bullets, the rest paragraphs
function richText(text) {
    const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const out = [];
    let items = [];
    const flush = () => {
        if (items.length) out.push(`\\begin{itemize}\n${items.map((i) => `    \\item ${tex(i)}`).join('\n')}\n\\end{itemize}`);
        items = [];
    };
    for (const l of lines) {
        if (/^[-•*]\s+/.test(l)) items.push(l.replace(/^[-•*]\s+/, ''));
        else { flush(); out.push(`${tex(l)}\\\\`); }
    }
    flush();
    return out.join('\n');
}

const bullets = (list) => (list?.filter(Boolean).length
    ? `\\begin{itemize}\n${list.filter(Boolean).map((b) => `    \\item ${tex(b)}`).join('\n')}\n\\end{itemize}`
    : '');

// "Title \hfill Date" heading row; inline dates follow the title instead
const headRow = (titleTex, dateText, inline) => {
    if (!dateText) return `\\noindent\\textbf{${titleTex}}`;
    return inline
        ? `\\noindent\\textbf{${titleTex}} \\textperiodcentered\\ \\textit{${tex(dateText)}}`
        : `\\noindent\\textbf{${titleTex}} \\hfill \\textit{${tex(dateText)}}`;
};

export function toLatex(data, design) {
    const {
        personalInfo: p = {}, summary = '', experience = [], education = [], skills = [], expertise = [],
        certifications = [], languages = [], projects = [], achievements = [], customSections = [], photo = '',
    } = data;
    const inline = design.dateAlign === 'inline';
    // Space between entries; read back by the LaTeX import as blockGap
    const gapPt = (design.blockGap * 0.5).toFixed(1);
    const entryGap = `\n\n\\vspace{${gapPt}pt}\n`;
    const accent = (design.accent || '#2163CA').replace('#', '').toUpperCase();
    const fontSize = design.bodySize >= 11.5 ? '12pt' : design.bodySize >= 10.5 ? '11pt' : '10pt';

    // ---- sections
    const blocks = {};
    if (summary?.trim()) blocks.summary = tex(summary);

    if (experience.length) {
        blocks.experience = experience.map((e) => {
            const title = tex(e.company || e.role || 'Company');
            const sub = [e.company ? e.role : '', e.type && e.type !== 'Full-time' ? e.type : '', e.location].filter(Boolean).map(tex).join(' \\textperiodcentered\\ ');
            return [`${headRow(title, e.dates, inline)}${sub ? `\\\\\n\\textit{${sub}}` : ''}`, bullets(e.bullets)].filter(Boolean).join('\n');
        }).join(entryGap);
    }

    if (projects.length) {
        blocks.projects = projects.map((pr) => {
            const live = safeUrl(pr.liveUrl);
            const repo = safeUrl(pr.repoUrl);
            const when = pr.startDate || pr.current ? formatRange(pr.startDate, pr.endDate, pr.current, 'Ongoing') : '';
            let head;
            if (live || repo) {
                const links = [
                    live ? `\\href{${url(live)}}{[Live Demo]}` : '',
                    repo ? `\\href{${url(repo)}}{[${/github\.com/i.test(repo) ? 'GitHub' : 'Code'}]}` : '',
                ].filter(Boolean).join(' \\textbar\\ ');
                head = `\\noindent\\textbf{${tex(pr.name)}}${when ? ` \\textperiodcentered\\ \\textit{${tex(when)}}` : ''} \\hfill ${links}`;
            } else {
                head = headRow(tex(pr.name), when, inline);
            }
            const techLine = pr.tech?.length ? `\\\\\n\\textit{${tex(pr.tech.join(', '))}}` : '';
            return [`${head}${techLine}`, richText(pr.description)].filter(Boolean).join('\n');
        }).join(entryGap);
    }

    if (education.length) {
        blocks.education = education.map((e) => {
            const school = e.school || 'Institution';
            const degree = [e.degree, e.field].filter(Boolean).join(', ') || 'Degree';
            const [first, second] = design.educationFirst === 'degree' ? [degree, school] : [school, degree];
            const extra = [e.board, formatScore(e)].filter(Boolean).map(tex).join(' \\textbar\\ ');
            return `${headRow(tex(first), e.dates, inline)}\\\\\n${tex(second)}${extra ? ` \\textbar\\ \\textbf{${extra}}` : ''}`;
        }).join(`\\\\[${gapPt}pt]\n\n`);
    }

    if (skills.length) {
        blocks.skills = design.skillsLayout === 'columns'
            ? `\\begin{multicols}{${design.skillsColumns}}\n\\begin{itemize}\n${skills.map((s) => `    \\item ${tex(s)}`).join('\n')}\n\\end{itemize}\n\\end{multicols}`
            : `\\noindent ${skills.map(tex).join(', ')}`;
    }
    if (expertise.length) blocks.expertise = `\\noindent ${expertise.map(tex).join(' \\textbullet\\ ')}`;

    if (certifications.length) {
        blocks.certifications = `\\begin{itemize}\n${certifications.map((c) => {
            const link = typeof c === 'object' ? safeUrl(c.credentialUrl) : '';
            const name = typeof c === 'object' ? c.name : '';
            if (link && name) return `    \\item \\textbf{\\href{${url(link)}}{${tex(name)}}}${c.provider ? ` -- ${tex(c.provider)}` : ''}`;
            return `    \\item ${tex(certificationLabel(c))}`;
        }).join('\n')}\n\\end{itemize}`;
    }
    if (achievements.length) blocks.achievements = bullets(achievements);
    if (languages.length) blocks.languages = `\\noindent ${languages.map(tex).join(', ')}`;

    for (const cs of customSections) {
        if (cs.kind === 'text') {
            if (cs.text?.trim()) blocks[cs.id] = richText(cs.text);
        } else {
            const items = (cs.items || []).filter((it) => it.title || it.subtitle || it.description);
            if (items.length) {
                blocks[cs.id] = items.map((it) => [
                    `${it.title || it.date ? headRow(tex(it.title), it.date, inline) : ''}${it.subtitle ? `${it.title || it.date ? '\\\\\n' : '\\noindent '}\\textit{${tex(it.subtitle)}}` : ''}`,
                    richText(it.description),
                ].filter(Boolean).join('\n')).join(entryGap);
            }
        }
    }

    const body = design.sectionOrder
        .filter((key) => !design.hidden.includes(key) && blocks[key])
        .map((key) => `% ------------------- ${sectionTitle(design, key, customSections).toUpperCase()} -------------------\n\\section{${tex(sectionTitle(design, key, customSections))}}\n${blocks[key]}`)
        .join('\n\n');

    // ---- header
    const place = [p.address, p.location, p.country].filter(Boolean).join(', ');
    const line2 = [p.phone ? tex(p.phone) : '', p.email ? href(`mailto:${p.email}`, p.email) : ''].filter(Boolean).join(' \\textbar\\ ');
    const line3 = ['website', 'linkedin', 'github'].filter((k) => p[k]).map((k) => href(ensureHttp(p[k]), shortUrl(p[k]))).join(' \\textbar\\ ');
    const details = [p.dob ? `DOB: ${p.dob}` : '', p.nationality].filter(Boolean).map(tex).join(' \\textbar\\ ');
    const headerLines = [
        `{\\LARGE \\textbf{\\textcolor{primary}{${tex(p.name || 'Your Name')}}}}`,
        p.title ? `\\textbf{${tex(p.title)}}` : '',
        place ? tex(place) : '',
        line2,
        line3,
        details,
    ].filter(Boolean);
    const align = design.headerAlign === 'center' ? '\\centering' : design.headerAlign === 'right' ? '\\raggedleft' : '\\raggedright';
    const headerText = headerLines.map((l, i) => (i === 0 ? `${l}\\\\[3.5pt]` : i < headerLines.length - 1 ? `${l}\\\\[2pt]` : l)).join('\n    ');
    const photoCm = Math.max(1.6, Math.min(4.6, (design.photoSize / 72) * 2.54)).toFixed(2);
    const withPhoto = Boolean(photo) && design.photoShow;
    const photoBox = `\\IfFileExists{photo.jpg}{\\includegraphics[width=${photoCm}cm,height=${photoCm}cm,keepaspectratio]{photo.jpg}}{}`;
    let header;
    if (!withPhoto) {
        header = `\\noindent\n\\begin{minipage}[c]{\\textwidth}\n    ${align}\n    ${headerText}\n\\end{minipage}`;
    } else if (design.headerAlign === 'center') {
        header = `\\begin{center}\n    ${photoBox}\\\\[4pt]\n    ${headerText}\n\\end{center}`;
    } else {
        const text = `\\begin{minipage}[c]{0.76\\textwidth}\n    ${align}\n    ${headerText}\n\\end{minipage}`;
        const pic = `\\begin{minipage}[c]{0.24\\textwidth}\n    ${design.headerAlign === 'right' ? '\\raggedright' : '\\raggedleft'}\n    ${photoBox}\n\\end{minipage}`;
        header = `\\noindent\n${design.headerAlign === 'right' ? `${pic}%\n${text}` : `${text}%\n${pic}`}`;
    }

    const sectionStyle = design.template === 'elegant'
        ? `\\titleformat{\\section}\n  {\\normalfont\\large\\bfseries\\color{primary}\\uppercase}\n  {}{0em}\n  {\\textcolor{primary}{\\rule[-1pt]{3pt}{1em}}\\hspace{5pt}}`
        : `\\titleformat{\\section}\n  {\\normalfont\\large\\bfseries\\color{primary}\\uppercase}\n  {}{0em}\n  {}[\\titlerule]`;

    return `% Generated by Appliqa. Compile with pdfLaTeX (e.g. on Overleaf).
${withPhoto ? '% Your photo: upload it next to this file as photo.jpg (it is skipped if missing).\n' : ''}\\documentclass[a4paper,${fontSize}]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
${FONT_PACKAGES[design.font] || FONT_PACKAGES.arial}
\\usepackage{geometry}
\\geometry{top=${design.marginY}in, bottom=${design.marginY}in, left=${design.marginX}in, right=${design.marginX}in}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{setspace}
\\usepackage{multicol}

\\setstretch{${Math.max(0.9, Math.min(1.4, design.lineHeight / 1.3)).toFixed(2)}}

\\definecolor{primary}{HTML}{${accent}}
\\hypersetup{colorlinks=true, linkcolor=primary, urlcolor=primary}
\\urlstyle{same}

${sectionStyle}

\\titlespacing*{\\section}{0pt}{${(design.sectionGap * 0.55).toFixed(1)}pt}{${(design.titleGap * 0.6).toFixed(1)}pt}

\\setlist[itemize]{leftmargin=1.3em, itemsep=${(design.itemGap / 2).toFixed(1)}pt, topsep=1.5pt, parsep=0pt}

\\begin{document}
\\pagestyle{empty}

% ------------------- HEADER -------------------
${header}

\\vspace{1pt}

${body}

\\end{document}
`;
}
