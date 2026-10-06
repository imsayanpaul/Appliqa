import { certificationLabel, formatScore, formatRange, safeUrl } from '../../lib/resumeProfile';
import { fontStack, sectionTitle } from '../../lib/resumeDesign';
import './resumeDocument.css';

const ensureHttp = (url) => (!url ? '' : /^https?:\/\//i.test(url) ? url : `https://${url}`);
const shortUrl = (url) => String(url || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

// Lines starting with "-", "•" or "*" become bullets; the rest are paragraphs
function RichText({ text }) {
    const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const out = [];
    let bullets = [];
    const flush = () => {
        if (bullets.length) out.push(<ul key={`u${out.length}`} className="rd-bullets">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
        bullets = [];
    };
    lines.forEach((line, i) => {
        if (/^[-•*]\s+/.test(line)) bullets.push(line.replace(/^[-•*]\s+/, ''));
        else { flush(); out.push(<p key={`p${i}`} className="rd-p">{line}</p>); }
    });
    flush();
    return out;
}

// Heading row with the date either pushed right or run inline
function EntryHead({ title, date, inline }) {
    if (!date) return <div className="rd-h">{title}</div>;
    return inline
        ? <div className="rd-h">{title}<span className="rd-date-inline"> · {date}</span></div>
        : <div className="rd-row"><div className="rd-h">{title}</div><div className="rd-date">{date}</div></div>;
}

export default function ResumeDocument({ data, design, print = false }) {
    const {
        personalInfo = {}, summary = '', experience = [], education = [], skills = [], expertise = [],
        certifications = [], languages = [], projects = [], achievements = [], customSections = [], photo = '',
    } = data;
    const inline = design.dateAlign === 'inline';

    const contact = [];
    const place = [personalInfo.address, personalInfo.location, personalInfo.country].filter(Boolean).join(', ');
    if (place) contact.push({ text: place });
    if (personalInfo.email) contact.push({ text: personalInfo.email, href: `mailto:${personalInfo.email}` });
    if (personalInfo.phone) contact.push({ text: personalInfo.phone });
    for (const k of ['website', 'linkedin', 'github']) {
        if (personalInfo[k]) contact.push({ text: shortUrl(personalInfo[k]), href: ensureHttp(personalInfo[k]) });
    }
    const details = [personalInfo.dob && `DOB: ${personalInfo.dob}`, personalInfo.nationality].filter(Boolean);

    const sections = {
        summary: summary?.trim() ? <p className="rd-p rd-justify">{summary}</p> : null,

        experience: experience.length ? experience.map((exp, i) => (
            <div key={i} className="rd-block">
                <EntryHead title={exp.company || exp.role || 'Company'} date={exp.dates} inline={inline} />
                {(exp.role || exp.location) && (
                    <div className="rd-sub">
                        {[exp.company ? exp.role : '', exp.type && exp.type !== 'Full-time' ? exp.type : '', exp.location].filter(Boolean).join(' · ')}
                    </div>
                )}
                {exp.bullets?.filter(Boolean).length > 0 && (
                    <ul className="rd-bullets">{exp.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>
                )}
            </div>
        )) : null,

        projects: projects.length ? projects.map((proj, i) => {
            const live = safeUrl(proj.liveUrl);
            const repo = safeUrl(proj.repoUrl);
            const when = proj.startDate || proj.current ? formatRange(proj.startDate, proj.endDate, proj.current, 'Ongoing') : '';
            return (
                <div key={proj.id || i} className="rd-block">
                    <EntryHead title={proj.name} date={when} inline={inline} />
                    {proj.tech?.length > 0 && <div className="rd-sub rd-italic">{proj.tech.join(', ')}</div>}
                    {proj.description && <RichText text={proj.description} />}
                    {(live || repo) && (
                        <div className="rd-meta">
                            {live && <a href={live}>{shortUrl(proj.liveUrl)}</a>}
                            {live && repo && ' · '}
                            {repo && <a href={repo}>{shortUrl(proj.repoUrl)}</a>}
                        </div>
                    )}
                </div>
            );
        }) : null,

        education: education.length ? education.map((edu, i) => {
            const school = edu.school || 'Institution';
            const degree = [edu.degree, edu.field].filter(Boolean).join(', ') || 'Degree';
            const [first, second] = design.educationFirst === 'degree' ? [degree, school] : [school, degree];
            const extra = [edu.board, formatScore(edu)].filter(Boolean).join(' · ');
            return (
                <div key={i} className="rd-block">
                    <EntryHead title={first} date={edu.dates} inline={inline} />
                    <div className="rd-sub">{second}</div>
                    {extra && <div className="rd-meta">{extra}</div>}
                </div>
            );
        }) : null,

        skills: skills.length ? (
            design.skillsLayout === 'columns'
                ? <ul className="rd-columns" style={{ gridTemplateColumns: `repeat(${design.skillsColumns}, minmax(0, 1fr))` }}>{skills.map((s) => <li key={s}>{s}</li>)}</ul>
                : <p className="rd-p">{skills.join(', ')}</p>
        ) : null,

        expertise: expertise.length ? <p className="rd-p">{expertise.join(' • ')}</p> : null,

        certifications: certifications.length
            ? <ul className="rd-bullets">{certifications.map((c, i) => <li key={i}>{certificationLabel(c)}</li>)}</ul>
            : null,

        achievements: achievements.length
            ? <ul className="rd-bullets">{achievements.map((a, i) => <li key={i}>{a}</li>)}</ul>
            : null,

        languages: languages.length ? <p className="rd-p">{languages.join(', ')}</p> : null,
    };

    for (const cs of customSections) {
        if (cs.kind === 'text') {
            sections[cs.id] = cs.text?.trim() ? <RichText text={cs.text} /> : null;
        } else {
            const items = (cs.items || []).filter((it) => it.title || it.subtitle || it.description);
            sections[cs.id] = items.length ? items.map((it) => (
                <div key={it.id} className="rd-block">
                    {(it.title || it.date) && <EntryHead title={it.title} date={it.date} inline={inline} />}
                    {it.subtitle && <div className="rd-sub">{it.subtitle}</div>}
                    {it.description && <RichText text={it.description} />}
                </div>
            )) : null;
        }
    }

    const style = {
        '--rd-accent': design.accent,
        '--rd-font': fontStack(design.font),
        '--rd-name': `${design.nameSize}pt`,
        '--rd-role': `${design.titleSize}pt`,
        '--rd-section': `${design.sectionSize}pt`,
        '--rd-heading': `${design.headingSize}pt`,
        '--rd-body': `${design.bodySize}pt`,
        '--rd-lh': design.lineHeight,
        '--rd-name-weight': design.nameWeight,
        '--rd-section-weight': design.sectionWeight,
        '--rd-heading-weight': design.headingWeight,
        '--rd-section-gap': `${design.sectionGap}pt`,
        '--rd-title-gap': `${design.titleGap}pt`,
        '--rd-block-gap': `${design.blockGap}pt`,
        '--rd-item-gap': `${design.itemGap}pt`,
        '--rd-photo': `${design.photoSize}pt`,
        '--rd-pad-y': `${design.marginY}in`,
        '--rd-pad-x': `${design.marginX}in`,
        '--rd-align': design.headerAlign,
    };

    const showPhoto = Boolean(photo) && design.photoShow;
    const visible = design.sectionOrder.filter((key) => !design.hidden.includes(key) && sections[key]);

    return (
        <div className={`rd rd-${design.template} ${print ? 'rd-print' : 'rd-screen'}`} style={style}>
            <header className={`rd-header rd-header-${design.headerAlign} ${showPhoto ? 'has-photo' : ''}`}>
                <div className="rd-header-text">
                    <h1 className="rd-name">{personalInfo.name || 'Your Name'}</h1>
                    {personalInfo.title && <p className="rd-role">{personalInfo.title}</p>}
                    {contact.length > 0 && (
                        <p className="rd-contact">
                            {contact.map((c, i) => (
                                <span key={i}>
                                    {i > 0 && <span className="rd-sep"> | </span>}
                                    {c.href ? <a href={c.href} target="_blank" rel="noopener noreferrer">{c.text}</a> : c.text}
                                </span>
                            ))}
                        </p>
                    )}
                    {details.length > 0 && <p className="rd-contact">{details.join(' | ')}</p>}
                </div>
                {showPhoto && <img src={photo} alt="" className={`rd-photo rd-photo-${design.photoShape}`} />}
            </header>

            {visible.map((key) => (
                <section key={key} className="rd-section">
                    <h2 className="rd-title">{sectionTitle(design, key, customSections)}</h2>
                    <div className="rd-body">{sections[key]}</div>
                </section>
            ))}
        </div>
    );
}
