// Look-and-layout settings for the resume builder, saved per resume as `design`.
// Sizes are in pt and margins in inches so the preview matches the printed PDF.

export const BUILT_IN_SECTIONS = [
    { key: 'summary', label: 'Professional summary' },
    { key: 'experience', label: 'Work experience' },
    { key: 'projects', label: 'Projects' },
    { key: 'education', label: 'Education' },
    { key: 'skills', label: 'Skills' },
    { key: 'expertise', label: 'Areas of expertise' },
    { key: 'certifications', label: 'Certifications' },
    { key: 'achievements', label: 'Achievements' },
    { key: 'languages', label: 'Languages' },
];

export const FONTS = [
    { value: 'arial', label: 'Arial', stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
    { value: 'calibri', label: 'Calibri', stack: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' },
    { value: 'mona', label: 'Mona Sans', stack: '"Mona Sans Variable", "Segoe UI", Arial, sans-serif' },
    { value: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
    { value: 'georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
    { value: 'garamond', label: 'Garamond', stack: 'Garamond, "EB Garamond", Georgia, serif' },
    { value: 'times', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
];

export const ACCENTS = ['#2163CA', '#171717', '#CA3C0A', '#0F766E', '#7C3AED', '#B91C1C', '#047857', '#A16207'];

export const WEIGHTS = [
    { value: 400, label: 'Regular' },
    { value: 500, label: 'Medium' },
    { value: 600, label: 'Semibold' },
    { value: 700, label: 'Bold' },
    { value: 800, label: 'Extra bold' },
];

export const DEFAULT_DESIGN = {
    template: 'modern', // modern | classic | elegant
    accent: '#2163CA',
    font: 'arial',
    nameSize: 24,
    titleSize: 11,
    sectionSize: 12,
    headingSize: 10.5,
    bodySize: 10,
    lineHeight: 1.35,
    nameWeight: 700,
    sectionWeight: 700,
    headingWeight: 700,
    marginY: 0.5,
    marginX: 0.6,
    sectionGap: 14,
    titleGap: 6,
    blockGap: 8,
    itemGap: 2,
    headerAlign: 'left', // left | center | right
    dateAlign: 'right', // right | inline
    skillsLayout: 'inline', // inline | columns
    skillsColumns: 3,
    educationFirst: 'institution', // institution | degree
    photoShow: true,
    photoSize: 80, // pt
    photoShape: 'square', // square | rounded | circle
    sectionOrder: BUILT_IN_SECTIONS.map((s) => s.key),
    hidden: [],
    titles: {},
};

const clamp = (n, min, max, fallback) => {
    const v = Number(n);
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

// Fill gaps and keep stored values in range; also keeps the section order in
// step with the built-in and custom sections that exist right now.
export function normalizeDesign(design, customSections = []) {
    const stored = design && typeof design === 'object' ? design : {};
    const d = { ...DEFAULT_DESIGN, ...stored };
    // Designs saved before v2 carry the old default photo shape ("rounded")
    if (!stored.v && stored.photoShape === 'rounded') d.photoShape = 'square';
    d.v = 2;
    const out = {
        ...d,
        template: oneOf(d.template, ['modern', 'classic', 'elegant'], 'modern'),
        accent: /^#[0-9a-f]{6}$/i.test(d.accent) ? d.accent : DEFAULT_DESIGN.accent,
        font: FONTS.some((f) => f.value === d.font) ? d.font : DEFAULT_DESIGN.font,
        nameSize: clamp(d.nameSize, 16, 40, 24),
        titleSize: clamp(d.titleSize, 8, 16, 11),
        sectionSize: clamp(d.sectionSize, 9, 18, 12),
        headingSize: clamp(d.headingSize, 9, 16, 10.5),
        bodySize: clamp(d.bodySize, 8, 13, 10),
        lineHeight: clamp(d.lineHeight, 1.1, 1.8, 1.35),
        nameWeight: clamp(d.nameWeight, 400, 800, 700),
        sectionWeight: clamp(d.sectionWeight, 400, 800, 700),
        headingWeight: clamp(d.headingWeight, 400, 800, 700),
        marginY: clamp(d.marginY, 0.2, 1.2, 0.5),
        marginX: clamp(d.marginX, 0.2, 1.2, 0.6),
        sectionGap: clamp(d.sectionGap, 4, 32, 14),
        titleGap: clamp(d.titleGap, 0, 16, 6),
        blockGap: clamp(d.blockGap, 0, 24, 8),
        itemGap: clamp(d.itemGap, 0, 10, 2),
        headerAlign: oneOf(d.headerAlign, ['left', 'center', 'right'], 'left'),
        dateAlign: oneOf(d.dateAlign, ['right', 'inline'], 'right'),
        skillsLayout: oneOf(d.skillsLayout, ['inline', 'columns'], 'inline'),
        skillsColumns: clamp(d.skillsColumns, 2, 5, 3),
        educationFirst: oneOf(d.educationFirst, ['institution', 'degree'], 'institution'),
        photoShow: d.photoShow !== false,
        photoSize: clamp(d.photoSize, 48, 140, 80),
        photoShape: oneOf(d.photoShape, ['square', 'rounded', 'circle'], 'square'),
        hidden: Array.isArray(d.hidden) ? d.hidden.filter((k) => typeof k === 'string') : [],
        titles: d.titles && typeof d.titles === 'object' ? d.titles : {},
    };
    const valid = [...BUILT_IN_SECTIONS.map((s) => s.key), ...customSections.map((c) => c.id)];
    const order = (Array.isArray(d.sectionOrder) ? d.sectionOrder : []).filter((k) => valid.includes(k));
    for (const k of valid) if (!order.includes(k)) order.push(k);
    out.sectionOrder = [...new Set(order)];
    out.hidden = out.hidden.filter((k) => valid.includes(k));
    return out;
}

export const fontStack = (font) => (FONTS.find((f) => f.value === font) || FONTS[0]).stack;

export function sectionTitle(design, key, customSections = []) {
    const custom = customSections.find((c) => c.id === key);
    if (custom) return custom.title || 'Custom section';
    return design.titles?.[key] || BUILT_IN_SECTIONS.find((s) => s.key === key)?.label || key;
}

export const newCustomId = () => `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Resize an uploaded photo in the browser so the saved resume stays small
export function readPhoto(file, maxSide = 360) {
    return new Promise((resolve, reject) => {
        if (!file || !/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
            reject(new Error('Use a PNG, JPG or WebP image.'));
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            reject(new Error('That image is over 8 MB. Try a smaller one.'));
            return;
        }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('That image could not be read.'));
        };
        img.src = url;
    });
}
