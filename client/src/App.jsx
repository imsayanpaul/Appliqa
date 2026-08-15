import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { FiSearch, FiBriefcase, FiBookmark, FiUser, FiUpload, FiZap, FiTrendingUp, FiX, FiMapPin, FiCheckCircle, FiAlertCircle, FiInfo, FiStar, FiChevronDown, FiCalendar, FiChevronRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Compass, Workflow, Route as RouteIcon, Bot, FileText } from 'lucide-react';

import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import SavedJobs from './pages/SavedJobs';
// Lazy-loaded pages for code-splitting and performance optimization
const Profile = lazy(() => import('./pages/Profile'));
const CareerPath = lazy(() => import('./pages/CareerPath'));
const Advisor = lazy(() => import('./pages/Advisor'));
const ResumeCreator = lazy(() => import('./pages/ResumeCreator'));

import SplashScreen from './components/SplashScreen';
import Footer from './components/ui/Footer';
import FeedbackWidget from './components/FeedbackWidget';
import { supabase } from './services/supabase';
import { getUserProfile, createOrUpdateUser } from './services/api';
import { Dropdown } from './components/ui/Dropdown';
import PremiumDatePicker from './components/ui/PremiumDatePicker';
import './App.css';

// Protected Route Wrapper with auth resolution check
const ProtectedRoute = ({ children, session, authResolved }) => {
    const isOAuthHash = typeof window !== 'undefined' && (window.location.hash?.includes('access_token') || window.location.hash?.includes('refresh_token'));
    if (!authResolved || (!session && isOAuthHash)) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
                <div className="spinner primary-spinner"></div>
            </div>
        );
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
    
    // GitHub repository stats (Stars)
    const [githubStats, setGithubStats] = useState({ stars: 0 });

    useEffect(() => {
        fetch('https://api.github.com/repos/imsayanpaul/Appliqa')
            .then(res => res.json())
            .then(data => {
                setGithubStats({
                    stars: data.stargazers_count ?? 0
                });
            })
            .catch(err => console.error('Error fetching GitHub stats:', err));
    }, []);

    // GitHub Dropdown States
    const [starDropdownOpen, setStarDropdownOpen] = useState(false);

    useEffect(() => {
        if (!starDropdownOpen) return;
        const handleOutsideClick = () => {
            setStarDropdownOpen(false);
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, [starDropdownOpen]);
    
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
        { 
            name: 'Search', 
            mobileTitle: 'Job Discovery', 
            desc: 'Search 50k+ live verified listings',
            path: '/', 
            icon: Compass
        },
        { 
            name: 'Saved', 
            mobileTitle: 'Application Pipeline', 
            desc: 'Track bookmarks, interviews & offers',
            path: '/saved', 
            icon: Workflow
        },
        { 
            name: 'Career', 
            mobileTitle: 'Career Roadmap', 
            desc: 'Promotion ladders & salary benchmarks',
            path: '/career', 
            icon: RouteIcon
        },
        { 
            name: 'Advisor', 
            mobileTitle: 'AI Career Advisor', 
            desc: 'Interactive mentor & mock prep',
            path: '/advisor', 
            icon: Bot
        },
        { 
            name: 'Resume Builder', 
            mobileTitle: 'Visual Resume Creator', 
            desc: 'ATS score boost & tailored exports',
            path: '/resume-creator', 
            icon: FileText
        }
    ];
    const handleNavClick = (path) => {
        navigate(path);
        setIsOpen(false);
    };
    const ctaText = session ? 'Profile' : 'Sign In';

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

    // Dynamic tab titles based on current route
    useEffect(() => {
        const routeTitles = {
            '/': 'Appliqa - Job Search',
            '/search': 'Appliqa - Discover Jobs',
            '/saved': 'Appliqa - Application Tracker',
            '/career': 'Appliqa - Career Path',
            '/advisor': 'Appliqa - Career Advisor',
            '/resume-creator': 'Appliqa - AI Resume Builder',
            '/profile': 'Appliqa - Profile Settings'
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
        if (!onboardingForm.educationStatus || !onboardingForm.jobSearchUrgency) {
            alert('Please fill out your education status and job search urgency.');
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
            {/* Modern Squarish Full-Width Header Navbar */}
            <header className={`app-navbar ${scrolled ? 'scrolled' : ''}`}>
                <div className="navbar-container">
                    {/* Brand Logo */}
                    <div className="navbar-brand-container" onClick={() => handleNavClick('/')}>
                        <motion.div
                            className="logo-icon-motion"
                            whileHover={{ scale: 1.03 }}
                        >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 20831.25 5423.16" 
                                style={{ display: 'block', height: '22px', width: 'auto' }}
                            >
                                <g id="Layer_x0020_1">
                                    <path fill="#0F172A" fillRule="nonzero" d="M1033.47 4275.76l109.2 -347.45 -728.14 -881.51 -414.54 1228.96 1033.47 0zm395.38 -1259.8l168.7 -537.88 369.03 -1179.54 30.99 0 348.44 1109.09 808.9 -536.54 -531.57 -1575.91 -1280.68 0 -831.24 2464.34 841.43 306.85 76 -50.41zm1122.52 45.97l293.36 934.66 87.8 279.16 1033.47 0 -669.29 -1984.23 -745.34 770.4z"/>
                                    <polygon fill="#FF6600" points="373.75,2825.59 1367.31,3187.91 3907.91,1502.75 1411.99,4082.51 "/>
                                    <path fill="#0F172A" fillRule="nonzero" d="M4403.03 5423.16l961.7 0 0 -1622.52 19.38 0c122.75,279.65 394.09,533.46 850.02,533.46 668.2,0 1207.2,-523.3 1207.2,-1551.45 0,-1065.99 -570.37,-1551.45 -1201.66,-1551.45 -477.16,0 -739.27,278.73 -855.56,556.53l-28.61 0 0 -517.76 -952.47 0 0 4153.2zm942.32 -2642.36c0,-493.77 203.97,-798.34 556.53,-798.34 356.25,0 552.84,311.95 552.84,798.34 0,487.31 -196.59,803.87 -552.84,803.87 -352.56,0 -556.53,-314.72 -556.53,-803.87z"/>
                                    <path fill="#0F172A" fillRule="nonzero" d="M7946.18 5423.16l961.7 0 0 -1622.52 19.38 0c122.75,279.65 394.09,533.46 850.02,533.46 668.2,0 1207.2,-523.3 1207.2,-1551.45 0,-1065.99 -570.37,-1551.45 -1201.66,-1551.45 -477.16,0 -739.27,278.73 -855.56,556.53l-28.61 0 0 -517.76 -952.47 0 0 4153.2zm942.32 -2642.36c0,-493.77 203.97,-798.34 556.53,-798.34 356.25,0 552.84,311.95 552.84,798.34 0,487.31 -196.59,803.87 -552.84,803.87 -352.56,0 -556.53,-314.72 -556.53,-803.87z"/>
                                    <polygon fill="#0F172A" points="12451.01,263.04 11489.32,263.04 11489.32,4290.72 12451.01,4290.72 "/>
                                    <path fill="#0F172A" fillRule="nonzero" d="M13060.15 4290.72l961.7 0 0 -3020.76 -961.7 0 0 3020.76zm481.77 -3372.4c273.19,0 493.77,-206.74 493.77,-460.54 0,-253.81 -220.58,-457.77 -493.77,-457.77 -271.34,0 -493.77,203.97 -493.77,457.77 0,253.81 222.43,460.54 493.77,460.54z"/>
                                    <path fill="#FF6600" fillRule="nonzero" d="M16603.29 5423.16l961.7 0 0 -4153.2 -951.54 0 0 517.76 -29.53 0c-114.44,-277.8 -377.48,-556.53 -853.72,-556.53 -631.29,0 -1203.51,485.46 -1203.51,1551.45 0,1028.15 540.84,1551.45 1208.12,1551.45 455.93,0 727.27,-253.81 849.1,-533.46l19.38 0 0 1622.52zm-534.38 -1838.48c-356.25,0 -554.68,-316.56 -554.68,-803.87 0,-486.39 196.59,-798.34 554.68,-798.34 351.64,0 556.53,304.57 556.53,798.34 0,489.16 -206.74,803.87 -556.53,803.87z"/>
                                    <path fill="#FF6600" fillRule="nonzero" d="M19025.99 4341.48c420.86,0 711.58,-162.44 876.79,-471.62l24 0 0 420.86 904.47 0 0 -2052.6c0,-639.6 -568.53,-1006.92 -1337.33,-1006.92 -812.18,0 -1272.72,408.86 -1349.33,958.93l886.94 31.38c41.53,-191.97 201.2,-310.1 454.08,-310.1 236.27,0 385.79,113.52 385.79,316.56l0 10.15c0,184.59 -200.28,223.35 -716.2,268.57 -610.98,51.69 -1122.29,277.8 -1122.29,946.01 0,598.06 414.4,888.79 993.08,888.79zm297.18 -628.52c-222.43,0 -380.25,-106.14 -380.25,-307.34 0,-194.74 154.13,-312.87 427.32,-353.48 179.05,-25.84 398.71,-65.53 506.69,-121.83l0 287.03c0,294.42 -247.35,495.62 -553.76,495.62z"/>
                                </g>
                            </svg>
                        </motion.div>
                    </div>

                    {/* Desktop Navigation - Segmented Island */}
                    {user && (
                        <nav className="navbar-desktop-nav">
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                const isResume = item.name === 'Resume Builder';
                                return (
                                    <span
                                        key={item.name}
                                        onClick={() => handleNavClick(item.path)}
                                        className={`navbar-link-item ${active ? 'active' : ''}`}
                                    >
                                        {active && <span className="navbar-active-dot" />}
                                        <span>{item.name}</span>
                                        {isResume && <span className="navbar-nav-badge">AI</span>}
                                    </span>
                                );
                            })}
                        </nav>
                    )}

                    {/* Right Actions: Profile CTA & Mobile Toggle */}
                    <div className="navbar-right-actions">
                        {session ? (
                            <>
                                {/* Desktop Profile Badge */}
                                <div className="navbar-desktop-cta">
                                    <button
                                        onClick={() => handleNavClick('/profile')}
                                        className={`navbar-profile-badge ${isActive('/profile') ? 'active' : ''}`}
                                        title="Open Profile & Settings"
                                    >
                                        <div className="navbar-profile-avatar">
                                            {(user?.name?.trim()?.charAt(0) || session?.user?.email?.charAt(0) || 'P').toUpperCase()}
                                        </div>
                                        <span className="navbar-profile-name">
                                            {user?.name?.trim() ? user.name.trim().split(' ')[0] : 'Profile'}
                                        </span>
                                        <FiChevronRight size={13} className="navbar-profile-arrow" />
                                    </button>
                                </div>

                                {/* Mobile Menu Button (Only when logged in) */}
                                <button 
                                    className="navbar-mobile-toggle" 
                                    onClick={toggleMenu}
                                    aria-label="Toggle navigation menu"
                                >
                                    <Menu size={22} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleNavClick('/profile')}
                                className={`navbar-signin-btn ${isActive('/profile') ? 'active' : ''}`}
                            >
                                <FiUser size={13} />
                                <span>Sign In</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Full-Screen Mobile Menu Drawer (Rendered outside header to guarantee isolation & solid background) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="navbar-mobile-overlay"
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Drawer Header with Logo & Close Button */}
                        <div className="navbar-mobile-header">
                            <div className="navbar-brand-container" onClick={() => handleNavClick('/')} style={{ cursor: 'pointer' }}>
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 20831.25 5423.16" 
                                    style={{ display: 'block', height: '22px', width: 'auto' }}
                                >
                                    <g id="Layer_x0020_1">
                                        <path fill="#0F172A" fillRule="nonzero" d="M1033.47 4275.76l109.2 -347.45 -728.14 -881.51 -414.54 1228.96 1033.47 0zm395.38 -1259.8l168.7 -537.88 369.03 -1179.54 30.99 0 348.44 1109.09 808.9 -536.54 -531.57 -1575.91 -1280.68 0 -831.24 2464.34 841.43 306.85 76 -50.41zm1122.52 45.97l293.36 934.66 87.8 279.16 1033.47 0 -669.29 -1984.23 -745.34 770.4z"/>
                                        <polygon fill="#FF6600" points="373.75,2825.59 1367.31,3187.91 3907.91,1502.75 1411.99,4082.51 "/>
                                        <path fill="#0F172A" fillRule="nonzero" d="M4403.03 5423.16l961.7 0 0 -1622.52 19.38 0c122.75,279.65 394.09,533.46 850.02,533.46 668.2,0 1207.2,-523.3 1207.2,-1551.45 0,-1065.99 -570.37,-1551.45 -1201.66,-1551.45 -477.16,0 -739.27,278.73 -855.56,556.53l-28.61 0 0 -517.76 -952.47 0 0 4153.2zm942.32 -2642.36c0,-493.77 203.97,-798.34 556.53,-798.34 356.25,0 552.84,311.95 552.84,798.34 0,487.31 -196.59,803.87 -552.84,803.87 -352.56,0 -556.53,-314.72 -556.53,-803.87z"/>
                                        <path fill="#0F172A" fillRule="nonzero" d="M7946.18 5423.16l961.7 0 0 -1622.52 19.38 0c122.75,279.65 394.09,533.46 850.02,533.46 668.2,0 1207.2,-523.3 1207.2,-1551.45 0,-1065.99 -570.37,-1551.45 -1201.66,-1551.45 -477.16,0 -739.27,278.73 -855.56,556.53l-28.61 0 0 -517.76 -952.47 0 0 4153.2zm942.32 -2642.36c0,-493.77 203.97,-798.34 556.53,-798.34 356.25,0 552.84,311.95 552.84,798.34 0,487.31 -196.59,803.87 -552.84,803.87 -352.56,0 -556.53,-314.72 -556.53,-803.87z"/>
                                        <polygon fill="#0F172A" points="12451.01,263.04 11489.32,263.04 11489.32,4290.72 12451.01,4290.72 "/>
                                        <path fill="#0F172A" fillRule="nonzero" d="M13060.15 4290.72l961.7 0 0 -3020.76 -961.7 0 0 3020.76zm481.77 -3372.4c273.19,0 493.77,-206.74 493.77,-460.54 0,-253.81 -220.58,-457.77 -493.77,-457.77 -271.34,0 -493.77,203.97 -493.77,457.77 0,253.81 222.43,460.54 493.77,460.54z"/>
                                        <path fill="#FF6600" fillRule="nonzero" d="M16603.29 5423.16l961.7 0 0 -4153.2 -951.54 0 0 517.76 -29.53 0c-114.44,-277.8 -377.48,-556.53 -853.72,-556.53 -631.29,0 -1203.51,485.46 -1203.51,1551.45 0,1028.15 540.84,1551.45 1208.12,1551.45 455.93,0 727.27,-253.81 849.1,-533.46l19.38 0 0 1622.52zm-534.38 -1838.48c-356.25,0 -554.68,-316.56 -554.68,-803.87 0,-486.39 196.59,-798.34 554.68,-798.34 351.64,0 556.53,304.57 556.53,798.34 0,489.16 -206.74,803.87 -556.53,803.87z"/>
                                        <path fill="#FF6600" fillRule="nonzero" d="M19025.99 4341.48c420.86,0 711.58,-162.44 876.79,-471.62l24 0 0 420.86 904.47 0 0 -2052.6c0,-639.6 -568.53,-1006.92 -1337.33,-1006.92 -812.18,0 -1272.72,408.86 -1349.33,958.93l886.94 31.38c41.53,-191.97 201.2,-310.1 454.08,-310.1 236.27,0 385.79,113.52 385.79,316.56l0 10.15c0,184.59 -200.28,223.35 -716.2,268.57 -610.98,51.69 -1122.29,277.8 -1122.29,946.01 0,598.06 414.4,888.79 993.08,888.79zm297.18 -628.52c-222.43,0 -380.25,-106.14 -380.25,-307.34 0,-194.74 154.13,-312.87 427.32,-353.48 179.05,-25.84 398.71,-65.53 506.69,-121.83l0 287.03c0,294.42 -247.35,495.62 -553.76,495.62z"/>
                                    </g>
                                </svg>
                            </div>
                            <button
                                className="navbar-mobile-close"
                                onClick={toggleMenu}
                                aria-label="Close navigation menu"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Drawer Navigation Links */}
                        <div className="navbar-mobile-body">
                            <div className="navbar-mobile-section-label">
                                <span>Platform Navigation</span>
                            </div>

                            <div className="navbar-mobile-card-list">
                                {navItems.map((item, idx) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.path);
                                    return (
                                        <motion.div
                                            key={item.name}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.04, duration: 0.2 }}
                                            className={`navbar-mobile-card ${active ? 'active' : ''}`}
                                            onClick={() => handleNavClick(item.path)}
                                        >
                                            <div className="navbar-mobile-icon-box">
                                                <Icon size={19} strokeWidth={1.8} />
                                            </div>
                                            <div className="navbar-mobile-card-content">
                                                <div className="navbar-mobile-card-title-row">
                                                    <span className="navbar-mobile-card-title">{item.mobileTitle}</span>
                                                    {item.badge && <span className="navbar-nav-badge">{item.badge}</span>}
                                                </div>
                                                <span className="navbar-mobile-card-desc">{item.desc}</span>
                                            </div>
                                            <FiChevronRight size={16} className="navbar-mobile-card-arrow" />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Drawer Bottom Actions */}
                        <div className="navbar-mobile-footer">
                            <button
                                className="navbar-cta-btn"
                                style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                                onClick={() => handleNavClick('/profile')}
                            >
                                {ctaText}
                            </button>
                            <a
                                href="https://github.com/imsayanpaul/Appliqa"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[#8A8580] hover:text-[#171717] transition-colors"
                            >
                                <FiStar size={14} />
                                <span>Star on GitHub ({githubStats.stars})</span>
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main onScroll={handleScroll} style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingTop: '64px', scrollBehavior: 'smooth' }}>
                <Suspense fallback={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>
                        <div className="spinner primary-spinner"></div>
                    </div>
                }>
                    <Routes>
                        <Route path="/" element={
                            <Home user={user} session={session} authResolved={authResolved} resumeData={resumeData} onResumeAnalyzed={updateResumeData} />
                        } />
                        <Route path="/search" element={
                            <SearchResults user={user} resumeData={resumeData} />
                        } />
                        
                        {/* Protected Routes */}
                        <Route path="/saved" element={
                            <ProtectedRoute session={session} authResolved={authResolved}><SavedJobs user={user} resumeData={resumeData} /></ProtectedRoute>
                        } />
                        <Route path="/career" element={
                            <ProtectedRoute session={session} authResolved={authResolved}><CareerPath user={user} resumeData={resumeData} /></ProtectedRoute>
                        } />
                        <Route path="/advisor" element={
                            <ProtectedRoute session={session} authResolved={authResolved}><Advisor user={user} resumeData={resumeData} /></ProtectedRoute>
                        } />
                        <Route path="/resume-creator" element={
                            <ProtectedRoute session={session} authResolved={authResolved}><ResumeCreator user={user} resumeData={resumeData} onResumeAnalyzed={updateResumeData} onUpdateUser={handleProfileUpdate} /></ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                            <Profile user={user} session={session} authResolved={authResolved} onUpdateUser={handleProfileUpdate} resumeData={resumeData} onResumeAnalyzed={updateResumeData} />
                        } />
                    </Routes>
                    {location.pathname === '/' && <Footer />}
                </Suspense>
            </main>

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
                            border: '1px solid rgba(244, 91, 37, 0.25)', 
                            color: '#F45B25',
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
                                e.currentTarget.style.background = '#F45B25';
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

                        {/* Progress Tracker */}
                        <div className="onboarding-progress-container">
                            <div className="onboarding-progress-dots">
                                {[1, 2, 3].map((stepNum) => (
                                    <div 
                                        key={stepNum} 
                                        className={`onboarding-progress-dot ${onboardingStep >= stepNum ? 'active' : ''}`}
                                    />
                                ))}
                            </div>
                            <div className="onboarding-progress-text">
                                Step {onboardingStep} of 3
                            </div>
                        </div>
                        
                        <div style={{ overflow: 'visible', position: 'relative', minHeight: '220px' }}>
                            <AnimatePresence mode="wait">
                                {onboardingStep === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="onboarding-grid"
                                    >
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

                                        {onboardingForm.educationStatus === "College/University Student" && (
                                            <>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                                        Course / Major
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. Computer Science"
                                                        value={onboardingForm.collegeCourse}
                                                        onChange={(e) => setOnboardingForm(prev => ({ ...prev, collegeCourse: e.target.value }))}
                                                        className="onboarding-input-field"
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                                        Grad Year
                                                    </label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="2027"
                                                        value={onboardingForm.expectedGraduationYear}
                                                        onChange={(e) => setOnboardingForm(prev => ({ ...prev, expectedGraduationYear: e.target.value }))}
                                                        className="onboarding-input-field"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                )}

                                {onboardingStep === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="onboarding-grid"
                                    >
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                                Job Search Urgency
                                            </label>
                                            <Dropdown
                                                options={[
                                                    { value: "Actively looking (Ready to interview/start immediately)", label: "Actively looking (Immediate start)" },
                                                    { value: "Open to opportunities (Passive search)", label: "Open to opportunities" },
                                                    { value: "Just browsing (Not looking)", label: "Just browsing" }
                                                ]}
                                                value={onboardingForm.jobSearchUrgency}
                                                onChange={(val) => setOnboardingForm(prev => ({ ...prev, jobSearchUrgency: val }))}
                                                placeholder="Select Urgency"
                                                variant="form"
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                                Target Salary (Optional)
                                            </label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 100000"
                                                value={onboardingForm.targetSalary}
                                                onChange={(e) => setOnboardingForm(prev => ({ ...prev, targetSalary: e.target.value }))}
                                                className="onboarding-input-field"
                                            />
                                        </div>

                                        <div className="onboarding-checkboxes-row">
                                            <label className="onboarding-checkbox-label">
                                                <input 
                                                    type="checkbox" 
                                                    checked={onboardingForm.willingToRelocate} 
                                                    onChange={(e) => setOnboardingForm(prev => ({ ...prev, willingToRelocate: e.target.checked }))}
                                                    className="onboarding-checkbox"
                                                />
                                                <span>Willing to relocate for work</span>
                                            </label>
                                            <label className="onboarding-checkbox-label">
                                                <input 
                                                    type="checkbox" 
                                                    checked={onboardingForm.openToBootcamps} 
                                                    onChange={(e) => setOnboardingForm(prev => ({ ...prev, openToBootcamps: e.target.checked }))}
                                                    className="onboarding-checkbox"
                                                />
                                                <span>Open to coding bootcamps / online degrees</span>
                                            </label>
                                        </div>
                                    </motion.div>
                                )}

                                {onboardingStep === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="onboarding-grid"
                                    >
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                                LinkedIn URL (Optional)
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="https://linkedin.com/in/username"
                                                value={onboardingForm.portfolioLinkedin}
                                                onChange={(e) => setOnboardingForm(prev => ({ ...prev, portfolioLinkedin: e.target.value }))}
                                                className="onboarding-input-field"
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                                GitHub URL (Optional)
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="https://github.com/username"
                                                value={onboardingForm.portfolioGithub}
                                                onChange={(e) => setOnboardingForm(prev => ({ ...prev, portfolioGithub: e.target.value }))}
                                                className="onboarding-input-field"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Navigation Controls */}
                        <div className="onboarding-buttons-row">
                            {onboardingStep > 1 && (
                                <button 
                                    type="button"
                                    className="onboarding-back-btn"
                                    onClick={() => setOnboardingStep(prev => prev - 1)}
                                >
                                    Back
                                </button>
                            )}
                            <button 
                                type="button"
                                className="onboarding-next-btn"
                                disabled={
                                    onboardingStep === 1 
                                        ? (!onboardingForm.dob || !onboardingForm.educationStatus)
                                        : onboardingStep === 2
                                            ? !onboardingForm.jobSearchUrgency
                                            : savingOnboarding
                                }
                                onClick={() => {
                                    if (onboardingStep < 3) {
                                        setOnboardingStep(prev => prev + 1);
                                    } else {
                                        handleSaveOnboarding();
                                    }
                                }}
                            >
                                {onboardingStep === 3 
                                    ? (savingOnboarding ? 'Saving...' : 'Complete Setup') 
                                    : 'Continue'
                                }
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
                            border: `1px solid ${customAlert.type === 'error' ? '#FECACA' : customAlert.type === 'success' ? '#F45B2540' : '#BFDBFE'}`,
                            color: customAlert.type === 'error' ? '#EF4444' : customAlert.type === 'success' ? '#F45B25' : '#2563EB',
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
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#FAF8F5] text-[#171717] flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-md bg-white p-8 rounded-3xl border border-neutral-200/80 shadow-xl space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFF0E8] text-[#F45B25] flex items-center justify-center mx-auto text-xl font-bold">!</div>
                        <h2 className="text-xl font-extrabold text-[#171717]">Something went wrong</h2>
                        <p className="text-xs text-neutral-500">{this.state.error?.message || 'An unexpected error occurred.'}</p>
                        <button
                            onClick={() => {
                                window.localStorage.removeItem('appliqa_resume');
                                window.location.href = '/';
                            }}
                            className="px-5 py-2.5 rounded-xl bg-[#171717] hover:bg-[#F45B25] text-white text-xs font-bold transition-all border-none cursor-pointer"
                        >
                            Reset & Reload
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
