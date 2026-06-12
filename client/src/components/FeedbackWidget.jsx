import { useState, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiCheckCircle } from 'react-icons/fi';
import { supabase } from '../services/supabase';

function FeedbackWidget({ user }) {
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState('General');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Sync email when user profile loads
    useEffect(() => {
        if (user?.email) {
            setEmail(user.email);
        }
    }, [user]);

    const handleRatingSelect = (val) => {
        setRating(val);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('feedback')
                .insert({
                    user_id: user?.id || null,
                    email: email.trim() || user?.email || null,
                    category,
                    rating: rating || null,
                    message: message.trim()
                });

            if (error) throw error;

            setSubmitted(true);
            // Reset form
            setMessage('');
            setRating(0);
            setCategory('General');
            
            // Auto close after 3 seconds
            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
            }, 3000);
        } catch (err) {
            console.error('Failed to submit feedback:', err);
            alert(err.message || 'Failed to send feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const ratingOptions = [
        { value: 1, text: 'Poor' },
        { value: 2, text: 'Okay' },
        { value: 3, text: 'Good' },
        { value: 4, text: 'Awesome' }
    ];

    const categories = ['General', 'Bug Report', 'Feature Request', 'Other'];

    const renderEmojiIcon = (val, isSelected) => {
        const strokeColor = isSelected ? '#f97316' : '#71717a';
        const fillColor = isSelected ? 'rgba(249, 115, 22, 0.1)' : 'transparent';
        const eyeColor = isSelected ? '#f97316' : '#71717a';
        const starFillColor = isSelected ? '#f97316' : 'transparent';
        
        switch (val) {
            case 1: // Crying / Very Sad
                return (
                    <svg viewBox="0 0 24 24" width="28" height="28" style={{ display: 'block', transition: 'stroke 0.2s' }}>
                        <circle cx="12" cy="12" r="10" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
                        {/* Crying eyes (downward curves) */}
                        <path d="M7.5 12c.5-1 1.5-1 2 0" stroke={eyeColor} strokeWidth="2" strokeLinecap="round" fill="none" />
                        <path d="M14.5 12c.5-1 1.5-1 2 0" stroke={eyeColor} strokeWidth="2" strokeLinecap="round" fill="none" />
                        {/* Vertical Blue Tears */}
                        <path d="M8.5 12.5v3.5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                        <path d="M15.5 12.5v3.5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                        {/* Frown Mouth */}
                        <path d="M10.5 16.5c.5-.5 1.5-.5 2 0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                );
            case 2: // Sad / Frown
                return (
                    <svg viewBox="0 0 24 24" width="28" height="28" style={{ display: 'block', transition: 'stroke 0.2s' }}>
                        <circle cx="12" cy="12" r="10" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
                        <circle cx="9" cy="10" r="1.2" fill={eyeColor} />
                        <circle cx="15" cy="10" r="1.2" fill={eyeColor} />
                        <path d="M9 16c1-1.5 5-1.5 6 0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                );
            case 3: // Smile / Good
                return (
                    <svg viewBox="0 0 24 24" width="28" height="28" style={{ display: 'block', transition: 'stroke 0.2s' }}>
                        <circle cx="12" cy="12" r="10" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
                        <circle cx="9" cy="10" r="1.2" fill={eyeColor} />
                        <circle cx="15" cy="10" r="1.2" fill={eyeColor} />
                        <path d="M9 14.5c1 1.8 5 1.8 6 0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                );
            case 4: // Star-eyes / Awesome
                return (
                    <svg viewBox="0 0 24 24" width="28" height="28" style={{ display: 'block', transition: 'stroke 0.2s' }}>
                        <circle cx="12" cy="12" r="10" stroke={strokeColor} strokeWidth="2" fill={fillColor} />
                        {/* Star left eye */}
                        <polygon 
                            points="9,7.5 9.8,9.2 11.6,9.2 10.2,10.3 10.7,12.1 9,11 7.3,12.1 7.8,10.3 6.4,9.2 8.2,9.2" 
                            fill={starFillColor} 
                            stroke={isSelected ? '#f97316' : '#71717a'} 
                            strokeWidth="1.2" 
                            strokeLinejoin="round"
                        />
                        {/* Star right eye */}
                        <polygon 
                            points="15,7.5 15.8,9.2 17.6,9.2 16.2,10.3 16.7,12.1 15,11 13.3,12.1 13.8,10.3 12.4,9.2 14.2,9.2" 
                            fill={starFillColor} 
                            stroke={isSelected ? '#f97316' : '#71717a'} 
                            strokeWidth="1.2" 
                            strokeLinejoin="round"
                        />
                        {/* Laughing Smile Mouth */}
                        <path d="M8.5 14c1 2.5 6 2.5 7 0" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <>
            {/* Floating button */}
            <button 
                className={`feedback-floating-btn ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <FiX size={16} /> : <FiMessageSquare size={16} />}
                <span>{isOpen ? 'Close' : 'Feedback'}</span>
            </button>

            {/* Feedback Panel */}
            {isOpen && (
                <div className="feedback-panel">
                    {submitted ? (
                        <div className="feedback-success-card">
                            <FiCheckCircle size={40} className="feedback-success-icon" style={{ color: '#f97316' }} />
                            <h4>Thank you!</h4>
                            <p>Your feedback helps us make Appliqa better for everyone.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="feedback-header">
                                <h3>
                                    <FiMessageSquare size={18} color="#f97316" />
                                    <span>Share Feedback</span>
                                </h3>
                                <button 
                                    type="button" 
                                    className="feedback-close-btn"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <FiX size={16} />
                                </button>
                            </div>

                            {/* Rating selection */}
                            <span className="feedback-rating-label">How was your experience?</span>
                            <div className="feedback-ratings">
                                {ratingOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        title={opt.text}
                                        className={`feedback-rating-opt ${rating === opt.value ? 'selected' : ''}`}
                                        onClick={() => handleRatingSelect(opt.value)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        {renderEmojiIcon(opt.value, rating === opt.value)}
                                    </button>
                                ))}
                            </div>

                            {/* Category pills */}
                            <span className="feedback-rating-label">Category</span>
                            <div className="feedback-categories">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        className={`feedback-cat-btn ${category === cat ? 'selected' : ''}`}
                                        onClick={() => setCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Feedback Text */}
                            <textarea
                                className="feedback-textarea"
                                placeholder="What can we improve? Or tell us what you love..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                            />

                            {/* Email Address (only editable/shown if guest or optional to change) */}
                            {!user && (
                                <input
                                    type="email"
                                    className="feedback-input-email"
                                    placeholder="Your email address (optional)"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="feedback-submit-btn"
                                disabled={isSubmitting || !message.trim()}
                            >
                                <FiSend size={14} />
                                <span>{isSubmitting ? 'Sending...' : 'Submit'}</span>
                            </button>
                        </form>
                    )}
                </div>
            )}
        </>
    );
}

export default FeedbackWidget;
