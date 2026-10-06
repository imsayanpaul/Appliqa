import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { FiSearch, FiBriefcase, FiBookmark, FiUser, FiUpload, FiZap, FiTrendingUp, FiX, FiMapPin, FiCheckCircle, FiAlertCircle, FiInfo, FiStar, FiChevronDown, FiCalendar, FiChevronRight, FiArrowUpRight, FiMessageSquare } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import Home from './pages/Home';
// Resilient lazy loader that automatically recovers from stale Vite chunk hashes after new deployments
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const isRefreshed = window.sessionStorage.getItem('retry-lazy-refreshed') === 'true';
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('retry-lazy-refreshed', 'false');
      return component;
    } catch (error) {
      if (!isRefreshed) {
        window.sessionStorage.setItem('retry-lazy-refreshed', 'true');
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });

// Lazy-loaded pages for code-splitting and performance optimization
const pageImports = {
    Profile: () => import('./pages/Profile'),
    CareerPath: () => import('./pages/CareerPath'),
    Advisor: () => import('./pages/Advisor'),
    ResumeCreator: () => import('./pages/ResumeCreator'),
    Pricing: () => import('./pages/Pricing'),
    Vault: () => import('./pages/Vault'),
    SearchResults: () => import('./pages/SearchResults'),
    SavedJobs: () => import('./pages/SavedJobs'),
    Legal: () => import('./pages/Legal'),
};
const Profile = lazyWithRetry(pageImports.Profile);
const CareerPath = lazyWithRetry(pageImports.CareerPath);
const Advisor = lazyWithRetry(pageImports.Advisor);
const ResumeCreator = lazyWithRetry(pageImports.ResumeCreator);
const Pricing = lazyWithRetry(pageImports.Pricing);
const Vault = lazyWithRetry(pageImports.Vault);
const SearchResults = lazyWithRetry(pageImports.SearchResults);
const SavedJobs = lazyWithRetry(pageImports.SavedJobs);
const Legal = lazyWithRetry(pageImports.Legal);

// Router navigations run as transitions, so an unloaded page chunk keeps the
// old page on screen until it arrives. Fetch them all once the app is idle.
const preloadPages = () => {
    Object.values(pageImports).forEach((load) => load().catch(() => {}));
};

import SplashScreen from './components/SplashScreen';
import Footer from './components/ui/Footer';
import { Logo } from './components/ui/Logo';
import { useEscapeKey } from './lib/useEscapeKey';
import { readProfiles, writeProfiles, makeProfile, dataFromAnalysis, toAIResume } from './lib/resumeProfiles';
import { normalizeProfile, profileToText } from './lib/resumeProfile';
import { ResumeSkillsContext } from './lib/resumeSkills';
import FeedbackWidget from './components/FeedbackWidget';
import LocationPrompt from './components/LocationPrompt';
import OnboardingSheet from './components/OnboardingSheet';
import { supabase } from './services/supabase';
import { getUserProfile, createOrUpdateUser } from './services/api';
import { Dropdown } from './components/ui/Dropdown';
import PremiumDatePicker from './components/ui/PremiumDatePicker';
import { PageSkeleton } from './components/ui/PageSkeleton';
import './App.css';

// Protected Route Wrapper with auth resolution check
const ProtectedRoute = ({ children, session, authResolved }) => {
    const isOAuthHash = typeof window !== 'undefined' && (window.location.hash?.includes('access_token') || window.location.hash?.includes('refresh_token'));
    if (!authResolved || (!session && isOAuthHash)) {
        return <PageSkeleton />;
    }
    if (!session) return <Navigate to="/profile" replace />;
    return children;
};

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();

    // Supabase Auth State
    const [session, setSession] = useState(null);
    const [authResolved, setAuthResolved] = useState(false);

    // Profile State (from database / cached in localStorage for instant 0ms mount)
    const [user, setUser] = useState(() => {
        try {
            const saved = window.localStorage.getItem('appliqa_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const userRef = useRef(null);
    userRef.current = user;

    const updateUserState = useCallback((newUser) => {
        setUser(newUser);
        if (newUser) {
            try {
                window.localStorage.setItem('appliqa_user', JSON.stringify(newUser));
            } catch (e) {}
        } else {
            window.localStorage.removeItem('appliqa_user');
        }
    }, []);
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);
    const [pendingLocationPrompt, setPendingLocationPrompt] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);
    
    const [isMobileViewport, setIsMobileViewport] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => {
            setIsMobileViewport(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Native scrolling on <main>: it runs on the compositor, so it stays smooth while React renders
    const mainRef = useRef(null);

    useEffect(() => {
        const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200));
        const cancel = window.cancelIdleCallback || clearTimeout;
        const id = idle(preloadPages);
        return () => cancel(id);
    }, []);

    const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);
    const [onboardingForm, setOnboardingForm] = useState({
        educationStatus: '',
        collegeCourse: '',
        expectedGraduationYear: '',
        jobSearchUrgency: '',
        portfolioLinkedin: '',
        portfolioGithub: '',
        targetSalary: '',
        willingToRelocate: false,
        openToBootcamps: false
    });
    const [savingOnboarding, setSavingOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(1);

    useEffect(() => {
        if (showOnboardingPrompt) {
            setOnboardingStep(1);
        }
    }, [showOnboardingPrompt]);
    
    // Custom Alert State
    const [customAlert, setCustomAlert] = useState({ show: false, message: '', title: 'Notice', type: 'info', action: null });

    // Override window.alert
    useEffect(() => {
        window.alert = (message) => {
            const msgLower = (message || '').toLowerCase();
            let type = 'info';
            let title = 'Notice';
            
            if (msgLower.includes('success') || msgLower.includes('created') || msgLower.includes('saved')) {
                type = 'success';
                title = 'Done';
            } else if (msgLower.includes('fail') || msgLower.includes('could not') || msgLower.includes('error') || msgLower.includes('missing')) {
                type = 'error';
                title = 'Error';
            }
            
            // Sign-in prompts get a direct link to the sign-in page
            const action = /\bsign in\b/i.test(message || '') ? { label: 'Sign in', path: '/profile' } : null;
            setCustomAlert({ show: true, message, title, type, action });
        };
    }, []);

    // Auto-dismiss custom alert after 4 seconds
    useEffect(() => {
        if (customAlert.show) {
            const timer = setTimeout(() => {
                setCustomAlert(prev => ({ ...prev, show: false }));
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [customAlert.show]);

    // Show pending location prompt after custom alert is dismissed
    useEffect(() => {
        if (pendingLocationPrompt && !customAlert.show) {
            setShowLocationPrompt(true);
            setPendingLocationPrompt(false);
        }
    }, [customAlert.show, pendingLocationPrompt]);
    
    // Navbar states & items
    const [isOpen, setIsOpen] = useState(false);
    const toggleMenu = () => setIsOpen(!isOpen);
    const navItems = [
        { name: 'Search', desc: 'find and filter live jobs', path: '/' },
        { name: 'Tracker', desc: 'saved, applied, interviewing', path: '/saved' },
        { name: 'Career path', desc: 'roles, skills and salary steps', path: '/career' },
        { name: 'Advisor', desc: 'ask an ai career coach', path: '/advisor' },
        { name: 'Resume builder', desc: 'write and tailor your resume', path: '/resume-creator', tag: 'ai' },
    ];
    const publicNavItems = [
        { name: 'Search jobs', desc: 'find and filter live jobs', path: '/search' },
        { name: 'Resume builder', desc: 'write and tailor your resume', path: '/resume-creator', tag: 'ai' },
        { name: 'Advisor', desc: 'ask an ai career coach', path: '/advisor' },
        { name: 'Pricing', desc: 'free to start', path: '/pricing' },
    ];
    const visibleNavItems = user ? navItems : publicNavItems;
    useEscapeKey(() => setIsOpen(false), isOpen);
    const handleNavClick = (path) => {
        navigate(path);
        setIsOpen(false);
    };

    // Start each page at the top
    useEffect(() => {
        if (mainRef.current) mainRef.current.scrollTop = 0;
    }, [location.pathname]);

    // Pages with a composer pinned to the bottom lift the feedback button above it
    useEffect(() => {
        document.body.classList.toggle('feedback-raised', location.pathname === '/advisor');
    }, [location.pathname]);

    // Dynamic tab titles based on current route
    useEffect(() => {
        const routeTitles = {
            '/': 'Appliqa - Job Search',
            '/search': 'Appliqa - Discover Jobs',
            '/saved': 'Appliqa - Application Tracker',
            '/career': 'Appliqa - Career Path',
            '/advisor': 'Appliqa - Career Advisor',
            '/resume-creator': 'Appliqa - AI Resume Builder',
            '/vault': 'Appliqa - My Vault',
            '/profile': 'Appliqa - Profile Settings',
            '/pricing': 'Appliqa - Pricing',
            '/privacy': 'Appliqa - Privacy Policy',
            '/terms': 'Appliqa - Terms of Service',
            '/security': 'Appliqa - Security'
        };
        const baseTitle = routeTitles[location.pathname] || 'Appliqa - Job Search';
        document.title = baseTitle;
    }, [location.pathname]);

    // Resume State
    const [resumeData, setResumeData] = useState(() => {
        try {
            const saved = window.localStorage.getItem('appliqa_resume');
            if (!saved) return null;
            const parsed = JSON.parse(saved);
            if (parsed?.data?.analysis) return { ...parsed.data.analysis, ...parsed };
            if (parsed?.analysis) return { ...parsed.analysis, ...parsed };
            return parsed;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const isOAuthHash = typeof window !== 'undefined' && (window.location.hash?.includes('access_token') || window.location.hash?.includes('refresh_token'));

        // Initial session check (runs once on cold start)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthResolved(true);
            if (session && isOAuthHash) {
                navigate('/', { replace: true });
            }
        }).catch(() => {
            setAuthResolved(true);
        });

        // Listen for runtime auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (event === 'PASSWORD_RECOVERY') {
                navigate('/profile?reset=true');
            } else if (event === 'SIGNED_IN') {
                if (window.location.hash?.includes('access_token') || window.location.hash?.includes('refresh_token')) {
                    navigate('/', { replace: true });
                }
            }
            if (!session) {
                updateUserState(null);
                if (event === 'SIGNED_OUT') setResumeData(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Fetch user profile from DB in the background when session exists
    useEffect(() => {
        if (session) {
            getUserProfile()
                .then(res => {
                    const profile = res.data.user;
                    updateUserState(profile);
                    // Also sync resumeData if it exists in DB but not local
                    if (profile.resumeData?.rawText && !resumeData) {
                        setResumeData(profile.resumeData);
                    }
                    
                    // Show combined onboarding setup if DOB or Education Status is missing
                    if (profile && (!profile.dob || !profile.educationStatus) && !sessionStorage.getItem('appliqa_onboarding_skipped')) {
                        setOnboardingForm({
                            dob: profile.dob || '',
                            educationStatus: profile.educationStatus || '',
                            collegeCourse: profile.collegeCourse || '',
                            expectedGraduationYear: profile.expectedGraduationYear || '',
                            jobSearchUrgency: profile.jobSearchUrgency || '',
                            portfolioLinkedin: profile.portfolioLinkedin || '',
                            portfolioGithub: profile.portfolioGithub || '',
                            targetSalary: profile.targetSalary || '',
                            willingToRelocate: profile.willingToRelocate || false,
                            openToBootcamps: profile.openToBootcamps || false
                        });
                        setShowOnboardingPrompt(true);
                    } else if (profile && (!profile.preferences?.country || !profile.preferences?.location)) {
                        const prompted = sessionStorage.getItem('appliqa_location_prompted');
                        if (!prompted) {
                            setShowLocationPrompt(true);
                        }
                    }
                })
                .catch(err => console.error("Could not fetch profile", err));
        }
    }, [session]);

    // Re-fetch profile when navigating to /profile so stat counters are fresh
    useEffect(() => {
        if (session && location.pathname === '/profile') {
            getUserProfile()
                .then(res => {
                    if (res.data?.user) {
                        updateUserState(res.data.user);
                    }
                })
                .catch(() => {});
        }
    }, [location.pathname, session]);

    const updateResumeData = useCallback((data) => {
        setResumeData(data);
        if (data) {
            window.localStorage.setItem('appliqa_resume', JSON.stringify(data));
            if (session) {
                createOrUpdateUser({ resumeData: data })
                    .then(res => {
                        if (res.data?.user) {
                            updateUserState(res.data.user);
                        }
                    })
                    .catch(err => console.error("Auto-saving resume to profile failed:", err));
            }
        } else {
            window.localStorage.removeItem('appliqa_resume');
            if (session) {
                createOrUpdateUser({
                    resumeData: {
                        fileName: '',
                        skills: [],
                        experience: [],
                        education: [],
                        summary: '',
                        rawText: '',
                        suggestedRoles: [],
                        experienceLevel: ''
                    }
                })
                .then(res => {
                    if (res.data?.user) {
                        updateUserState(res.data.user);
                    }
                })
                .catch(err => console.error("Auto-clearing resume from profile failed:", err));
            }
        }
    }, [session, updateUserState]);

    // AI features (match score, ATS, interview prep, career path, advisor) use the
    // primary saved resume. The raw upload is still passed to the uploader.
    const aiResumeData = useMemo(() => {
        const { profiles, primaryId } = readProfiles(user?.builderData);
        const primary = profiles.find((p) => p.id === primaryId);
        return primary ? toAIResume(primary.data, resumeData, primary.name) : resumeData;
    }, [user?.builderData, resumeData]);

    // "+ skill" tags anywhere in the app add to the primary resume
    const resumeDataRef = useRef(resumeData);
    resumeDataRef.current = resumeData;
    const skillQueueRef = useRef(Promise.resolve());
    // Result of the last queued save; React state lags a render behind it
    const pendingUserRef = useRef(null);
    const pendingCountRef = useRef(0);
    const primarySkills = useMemo(() => {
        const { profiles, primaryId } = readProfiles(user?.builderData);
        const primary = profiles.find((p) => p.id === primaryId);
        return new Set((primary ? primary.data.skills || [] : resumeData?.skills || []).map((x) => String(x).toLowerCase()));
    }, [user?.builderData, resumeData]);
    const addSkillsToPrimary = useCallback((skills) => {
        // Run one save at a time so quick clicks don't overwrite each other
        const run = async () => {
            const current = pendingUserRef.current || userRef.current;
            if (!current) return;
            let { profiles, primaryId } = readProfiles(current.builderData);
            if (!profiles.length) {
                const base = resumeDataRef.current ? dataFromAnalysis(resumeDataRef.current) : {};
                profiles = [{ ...makeProfile('Main resume', base), id: 'main' }];
                primaryId = 'main';
            }
            const primary = profiles.find((p) => p.id === primaryId) || profiles[0];
            const existing = primary.data.skills || [];
            const have = new Set(existing.map((x) => String(x).toLowerCase()));
            const added = skills.map((x) => String(x).trim()).filter((x) => x && !have.has(x.toLowerCase()));
            if (!added.length) return;
            const data = { ...primary.data, skills: [...existing, ...added] };
            data.rawText = profileToText(normalizeProfile(data), data.personalInfo || { name: current.name });
            const next = profiles.map((p) => (p.id === primary.id ? { ...p, data, updatedAt: new Date().toISOString() } : p));
            const res = await createOrUpdateUser({ builderData: writeProfiles(current.builderData, next, primary.id) });
            if (res.data?.user) {
                pendingUserRef.current = res.data.user;
                updateUserState(res.data.user);
            }
        };
        pendingCountRef.current += 1;
        const task = skillQueueRef.current.then(run, run).finally(() => {
            pendingCountRef.current -= 1;
            if (pendingCountRef.current === 0) pendingUserRef.current = null;
        });
        skillQueueRef.current = task.catch(() => {});
        return task;
    }, [updateUserState]);
    const resumeSkills = useMemo(() => ({
        canAdd: !!session && !!user,
        hasSkill: (skill) => primarySkills.has(String(skill).toLowerCase()),
        addSkills: addSkillsToPrimary,
    }), [session, user, primarySkills, addSkillsToPrimary]);

    const handleProfileUpdate = useCallback((updatedUser) => {
        updateUserState(updatedUser);
    }, [updateUserState]);

    const needsOnboarding = (u) => u && (!u.dob || !u.educationStatus) && !sessionStorage.getItem('appliqa_onboarding_skipped');

    const saveJobLocation = async (country, city) => {
        const updateRes = await createOrUpdateUser({
            name: user?.name,
            preferences: { ...user?.preferences, country, location: city },
        });
        updateUserState(updateRes.data.user);
        setShowLocationPrompt(false);
        sessionStorage.setItem('appliqa_location_prompted', 'true');
        alert(`Job location set to ${city}, ${country}.`);
        if (needsOnboarding(updateRes.data.user)) setShowOnboardingPrompt(true);
    };

    // Returns false when the city can't be detected, so the card can offer manual entry
    const handleDetectLocation = async () => {
        setDetectingLocation(true);
        try {
            const res = await fetch('https://ipapi.co/json/');
            if (!res.ok) throw new Error('IP api response error');
            const data = await res.json();
            if (!data.city || !data.country_name) throw new Error('Incomplete location data from IP API');
            await saveJobLocation(data.country_name, data.city);
            return true;
        } catch (err) {
            console.error('IP location detection failed:', err);
            return false;
        } finally {
            setDetectingLocation(false);
        }
    };

    const handleDismissLocationPrompt = (manual = false) => {
        setShowLocationPrompt(false);
        sessionStorage.setItem('appliqa_location_prompted', 'true');
        if (manual) {
            navigate('/profile');
        } else {
            // Chained check for missing onboarding
            if (needsOnboarding(user)) setShowOnboardingPrompt(true);
        }
    };



    const handleSkipOnboarding = () => {
        sessionStorage.setItem('appliqa_onboarding_skipped', 'true');
        setShowOnboardingPrompt(false);
        if (user && (!user.preferences?.country || !user.preferences?.location) && !sessionStorage.getItem('appliqa_location_prompted')) {
            setShowLocationPrompt(true);
        }
    };

    const handleSaveOnboarding = async () => {
        if (!onboardingForm.dob) {
            alert('Please fill out your Date of Birth.');
            return;
        }
        if (!onboardingForm.educationStatus || !onboardingForm.dob) {
            alert('Please fill out your date of birth and education status.');
            return;
        }
        setSavingOnboarding(true);
        try {
            const userData = {
                name: user?.name,
                dob: onboardingForm.dob,
                educationStatus: onboardingForm.educationStatus,
                collegeCourse: onboardingForm.collegeCourse,
                expectedGraduationYear: onboardingForm.expectedGraduationYear ? parseInt(onboardingForm.expectedGraduationYear, 10) : null,
                jobSearchUrgency: onboardingForm.jobSearchUrgency,
                portfolioLinkedin: onboardingForm.portfolioLinkedin,
                portfolioGithub: onboardingForm.portfolioGithub,
                targetSalary: onboardingForm.targetSalary !== '' && onboardingForm.targetSalary !== null ? parseInt(onboardingForm.targetSalary, 10) : null,
                willingToRelocate: onboardingForm.willingToRelocate,
                openToBootcamps: onboardingForm.openToBootcamps,
                preferences: user?.preferences
            };
            const updateRes = await createOrUpdateUser(userData);
            const updatedUser = updateRes.data.user;
            updateUserState(updatedUser);
            alert('You’re all set. Your career path and matches now use these details.');
            setShowOnboardingPrompt(false);

            // Chained check for missing location (queued until alert is dismissed)
            if (updatedUser && (!updatedUser.preferences?.country || !updatedUser.preferences?.location)) {
                const prompted = sessionStorage.getItem('appliqa_location_prompted');
                if (!prompted) {
                    setPendingLocationPrompt(true);
                }
            }
        } catch (err) {
            console.error('Failed to save onboarding details:', err);
            alert('Could not save details. Please try again.');
        } finally {
            setSavingOnboarding(false);
        }
    };

    const isActive = (path) => location.pathname === path;



    return (
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[300] focus:bg-white focus:px-4 focus:py-2 focus:text-sm">Skip to content</a>

            <header className="app-navbar">
                <div className="navbar-container">
                    <a
                        href="/"
                        className="nav-cell nav-brand"
                        aria-label="Appliqa home"
                        onClick={(e) => { e.preventDefault(); handleNavClick('/'); }}
                    >
                        <Logo height={22} />
                    </a>

                    <nav className="navbar-desktop-nav" aria-label="Primary">
                        {visibleNavItems.map((item) => (
                            <a
                                key={item.path}
                                href={item.path}
                                aria-current={isActive(item.path) ? 'page' : undefined}
                                className="nav-cell"
                                onClick={(e) => { e.preventDefault(); handleNavClick(item.path); }}
                            >
                                {item.name}
                                {item.tag && <span className="nav-tag">{item.tag}</span>}
                            </a>
                        ))}
                    </nav>
                    <div className="nav-spacer" aria-hidden="true" />

                    <div className="nav-right">
                        {session ? (
                            <a
                                href="/profile"
                                aria-current={isActive('/profile') ? 'page' : undefined}
                                className="nav-cell nav-hide-mobile"
                                onClick={(e) => { e.preventDefault(); handleNavClick('/profile'); }}
                            >
                                <span className="nav-avatar" aria-hidden="true">
                                    {(user?.name?.trim()?.charAt(0) || session?.user?.email?.charAt(0) || 'P').toUpperCase()}
                                </span>
                                {user?.name?.trim() ? user.name.trim().split(' ')[0] : 'Profile'}
                            </a>
                        ) : (
                            <>
                                <a
                                    href="/profile"
                                    className="nav-cell nav-hide-mobile"
                                    onClick={(e) => { e.preventDefault(); handleNavClick('/profile'); }}
                                >
                                    Sign in
                                </a>
                                <a
                                    href="/profile"
                                    className="nav-cell nav-cta nav-hide-mobile"
                                    onClick={(e) => { e.preventDefault(); handleNavClick('/profile'); }}
                                >
                                    Get started
                                    <FiArrowUpRight size={16} aria-hidden="true" />
                                </a>
                            </>
                        )}
                        <button
                            type="button"
                            className="navbar-mobile-toggle nav-feedback"
                            onClick={() => window.dispatchEvent(new CustomEvent('appliqa:open-feedback', { detail: { toggle: true } }))}
                            aria-label="Send feedback"
                        >
                            <FiMessageSquare size={19} />
                        </button>
                        <button
                            type="button"
                            className="navbar-mobile-toggle"
                            onClick={toggleMenu}
                            aria-label="Open menu"
                            aria-expanded={isOpen}
                            aria-controls="mobile-menu"
                        >
                            <Menu size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        id="mobile-menu"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu"
                        className="navbar-mobile-overlay"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                        <div className="navbar-mobile-header">
                            <a
                                href="/"
                                className="nav-cell nav-brand"
                                aria-label="Appliqa home"
                                onClick={(e) => { e.preventDefault(); handleNavClick('/'); }}
                            >
                                <Logo height={22} />
                            </a>
                            <button type="button" className="navbar-mobile-toggle" style={{ display: 'flex' }} onClick={toggleMenu} aria-label="Close menu">
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="navbar-mobile-body" aria-label="Mobile">
                            {visibleNavItems.map((item) => (
                                <button
                                    key={item.path}
                                    type="button"
                                    className="nav-drawer-link"
                                    aria-current={isActive(item.path) ? 'page' : undefined}
                                    onClick={() => handleNavClick(item.path)}
                                >
                                    <span className="nav-drawer-title">{item.name}</span>
                                    <span className="nav-drawer-desc">{item.desc}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="navbar-mobile-footer">
                            <button type="button" className="ds-btn ds-btn-accent" onClick={() => handleNavClick('/profile')}>
                                {session ? 'Your profile' : 'Get started'}
                                <FiArrowUpRight size={18} className="ds-btn-arrow" aria-hidden="true" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ResumeSkillsContext.Provider value={resumeSkills}>
            <main id="main-content" tabIndex={-1} ref={mainRef} style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingTop: '64px' }}>
                <div style={{ width: '100%', minHeight: '100%' }}>
                    <Suspense fallback={<PageSkeleton />}>
                        <Routes>
                            <Route path="/" element={
                                <Home user={user} session={session} authResolved={authResolved} resumeData={resumeData} onResumeAnalyzed={updateResumeData} onUpdateUser={handleProfileUpdate} />
                            } />
                            <Route path="/search" element={
                                <SearchResults user={user} resumeData={aiResumeData} />
                            } />
                            <Route path="/pricing" element={
                                <Pricing user={user} session={session} />
                            } />
                            <Route path="/checkout" element={
                                <Pricing user={user} session={session} />
                            } />
                            
                            <Route path="/privacy" element={<Legal />} />
                            <Route path="/terms" element={<Legal />} />
                            <Route path="/security" element={<Legal />} />

                            {/* Protected Routes */}
                            <Route path="/saved" element={
                                <ProtectedRoute session={session} authResolved={authResolved}><SavedJobs user={user} resumeData={aiResumeData} /></ProtectedRoute>
                            } />
                            <Route path="/career" element={
                                <ProtectedRoute session={session} authResolved={authResolved}><CareerPath user={user} resumeData={aiResumeData} /></ProtectedRoute>
                            } />
                            <Route path="/advisor" element={
                                <ProtectedRoute session={session} authResolved={authResolved}><Advisor user={user} resumeData={aiResumeData} onUpdateUser={handleProfileUpdate} /></ProtectedRoute>
                            } />
                            <Route path="/resume-creator" element={
                                <ProtectedRoute session={session} authResolved={authResolved}><ResumeCreator user={user} resumeData={resumeData} onResumeAnalyzed={updateResumeData} onUpdateUser={handleProfileUpdate} /></ProtectedRoute>
                            } />
                            <Route path="/vault" element={
                                <ProtectedRoute session={session} authResolved={authResolved}><Vault user={user} /></ProtectedRoute>
                            } />
                            <Route path="/profile" element={
                                <Profile user={user} session={session} authResolved={authResolved} onUpdateUser={handleProfileUpdate} resumeData={resumeData} onResumeAnalyzed={updateResumeData} />
                            } />
                        </Routes>
                        {['/', '/pricing', '/checkout', '/privacy', '/terms', '/security'].includes(location.pathname) && <Footer signedIn={!!session} />}
                    </Suspense>
                </div>
            </main>
            </ResumeSkillsContext.Provider>

            {showLocationPrompt && (
                <LocationPrompt
                    detecting={detectingLocation}
                    onDetect={handleDetectLocation}
                    onManualSave={saveJobLocation}
                    onDismiss={() => handleDismissLocationPrompt(false)}
                />
            )}

            {showOnboardingPrompt && (
                <OnboardingSheet
                    form={onboardingForm}
                    setForm={setOnboardingForm}
                    saving={savingOnboarding}
                    onSave={handleSaveOnboarding}
                    onSkip={handleSkipOnboarding}
                />
            )}

            <AnimatePresence>
                {customAlert.show && (
                    <motion.div
                        role={customAlert.type === 'error' ? 'alert' : 'status'}
                        className="ds-toast"
                        data-type={customAlert.type}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                        <span className="ds-toast-rule" aria-hidden="true" />
                        <div className="ds-toast-body">
                            <p className="ds-mono ds-mono-muted m-0 flex items-center gap-2">
                                {customAlert.type === 'success' ? <FiCheckCircle size={13} /> : customAlert.type === 'error' ? <FiAlertCircle size={13} /> : <FiInfo size={13} />}
                                {customAlert.title.toLowerCase()}
                            </p>
                            <p className="ds-toast-msg">{customAlert.message}</p>
                            {customAlert.action && (
                                <button
                                    type="button"
                                    className="ds-toast-action"
                                    onClick={() => {
                                        setCustomAlert(prev => ({ ...prev, show: false }));
                                        navigate(customAlert.action.path);
                                    }}
                                >
                                    {customAlert.action.label} <FiArrowUpRight size={15} aria-hidden="true" />
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            className="ds-toast-close"
                            aria-label="Dismiss notification"
                            onClick={() => setCustomAlert(prev => ({ ...prev, show: false }))}
                        >
                            <FiX size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <FeedbackWidget user={user} />
        </div>
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
        const msg = error?.message || '';
        if (msg.includes('dynamically imported module') || msg.includes('Failed to fetch') || msg.includes('ChunkLoadError')) {
            // Auto reload to fetch latest deployed assets
            setTimeout(() => {
                window.location.reload();
            }, 300);
        }
    }
    render() {
        if (this.state.hasError) {
            const isChunkError = this.state.error?.message?.includes('dynamically imported module') || this.state.error?.message?.includes('ChunkLoadError');
            return (
                <div className="min-h-screen bg-[#FAF8F5] text-[#171717] flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-md bg-white p-8 rounded-3xl border border-neutral-200/80 shadow-xl space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFF0E8] text-[#CA3C0A] flex items-center justify-center mx-auto text-xl font-bold">!</div>
                        <h2 className="text-xl font-extrabold text-[#171717]">
                            {isChunkError ? 'New App Version Available' : 'Something went wrong'}
                        </h2>
                        <p className="text-xs text-neutral-500">
                            {isChunkError 
                                ? 'We just updated Appliqa with new capabilities. Reloading to get the latest version...'
                                : (this.state.error?.message || 'An unexpected error occurred.')}
                        </p>
                        <button
                            onClick={() => {
                                window.location.reload();
                            }}
                            className="px-5 py-2.5 rounded-xl bg-[#171717] hover:bg-[#CA3C0A] text-white text-xs font-bold transition-all border-none cursor-pointer shadow-md"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    return (
        <ErrorBoundary>
            <Router>
                <AppContent />
            </Router>
        </ErrorBoundary>
    );
}

export default App;
