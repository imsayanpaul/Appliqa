import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Download, ArrowUpRight, Image as ImageIcon, RotateCcw, ArrowLeft } from 'lucide-react';
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

// `draft` is { code, base } once the person edits: `base` is the generated code
// they started from, so we can tell when the builder has moved on since.
export default function LatexSheet({ data, design, draft, onDraftChange, onApply, onClose }) {
    const generated = useMemo(() => toLatex(data, design), [data, design]);
    const code = draft?.code ?? generated;
    const edited = Boolean(draft) && draft.code !== generated;
    const stale = Boolean(draft) && draft.base !== generated;
    const [copied, setCopied] = useState(false);
    const [applyError, setApplyError] = useState('');
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

    const apply = () => {
        const err = onApply(code);
        setApplyError(err || '');
    };

    const discard = () => {
        if (edited && !window.confirm('Discard your edits to the LaTeX code? It will be regenerated from the builder.')) return;
        onDraftChange(null);
        setApplyError('');
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
                            Your resume as LaTeX. Edit the code here, then <strong className="font-semibold text-[#171717]">apply it to the resume</strong> to update the builder, or export it as it is for Overleaf or any LaTeX editor (pdfLaTeX).
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
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="ds-mono m-0 flex items-center gap-2">
                                <span className="ds-mono-muted">{base}.tex</span>
                                {edited && <span className="text-[#CA3C0A] flex items-center gap-1.5"><span className="ds-square" /> edited</span>}
                            </p>
                            <p className="ds-mono ds-mono-muted m-0">{lines} lines</p>
                        </div>

                        {stale && (
                            <div role="status" className="mb-2 px-4 py-3 bg-[#FFF0E8] border border-[#CA3C0A]/30 text-[14px] text-[#171717]">
                                The builder changed after you edited this code, so it doesn’t include those changes. Apply it to overwrite the builder, or discard your edits to get the latest.
                            </div>
                        )}

                        <textarea
                            value={code}
                            spellCheck={false}
                            autoCapitalize="off"
                            autoCorrect="off"
                            onChange={(e) => onDraftChange({ code: e.target.value, base: draft?.base ?? generated })}
                            onKeyDown={(e) => {
                                // Tab indents instead of leaving the editor
                                if (e.key !== 'Tab') return;
                                e.preventDefault();
                                const el = e.currentTarget;
                                const { selectionStart: a, selectionEnd: b } = el;
                                const next = `${code.slice(0, a)}    ${code.slice(b)}`;
                                onDraftChange({ code: next, base: draft?.base ?? generated });
                                requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 4; });
                            }}
                            aria-label="LaTeX source"
                            className="w-full h-[52vh] min-h-[320px] p-4 bg-[#171717] text-[#EDEAE4] caret-[#FF6A33] border-0 font-mono text-[12.5px] leading-[1.55] resize-y outline-none focus:shadow-[inset_0_0_0_2px_#CA3C0A]"
                            style={{ tabSize: 4 }}
                        />

                        {applyError && <p role="alert" className="m-0 mt-2 text-[14px] text-[#B91C1C]">{applyError}</p>}

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                            <button
                                type="button"
                                onClick={apply}
                                disabled={!edited && !stale}
                                className="ds-btn ds-btn-accent !min-h-12 !text-[14px] disabled:!bg-[#EFECE6] disabled:!text-[#8A8580] disabled:!opacity-100"
                                title="Update the builder's sections, colour and margins from this code"
                            >
                                Apply to resume <ArrowLeft size={15} />
                            </button>
                            <button type="button" onClick={discard} disabled={!draft} className="ds-btn ds-btn-line !min-h-12 !px-5 !text-[14px] disabled:opacity-40">
                                Discard edits <RotateCcw size={14} />
                            </button>
                        </div>
                        <p className="ds-mono ds-mono-muted m-0 mt-2">
                            {draft ? 'edits are kept with this resume when you save' : 'generated from the builder · edit it directly'}
                        </p>
                    </section>

                    <section className="ds-sheet-section border-b-0">
                        <p className="ds-mono ds-mono-muted m-0 mb-2">what apply reads</p>
                        <ul className="ds-list">
                            <li>Name, title and contact lines; each <span className="font-mono text-[13px]">\section{'{…}'}</span> with its rows, dates, links and <span className="font-mono text-[13px]">\item</span> bullets.</li>
                            <li>Section order and titles. A section the builder doesn’t know becomes a custom section.</li>
                            <li>The <span className="font-mono text-[13px]">primary</span> colour, page margins and font size. Other styling stays in the code only.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>,
        document.body
    );
}
