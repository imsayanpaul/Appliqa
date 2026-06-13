import { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';

export function Dropdown({
    options = [],
    value = '',
    onChange,
    placeholder = 'Select Option',
    disabled = false,
    className = '',
    variant = 'filter', // 'filter', 'ghost', 'form'
    direction = 'down' // 'down' or 'up'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;
    const hasValue = !!value;

    const handleSelect = (val) => {
        if (onChange) onChange(val);
        setIsOpen(false);
    };

    return (
        <div 
            ref={containerRef} 
            className={`relative inline-block ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${
                variant === 'form' ? 'w-full' : ''
            }`}
        >
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={
                    variant === 'ghost' 
                        ? `ghost-select-custom flex items-center justify-between gap-1 cursor-pointer outline-none transition-all duration-300 ${hasValue ? 'active' : ''}` 
                        : variant === 'form'
                            ? `form-input-custom flex items-center justify-between gap-2 cursor-pointer w-full text-left outline-none transition-all duration-300 ${hasValue ? 'active' : ''}`
                            : `filter-select-custom flex items-center justify-between gap-2 cursor-pointer outline-none transition-all duration-300 ${hasValue ? 'active' : ''}`
                }
                style={
                    variant === 'ghost' ? {
                        height: '30px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                    } : variant === 'form' ? {
                        height: '42px',
                        padding: '0 14px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 400,
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        width: '100%'
                    } : {
                        height: '38px',
                        padding: '0 16px',
                        borderRadius: '99px',
                        fontSize: '13px',
                        fontWeight: 500,
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                    }
                }
            >
                <span>{displayText}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="flex items-center justify-center flex-shrink-0"
                >
                    <FiChevronDown size={14} className={hasValue ? 'text-orange-500' : 'text-zinc-400'} />
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        role="listbox"
                        initial={{ opacity: 0, y: direction === 'up' ? 8 : -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: direction === 'up' ? 8 : -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`dropdown-menu-custom absolute ${
                            direction === 'up' ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'
                        } z-50 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-filter backdrop-blur-xl shadow-2xl p-1 ${
                            variant === 'form' ? 'w-full left-0 translate-x-0' : 'min-w-full left-1/2 -translate-x-1/2'
                        }`}
                        style={variant === 'form' ? {} : { width: 'max-content' }}
                    >
                        <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
                            {options.map((option, index) => {
                                const isSelected = option.value === value;
                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(option.value)}
                                        className={`w-full text-left px-4 py-2 text-xs rounded-lg transition-all duration-150 border-0 ${
                                            isSelected 
                                                ? 'bg-orange-500/10 text-orange-500 font-semibold' 
                                                : 'bg-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-white'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
