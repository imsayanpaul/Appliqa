import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiCheck, FiLogOut, FiEye, FiEyeOff, FiGithub, FiUser, FiMail, FiBriefcase, FiDollarSign, FiPlus, FiX, FiLock, FiCalendar, FiLinkedin, FiGlobe, FiBookOpen, FiClock } from 'react-icons/fi';
import { createOrUpdateUser } from '../services/api';
import { supabase } from '../services/supabase';
import ResumeUpload from '../components/ResumeUpload';
import citiesByCountry from '../data/cities';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Dropdown } from '../components/ui/Dropdown';
import { motion, AnimatePresence } from 'framer-motion';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px', marginRight: '4px' }} viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
);

// Premium Redesigned UI Controls and Animation Configurations

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08
        }
    }
};

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    }
};

function PremiumIconInput({ icon: Icon, symbol, placeholder, value, onChange, type = "text", disabled = false, ...props }) {
    const [focused, setFocused] = useState(false);
    return (
        <div className={`premium-input-container ${focused ? 'focused' : ''} ${disabled ? 'opacity-50' : ''}`}>
            {Icon && (
                <span className="premium-input-icon">
                    <Icon size={16} />
                </span>
            )}
            {!Icon && symbol && (
                <span className="premium-input-icon" style={{ fontSize: '15px', fontWeight: 600 }}>
                    {symbol}
                </span>
            )}
            <input
                type={type}
                className="premium-input-field"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                {...props}
            />
        </div>
    );
}

function PremiumToggle({ checked, onChange, label }) {
    return (
        <div 
            style={{ display: 'inline-flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }} 
            onClick={() => onChange(!checked)}
        >
            <div className={`switch-track ${checked ? 'active' : ''}`}>
                <span className="switch-knob" />
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>{label}</span>
        </div>
    );
}

function SkillsTagInput({ value, onChange }) {
    const [inputValue, setInputValue] = useState('');
    const [focused, setFocused] = useState(false);
    const inputRef = useRef(null);

    const tags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

    const handleAddTag = () => {
        if (inputValue.trim()) {
            const newSkills = inputValue.split(',')
                .map(s => s.trim())
                .filter(s => s && !tags.includes(s));
            if (newSkills.length > 0) {
                const newTags = [...tags, ...newSkills];
                onChange(newTags.join(', '));
            }
            setInputValue('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        } else if (e.key === ',') {
            e.preventDefault();
            handleAddTag();
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const removeTag = (indexToRemove) => {
        const newTags = tags.filter((_, idx) => idx !== indexToRemove);
        onChange(newTags.join(', '));
    };

    return (
        <div 
            className={`skills-container ${focused ? 'focused' : ''}`}
            onClick={() => inputRef.current?.focus()}
        >
            <AnimatePresence mode="popLayout">
                {tags.map((tag, idx) => (
                    <motion.span
                        key={tag}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="skill-badge"
                    >
                        {tag}
                        <span 
                            className="skill-badge-delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(idx);
                            }}
                        >
                            <FiX size={12} />
                        </span>
                    </motion.span>
                ))}
            </AnimatePresence>
            <input
                ref={inputRef}
                type="text"
                className="skill-input-inline"
                placeholder={tags.length === 0 ? "Type skill and press Enter..." : "Add skill..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    setFocused(false);
                    handleAddTag();
                }}
                onFocus={() => setFocused(true)}
            />
        </div>
    );
}

function Profile({ user, session, onUpdateUser, resumeData, onResumeAnalyzed }) {
    const navigate = useNavigate();
    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [dob, setDob] = useState('');
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [showPassword, setShowPassword] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState(null);

    const handleOAuthLogin = async (provider) => {
        try {
            setAuthLoading(true);
            setAuthError(null);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${window.location.origin}/`
                }
            });
            if (error) throw error;
        } catch (err) {
            console.error(`${provider} login failed:`, err);
            setAuthError(err.message || `Failed to sign in with ${provider}`);
            setAuthLoading(false);
        }
    };

    const [form, setForm] = useState({
        name: '',
        email: '',
        dob: '',
        desiredRole: '',
        country: '',
        location: '',
        experienceLevel: '',
        salaryMin: '',
        salaryMax: '',
        jobType: '',
        remote: false,
        skills: '',
        educationStatus: '',
        collegeCourse: '',
        expectedGraduationYear: '',
        jobSearchUrgency: '',
        openToInternationalRemote: false,
        preferredCurrency: '',
        portfolioGithub: '',
        portfolioBehance: '',
        portfolioLinkedin: '',
        portfolioWebsite: ''
    });

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({
                name: user?.name || '',
                email: user?.email || '',
                dob: user?.dob || '',
                desiredRole: user?.preferences?.desiredRole || '',
                country: user?.preferences?.country || '',
                location: user?.preferences?.location || '',
                experienceLevel: user?.preferences?.experienceLevel || '',
                salaryMin: user?.preferences?.salaryMin || '',
                salaryMax: user?.preferences?.salaryMax || '',
                jobType: user?.preferences?.jobType || '',
                remote: user?.preferences?.remote || false,
                skills: user?.preferences?.skills?.join(', ') || resumeData?.skills?.join(', ') || '',
                educationStatus: user?.educationStatus || '',
                collegeCourse: user?.collegeCourse || '',
                expectedGraduationYear: user?.expectedGraduationYear || '',
                jobSearchUrgency: user?.jobSearchUrgency || '',
                openToInternationalRemote: user?.openToInternationalRemote || false,
                preferredCurrency: user?.preferredCurrency || '',
                portfolioGithub: user?.portfolioGithub || '',
                portfolioBehance: user?.portfolioBehance || '',
                portfolioLinkedin: user?.portfolioLinkedin || '',
                portfolioWebsite: user?.portfolioWebsite || ''
            });
        }
    }, [user, resumeData]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);

        try {
            if (authMode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                navigate('/');
            } else {
                const { error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        data: {
                            dob: dob || null
                        }
                    }
                });
                if (error) throw error;
                alert("Account created! Check your email to verify your registration.");
            }
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const userData = {
                name: form.name,
                dob: form.dob || null,
                educationStatus: form.educationStatus,
                collegeCourse: form.collegeCourse,
                expectedGraduationYear: form.expectedGraduationYear ? parseInt(form.expectedGraduationYear, 10) : null,
                jobSearchUrgency: form.jobSearchUrgency,
                openToInternationalRemote: form.openToInternationalRemote,
                preferredCurrency: form.preferredCurrency,
                portfolioGithub: form.portfolioGithub,
                portfolioBehance: form.portfolioBehance,
                portfolioLinkedin: form.portfolioLinkedin,
                portfolioWebsite: form.portfolioWebsite,
                preferences: {
                    desiredRole: form.desiredRole,
                    country: form.country,
                    location: form.location,
                    experienceLevel: form.experienceLevel,
                    salaryMin: parseInt(form.salaryMin) || 0,
                    salaryMax: parseInt(form.salaryMax) || 0,
                    jobType: form.jobType,
                    remote: form.remote,
                    skills: form.skills.split(',').map(s => s.trim()).filter(Boolean)
                }
            };

            if (resumeData) {
                userData.resumeData = resumeData;
            }

            const res = await createOrUpdateUser(userData);
            onUpdateUser(res.data.user);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!session) {
        return (
            <div className="auth-page-wrapper" style={{ position: 'relative', minHeight: '100vh' }}>
                {/* Brand Logo in Top-Left Corner */}
                <div 
                    className="absolute top-6 left-6 z-50 cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    <span className="navbar-logo text-xl">
                        Appli<span>qa</span>
                    </span>
                </div>

                <div className="auth-container" style={{ minHeight: '100vh' }}>
                    {/* Left column: sign-in/sign-up form */}
                    <section className="auth-form-section" style={{ paddingTop: '100px' }}>
                    <div className="auth-form-wrapper">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <h1 className="animate-fade-up animate-delay-100" style={{ fontSize: '42px', fontWeight: 500, letterSpacing: '-1.5px', marginBottom: '36px' }}>
                                    {authMode === 'login' ? 'Welcome' : 'Create Account'}
                                </h1>
                                <p className="animate-fade-up animate-delay-200" style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
                                    {authMode === 'login' 
                                        ? "Access your account and continue your journey with us" 
                                        : "Create an account to track applications and get AI insights"}
                                </p>
                            </div>

                            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {authError && (
                                    <div className="animate-fade-up" style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                        {authError}
                                    </div>
                                )}

                                <div className="animate-fade-up animate-delay-300">
                                    <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Email Address</label>
                                    <div className="premium-auth-input-wrapper">
                                        <FiMail className="input-icon" />
                                        <input 
                                            type="email" 
                                            required 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email address" 
                                            className="premium-auth-input" 
                                            disabled={authLoading}
                                        />
                                    </div>
                                </div>

                                {authMode === 'register' && (
                                    <div className="animate-fade-up animate-delay-350">
                                        <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Date of Birth</label>
                                        <div className="premium-auth-input-wrapper">
                                            <FiCalendar className="input-icon" />
                                            <input 
                                                type="date" 
                                                required 
                                                value={dob}
                                                onChange={(e) => setDob(e.target.value)}
                                                className="premium-auth-input" 
                                                style={{ colorScheme: 'dark' }}
                                                disabled={authLoading}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="animate-fade-up animate-delay-400">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Password</label>
                                    </div>
                                    <div className="premium-auth-input-wrapper">
                                        <FiLock className="input-icon" />
                                        <input 
                                            type={showPassword ? 'text' : 'password'} 
                                            required 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password" 
                                            className="premium-auth-input" 
                                            style={{ paddingRight: '48px' }}
                                            disabled={authLoading}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPassword(!showPassword)} 
                                            className="password-toggle-btn"
                                        >
                                            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="animate-fade-up animate-delay-500" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <label className="auth-checkbox-label">
                                        <input type="checkbox" name="rememberMe" className="auth-checkbox" />
                                        <span style={{ color: 'var(--text-secondary)' }}>Keep me signed in</span>
                                    </label>
                                    {authMode === 'login' && (
                                        <a href="#" onClick={(e) => { e.preventDefault(); alert('Forgot password flow not implemented yet.'); }} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }} className="hover:underline">
                                            Reset password
                                        </a>
                                    )}
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={authLoading}
                                    className="auth-submit-btn animate-fade-up animate-delay-600"
                                >
                                    {authLoading ? (
                                        <><span className="spinner-loader"></span> {authMode === 'login' ? 'Signing In...' : 'Creating Account...'}</>
                                    ) : (
                                        authMode === 'login' ? 'Sign In' : 'Create Account'
                                    )}
                                </button>
                            </form>

                             <div className="animate-fade-up animate-delay-700" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
                                <span style={{ width: '100%', borderTop: '1px solid var(--ghost-border)' }}></span>
                                <span style={{ padding: '0 16px', fontSize: '12px', color: 'var(--text-muted)', backgroundColor: '#000000', position: 'absolute' }}>Or continue with</span>
                            </div>

                            <div className="animate-fade-up animate-delay-800" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <button 
                                    onClick={() => handleOAuthLogin('google')} 
                                    disabled={authLoading}
                                    className="premium-oauth-btn"
                                >
                                    <GoogleIcon />
                                    Google
                                </button>
                                <button 
                                    onClick={() => handleOAuthLogin('github')} 
                                    disabled={authLoading}
                                    className="premium-oauth-btn"
                                >
                                    <FiGithub size={16} />
                                    GitHub
                                </button>
                            </div>

                            <p className="animate-fade-up animate-delay-900" style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                                {authMode === 'login' ? (
                                    <>New to our platform? <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('register'); }} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }} className="hover:underline">Create Account</a></>
                                ) : (
                                    <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('login'); }} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }} className="hover:underline">Sign In</a></>
                                )}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Right column: hero image + testimonials */}
                <section className="auth-hero-section">
                    <div className="auth-hero-image-container">
                        <div className="auth-hero-ambient-glow"></div>
                        <div className="auth-hero-content-wrapper">
                            {/* Floating Mock Card 1: Match Score */}
                            <div className="auth-mock-card match-score-card animate-fade-up">
                                <div className="auth-mock-card-header">
                                    <span className="auth-mock-pill">AI MATCH</span>
                                    <span className="auth-mock-percentage">94%</span>
                                </div>
                                <div className="auth-mock-job-details">
                                    <h4>Senior Frontend Engineer</h4>
                                    <p>Vercel • San Francisco, CA</p>
                                </div>
                                <div className="auth-mock-skills-match">
                                    <div className="skills-match-header">
                                        <span>Skills Match</span>
                                        <span>12/15 skills</span>
                                    </div>
                                    <div className="auth-mock-progress-bar">
                                        <div className="auth-mock-progress-fill" style={{ width: '80%' }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Mock Card 2: Career Roadmap */}
                            <div className="auth-mock-card roadmap-card animate-fade-up animate-delay-200">
                                <div className="auth-mock-card-header">
                                    <span className="auth-mock-pill" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.2)' }}>CAREER PATH</span>
                                </div>
                                <div className="auth-roadmap-steps">
                                    <div className="auth-roadmap-step completed">
                                        <div className="step-dot"></div>
                                        <div className="step-info">
                                            <h5>Frontend Developer</h5>
                                            <p>Current Role</p>
                                        </div>
                                    </div>
                                    <div className="auth-roadmap-step active">
                                        <div className="step-dot"></div>
                                        <div className="step-info">
                                            <h5>Senior Engineer</h5>
                                            <p>Next Step (94% ready)</p>
                                        </div>
                                    </div>
                                    <div className="auth-roadmap-step future">
                                        <div className="step-dot"></div>
                                        <div className="step-info">
                                            <h5>Staff Engineer / Architect</h5>
                                            <p>Long term target</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Mock Card 3: Resume ATS Optimizer */}
                            <div className="auth-mock-card ats-card animate-fade-up animate-delay-300">
                                <div className="auth-mock-card-header">
                                    <span className="auth-mock-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.2)' }}>ATS OPTIMIZER</span>
                                    <span className="auth-mock-percentage" style={{ color: '#10b981', textShadow: '0 0 12px rgba(16, 185, 129, 0.3)' }}>88%</span>
                                </div>
                                <div className="auth-mock-ats-checklist" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div className="ats-check-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: 'var(--text-primary)', textAlign: 'left' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        <span>Formatting & Structure Passed</span>
                                    </div>
                                    <div className="ats-check-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: 'var(--text-primary)', textAlign: 'left' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        <span>Quantifiable Achievement Found</span>
                                    </div>
                                    <div className="ats-check-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: 'var(--text-secondary)', textAlign: 'left' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                        <span style={{ color: 'var(--text-muted)' }}>5 Missing Keywords Detected</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </section>
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            className="main-content" 
            style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div 
                className="section-header" 
                style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                variants={cardVariants}
            >
                <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>
                    Your Profile <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 12px rgba(249, 115, 22, 0.2)' }}>Options</span>
                </h2>
                <Button 
                    variant="ghost" 
                    onClick={handleLogout} 
                    style={{ 
                        color: 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '99px',
                        border: '1px solid var(--ghost-border)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                    }}
                    className="hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/5"
                >
                    <FiLogOut size={16} /> Sign Out
                </Button>
            </motion.div>

            <form onSubmit={handleSubmit}>
                <motion.div variants={cardVariants} style={{ marginBottom: 24 }}>
                    <Card style={{ 
                        background: 'rgba(10, 10, 10, 0.4)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid var(--ghost-border)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
                        borderRadius: '16px'
                    }}>
                        <h3 style={{ marginBottom: 24, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            <span style={{ width: '3px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px', display: 'inline-block' }}></span>
                            Basic Info
                        </h3>
                        <div className="preferences-form">
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Full Name</label>
                                <PremiumIconInput
                                    icon={FiUser}
                                    placeholder="John Doe"
                                    value={form.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Email (Read Only)</label>
                                <PremiumIconInput
                                    icon={FiMail}
                                    type="email"
                                    disabled
                                    value={form.email || session.user.email}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Date of Birth</label>
                                <PremiumIconInput
                                    icon={FiCalendar}
                                    type="date"
                                    value={form.dob}
                                    onChange={(e) => handleChange('dob', e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                        </div>
                    </Card>
                </motion.div>

                <motion.div variants={cardVariants} style={{ marginBottom: 24 }}>
                    <Card style={{ 
                        background: 'rgba(10, 10, 10, 0.4)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid var(--ghost-border)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
                        borderRadius: '16px'
                    }}>
                        <h3 style={{ marginBottom: 24, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            <span style={{ width: '3px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px', display: 'inline-block' }}></span>
                            Job Preferences
                        </h3>
                        <div className="preferences-form">
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Desired Role</label>
                                <PremiumIconInput
                                    icon={FiBriefcase}
                                    placeholder="e.g. Frontend Developer"
                                    value={form.desiredRole}
                                    onChange={(e) => handleChange('desiredRole', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Country</label>
                                <Dropdown
                                    options={[
                                        { value: "", label: "Select country" },
                                        { value: "India", label: "India" },
                                        { value: "United States", label: "United States" },
                                        { value: "United Kingdom", label: "United Kingdom" },
                                        { value: "Canada", label: "Canada" },
                                        { value: "Germany", label: "Germany" },
                                        { value: "Australia", label: "Australia" },
                                        { value: "Singapore", label: "Singapore" },
                                        { value: "UAE", label: "UAE" },
                                        { value: "Netherlands", label: "Netherlands" },
                                        { value: "Japan", label: "Japan" },
                                        ...(form.country && !["India", "United States", "United Kingdom", "Canada", "Germany", "Australia", "Singapore", "UAE", "Netherlands", "Japan"].includes(form.country) ? [{ value: form.country, label: form.country }] : [])
                                    ]}
                                    value={form.country}
                                    onChange={(val) => {
                                        handleChange('country', val);
                                        handleChange('location', '');
                                    }}
                                    placeholder="Select country"
                                    variant="form"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>City / Location</label>
                                <Dropdown
                                    options={[
                                        { value: "", label: form.country ? 'Select city' : 'Select country first' },
                                        ...(citiesByCountry[form.country] || []).map(city => ({ value: city, label: city })),
                                        ...(form.location && !(citiesByCountry[form.country] || []).includes(form.location) ? [{ value: form.location, label: form.location }] : [])
                                    ]}
                                    value={form.location}
                                    onChange={(val) => handleChange('location', val)}
                                    disabled={!form.country}
                                    placeholder={form.country ? 'Select city' : 'Select country first'}
                                    variant="form"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Experience Level</label>
                                <Dropdown
                                    options={[
                                        { value: "", label: "Select level" },
                                        { value: "entry", label: "Entry Level (0-2 years)" },
                                        { value: "mid", label: "Mid Level (2-5 years)" },
                                        { value: "senior", label: "Senior (5-10 years)" },
                                        { value: "lead", label: "Lead/Principal (10+ years)" }
                                    ]}
                                    value={form.experienceLevel}
                                    onChange={(val) => handleChange('experienceLevel', val)}
                                    placeholder="Select level"
                                    variant="form"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Job Type</label>
                                <Dropdown
                                    options={[
                                        { value: "", label: "Any type" },
                                        { value: "fulltime", label: "Full Time" },
                                        { value: "parttime", label: "Part Time" },
                                        { value: "contract", label: "Contract" },
                                        { value: "intern", label: "Internship" }
                                    ]}
                                    value={form.jobType}
                                    onChange={(val) => handleChange('jobType', val)}
                                    placeholder="Any type"
                                    variant="form"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Min Salary (₹)</label>
                                <PremiumIconInput
                                    symbol="₹"
                                    type="number"
                                    placeholder="500000"
                                    value={form.salaryMin}
                                    onChange={(e) => handleChange('salaryMin', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Max Salary (₹)</label>
                                <PremiumIconInput
                                    symbol="₹"
                                    type="number"
                                    placeholder="1500000"
                                    value={form.salaryMax}
                                    onChange={(e) => handleChange('salaryMax', e.target.value)}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Skills</label>
                                <SkillsTagInput
                                    value={form.skills}
                                    onChange={(val) => handleChange('skills', val)}
                                />
                            </div>
                            <div className="form-group" style={{ marginTop: 16 }}>
                                <PremiumToggle
                                    checked={form.remote}
                                    onChange={(val) => handleChange('remote', val)}
                                    label="Remote positions only"
                                />
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Career Status & Urgency */}
                <motion.div variants={cardVariants} style={{ marginBottom: 24 }}>
                    <Card style={{ 
                        background: 'rgba(10, 10, 10, 0.4)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid var(--ghost-border)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
                        borderRadius: '16px'
                    }}>
                        <h3 style={{ marginBottom: 24, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            <span style={{ width: '3px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px', display: 'inline-block' }}></span>
                            Career Status & Urgency
                        </h3>
                        <div className="preferences-form">
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Education / Professional Status</label>
                                <Dropdown
                                    options={[
                                        { value: "", label: "Select status" },
                                        { value: "Working Professional", label: "Working Professional" },
                                        { value: "College/University Student", label: "College/University Student" },
                                        { value: "School Student", label: "School Student" },
                                        { value: "Self-Educated / Career Switcher", label: "Self-Educated / Career Switcher" }
                                    ]}
                                    value={form.educationStatus}
                                    onChange={(val) => {
                                        handleChange('educationStatus', val);
                                        if (val !== "College/University Student") {
                                            handleChange('collegeCourse', '');
                                            handleChange('expectedGraduationYear', '');
                                        }
                                    }}
                                    placeholder="Select status"
                                    variant="form"
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Job Search Urgency</label>
                                <Dropdown
                                    options={[
                                        { value: "", label: "Select urgency" },
                                        { value: "Actively looking (Ready to interview/start immediately)", label: "Actively looking (Ready to start)" },
                                        { value: "Open to opportunities (Passive search)", label: "Open to opportunities" },
                                        { value: "Just browsing (Not looking)", label: "Just browsing / Not looking" }
                                    ]}
                                    value={form.jobSearchUrgency}
                                    onChange={(val) => handleChange('jobSearchUrgency', val)}
                                    placeholder="Select urgency"
                                    variant="form"
                                />
                            </div>

                            {form.educationStatus === "College/University Student" && (
                                <>
                                    <div className="form-group">
                                        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>College Course / Major</label>
                                        <PremiumIconInput
                                            icon={FiBookOpen}
                                            placeholder="e.g. B.Tech Computer Science"
                                            value={form.collegeCourse}
                                            onChange={(e) => handleChange('collegeCourse', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Expected Graduation Year</label>
                                        <PremiumIconInput
                                            icon={FiCalendar}
                                            type="number"
                                            placeholder="e.g. 2027"
                                            value={form.expectedGraduationYear}
                                            onChange={(e) => handleChange('expectedGraduationYear', e.target.value)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                </motion.div>

                {/* Work & Currency Preferences */}
                <motion.div variants={cardVariants} style={{ marginBottom: 24 }}>
                    <Card style={{ 
                        background: 'rgba(10, 10, 10, 0.4)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid var(--ghost-border)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
                        borderRadius: '16px'
                    }}>
                        <h3 style={{ marginBottom: 24, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            <span style={{ width: '3px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px', display: 'inline-block' }}></span>
                            Work & Pay Preferences
                        </h3>
                        <div className="preferences-form">
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Preferred Currency</label>
                                <Dropdown
                                    options={[
                                        { value: "", label: "Select currency" },
                                        { value: "INR", label: "Indian Rupee (₹)" },
                                        { value: "USD", label: "US Dollar ($)" },
                                        { value: "EUR", label: "Euro (€)" },
                                        { value: "GBP", label: "British Pound (£)" },
                                        { value: "CAD", label: "Canadian Dollar (C$)" }
                                    ]}
                                    value={form.preferredCurrency}
                                    onChange={(val) => handleChange('preferredCurrency', val)}
                                    placeholder="Select currency"
                                    variant="form"
                                />
                            </div>

                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: 32 }}>
                                <PremiumToggle
                                    checked={form.openToInternationalRemote}
                                    onChange={(val) => handleChange('openToInternationalRemote', val)}
                                    label="Open to International Remote positions"
                                />
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Professional Links */}
                <motion.div variants={cardVariants} style={{ marginBottom: 24 }}>
                    <Card style={{ 
                        background: 'rgba(10, 10, 10, 0.4)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid var(--ghost-border)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
                        borderRadius: '16px'
                    }}>
                        <h3 style={{ marginBottom: 24, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            <span style={{ width: '3px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px', display: 'inline-block' }}></span>
                            Professional Links
                        </h3>
                        <div className="preferences-form">
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>LinkedIn Profile</label>
                                <PremiumIconInput
                                    icon={FiLinkedin}
                                    placeholder="https://linkedin.com/in/username"
                                    value={form.portfolioLinkedin}
                                    onChange={(e) => handleChange('portfolioLinkedin', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>GitHub Profile</label>
                                <PremiumIconInput
                                    icon={FiGithub}
                                    placeholder="https://github.com/username"
                                    value={form.portfolioGithub}
                                    onChange={(e) => handleChange('portfolioGithub', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Behance Portfolio</label>
                                <PremiumIconInput
                                    icon={FiGlobe}
                                    placeholder="https://behance.net/username"
                                    value={form.portfolioBehance}
                                    onChange={(e) => handleChange('portfolioBehance', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Personal Website</label>
                                <PremiumIconInput
                                    icon={FiGlobe}
                                    placeholder="https://yourwebsite.com"
                                    value={form.portfolioWebsite}
                                    onChange={(e) => handleChange('portfolioWebsite', e.target.value)}
                                />
                            </div>
                        </div>
                    </Card>
                </motion.div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32, borderTop: '1px solid var(--ghost-border)', paddingTop: 24 }}>
                    <motion.button
                        type="submit"
                        disabled={saving}
                        whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(249, 115, 22, 0.2)" }}
                        whileTap={{ scale: 0.98 }}
                        className="btn btn-primary"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background 0.3s ease, border-color 0.3s ease'
                        }}
                    >
                        {saved ? (
                            <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiCheck size={16} /> Saved!
                            </motion.span>
                        ) : saving ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    style={{ display: 'inline-block' }}
                                >
                                    <FiSave size={16} />
                                </motion.span>
                                Saving...
                            </span>
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiSave size={16} /> Save Profile
                            </span>
                        )}
                    </motion.button>
                </div>
            </form>

            <motion.div variants={cardVariants} style={{ marginTop: 40 }}>
                <div className="section-header" style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 600 }}>Your Resume</h2>
                </div>
                <ResumeUpload
                    onResumeAnalyzed={onResumeAnalyzed}
                    existingData={resumeData}
                />
            </motion.div>
        </motion.div>
    );
}

export default Profile;
