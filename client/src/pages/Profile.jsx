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
import PremiumDatePicker from '../components/ui/PremiumDatePicker';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { motion, AnimatePresence } from 'framer-motion';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px', marginRight: '6px' }} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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

function PremiumCard({ children, className = '', style = {}, ...props }) {
    return (
        <div 
            className={`p-5 sm:p-6 rounded-lg bg-white border border-[#D8D4CC] ${className}`}
            style={{ 
                boxShadow: 'none',
                ...style
            }}
            {...props}
        >
            {children}
        </div>
    );
}

function PremiumTagInput({ 
    value, 
    onChange, 
    placeholder = "Add...", 
    emptyPlaceholder = "Type and press Enter..." 
}) {
    const [inputValue, setInputValue] = useState('');
    const [focused, setFocused] = useState(false);
    const inputRef = useRef(null);

    const tags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

    const handleAddTag = () => {
        if (inputValue.trim()) {
            const newTagsList = inputValue.split(',')
                .map(s => s.trim())
                .filter(s => s && !tags.includes(s));
            if (newTagsList.length > 0) {
                const newTags = [...tags, ...newTagsList];
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
                placeholder={tags.length === 0 ? emptyPlaceholder : placeholder}
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

function Profile({ user, session, authResolved, onUpdateUser, resumeData, onResumeAnalyzed }) {
    const navigate = useNavigate();
    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authMode, setAuthMode] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('reset') === 'true' ? 'reset' : 'login';
    });
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
        portfolioWebsite: '',
        currentSalary: '',
        targetSalary: '',
        willingToRelocate: false,
        targetCities: '',
        skillsToLearn: '',
        openToBootcamps: false,
        preferredTools: '',
        preferredTechStack: '',
        certifications: '',
        skillsProficiency: '',
        resumesOptimizedCount: 0,
        coverLettersGeneratedCount: 0,
        recruiterDmsSentCount: 0
    });

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const initialFormSnapshotRef = useRef(null);

    // Global keyboard shortcut (Ctrl+S / Cmd+S) to save profile from anywhere
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSubmit(e);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [form, resumeData]);

    useEffect(() => {
        if (user) {
            const initialForm = {
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
                portfolioWebsite: user?.portfolioWebsite || '',
                currentSalary: user?.currentSalary || '',
                targetSalary: user?.targetSalary || '',
                willingToRelocate: user?.willingToRelocate || false,
                targetCities: user?.targetCities || '',
                skillsToLearn: user?.skillsToLearn || '',
                openToBootcamps: user?.openToBootcamps || false,
                preferredTools: user?.preferredTools || '',
                preferredTechStack: user?.preferredTechStack || '',
                certifications: user?.certifications || '',
                skillsProficiency: user?.skillsProficiency || '',
                resumesOptimizedCount: user?.resumesOptimizedCount || 0,
                coverLettersGeneratedCount: user?.coverLettersGeneratedCount || 0,
                recruiterDmsSentCount: user?.recruiterDmsSentCount || 0
            };
            setForm(initialForm);
            initialFormSnapshotRef.current = JSON.stringify(initialForm);
            setIsDirty(false);
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
            } else if (authMode === 'register') {
                const { error } = await supabase.auth.signUp({ 
                    email, 
                    password
                });
                if (error) throw error;
                alert("Account created! Check your email to verify your registration.");
            } else if (authMode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/profile?reset=true`
                });
                if (error) throw error;
                alert("Password reset email sent! Please check your inbox.");
                setAuthMode('login');
            } else if (authMode === 'reset') {
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                alert("Password updated successfully! You can now log in with your new password.");
                await supabase.auth.signOut();
                navigate('/profile', { replace: true });
                setAuthMode('login');
                setPassword('');
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
        setForm(prev => {
            const updated = { ...prev, [field]: value };
            if (initialFormSnapshotRef.current) {
                const isChanged = JSON.stringify(updated) !== initialFormSnapshotRef.current;
                setIsDirty(isChanged);
                if (isChanged) setSaved(false);
            } else {
                setIsDirty(true);
                setSaved(false);
            }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
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
                currentSalary: form.currentSalary !== '' && form.currentSalary !== null ? parseInt(form.currentSalary, 10) : null,
                targetSalary: form.targetSalary !== '' && form.targetSalary !== null ? parseInt(form.targetSalary, 10) : null,
                willingToRelocate: form.willingToRelocate,
                targetCities: form.targetCities,
                skillsToLearn: form.skillsToLearn,
                openToBootcamps: form.openToBootcamps,
                preferredTools: form.preferredTools,
                preferredTechStack: form.preferredTechStack,
                certifications: form.certifications,
                skillsProficiency: form.skillsProficiency,
                resumesOptimizedCount: parseInt(form.resumesOptimizedCount, 10) || 0,
                coverLettersGeneratedCount: parseInt(form.coverLettersGeneratedCount, 10) || 0,
                recruiterDmsSentCount: parseInt(form.recruiterDmsSentCount, 10) || 0,
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
            initialFormSnapshotRef.current = JSON.stringify(form);
            setIsDirty(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3500);
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const isOAuthCallback = typeof window !== 'undefined' && (window.location.hash?.includes('access_token') || window.location.hash?.includes('refresh_token'));

    if ((!authResolved && !session) || (!session && isOAuthCallback)) {
        return <PageSkeleton />;
    }

    if (!session || authMode === 'reset') {
        return (
            <div className="auth-split-wrapper">
                {/* Left Column: Form Centered Horizontally & Vertically */}
                <div className="auth-split-left">
                    <div className="auth-split-form-container">
                        {/* Title Section */}
                        <div style={{ marginBottom: '28px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                                {authMode === 'login' 
                                    ? 'Welcome back' 
                                    : authMode === 'register' 
                                        ? 'Start your journey' 
                                        : 'Account security'}
                            </span>
                            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
                                {authMode === 'login' 
                                    ? 'Sign In to Appliqa' 
                                    : authMode === 'register' 
                                        ? 'Sign Up to Appliqa' 
                                        : authMode === 'forgot' 
                                            ? 'Reset Password' 
                                            : 'Set New Password'}
                            </h1>
                        </div>

                        {authError && (
                            <div style={{ marginBottom: '20px', padding: '12px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                <span>{authError}</span>
                            </div>
                        )}

                        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {authMode !== 'reset' && (
                                <div className="auth-field-wrapper">
                                    <label className="auth-field-label">
                                        E-mail
                                    </label>
                                    <div className="auth-field-box">
                                        <input 
                                            type="email" 
                                            required 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="example@email.com" 
                                            className="auth-field-input"
                                            disabled={authLoading}
                                        />
                                        <FiMail className="auth-field-icon" />
                                    </div>
                                </div>
                            )}

                            {authMode !== 'forgot' && (
                                <div className="auth-field-wrapper">
                                    <div className="auth-field-label-row">
                                        <label className="auth-field-label">
                                            Password
                                        </label>
                                        {authMode === 'login' && (
                                            <a 
                                                href="#" 
                                                onClick={(e) => { e.preventDefault(); setAuthError(null); setAuthMode('forgot'); }} 
                                                className="auth-field-forgot"
                                            >
                                                Forgot?
                                            </a>
                                        )}
                                    </div>
                                    <div className="auth-field-box">
                                        <input 
                                            type={showPassword ? 'text' : 'password'} 
                                            required 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••" 
                                            className="auth-field-input"
                                            disabled={authLoading}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPassword(!showPassword)} 
                                            className="auth-field-icon-btn"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {authMode === 'login' && (
                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', paddingTop: '2px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#64748B', userSelect: 'none' }}>
                                        <input type="checkbox" name="rememberMe" style={{ accentColor: '#F45B25', cursor: 'pointer' }} />
                                        <span>Keep me signed in</span>
                                    </label>
                                </div>
                            )}

                            {/* Solid Theme Button */}
                            <button 
                                type="submit" 
                                disabled={authLoading}
                                className="auth-submit-button"
                            >
                                {authLoading ? (
                                    <>
                                        <span className="spinner-loader" style={{ width: 16, height: 16, borderWidth: 2 }}></span> 
                                        <span>
                                            {authMode === 'login' 
                                                ? 'Signing in...' 
                                                : authMode === 'register' 
                                                    ? 'Signing up...' 
                                                    : authMode === 'forgot' 
                                                        ? 'Sending link...' 
                                                        : 'Updating...'}
                                        </span>
                                    </>
                                ) : (
                                    authMode === 'login' 
                                        ? 'Sign In' 
                                        : authMode === 'register' 
                                            ? 'Sign Up' 
                                            : authMode === 'forgot' 
                                                ? 'Send Reset Link' 
                                                : 'Update Password'
                                )}
                            </button>
                        </form>

                        {(authMode === 'login' || authMode === 'register') && (
                            <>
                                <div className="auth-divider">
                                    <div className="auth-divider-line"></div>
                                    <span className="auth-divider-text">
                                        {authMode === 'login' ? 'or sign in with' : 'or sign up with'}
                                    </span>
                                </div>

                                <div className="auth-social-row">
                                    <button 
                                        type="button"
                                        onClick={() => handleOAuthLogin('google')} 
                                        disabled={authLoading}
                                        className="auth-social-btn"
                                        title="Sign in with Google"
                                    >
                                        <GoogleIcon />
                                        <span>Google</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleOAuthLogin('github')} 
                                        disabled={authLoading}
                                        className="auth-social-btn"
                                        title="Sign in with GitHub"
                                    >
                                        <FiGithub size={18} />
                                        <span>GitHub</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Bottom Switcher */}
                        <div className="auth-switcher-footer">
                            {authMode === 'login' ? (
                                <>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setAuthError(null); setAuthMode('register'); }} className="auth-switcher-link">Sign up</a></>
                            ) : authMode === 'register' ? (
                                <>Have an account? <a href="#" onClick={(e) => { e.preventDefault(); setAuthError(null); setAuthMode('login'); }} className="auth-switcher-link">Sign in</a></>
                            ) : (
                                <a href="#" onClick={(e) => { e.preventDefault(); setAuthError(null); setAuthMode('login'); }} className="auth-switcher-link">
                                    ← Back to Sign In
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Full-Bleed Editorial Fluid Artwork in Appliqa Palette */}
                <div className="auth-split-right">
                    <img 
                        src="/auth-art.jpg" 
                        alt="Appliqa Editorial Fluid Artwork" 
                        className="w-full h-full object-cover object-center block select-none pointer-events-none"
                    />
                    
                    {/* Subtle Overlay Badge / Carousel Indicators at bottom-right */}
                    <div className="absolute bottom-8 right-8 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                        <div className="w-5 h-1 rounded-full bg-white"></div>
                        <div className="w-1.5 h-1 rounded-full bg-white/40"></div>
                        <div className="w-1.5 h-1 rounded-full bg-white/40"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            className="max-w-5xl mx-auto px-4 sm:px-6 py-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ── Candidate Command Header ── */}
            <motion.div 
                className="bg-white rounded-lg border border-[#D8D4CC] p-5 sm:p-6 mb-6"
                variants={cardVariants}
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight m-0">
                                {form.name || 'Candidate Profile'}
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#FFF0E8] text-[#F45B25] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#F45B25]/20">
                                {form.desiredRole || 'Tech Candidate'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#66615C] flex-wrap">
                            <span>{form.email || session?.user?.email}</span>
                            {form.location && (
                                <>
                                    <span className="text-[#D8D4CC]">·</span>
                                    <span>{form.location}{form.country ? `, ${form.country}` : ''}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* On-Platform Stats Cluster */}
                        <div className="flex items-center gap-2 bg-[#FAF8F5] p-1.5 rounded-md border border-[#D8D4CC]">
                            <div className="px-3 py-1 text-center">
                                <div className="text-[10px] font-mono uppercase text-[#8A8580] tracking-wider">Optimized</div>
                                <div className="text-sm font-black text-[#171717] font-mono">{form.resumesOptimizedCount}</div>
                            </div>
                            <div className="w-[1px] h-6 bg-[#D8D4CC]" />
                            <div className="px-3 py-1 text-center">
                                <div className="text-[10px] font-mono uppercase text-[#8A8580] tracking-wider">Letters</div>
                                <div className="text-sm font-black text-[#171717] font-mono">{form.coverLettersGeneratedCount}</div>
                            </div>
                            <div className="w-[1px] h-6 bg-[#D8D4CC]" />
                            <div className="px-3 py-1 text-center">
                                <div className="text-[10px] font-mono uppercase text-[#8A8580] tracking-wider">DMs</div>
                                <div className="text-sm font-black text-[#171717] font-mono">{form.recruiterDmsSentCount}</div>
                            </div>
                        </div>

                        {/* Top Save Profile Button */}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            className={`h-9 px-4 rounded-md text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 border-none shadow-sm ${
                                saved
                                    ? 'bg-[#F45B25] text-white shadow-[#F45B25]/30'
                                    : isDirty
                                    ? 'bg-[#F45B25] hover:bg-[#d94815] text-white shadow-[#F45B25]/30 animate-pulse'
                                    : 'bg-[#171717] hover:bg-[#F45B25] text-white'
                            }`}
                            title="Save profile changes (Ctrl+S)"
                        >
                            {saving ? (
                                <>
                                    <FiSave size={13} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : saved ? (
                                <>
                                    <FiCheck size={13} />
                                    <span>Saved!</span>
                                </>
                            ) : (
                                <>
                                    <FiSave size={13} />
                                    <span>{isDirty ? 'Save Changes' : 'Save Profile'}</span>
                                </>
                            )}
                        </button>

                        <button 
                            type="button"
                            onClick={handleLogout} 
                            className="h-9 px-3 rounded-md bg-white hover:bg-[#FAF8F5] text-[#171717] text-xs font-bold border border-[#D8D4CC] transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                            title="Sign out of your account"
                        >
                            <FiLogOut size={13} className="text-[#8A8580]" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 01 // Personal Identity & Contact */}
                <motion.div variants={cardVariants}>
                    <PremiumCard>
                        <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-[#FAF8F5]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25]">
                                01 // PERSONAL IDENTITY & CONTACT
                            </span>
                        </div>
                        <div className="preferences-form">
                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Full Name</label>
                                <PremiumIconInput
                                    icon={FiUser}
                                    placeholder="John Doe"
                                    value={form.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Email Address (Read Only)</label>
                                <PremiumIconInput
                                    icon={FiMail}
                                    type="email"
                                    disabled
                                    value={form.email || session.user.email}
                                />
                            </div>
                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Date of Birth</label>
                                <PremiumDatePicker
                                    value={form.dob}
                                    onChange={(val) => handleChange('dob', val)}
                                    placeholder="Select your date of birth"
                                />
                            </div>
                        </div>
                    </PremiumCard>
                </motion.div>

                {/* 02 // Career Targeting & Location */}
                <motion.div variants={cardVariants}>
                    <PremiumCard>
                        <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-[#FAF8F5]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25]">
                                02 // CAREER TARGETING & COMPENSATION
                            </span>
                        </div>
                        <div className="preferences-form">
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Desired Target Role</label>
                                <PremiumIconInput
                                    icon={FiBriefcase}
                                    placeholder="e.g. Senior Fullstack Developer"
                                    value={form.desiredRole}
                                    onChange={(e) => handleChange('desiredRole', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Country</label>
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
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">City / Base Location</label>
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
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Experience Level</label>
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
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Employment Type</label>
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
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Min Salary</label>
                                <PremiumIconInput
                                    symbol={form.preferredCurrency === 'USD' ? '$' : form.preferredCurrency === 'EUR' ? '€' : form.preferredCurrency === 'GBP' ? '£' : form.preferredCurrency === 'CAD' ? 'C$' : '₹'}
                                    type="number"
                                    placeholder="e.g. 500000"
                                    value={form.salaryMin}
                                    onChange={(e) => handleChange('salaryMin', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Max Salary</label>
                                <PremiumIconInput
                                    symbol={form.preferredCurrency === 'USD' ? '$' : form.preferredCurrency === 'EUR' ? '€' : form.preferredCurrency === 'GBP' ? '£' : form.preferredCurrency === 'CAD' ? 'C$' : '₹'}
                                    type="number"
                                    placeholder="e.g. 1500000"
                                    value={form.salaryMax}
                                    onChange={(e) => handleChange('salaryMax', e.target.value)}
                                />
                            </div>

                            {/* Preference Toggles Row */}
                            <div className="flex flex-wrap items-center gap-6 pt-3" style={{ gridColumn: '1 / -1' }}>
                                <PremiumToggle
                                    checked={form.remote}
                                    onChange={(val) => handleChange('remote', val)}
                                    label="Remote only"
                                />
                                <PremiumToggle
                                    checked={form.willingToRelocate}
                                    onChange={(val) => handleChange('willingToRelocate', val)}
                                    label="Willing to relocate"
                                />
                                <PremiumToggle
                                    checked={form.openToInternationalRemote}
                                    onChange={(val) => handleChange('openToInternationalRemote', val)}
                                    label="International Remote"
                                />
                            </div>
                        </div>
                    </PremiumCard>
                </motion.div>

                {/* 03 // Skills & Tech Ecosystem */}
                <motion.div variants={cardVariants}>
                    <PremiumCard>
                        <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-[#FAF8F5]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25]">
                                03 // SKILLS & TECH ECOSYSTEM
                            </span>
                        </div>
                        <div className="space-y-4">
                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Core Verified Skills</label>
                                <PremiumTagInput
                                    value={form.skills}
                                    onChange={(val) => handleChange('skills', val)}
                                    emptyPlaceholder="Type skill and press Enter..."
                                    placeholder="Add skill..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Preferred Tech Stack</label>
                                    <PremiumTagInput
                                        value={form.preferredTechStack}
                                        onChange={(val) => handleChange('preferredTechStack', val)}
                                        emptyPlaceholder="React, Node.js, etc."
                                        placeholder="Add tech..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Preferred Tools & IDEs</label>
                                    <PremiumTagInput
                                        value={form.preferredTools}
                                        onChange={(val) => handleChange('preferredTools', val)}
                                        emptyPlaceholder="VS Code, Docker, etc."
                                        placeholder="Add tool..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Skills to Learn Next</label>
                                    <PremiumTagInput
                                        value={form.skillsToLearn}
                                        onChange={(val) => handleChange('skillsToLearn', val)}
                                        emptyPlaceholder="GraphQL, Rust, etc."
                                        placeholder="Add skill..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Certifications Held</label>
                                    <PremiumTagInput
                                        value={form.certifications}
                                        onChange={(val) => handleChange('certifications', val)}
                                        emptyPlaceholder="AWS Solutions Architect, etc."
                                        placeholder="Add cert..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <div className="form-group">
                                    <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Self-Assessed Proficiency</label>
                                    <Dropdown
                                        options={[
                                            { value: "", label: "Select proficiency" },
                                            { value: "Beginner", label: "Beginner" },
                                            { value: "Intermediate", label: "Intermediate" },
                                            { value: "Expert", label: "Expert" }
                                        ]}
                                        value={form.skillsProficiency}
                                        onChange={(val) => handleChange('skillsProficiency', val)}
                                        placeholder="Select proficiency"
                                        variant="form"
                                    />
                                </div>
                                <div className="form-group flex items-end pb-1">
                                    <PremiumToggle
                                        checked={form.openToBootcamps}
                                        onChange={(val) => handleChange('openToBootcamps', val)}
                                        label="Open to bootcamps & online degrees"
                                    />
                                </div>
                            </div>
                        </div>
                    </PremiumCard>
                </motion.div>

                {/* 04 // Career Status & Education */}
                <motion.div variants={cardVariants}>
                    <PremiumCard>
                        <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-[#FAF8F5]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25]">
                                04 // CAREER STATUS & EDUCATION
                            </span>
                        </div>
                        <div className="preferences-form">
                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Job Search Urgency</label>
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

                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Professional / Academic Status</label>
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

                            {form.educationStatus === "College/University Student" && (
                                <>
                                    <div className="form-group">
                                        <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">College Course / Major</label>
                                        <PremiumIconInput
                                            icon={FiBookOpen}
                                            placeholder="e.g. B.Tech Computer Science"
                                            value={form.collegeCourse}
                                            onChange={(e) => handleChange('collegeCourse', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Expected Graduation Year</label>
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

                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Target Cities</label>
                                <PremiumIconInput
                                    icon={FiGlobe}
                                    placeholder="e.g. Bangalore, Mumbai, Remote"
                                    value={form.targetCities}
                                    onChange={(e) => handleChange('targetCities', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Preferred Currency</label>
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
                        </div>
                    </PremiumCard>
                </motion.div>

                {/* 05 // Portfolio & Profiles */}
                <motion.div variants={cardVariants}>
                    <PremiumCard>
                        <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-[#FAF8F5]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25]">
                                05 // PORTFOLIO & PROFILES
                            </span>
                        </div>
                        <div className="preferences-form">
                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">LinkedIn URL</label>
                                <PremiumIconInput
                                    icon={FiLinkedin}
                                    placeholder="https://linkedin.com/in/username"
                                    value={form.portfolioLinkedin}
                                    onChange={(e) => handleChange('portfolioLinkedin', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">GitHub Profile</label>
                                <PremiumIconInput
                                    icon={FiGithub}
                                    placeholder="https://github.com/username"
                                    value={form.portfolioGithub}
                                    onChange={(e) => handleChange('portfolioGithub', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Behance Portfolio</label>
                                <PremiumIconInput
                                    icon={FiGlobe}
                                    placeholder="https://behance.net/username"
                                    value={form.portfolioBehance}
                                    onChange={(e) => handleChange('portfolioBehance', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Personal Website</label>
                                <PremiumIconInput
                                    icon={FiGlobe}
                                    placeholder="https://yourwebsite.com"
                                    value={form.portfolioWebsite}
                                    onChange={(e) => handleChange('portfolioWebsite', e.target.value)}
                                />
                            </div>
                        </div>
                    </PremiumCard>
                </motion.div>

                {/* ── Prominent Bottom Save Bar ── */}
                <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#D8D4CC] shadow-sm flex-wrap">
                    <div className="text-xs text-[#66615C] flex items-center gap-2">
                        {saved ? (
                            <span className="text-[#F45B25] font-bold inline-flex items-center gap-1.5">
                                <FiCheck size={16} /> Profile settings successfully synced!
                            </span>
                        ) : isDirty ? (
                            <span className="text-[#F45B25] font-semibold inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#F45B25] animate-pulse" /> You have unsaved changes.
                            </span>
                        ) : (
                            <span>All profile changes automatically update your ATS and job match algorithms.</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-block text-[11px] text-[#8A8580] font-mono">
                            Press Ctrl+S to save
                        </span>
                        <button
                            type="submit"
                            disabled={saving}
                            className={`h-11 px-7 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 border-none shrink-0 shadow-lg ${
                                isDirty 
                                    ? 'bg-[#F45B25] hover:bg-[#d94815] text-white shadow-[#F45B25]/25' 
                                    : 'bg-[#171717] hover:bg-[#F45B25] text-white shadow-neutral-900/10'
                            }`}
                        >
                            {saving ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <FiSave size={15} className="animate-spin" /> Saving...
                                </span>
                            ) : saved ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <FiCheck size={15} /> Saved!
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5">
                                    <FiSave size={15} /> Save Profile Changes
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            {/* ── Floating Sticky Save Bar (Pops up when changes are made) ── */}
            <AnimatePresence>
                {isDirty && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="fixed bottom-6 left-1/2 z-50 flex items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-[#171717] text-white shadow-2xl border border-white/15"
                        style={{ width: 'min(92vw, 560px)' }}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#F45B25] animate-ping shrink-0" />
                            <span className="text-xs font-medium text-white/90 truncate">
                                You have unsaved profile changes
                            </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden sm:inline-block text-[10.5px] text-white/50 font-mono">
                                Ctrl+S
                            </span>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={saving}
                                className="h-8 px-4 rounded-xl bg-[#F45B25] hover:bg-[#d94815] text-white text-xs font-bold border-none transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-[#F45B25]/30"
                            >
                                {saving ? <FiSave size={13} className="animate-spin" /> : <FiSave size={13} />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Dedicated Full-Width Synchronized Resume Section ── */}
            <motion.div variants={cardVariants} className="mt-14 pt-10 border-t border-[#D8D4CC]">
                <div className="mb-6">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25] block mb-1">
                        AI RESUME PROFILE
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight m-0">
                        Synchronized Resume Intelligence
                    </h2>
                    <p className="text-xs text-[#66615C] mt-1">
                        Live extracted skills, experience record, and career trajectory synced with your candidate profile.
                    </p>
                </div>
                <ResumeUpload
                    onResumeAnalyzed={onResumeAnalyzed}
                    existingData={resumeData}
                    user={user}
                />
            </motion.div>
        </motion.div>
    );
}

export default Profile;
