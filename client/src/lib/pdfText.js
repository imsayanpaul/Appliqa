// PDF -> plain text that keeps line breaks, so resume sections can be found.
// pdf.js returns positioned fragments; a change in vertical position starts a
// new line and a horizontal gap becomes a space.
//
// Clickable text ("[Live Demo]", "GitHub", "Credential") keeps its address in a
// link annotation, not in the text. Each link's URL is written right after the
// text it covers, so the resume reader can find it.

const bareUrl = (u) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '').toLowerCase();

// Which fragment each link belongs after: the last fragment on its line that it covers
function assignLinks(items, links) {
    const byItem = new Map();
    for (const link of links) {
        const [x1, y1, x2, y2] = link.rect;
        const left = Math.min(x1, x2), right = Math.max(x1, x2), low = Math.min(y1, y2), high = Math.max(y1, y2);
        let last = -1;
        items.forEach((item, i) => {
            if (typeof item.str !== 'string' || !item.str.trim()) return;
            const [, , , , x, y] = item.transform || [0, 0, 0, 0, 0, 0];
            if (y < low - 3 || y > high + 3) return;
            if (x < right - 1 && x + (item.width || 0) > left + 1) last = i;
        });
        if (last >= 0) byItem.set(last, [...(byItem.get(last) || []), { ...link, right }]);
    }
    return byItem;
}

// "Live demo | GitHub" with two links -> "Live demo <url1> | GitHub <url2>"
function withUrls(item, links) {
    let text = item.str;
    const [, , , , x] = item.transform || [0, 0, 0, 0, 0, 0];
    const width = item.width || 1;
    const spots = links
        .filter((l) => !text.toLowerCase().includes(bareUrl(l.url))) // already written out in the text
        .map((l) => {
            let pos = Math.round(((l.right - x) / width) * text.length);
            pos = Math.max(0, Math.min(text.length, pos));
            // Finish the word (and a closing bracket) the link ends in
            while (pos < text.length && !/\s/.test(text[pos]) && !/[|,]/.test(text[pos])) pos += 1;
            while (pos > 0 && text[pos - 1] === ' ') pos -= 1;
            return { pos, url: l.url };
        })
        .sort((a, b) => b.pos - a.pos);
    for (const { pos, url } of spots) text = `${text.slice(0, pos)} ${url}${text.slice(pos)}`;
    return text;
}

export function pageItemsToText(items, links = []) {
    const byItem = links.length ? assignLinks(items, links) : new Map();
    let out = '';
    let lastY = null;
    let lastEndX = null;
    items.forEach((item, i) => {
        if (typeof item.str !== 'string') return;
        const [, , , , x, y] = item.transform || [0, 0, 0, 0, 0, 0];
        if (lastY !== null && Math.abs(y - lastY) > 2) {
            out += '\n';
        } else if (lastEndX !== null && x - lastEndX > 1.5 && !out.endsWith(' ') && !item.str.startsWith(' ')) {
            out += ' ';
        }
        out += byItem.has(i) ? withUrls(item, byItem.get(i)) : item.str;
        if (item.str.trim()) {
            lastY = y;
            lastEndX = x + (item.width || 0);
        }
        if (item.hasEOL) {
            out += '\n';
            lastY = null;
            lastEndX = null;
        }
    });
    return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

// Web links only: mailto/tel links repeat what the text already says
async function pageLinks(page) {
    try {
        const annotations = await page.getAnnotations();
        return annotations
            .filter((a) => a.subtype === 'Link' && /^https?:\/\//i.test(a.url || '') && Array.isArray(a.rect))
            .map((a) => ({ url: a.url, rect: a.rect }));
    } catch {
        return [];
    }
}

export async function extractPdfText(pdf) {
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const [content, links] = await Promise.all([page.getTextContent(), pageLinks(page)]);
        pages.push(pageItemsToText(content.items, links));
    }
    return pages.join('\n').trim();
}
