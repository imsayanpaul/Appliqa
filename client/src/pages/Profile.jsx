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
import { PageSkeleton, AuthSkeleton } from '../components/ui/PageSkeleton';
import { motion, AnimatePresence } from 'framer-motion';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px', marginRight: '6px' }} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

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
        <button type="button" role="switch" aria-checked={!!checked} className="ds-switch" onClick={() => onChange(!checked)}>
            <span className={`switch-track ${checked ? 'active' : ''}`} aria-hidden="true">
                <span className="switch-knob" />
            </span>
            <span>{label}</span>
        </button>
    );
}

function FormSection({ number, title, description, children }) {
    return (
        <section className="ds-frame ds-rule-b grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-4 ds-cell border-0 lg:border-r border-[#D8D4CC]">
                <span className="ds-mono text-[#CA3C0A]">{number}</span>
                <h2 className="mt-3 mb-2 text-[22px] font-semibold tracking-[-0.02em] leading-tight">{title}</h2>
                <p className="ds-body m-0 max-w-xs">{description}</p>
            </div>
            <div className="lg:col-span-8 ds-cell">{children}</div>
        </section>
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
        if (!session && !isOAuthCallback) {
            return <AuthSkeleton />;
        }
        return <PageSkeleton />;
    }

    if (!session || authMode === 'reset') {
        return (
            <div className="auth-split-wrapper">
                {/* Left Column: Form Centered Horizontally & Vertically */}
                <div className="auth-split-left" data-lenis-prevent>
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
                                        <input type="checkbox" name="rememberMe" style={{ accentColor: '#CA3C0A', cursor: 'pointer' }} />
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

                {/* Right side: what an account unlocks */}
                <div className="auth-split-right">
                    <div className="h-full flex flex-col text-white">
                        <div className="h-14 px-8 flex items-center justify-between border-0 border-b border-white/15">
                            <span className="ds-mono text-white/60">your account</span>
                            <span className="ds-mono text-white/60 flex items-center gap-2">free <span className="ds-square" /></span>
                        </div>
                        <ol className="list-none m-0 p-0 flex-1 min-h-0 flex flex-col">
                            {[
                                ["Upload your resume once", "Every search and score is matched against it."],
                                ["Save jobs to a tracker", "Move them from saved to applied to offer."],
                                ["Generate applications", "Cover letters and recruiter messages per job."],
                                ["Plan your next step", "Career paths, skill gaps and interview prep."],
                            ].map(([title, body], i) => (
                                <li key={title} className="auth-step flex-1 min-h-0 flex flex-col justify-center px-8 py-3 border-0 border-t border-white/15 first:border-t-0">
                                    <span className="ds-mono text-[#FF6A33]">0{i + 1}</span>
                                    <p className="m-0 mt-2 text-[22px] font-medium tracking-[-0.015em]">{title}</p>
                                    <p className="m-0 mt-1 text-[15px] text-white/60">{body}</p>
                                </li>
                            ))}
                        </ol>
                        <p aria-hidden="true" className="auth-wordmark ds-display !text-white m-0 px-8 pb-6 pt-4 border-0 border-t border-white/15 shrink-0 select-none whitespace-nowrap overflow-hidden" style={{ fontSize: "calc((min(50vw, 720px) - 64px) / 5.14)" }}>
                            Appliqa<span className="text-[#FF6A33]">.</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const saveLabel = saving ? 'Saving…' : saved ? 'Saved' : isDirty ? 'Save changes' : 'Save profile';
    const stats = [
        ['resumes optimised', form.resumesOptimizedCount],
        ['cover letters', form.coverLettersGeneratedCount],
        ['recruiter messages', form.recruiterDmsSentCount],
    ];

    return (
        <div className="bg-[#F7F5F2] text-[#171717] pb-24">
            <section className="ds-frame ds-rule-b">
                <div className="ds-rule-b px-6 sm:px-8 h-14 flex items-center justify-between gap-4">
                    <span className="ds-mono">profile / settings</span>
                    <span className={`ds-mono flex items-center gap-2 ${isDirty ? 'text-[#CA3C0A]' : 'ds-mono-muted'}`} aria-live="polite">
                        {saving ? 'saving…' : saved ? 'saved' : isDirty ? 'unsaved changes' : 'up to date'}
                        <span className="ds-square" />
                    </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-7 ds-cell !py-10 sm:!py-14 border-0 lg:border-r border-[#D8D4CC]">
                        <p className="ds-mono ds-mono-muted m-0 mb-4">{(form.desiredRole || 'no target role yet').toLowerCase()}</p>
                        <h1 className="m-0 font-semibold tracking-[-0.035em] leading-[0.95] break-words" style={{ fontSize: 'clamp(40px, 5.5vw, 76px)' }}>
                            {form.name || 'Your profile'}
                        </h1>
                        <p className="ds-mono ds-mono-muted mt-5 mb-0">
                            {[form.email || session?.user?.email, form.location && `${form.location}${form.country ? `, ${form.country}` : ''}`].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <div className="lg:col-span-5 flex flex-col border-0 border-t lg:border-t-0 border-[#D8D4CC]">
                        <dl className="ds-gridlines grid-cols-3 m-0 flex-1">
                            {stats.map(([label, value]) => (
                                <div key={label} className="px-5 py-6 flex flex-col justify-between gap-6">
                                    <dt className="ds-mono ds-mono-muted">{label}</dt>
                                    <dd className="m-0 text-[40px] font-semibold tracking-[-0.03em] leading-none">{value || 0}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="grid grid-cols-2 border-0 border-t border-[#D8D4CC]">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={saving}
                                title="Save (Ctrl+S)"
                                className={`ds-btn !min-h-[64px] !px-6 ${isDirty || saved ? 'ds-btn-accent' : 'ds-btn-ink'}`}
                            >
                                {saveLabel}
                                {saved ? <FiCheck size={18} /> : <FiSave size={18} />}
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="ds-btn !min-h-[64px] !px-6 bg-transparent text-[#171717] hover:bg-white border-0 border-l border-[#D8D4CC]"
                            >
                                Sign out
                                <FiLogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <form onSubmit={handleSubmit}>
                
            <FormSection number="01" title="About you" description="Your name and date of birth. Your email comes from your sign-in and can’t be changed here.">
                        <div className="ds-fields">
                            <div className="form-group">
                                <label className="ds-label">Full Name</label>
                                <PremiumIconInput
                                    icon={FiUser}
                                    placeholder="John Doe"
                                    value={form.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="ds-label">Email Address (Read Only)</label>
                                <PremiumIconInput
                                    icon={FiMail}
                                    type="email"
                                    disabled
                                    value={form.email || session.user.email}
                                />
                            </div>
                            <div className="form-group">
                                <label className="ds-label">Date of Birth</label>
                                <PremiumDatePicker
                                    value={form.dob}
                                    onChange={(val) => handleChange('dob', val)}
                                    placeholder="Select your date of birth"
                                />
                            </div>
                        </div>
            </FormSection>

            <FormSection number="02" title="What you’re looking for" description="Used to personalise search results, recommendations and match scores.">
                        <div className="ds-fields">
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="ds-label">Desired Target Role</label>
                                <PremiumIconInput
                                    icon={FiBriefcase}
                                    placeholder="e.g. Senior Fullstack Developer"
                                    value={form.desiredRole}
                                    onChange={(e) => handleChange('desiredRole', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="ds-label">Country</label>
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
                                <label className="ds-label">City / Base Location</label>
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
                                <label className="ds-label">Experience Level</label>
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
                                <label className="ds-label">Employment Type</label>
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
                                <label className="ds-label">Min Salary</label>
                                <PremiumIconInput
                                    symbol={form.preferredCurrency === 'USD' ? '$' : form.preferredCurrency === 'EUR' ? '€' : form.preferredCurrency === 'GBP' ? '£' : form.preferredCurrency === 'CAD' ? 'C$' : '₹'}
                                    type="number"
                                    placeholder="e.g. 500000"
                                    value={form.salaryMin}
                                    onChange={(e) => handleChange('salaryMin', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="ds-label">Max Salary</label>
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
            </FormSection>

            <FormSection number="03" title="Skills" description="Press Enter after each one. These feed your match scores and career path.">
                        <div className="space-y-4">
                            <div className="form-group">
                                <label className="ds-label">Your skills</label>
                                <PremiumTagInput
                                    value={form.skills}
                                    onChange={(val) => handleChange('skills', val)}
                                    emptyPlaceholder="Type skill and press Enter..."
                                    placeholder="Add skill..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="ds-label">Preferred Tech Stack</label>
                                    <PremiumTagInput
                                        value={form.preferredTechStack}
                                        onChange={(val) => handleChange('preferredTechStack', val)}
                                        emptyPlaceholder="React, Node.js, etc."
                                        placeholder="Add tech..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="ds-label">Preferred Tools & IDEs</label>
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
                                    <label className="ds-label">Skills to Learn Next</label>
                                    <PremiumTagInput
                                        value={form.skillsToLearn}
                                        onChange={(val) => handleChange('skillsToLearn', val)}
                                        emptyPlaceholder="GraphQL, Rust, etc."
                                        placeholder="Add skill..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="ds-label">Certifications Held</label>
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
                                    <label className="ds-label">Self-Assessed Proficiency</label>
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
            </FormSection>

            <FormSection number="04" title="Background" description="Helps tailor advice and salary figures to where you are.">
                        <div className="ds-fields">
                            {/* Job Search Urgency temporarily hidden */}

                            <div className="form-group">
                                <label className="ds-label">Professional / Academic Status</label>
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

                            {/* College Course / Major and Expected Graduation Year temporarily hidden */}

                            <div className="form-group">
                                <label className="ds-label">Target Cities</label>
                                <PremiumIconInput
                                    icon={FiGlobe}
                                    placeholder="e.g. Bangalore, Mumbai, Remote"
                                    value={form.targetCities}
                                    onChange={(e) => handleChange('targetCities', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="ds-label">Preferred Currency</label>
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
            </FormSection>

            <FormSection number="05" title="Links" description="Used on your resume and when writing applications.">
                        <div className="ds-fields">
                            <div className="form-group">
                                <label className="ds-label">LinkedIn URL</label>
                                <PremiumIconInput
                                    icon={FiLinkedin}
                                    placeholder="https://linkedin.com/in/username"
                                    value={form.portfolioLinkedin}
                                    onChange={(e) => handleChange('portfolioLinkedin', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="ds-label">GitHub Profile</label>
                                <PremiumIconInput
                                    icon={FiGithub}
                                    placeholder="https://github.com/username"
                                    value={form.portfolioGithub}
                                    onChange={(e) => handleChange('portfolioGithub', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="ds-label">Behance Portfolio</label>
                                <PremiumIconInput
                                    icon={FiGlobe}
                                    placeholder="https://behance.net/username"
                                    value={form.portfolioBehance}
                                    onChange={(e) => handleChange('portfolioBehance', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="ds-label">Personal Website</label>
                                <PremiumIconInput
                                    icon={FiGlobe}
                                    placeholder="https://yourwebsite.com"
                                    value={form.portfolioWebsite}
                                    onChange={(e) => handleChange('portfolioWebsite', e.target.value)}
                                />
                            </div>
                        </div>
            </FormSection>

            <section className="ds-frame ds-rule-b grid grid-cols-1 md:grid-cols-12">
                <div className="md:col-span-8 ds-cell flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className={`m-0 text-[15px] ${isDirty ? 'text-[#CA3C0A] font-medium' : 'text-[#4A4540]'}`}>
                        {saved ? 'Profile saved.' : isDirty ? 'You have unsaved changes.' : 'Your profile personalises search, match scores and applications.'}
                    </p>
                    <span className="hidden sm:inline ds-mono ds-mono-muted">ctrl+s to save</span>
                </div>
                <button type="submit" disabled={saving} className="md:col-span-4 ds-btn ds-btn-accent !min-h-[80px] !px-8">
                    {saveLabel}
                    {saved ? <FiCheck size={18} /> : <FiSave size={18} />}
                </button>
            </section>
            </form>

            {/* ── Floating Sticky Save Bar (Pops up when changes are made) ── */}
            <AnimatePresence>
                {isDirty && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="fixed bottom-4 left-1/2 z-50 flex items-center justify-between gap-4 pl-5 pr-1 py-1 bg-[#171717] text-white shadow-2xl"
                        style={{ width: 'min(92vw, 560px)' }}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="ds-square shrink-0" />
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
                                className="h-10 px-4 bg-[#CA3C0A] hover:bg-[#B73609] text-white text-[14px] font-semibold border-none cursor-pointer inline-flex items-center gap-2"
                            >
                                {saving ? <FiSave size={13} className="animate-spin" /> : <FiSave size={13} />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <section className="ds-frame ds-rule-b" aria-labelledby="resume-heading">
                <div className="ds-cell ds-rule-b flex flex-wrap items-end justify-between gap-4 !pt-14">
                    <h2 id="resume-heading" className="ds-slash m-0">resume</h2>
                    <p className="ds-mono ds-mono-muted m-0">pdf or txt · read in your browser</p>
                </div>
                <div className="ds-cell">
                    <ResumeUpload
                        onResumeAnalyzed={onResumeAnalyzed}
                        onUpdateUser={onUpdateUser}
                        existingData={resumeData}
                        user={user}
                    />
                </div>
            </section>
        </div>
    );
}

export default Profile;
