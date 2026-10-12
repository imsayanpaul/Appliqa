import { useState } from 'react';
import { FiMonitor, FiLink, FiCheck, FiMessageSquare, FiArrowRight } from 'react-icons/fi';

const BUILDER_URL = 'https://www.appliqa.xyz/resume-creator';

// The resume builder needs a wide screen; on phones, explain and offer next steps
export default function MobileBuilderNotice({ onAdvisor, onHome }) {
    const [copied, setCopied] = useState(false);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(BUILDER_URL);
        } catch {
            const field = Object.assign(document.createElement('textarea'), { value: BUILDER_URL });
            document.body.appendChild(field);
            field.select();
            document.execCommand('copy');
            field.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#F7F5F2] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-0 border-b border-[#D8D4CC]">
                <span className="ds-mono truncate">resume / builder</span>
                <span className="ds-mono ds-mono-muted flex items-center gap-1.5 shrink-0">
                    desktop <span className="w-1.5 h-1.5 bg-[#CA3C0A]" aria-hidden="true" />
                </span>
            </div>

            <div className="flex-1 flex items-center justify-center px-5 py-10">
                <div className="w-full max-w-[420px] bg-white border border-[#D8D4CC]">
                    <div className="flex items-center gap-2 px-5 py-3 border-0 border-b border-[#D8D4CC]">
                        <FiMonitor size={13} className="text-[#CA3C0A]" />
                        <span className="ds-mono ds-mono-muted">best on a bigger screen</span>
                    </div>

                    <div className="px-5 pt-5 pb-6">
                        <h1 className="m-0 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[#171717]">
                            Open the resume builder on your computer
                        </h1>
                        <p className="m-0 mt-2 text-[14px] leading-relaxed text-[#4A4540]">
                            The live preview, ATS check and design editor sit side by side, so they need a wider screen.
                            Copy the link and open it on a laptop or tablet.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={copyLink}
                        className="ds-btn ds-btn-ink w-full !min-h-12 !px-5 !text-[14px] hover:!bg-[#CA3C0A] border-0 border-t border-[#D8D4CC]"
                    >
                        {copied ? 'Link copied' : 'Copy link for your computer'}
                        {copied ? <FiCheck size={15} /> : <FiLink size={15} />}
                    </button>
                    <div className="grid grid-cols-2 border-0 border-t border-[#D8D4CC]">
                        <button
                            type="button"
                            onClick={onAdvisor}
                            className="ds-btn !border-0 !min-h-11 !px-4 !text-[14px] bg-transparent text-[#171717] hover:bg-[#F7F5F2]"
                        >
                            Career advisor <FiMessageSquare size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={onHome}
                            className="ds-btn !border-0 !border-l !border-solid !border-[#D8D4CC] !min-h-11 !px-4 !text-[14px] bg-transparent text-[#6F6A65] hover:text-[#171717] hover:bg-[#F7F5F2]"
                        >
                            Home <FiArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
