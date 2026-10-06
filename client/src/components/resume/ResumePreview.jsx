import { useLayoutEffect, useRef, useState } from 'react';
import ResumeDocument from './ResumeDocument';

const MM = 96 / 25.4; // css px per mm
const PAGE_W = 210 * MM;
const PAGE_H = 297 * MM;

// Scales the A4 page down to fit the panel and estimates how many pages it prints to
export default function ResumePreview({ data, design }) {
    const outerRef = useRef(null);
    const docRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [docHeight, setDocHeight] = useState(PAGE_H);

    useLayoutEffect(() => {
        const outer = outerRef.current;
        const doc = docRef.current;
        if (!outer || !doc) return;
        const measure = () => {
            setScale(Math.min(1, outer.clientWidth / PAGE_W));
            setDocHeight(doc.offsetHeight);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(outer);
        ro.observe(doc);
        return () => ro.disconnect();
    }, []);

    // Printed pages repeat the top and bottom margin, so divide by the usable height
    const margin = design.marginY * 96 * 2;
    const pages = Math.max(1, Math.ceil((docHeight - margin - 2) / (PAGE_H - margin)));

    return (
        <div ref={outerRef} className="w-full">
            <p className="ds-mono ds-mono-muted m-0 mb-3 flex items-center justify-between gap-3">
                <span>a4 preview · {Math.round(scale * 100)}%</span>
                <span className={pages > 2 ? 'text-[#CA3C0A]' : ''}>≈ {pages} page{pages === 1 ? '' : 's'} when printed</span>
            </p>
            <div className="mx-auto overflow-hidden bg-white outline outline-1 outline-[#D8D4CC] shadow-[0_12px_32px_-12px_rgba(23,23,23,0.25)]" style={{ width: PAGE_W * scale, height: docHeight * scale }}>
                <div ref={docRef} style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                    <ResumeDocument data={data} design={design} />
                </div>
            </div>
        </div>
    );
}
