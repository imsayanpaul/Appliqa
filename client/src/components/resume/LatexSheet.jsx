import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Download, ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { toLatex } from '../../lib/resumeLatex';

const fileSafe = (s) => String(s || 'resume').trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'resume';

function downloadBlob(content, name, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const href = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
}

// Overleaf opens a new project from posted source (compiles with pdfLaTeX)
function openInOverleaf(code, name) {
    const form = Object.assign(document.createElement('form'), {
        method: 'POST', action: 'https://www.overleaf.com/docs', target: '_blank',
    });
    for (const [k, v] of Object.entries({ encoded_snip: encodeURIComponent(code), snip_name: name, engine: 'pdflatex' })) {
        form.appendChild(Object.assign(document.createElement('input'), { type: 'hidden', name: k, value: v }));
    }
    document.body.appendChild(form);
    form.submit();
    form.remove();
}

export default function LatexSheet({ data, design, onClose }) {
    const code = useMemo(() => toLatex(data, design), [data, design]);
    const [copied, setCopied] = useState(false);
    const base = fileSafe(data.personalInfo?.name);
    const hasPhoto = Boolean(data.photo) && design.photoShow;
    const lines = code.split('\n').length;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
        } catch {
            const ta = Object.assign(document.createElement('textarea'), { value: code });
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadPhoto = async () => {
        const blob = await (await fetch(data.photo)).blob();
        downloadBlob(blob, 'photo.jpg');
    };

    const actionCls = 'ds-btn !min-h-[56px] !px-5 !text-[14px] bg-transparent text-[#171717] hover:bg-white border-0 border-l first:border-l-0 border-[#D8D4CC]';

    return createPortal(
        <div className="modal-overlay" onClick={onClose} data-lenis-prevent>
            <div className="modal-content ds-sheet" role="dialog" aria-modal="true" aria-labelledby="latex-title" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
                <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                    <span className="ds-mono self-center px-6 sm:px-8 truncate">resume builder / latex</span>
                    <button type="button" onClick={onClose} aria-label="Close" className="w-14 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="ds-sheet-body" data-lenis-prevent>
                    <header className="ds-sheet-section !pt-8">
                        <h2 id="latex-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em]">LaTeX code</h2>
                        <p className="ds-body mt-3 mb-0">
                            Your resume as LaTeX, with your section order, colour, font and margins. Open it in Overleaf to compile a PDF, or paste it into any LaTeX editor (pdfLaTeX).
                        </p>
                    </header>

                    <div className="grid grid-cols-3 border-0 border-b border-[#D8D4CC] bg-[#F7F5F2]">
                        <button type="button" onClick={copy} className={actionCls}>
                            {copied ? 'Copied' : 'Copy'} {copied ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                        <button type="button" onClick={() => downloadBlob(code, `${base}.tex`, 'application/x-tex')} className={actionCls}>
                            Download .tex <Download size={15} />
                        </button>
                        <button type="button" onClick={() => openInOverleaf(code, `${base}.tex`)} className={`${actionCls} !bg-[#171717] !text-white hover:!bg-[#CA3C0A]`}>
                            Open in Overleaf <ArrowUpRight size={15} />
                        </button>
                    </div>

                    {hasPhoto && (
                        <div className="ds-sheet-section flex flex-wrap items-center justify-between gap-3 !py-4 bg-white">
                            <p className="m-0 text-[14px] text-[#4A4540] max-w-md">
                                The code looks for your photo as <span className="font-mono text-[13px] text-[#171717]">photo.jpg</span>. Upload it next to the .tex file; without it the resume compiles with no photo.
                            </p>
                            <button type="button" onClick={downloadPhoto} className="ds-btn ds-btn-line !min-h-10 !px-4 !text-[14px]">
                                Download photo.jpg <ImageIcon size={15} />
                            </button>
                        </div>
                    )}

                    <section className="ds-sheet-section">
                        <div className="flex items-center justify-between mb-2">
                            <p className="ds-mono ds-mono-muted m-0">{base}.tex</p>
                            <p className="ds-mono ds-mono-muted m-0">{lines} lines</p>
                        </div>
                        <textarea
                            readOnly
                            value={code}
                            spellCheck={false}
                            onFocus={(e) => e.target.select()}
                            aria-label="LaTeX source"
                            className="w-full h-[52vh] min-h-[320px] p-4 bg-[#171717] text-[#EDEAE4] border-0 font-mono text-[12.5px] leading-[1.55] resize-y outline-none focus:shadow-[inset_0_0_0_2px_#CA3C0A]"
                            style={{ tabSize: 4 }}
                        />
                        <p className="ds-mono ds-mono-muted m-0 mt-2">matches your current edits, saved or not</p>
                    </section>
                </div>
            </div>
        </div>,
        document.body
    );
}
