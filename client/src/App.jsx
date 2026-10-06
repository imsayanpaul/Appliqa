import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { FiSearch, FiBriefcase, FiBookmark, FiUser, FiUpload, FiZap, FiTrendingUp, FiX, FiMapPin, FiCheckCircle, FiAlertCircle, FiInfo, FiStar, FiChevronDown, FiCalendar, FiChevronRight, FiArrowUpRight } from 'react-icons/fi';
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
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const CareerPath = lazyWithRetry(() => import('./pages/CareerPath'));
const Advisor = lazyWithRetry(() => import('./pages/Advisor'));
const ResumeCreator = lazyWithRetry(() => import('./pages/ResumeCreator'));
const Pricing = lazyWithRetry(() => import('./pages/Pricing'));
const Vault = lazyWithRetry(() => import('./pages/Vault'));
const SearchResults = lazyWithRetry(() => import('./pages/SearchResults'));
const SavedJobs = lazyWithRetry(() => import('./pages/SavedJobs'));
const Legal = lazyWithRetry(() => import('./pages/Legal'));

import SplashScreen from './components/SplashScreen';
import Footer from './components/ui/Footer';
import { Logo } from './components/ui/Logo';
import { useEscapeKey } from './lib/useEscapeKey';
import { readProfiles, writeProfiles, makeProfile, dataFromAnalysis, toAIResume } from './lib/resumeProfiles';
import { normalizeProfile, profileToText } from './lib/resumeProfile';
import { ResumeSkillsContext } from './lib/resumeSkills';
import FeedbackWidget from './components/FeedbackWidget';
import { supabase } from './services/supabase';
import { getUserProfile, createOrUpdateUser } from './services/api';
import { Dropdown } from './components/ui/Dropdown';
import PremiumDatePicker from './components/ui/PremiumDatePicker';
import { PageSkeleton } from './components/ui/PageSkeleton';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
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

    // 🌊 Lenis Smooth Scrolling scoped to <main>
    const mainRef = useRef(null);
    const contentRef = useRef(null);
    const lenisRef = useRef(null);

    useEffect(() => {
        if (!mainRef.current || !contentRef.current) return;
        // Keep native scrolling for users who ask the OS to reduce motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const lenis = new Lenis({
            wrapper: mainRef.current,
            content: contentRef.current,
            eventsTarget: mainRef.current,
            duration: 0.9,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1.0,
            touchMultiplier: 1.2,
            allowNestedScroll: true,
            prevent: (node) => {
                if (!node || typeof node.closest !== 'function') return false;
                return Boolean(node.closest('.modal-content, .modal-overlay, [data-lenis-prevent], .resume-modal-content, .auth-split-left, textarea, select, input'));
            }
        });

        lenisRef.current = lenis;
        window.lenis = lenis;

        // Automatically update Lenis scrollable limits whenever page content or API data changes size
        const resizeObserver = new ResizeObserver(() => {
            lenis.resize();
        });
        resizeObserver.observe(contentRef.current);

        let rafId;
        function raf(time) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);

        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(rafId);
            lenis.destroy();
            delete window.lenis;
        };
    }, []);

    // Re-measure dimensions and scroll to top on route change
    useEffect(() => {
        if (lenisRef.current) {
            setTimeout(() => {
                lenisRef.current?.resize();
                lenisRef.current?.scrollTo(0, { immediate: true });
            }, 50);
        } else if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
    }, [location.pathname]);

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
    const [customAlert, setCustomAlert] = useState({ show: false, message: '', title: 'Notification', type: 'info' });

    // Override window.alert
    useEffect(() => {
        window.alert = (message) => {
            const msgLower = (message || '').toLowerCase();
            let type = 'info';
            let title = 'Notification';
            
            if (msgLower.includes('success') || msgLower.includes('created') || msgLower.includes('saved')) {
                type = 'success';
                title = 'Success';
            } else if (msgLower.includes('fail') || msgLower.includes('could not') || msgLower.includes('error') || msgLower.includes('missing')) {
                type = 'error';
                title = 'Error';
            }
            
            setCustomAlert({ show: true, message, title, type });
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

    // Navbar expand/contract & show/hide state on scroll
    const [scrolled, setScrolled] = useState(false);
    const [visible, setVisible] = useState(true);
    const lastScrollTopRef = useRef(0);

    const handleScroll = useCallback((e) => {
        const scrollTop = e.currentTarget.scrollTop;
        const lastScrollTop = lastScrollTopRef.current;
        
        // Threshold check (scrolled state)
        const isScrolled = scrollTop > 30;
        setScrolled(prev => {
            if (prev !== isScrolled) return isScrolled;
            return prev;
        });

        // Direction check (visible state)
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            setVisible(prev => {
                if (prev !== false) return false;
                return prev;
            });
        } else if (scrollTop < lastScrollTop) {
            setVisible(prev => {
                if (prev !== true) return true;
                return prev;
            });
        }
        
        lastScrollTopRef.current = scrollTop;
    }, []);

    // Reset scroll position and navbar state on route change
    useEffect(() => {
        const mainEl = document.querySelector('main');
        if (mainEl) {
            mainEl.scrollTop = 0;
        }
        setScrolled(false);
        setVisible(true);
        lastScrollTopRef.current = 0;
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
                    if (profile && (!profile.dob || !profile.educationStatus)) {
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

    const handleDetectLocation = async () => {
        setDetectingLocation(true);
        
        try {
            const res = await fetch('https://ipapi.co/json/');
            if (!res.ok) throw new Error('IP api response error');
            const data = await res.json();
            const city = data.city || '';
            const country = data.country_name || '';
            
            if (city && country) {
                const userData = {
                    name: user?.name,
                    preferences: {
                        ...user?.preferences,
                        country: country,
                        location: city
                    }
                };
                const updateRes = await createOrUpdateUser(userData);
                updateUserState(updateRes.data.user);
                alert(`Successfully set default location to: ${city}, ${country}`);
                setShowLocationPrompt(false);
                sessionStorage.setItem('appliqa_location_prompted', 'true');
                
                // Chained check for missing onboarding
                if (updateRes.data.user && !updateRes.data.user.educationStatus) {
                    setShowOnboardingPrompt(true);
                }
            } else {
                throw new Error('Incomplete location data from IP API');
            }
        } catch (err) {
            console.error('IP location detection failed:', err);
            alert('Could not automatically detect location. Please set it manually in your profile.');
            setShowLocationPrompt(false);
            sessionStorage.setItem('appliqa_location_prompted', 'true');
            navigate('/profile');
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
            if (user && !user.educationStatus) {
                setShowOnboardingPrompt(true);
            }
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
            alert('Profile setup completed successfully!');
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
            <main id="main-content" tabIndex={-1} ref={mainRef} onScroll={handleScroll} style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingTop: '64px' }}>
                <div ref={contentRef} style={{ width: '100%', minHeight: '100%' }}>
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
                <div 
                    className="location-prompt"
                    style={{ 
                        position: 'fixed', 
                        bottom: isMobileViewport ? '16px' : '24px', 
                        left: isMobileViewport ? '16px' : 'auto',
                        right: isMobileViewport ? '16px' : '24px', 
                        width: isMobileViewport ? 'auto' : '380px', 
                        background: '#FFFFFF',
                        border: '1px solid #D8D4CC',
                        borderRadius: '8px',
                        padding: '22px',
                        boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
                        zIndex: 1100,
                        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    <button 
                        onClick={() => handleDismissLocationPrompt(false)}
                        style={{
                            position: 'absolute',
                            top: '14px',
                            right: '14px',
                            background: '#FAF8F5',
                            border: '1px solid #D8D4CC',
                            color: '#8A8580',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            width: '26px',
                            height: '26px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            padding: '0'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.color = '#171717';
                            e.currentTarget.style.borderColor = '#171717';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.color = '#8A8580';
                            e.currentTarget.style.borderColor = '#D8D4CC';
                        }}
                        title="Dismiss"
                    >
                        <FiX size={13} />
                    </button>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '18px' }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '6px', 
                            background: '#FFF0E8', 
                            border: '1px solid rgba(202, 60, 10, 0.25)', 
                            color: '#CA3C0A',
                            flexShrink: 0
                        }}>
                            <FiMapPin size={17} />
                        </div>
                        <div style={{ flex: 1, paddingRight: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#171717', letterSpacing: '-0.01em', margin: '0 0 3px 0' }}>
                                Set Default Location
                            </h3>
                            <p style={{ color: '#66615C', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                                Automatically detect country and city to optimize your job searches and matching scores.
                            </p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button 
                            onClick={handleDetectLocation} 
                            disabled={detectingLocation}
                            style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center', 
                                width: '100%', 
                                padding: '10px 16px', 
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 700,
                                background: '#171717',
                                color: '#FFFFFF',
                                border: 'none',
                                transition: 'all 0.15s ease',
                                cursor: 'pointer'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = '#CA3C0A';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = '#171717';
                            }}
                        >
                            {detectingLocation ? (
                                <><div className="spinner primary-spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 8, borderColor: '#FFFFFF', borderTopColor: 'transparent' }}></div> Detecting Location...</>
                            ) : (
                                'Detect Automatically'
                            )}
                        </button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button 
                                onClick={() => handleDismissLocationPrompt(true)}
                                disabled={detectingLocation}
                                style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center', 
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    background: '#FAF8F5',
                                    border: '1px solid #D8D4CC',
                                    color: '#171717',
                                    transition: 'all 0.15s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#FFFFFF';
                                    e.currentTarget.style.borderColor = '#171717';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#FAF8F5';
                                    e.currentTarget.style.borderColor = '#D8D4CC';
                                }}
                            >
                                Choose Manually
                            </button>
                            <button 
                                onClick={() => handleDismissLocationPrompt(false)}
                                disabled={detectingLocation}
                                style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center', 
                                    padding: '8px 12px', 
                                    background: 'transparent', 
                                    border: '1px solid transparent', 
                                    color: '#8A8580',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    transition: 'all 0.15s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = '#171717'}
                                onMouseOut={(e) => e.currentTarget.style.color = '#8A8580'}
                            >
                                Not Now
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {showOnboardingPrompt && (
                <div className="onboarding-modal-overlay">
                    <div className="onboarding-modal-card">
                        <div style={{ textAlign: 'center' }}>
                            <div className="onboarding-header-icon-container">
                                <FiBriefcase size={24} />
                            </div>
                            
                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                                Complete Your Profile
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '20px' }}>
                                Please provide a few details to optimize your career path matching and investor-ready profile.
                            </p>
                        </div>

                        <div style={{ overflow: 'visible', position: 'relative' }}>
                            <div className="onboarding-grid">
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                        Date of Birth
                                    </label>
                                    <PremiumDatePicker
                                        value={onboardingForm.dob}
                                        onChange={(val) => setOnboardingForm(prev => ({ ...prev, dob: val }))}
                                        placeholder="Select Date of Birth"
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                        Current Status
                                    </label>
                                    <Dropdown
                                        options={[
                                            { value: "Working Professional", label: "Working Professional" },
                                            { value: "College/University Student", label: "College Student" },
                                            { value: "School Student", label: "School Student" },
                                            { value: "Self-Educated / Career Switcher", label: "Self-Educated / Career Switcher" }
                                        ]}
                                        value={onboardingForm.educationStatus}
                                        onChange={(val) => setOnboardingForm(prev => ({ ...prev, educationStatus: val }))}
                                        placeholder="Select Status"
                                        variant="form"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Navigation Controls */}
                        <div className="onboarding-buttons-row" style={{ marginTop: '24px' }}>
                            <button 
                                type="button"
                                className="onboarding-next-btn"
                                style={{ width: '100%' }}
                                disabled={!onboardingForm.dob || !onboardingForm.educationStatus || savingOnboarding}
                                onClick={handleSaveOnboarding}
                            >
                                {savingOnboarding ? 'Saving...' : 'Complete Setup'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {customAlert.show && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, x: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        onClick={() => setCustomAlert(prev => ({ ...prev, show: false }))}
                        style={{
                            position: 'fixed',
                            bottom: isMobileViewport ? '16px' : '24px',
                            left: isMobileViewport ? '16px' : 'auto',
                            right: isMobileViewport ? '16px' : '24px',
                            width: isMobileViewport ? 'auto' : '360px',
                            background: '#FFFFFF',
                            border: '1.5px solid #D8D4CC',
                            borderRadius: '8px',
                            padding: '14px 16px',
                            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
                            zIndex: 2000,
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                            cursor: 'pointer',
                        }}
                    >
                        {/* Icon wrapper */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: customAlert.type === 'error' ? '#FEF2F2' : customAlert.type === 'success' ? '#FFF0E8' : '#EFF6FF',
                            border: `1px solid ${customAlert.type === 'error' ? '#FECACA' : customAlert.type === 'success' ? '#CA3C0A40' : '#BFDBFE'}`,
                            color: customAlert.type === 'error' ? '#EF4444' : customAlert.type === 'success' ? '#CA3C0A' : '#2563EB',
                            flexShrink: 0,
                        }}>
                            {customAlert.type === 'success' ? (
                                <FiCheckCircle size={16} />
                            ) : customAlert.type === 'error' ? (
                                <FiAlertCircle size={16} />
                            ) : (
                                <FiInfo size={16} />
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                            <h4 style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#171717',
                                letterSpacing: '-0.01em',
                                margin: '0 0 3px 0',
                            }}>
                                {customAlert.title}
                            </h4>
                            <p style={{
                                color: '#66615C',
                                fontSize: '12px',
                                lineHeight: '1.45',
                                margin: 0,
                                wordBreak: 'break-word',
                            }}>
                                {customAlert.message}
                            </p>
                        </div>

                        {/* Small Close Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCustomAlert(prev => ({ ...prev, show: false }));
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#8A8580',
                                cursor: 'pointer',
                                padding: '4px',
                                marginRight: '-4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.15s',
                            }}
                            onMouseOver={(e) => e.target.style.color = '#171717'}
                            onMouseOut={(e) => e.target.style.color = '#8A8580'}
                        >
                            <FiX size={14} />
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
