import { useState, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend } from 'react-icons/fi';
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
            alert('Failed to send feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const ratingOptions = [
        { label: '😞', value: 1, text: 'Poor' },
        { label: '😐', value: 2, text: 'Okay' },
        { label: '🙂', value: 3, text: 'Good' },
        { label: '😃', value: 4, text: 'Great' },
        { label: '🤩', value: 5, text: 'Amazing' }
    ];

    const categories = ['General', 'Bug Report', 'Feature Request', 'Other'];

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
                            <span className="feedback-success-icon">🙌</span>
                            <h4>Thank you!</h4>
                            <p>Your feedback helps us make Appliqa better for everyone.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="feedback-header">
                                <h3>
                                    <FiMessageSquare size={18} color="var(--accent-primary)" />
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
                                    >
                                        {opt.label}
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
