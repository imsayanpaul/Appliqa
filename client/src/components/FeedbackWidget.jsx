import { useState, useEffect } from 'react';
import { FiMessageSquare, FiX, FiArrowUpRight, FiCheck } from 'react-icons/fi';
import { supabase } from '../services/supabase';
import { useEscapeKey } from '../lib/useEscapeKey';

const RATINGS = [
    { value: 1, text: 'Poor' },
    { value: 2, text: 'Okay' },
    { value: 3, text: 'Good' },
    { value: 4, text: 'Great' },
];

const CATEGORIES = [
    { value: 'General', label: 'General' },
    { value: 'Bug Report', label: 'Bug' },
    { value: 'Feature Request', label: 'Idea' },
    { value: 'Other', label: 'Other' },
];

// Segmented cell shared by the rating and category rows
const segment = (selected) => `h-12 flex items-center justify-center gap-1.5 border-0 border-l first:border-l-0 border-[#D8D4CC] cursor-pointer text-[14px] font-medium transition-colors ${selected ? 'bg-[#171717] text-white' : 'bg-white text-[#171717] hover:bg-[#F7F5F2]'}`;

function FeedbackWidget({ user }) {
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState('General');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEscapeKey(() => setIsOpen(false), isOpen);

    // Allow other pages (and the mobile navbar) to open the widget
    useEffect(() => {
        const open = (e) => {
            if (e.detail?.category) setCategory(e.detail.category);
            setIsOpen((o) => (e.detail?.toggle ? !o : true));
        };
        window.addEventListener('appliqa:open-feedback', open);
        return () => window.removeEventListener('appliqa:open-feedback', open);
    }, []);

    // Sync email when user profile loads
    useEffect(() => {
        if (user?.email) setEmail(user.email);
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSubmitting(true);
        setError('');
        try {
            const { error: insertError } = await supabase
                .from('feedback')
                .insert({
                    user_id: user?.id || null,
                    email: email.trim() || user?.email || null,
                    category,
                    rating: rating || null,
                    message: message.trim()
                });

            if (insertError) throw insertError;

            setSubmitted(true);
            setMessage('');
            setRating(0);
            setCategory('General');

            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
            }, 3000);
        } catch (err) {
            console.error('Failed to submit feedback:', err);
            setError('We couldn’t send that just now. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating button (desktop; mobile opens from the navbar) */}
            <button
                type="button"
                className={`feedback-floating-btn ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                {isOpen ? <FiX size={16} /> : <FiMessageSquare size={16} />}
                <span>{isOpen ? 'Close' : 'Feedback'}</span>
            </button>

            {isOpen && (
                <div className="feedback-panel ds-feedback" role="dialog" aria-label="Share feedback">
                    <div className="h-12 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                        <span className="ds-mono self-center px-5">feedback / {submitted ? 'sent' : 'share'}</span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close feedback"
                            className="w-12 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-[#F7F5F2]"
                        >
                            <FiX size={16} />
                        </button>
                    </div>

                    {submitted ? (
                        <div className="px-5 py-10">
                            <span className="inline-flex w-10 h-10 items-center justify-center bg-[#CA3C0A] text-white">
                                <FiCheck size={20} />
                            </span>
                            <p className="m-0 mt-5 text-[22px] font-semibold tracking-[-0.02em]">Thank you.</p>
                            <p className="m-0 mt-2 text-[15px] text-[#66615C] leading-relaxed">Your feedback helps us make Appliqa better for everyone.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <fieldset className="m-0 p-0 border-0 border-b border-[#D8D4CC] min-w-0">
                                <legend className="ds-mono ds-mono-muted px-5 pt-3 pb-2.5 float-left w-full">how was your experience?</legend>
                                <div className="clear-both grid grid-cols-4 border-0 border-t border-[#D8D4CC]">
                                    {RATINGS.map((opt) => {
                                        const selected = rating === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                aria-pressed={selected}
                                                onClick={() => setRating(selected ? 0 : opt.value)}
                                                className={segment(selected)}
                                            >
                                                <span className={`font-mono text-[11px] ${selected ? 'text-[#FF6A33]' : 'text-[#CA3C0A]'}`}>0{opt.value}</span>
                                                {opt.text}
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>

                            <fieldset className="m-0 p-0 border-0 border-b border-[#D8D4CC] min-w-0">
                                <legend className="ds-mono ds-mono-muted px-5 pt-3 pb-2.5 float-left w-full">category</legend>
                                <div className="clear-both grid grid-cols-4 border-0 border-t border-[#D8D4CC]">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            aria-pressed={category === cat.value}
                                            onClick={() => setCategory(cat.value)}
                                            className={segment(category === cat.value)}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="px-5 pt-3 pb-4 flex flex-col gap-3">
                                <div>
                                    <label htmlFor="feedback-message" className="ds-mono ds-mono-muted block mb-2">message</label>
                                    <textarea
                                        id="feedback-message"
                                        className="resume-input-field !min-h-[84px] resize-y"
                                        placeholder="What can we improve? Or tell us what you love…"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                    />
                                </div>

                                {!user && (
                                    <div>
                                        <label htmlFor="feedback-email" className="ds-mono ds-mono-muted block mb-2">email · optional</label>
                                        <input
                                            id="feedback-email"
                                            type="email"
                                            className="resume-input-field"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                )}

                                {error && <p role="alert" className="m-0 text-[14px] text-[#B91C1C]">{error}</p>}
                            </div>

                            <button
                                type="submit"
                                className="ds-btn ds-btn-accent w-full !min-h-[52px] !px-5 border-0 border-t border-[#D8D4CC]"
                                disabled={isSubmitting || !message.trim()}
                            >
                                {isSubmitting ? 'Sending…' : 'Send feedback'}
                                <FiArrowUpRight size={18} className="ds-btn-arrow" />
                            </button>
                        </form>
                    )}
                </div>
            )}
        </>
    );
}

export default FeedbackWidget;
