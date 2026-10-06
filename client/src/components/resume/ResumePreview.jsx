import { useLayoutEffect, useRef, useState } from 'react';
import ResumeDocument from './ResumeDocument';

const MM = 96 / 25.4; // css px per mm
const PAGE_W = 210 * MM;
const PAGE_H = 297 * MM;
// Print layout can wrap a line or two differently from the screen, so "fits on
// one page" keeps about two lines of room spare
const SAFETY = 0.03;

// Pages a rendered `.rd-screen` document prints to. Measures the content itself
// (the page box has an A4 minimum height, which would hide how full it is).
export function estimatePrintedPages(docEl, marginY) {
    const kids = docEl ? [...docEl.children] : [];
    if (!kids.length) return { pages: 1, fill: 0 };
    const first = kids[0];
    const last = kids[kids.length - 1];
    const contentH = last.offsetTop + last.offsetHeight - first.offsetTop;
    const usable = (PAGE_H - marginY * 96 * 2) * (1 - SAFETY);
    return { pages: Math.max(1, Math.ceil(contentH / usable)), fill: contentH / usable };
}

// Scales the A4 page down to fit the panel and estimates how many pages it prints to
export default function ResumePreview({ data, design, onFit, onUndoFit, fitting = false, canUndoFit = false }) {
    const outerRef = useRef(null);
    const docRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [docHeight, setDocHeight] = useState(PAGE_H);
    const [estimate, setEstimate] = useState({ pages: 1, fill: 0 });

    const measure = () => {
        const doc = docRef.current;
        if (!doc) return;
        if (doc.offsetHeight !== docHeight) setDocHeight(doc.offsetHeight);
        const next = estimatePrintedPages(doc.firstElementChild, design.marginY);
        if (next.pages !== estimate.pages || Math.abs(next.fill - estimate.fill) > 0.01) setEstimate(next);
    };

    useLayoutEffect(() => {
        const outer = outerRef.current;
        const doc = docRef.current;
        if (!outer || !doc) return;
        const onResize = () => {
            setScale(Math.min(1, outer.clientWidth / PAGE_W));
            setDocHeight(doc.offsetHeight);
        };
        onResize();
        const ro = new ResizeObserver(onResize);
        ro.observe(outer);
        ro.observe(doc);
        return () => ro.disconnect();
    }, []);

    // Also measure after every render: resize events can arrive late (or not at all
    // in a background tab), which would leave a stale page count
    useLayoutEffect(measure);

    const { pages, fill } = estimate;

    return (
        <div ref={outerRef} className="w-full">
            <div className="ds-mono ds-mono-muted m-0 mb-3 flex items-center justify-between gap-3">
                <span>a4 preview · {Math.round(scale * 100)}%</span>
                <span className="flex items-center gap-3">
                    <span
                        className={pages > 1 ? 'text-[#CA3C0A]' : ''}
                        title={pages === 1 ? `About ${Math.round(fill * 100)}% of the page is used` : undefined}
                    >
                        ≈ {pages} page{pages === 1 ? '' : 's'} when printed
                    </span>
                    {canUndoFit && !fitting && (
                        <button type="button" onClick={onUndoFit} className="bg-transparent border-0 p-0 cursor-pointer ds-mono text-[#171717] underline underline-offset-2 hover:text-[#CA3C0A]">
                            undo fit
                        </button>
                    )}
                    {onFit && (pages > 1 || fitting) && (
                        <button
                            type="button"
                            onClick={onFit}
                            disabled={fitting}
                            title="Tighten spacing, then line height and margins, then text size, until it fits"
                            className="h-8 px-3 inline-flex items-center gap-1.5 bg-[#171717] hover:bg-[#CA3C0A] text-white border-0 cursor-pointer font-sans text-[13px] font-semibold tracking-normal disabled:cursor-wait disabled:opacity-80"
                        >
                            {fitting ? 'Fitting…' : 'Fit to 1 page'}
                        </button>
                    )}
                </span>
            </div>
            <div className="mx-auto overflow-hidden bg-white outline outline-1 outline-[#D8D4CC] shadow-[0_12px_32px_-12px_rgba(23,23,23,0.25)]" style={{ width: PAGE_W * scale, height: docHeight * scale }}>
                <div ref={docRef} style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                    <ResumeDocument data={data} design={design} />
                </div>
            </div>
        </div>
    );
}
