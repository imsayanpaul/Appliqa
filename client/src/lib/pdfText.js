// PDF -> plain text that keeps line breaks, so resume sections can be found.
// pdf.js returns positioned fragments; a change in vertical position starts a
// new line and a horizontal gap becomes a space.

export function pageItemsToText(items) {
    let out = '';
    let lastY = null;
    let lastEndX = null;
    for (const item of items) {
        if (typeof item.str !== 'string') continue;
        const [, , , , x, y] = item.transform || [0, 0, 0, 0, 0, 0];
        if (lastY !== null && Math.abs(y - lastY) > 2) {
            out += '\n';
        } else if (lastEndX !== null && x - lastEndX > 1.5 && !out.endsWith(' ') && !item.str.startsWith(' ')) {
            out += ' ';
        }
        out += item.str;
        if (item.str.trim()) {
            lastY = y;
            lastEndX = x + (item.width || 0);
        }
        if (item.hasEOL) {
            out += '\n';
            lastY = null;
            lastEndX = null;
        }
    }
    return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

export async function extractPdfText(pdf) {
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(pageItemsToText(content.items));
    }
    return pages.join('\n').trim();
}
