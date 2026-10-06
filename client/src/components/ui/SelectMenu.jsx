import { useState, useRef, useEffect, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

// Design-system dropdown (replaces the native <select> popup).
// options: [{ value, label, dot?: 'bg-[#...]' }]
export default function SelectMenu({ value, onChange, options, ariaLabel, className = '', size = 'md', disabled = false }) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [pos, setPos] = useState(null);
    const buttonRef = useRef(null);
    const listRef = useRef(null);
    const listId = useId();

    const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
    const selected = options[selectedIndex];

    const place = () => {
        const r = buttonRef.current?.getBoundingClientRect();
        if (!r) return;
        const maxHeight = Math.min(320, options.length * 44 + 2);
        const below = window.innerHeight - r.bottom;
        const openUp = below < maxHeight + 8 && r.top > below;
        setPos({ left: r.left, width: Math.max(r.width, 180), top: openUp ? r.top - maxHeight - 4 : r.bottom + 4, maxHeight });
    };

    useLayoutEffect(() => { if (open) place(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!open) return;
        const close = (e) => {
            if (buttonRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onScroll = (e) => { if (!listRef.current?.contains(e.target)) setOpen(false); };
        window.addEventListener('mousedown', close);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', () => setOpen(false), { once: true });
        return () => {
            window.removeEventListener('mousedown', close);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [open]);

    const choose = (i) => {
        const opt = options[i];
        setOpen(false);
        buttonRef.current?.focus();
        if (opt && opt.value !== value) onChange(opt.value);
    };

    const onKeyDown = (e) => {
        if (disabled) return;
        if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            setActive(selectedIndex);
            setOpen(true);
            return;
        }
        if (!open) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
        else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
        else if (e.key === 'Tab') setOpen(false);
    };

    const height = size === 'sm' ? 'h-9' : 'h-[46px]';

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                role="combobox"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={open ? `${listId}-${active}` : undefined}
                disabled={disabled}
                onClick={() => { setActive(selectedIndex); setOpen((o) => !o); }}
                onKeyDown={onKeyDown}
                className={`w-full ${height} pl-3 pr-2.5 flex items-center justify-between gap-2 bg-white border cursor-pointer text-left text-[14px] font-medium text-[#171717] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${open ? 'border-[#171717] shadow-[inset_0_-2px_0_#CA3C0A]' : 'border-[#D8D4CC] hover:border-[#171717]'} ${className}`}
            >
                <span className="flex items-center gap-2 min-w-0">
                    {selected?.dot && <span className={`w-2 h-2 shrink-0 ${selected.dot}`} aria-hidden="true" />}
                    <span className="truncate">{selected?.label ?? ''}</span>
                </span>
                <FiChevronDown size={15} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {open && pos && createPortal(
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    aria-label={ariaLabel}
                    className="fixed z-[1100] m-0 p-0 list-none bg-white border border-[#171717] overflow-y-auto"
                    style={{ left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight, boxShadow: '0 16px 32px -16px rgba(23,23,23,0.35)' }}
                >
                    {options.map((opt, i) => {
                        const isSelected = opt.value === value;
                        const isActive = i === active;
                        return (
                            <li
                                key={String(opt.value)}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={isSelected}
                                onMouseEnter={() => setActive(i)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => choose(i)}
                                className={`h-11 px-3 flex items-center justify-between gap-3 cursor-pointer text-[14px] border-0 border-t border-[#EFECE6] first:border-t-0 ${isActive ? 'bg-[#F7F5F2]' : 'bg-white'} ${isSelected ? 'font-semibold text-[#171717]' : 'text-[#2A2622]'}`}
                            >
                                <span className="flex items-center gap-2.5 min-w-0">
                                    {opt.dot && <span className={`w-2 h-2 shrink-0 ${opt.dot}`} aria-hidden="true" />}
                                    <span className="truncate">{opt.label}</span>
                                </span>
                                {isSelected && <FiCheck size={15} className="shrink-0 text-[#CA3C0A]" aria-hidden="true" />}
                            </li>
                        );
                    })}
                </ul>,
                document.body
            )}
        </>
    );
}
