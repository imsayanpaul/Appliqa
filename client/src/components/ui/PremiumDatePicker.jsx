import { useState, useRef, useEffect, useMemo } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function PremiumDatePicker({ value, onChange, placeholder = 'Select date' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState('days'); // 'days', 'months', 'years'
    const containerRef = useRef(null);

    // Parse value (YYYY-MM-DD format)
    const selectedDate = useMemo(() => value ? new Date(value + 'T00:00:00') : null, [value]);

    const [viewMonth, setViewMonth] = useState(() => selectedDate ? selectedDate.getMonth() : new Date().getMonth());
    const [viewYear, setViewYear] = useState(() => selectedDate ? selectedDate.getFullYear() : new Date().getFullYear());
    const [yearRangeStart, setYearRangeStart] = useState(() => {
        const baseYear = selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
        return Math.floor(baseYear / 16) * 16;
    });

    // Sync view when value changes externally
    useEffect(() => {
        if (selectedDate) {
            setViewMonth(selectedDate.getMonth());
            setViewYear(selectedDate.getFullYear());
            setYearRangeStart(Math.floor(selectedDate.getFullYear() / 16) * 16);
        }
    }, [selectedDate]);

    // Click outside handler
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setViewMode('days');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // Format display value as DD / MM / YYYY
    const displayValue = useMemo(() => {
        if (!selectedDate) return '';
        const dd = String(selectedDate.getDate()).padStart(2, '0');
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const yyyy = selectedDate.getFullYear();
        return `${dd} / ${mm} / ${yyyy}`;
    }, [selectedDate]);

    // Calendar math
    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const calendarDays = useMemo(() => {
        const daysInMonth = getDaysInMonth(viewMonth, viewYear);
        const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
        const prevMonthDays = viewMonth === 0
            ? getDaysInMonth(11, viewYear - 1)
            : getDaysInMonth(viewMonth - 1, viewYear);

        const days = [];

        // Previous month trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthDays - i, current: false, date: null });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({ day: i, current: true, date: dateStr });
        }

        // Next month leading days (fill to 42 = 6 rows)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, current: false, date: null });
        }

        return days;
    }, [viewMonth, viewYear]);

    // Today string
    const todayStr = useMemo(() => {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }, []);

    const handleDayClick = (dateStr) => {
        if (!dateStr) return;
        onChange(dateStr);
        setIsOpen(false);
        setViewMode('days');
    };

    const handleMonthClick = (monthIdx) => {
        setViewMonth(monthIdx);
        setViewMode('days');
    };

    const handleYearClick = (year) => {
        setViewYear(year);
        setViewMode('months');
    };

    const navigateMonth = (dir) => {
        if (dir === -1) {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
            else setViewMonth(m => m - 1);
        } else {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
            else setViewMonth(m => m + 1);
        }
    };

    const handleHeaderClick = () => {
        if (viewMode === 'days') setViewMode('months');
        else if (viewMode === 'months') setViewMode('years');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setIsOpen(false);
        setViewMode('days');
    };

    const handleToday = (e) => {
        e.stopPropagation();
        const t = new Date();
        const dateStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        setViewMonth(t.getMonth());
        setViewYear(t.getFullYear());
        onChange(dateStr);
        setIsOpen(false);
        setViewMode('days');
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {/* Trigger Input */}
            <div
                className={`premium-input-container ${isOpen ? 'focused' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ cursor: 'pointer' }}
            >
                <span className="premium-input-icon">
                    <FiCalendar size={16} />
                </span>
                <input
                    type="text"
                    className="premium-input-field"
                    placeholder={placeholder}
                    value={displayValue}
                    readOnly
                    style={{ cursor: 'pointer', caretColor: 'transparent' }}
                />
            </div>

            {/* Calendar Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="pdp-dropdown"
                    >
                        {/* ── Header ── */}
                        <div className="pdp-header">
                            <button
                                type="button"
                                className="pdp-nav-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (viewMode === 'days') navigateMonth(-1);
                                    else if (viewMode === 'months') setViewYear(y => y - 1);
                                    else setYearRangeStart(s => s - 16);
                                }}
                            >
                                <FiChevronLeft size={16} />
                            </button>

                            <button
                                type="button"
                                className="pdp-header-label"
                                onClick={(e) => { e.stopPropagation(); handleHeaderClick(); }}
                            >
                                {viewMode === 'days' && `${MONTHS[viewMonth]} ${viewYear}`}
                                {viewMode === 'months' && `${viewYear}`}
                                {viewMode === 'years' && `${yearRangeStart} – ${yearRangeStart + 15}`}
                            </button>

                            <button
                                type="button"
                                className="pdp-nav-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (viewMode === 'days') navigateMonth(1);
                                    else if (viewMode === 'months') setViewYear(y => y + 1);
                                    else setYearRangeStart(s => s + 16);
                                }}
                            >
                                <FiChevronRight size={16} />
                            </button>
                        </div>

                        {/* ── Days View ── */}
                        {viewMode === 'days' && (
                            <div className="pdp-body">
                                <div className="pdp-weekdays">
                                    {DAYS.map(d => (
                                        <div key={d} className="pdp-weekday">{d}</div>
                                    ))}
                                </div>
                                <div className="pdp-days-grid">
                                    {calendarDays.map((d, i) => {
                                        const isSelected = d.date === value;
                                        const isT = d.date === todayStr;
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                className={[
                                                    'pdp-day',
                                                    !d.current && 'pdp-day--other',
                                                    isSelected && 'pdp-day--selected',
                                                    isT && !isSelected && 'pdp-day--today',
                                                ].filter(Boolean).join(' ')}
                                                onClick={(e) => { e.stopPropagation(); handleDayClick(d.date); }}
                                                disabled={!d.current}
                                            >
                                                {d.day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Months View ── */}
                        {viewMode === 'months' && (
                            <div className="pdp-body">
                                <div className="pdp-months-grid">
                                    {MONTHS_SHORT.map((m, i) => {
                                        const isCurrent = i === viewMonth && viewYear === (selectedDate?.getFullYear() ?? -1);
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                className={`pdp-month ${isCurrent ? 'pdp-month--selected' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); handleMonthClick(i); }}
                                            >
                                                {m}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Years View ── */}
                        {viewMode === 'years' && (
                            <div className="pdp-body">
                                <div className="pdp-years-grid">
                                    {Array.from({ length: 16 }, (_, i) => {
                                        const yr = yearRangeStart + i;
                                        const isCurrent = yr === viewYear && yr === (selectedDate?.getFullYear() ?? -1);
                                        return (
                                            <button
                                                key={yr}
                                                type="button"
                                                className={`pdp-year ${isCurrent ? 'pdp-year--selected' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); handleYearClick(yr); }}
                                            >
                                                {yr}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Footer ── */}
                        <div className="pdp-footer">
                            <button type="button" className="pdp-footer-btn" onClick={handleClear}>
                                Clear
                            </button>
                            <button type="button" className="pdp-footer-btn pdp-footer-btn--accent" onClick={handleToday}>
                                Today
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default PremiumDatePicker;
