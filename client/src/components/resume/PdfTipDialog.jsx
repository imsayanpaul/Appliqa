import { FiX, FiPrinter, FiCheck } from 'react-icons/fi';
import { useEscapeKey } from '../../lib/useEscapeKey';

const TIP_KEY = 'appliqa_pdf_tip_seen';

export const shouldShowPdfTip = () => {
    try { return localStorage.getItem(TIP_KEY) !== '1'; } catch { return true; }
};

const rememberPdfTip = () => {
    try { localStorage.setItem(TIP_KEY, '1'); } catch { /* private mode: show again next time */ }
};

// Shown before the browser's print window. Other destinations (like Microsoft Print
// to PDF) can save the resume as an image, which ATS software can't read.
export default function PdfTipDialog({ onContinue, onClose }) {
    useEscapeKey(onClose);

    const proceed = (remember) => {
        if (remember) rememberPdfTip();
        onContinue();
    };

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-[#171717]/40" onMouseDown={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="pdf-tip-title"
                className="w-full max-w-[440px] bg-white border border-[#D8D4CC] shadow-[0_24px_60px_-20px_rgba(23,23,23,0.35)]"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                    <span className="ds-mono ds-mono-muted self-center px-5 py-3 flex items-center gap-2">
                        <FiPrinter size={13} className="text-[#CA3C0A]" /> download pdf
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="w-11 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#6F6A65] hover:text-[#171717] hover:bg-[#F7F5F2]"
                    >
                        <FiX size={16} />
                    </button>
                </div>

                <div className="px-5 pt-4 pb-5">
                    <h3 id="pdf-tip-title" className="m-0 text-[18px] font-semibold tracking-[-0.015em] text-[#171717]">
                        Choose “Save as PDF”
                    </h3>
                    <p className="m-0 mt-1.5 text-[14px] leading-relaxed text-[#4A4540]">
                        In the print window, set <b className="text-[#171717]">Destination</b> to <b className="text-[#171717]">Save as PDF</b>.
                        Other options can save the text as an image, which applicant tracking systems can’t read.
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3 border border-[#D8D4CC] bg-[#F7F5F2] px-3 py-2.5">
                        <span className="ds-mono ds-mono-muted">destination</span>
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#171717]">
                            <FiCheck size={13} className="text-[#047857]" /> Save as PDF
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 border-0 border-t border-[#D8D4CC]">
                    <button
                        type="button"
                        onClick={() => proceed(true)}
                        autoFocus
                        className="ds-btn ds-btn-ink !min-h-12 !px-4 !text-[14px] hover:!bg-[#CA3C0A]"
                    >
                        Got it, don’t show again
                    </button>
                    <button
                        type="button"
                        onClick={() => proceed(false)}
                        className="ds-btn !min-h-12 !px-4 !text-[14px] bg-transparent text-[#171717] hover:bg-[#F7F5F2] border-0 border-l border-[#D8D4CC]"
                    >
                        Open print window
                    </button>
                </div>
            </div>
        </div>
    );
}
