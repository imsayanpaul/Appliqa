import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { FiSearch, FiBriefcase, FiBookmark, FiUser, FiUpload, FiZap, FiTrendingUp, FiX, FiMapPin, FiCheckCircle, FiAlertCircle, FiInfo, FiStar, FiGitBranch, FiChevronDown, FiCalendar } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import SavedJobs from './pages/SavedJobs';
import Profile from './pages/Profile';
import CareerPath from './pages/CareerPath';
import Advisor from './pages/Advisor';
import ResumeCreator from './pages/ResumeCreator';
import SplashScreen from './components/SplashScreen';
import Footer from './components/ui/Footer';
import { supabase } from './services/supabase';
import { getUserProfile, createOrUpdateUser } from './services/api';
import { Dropdown } from './components/ui/Dropdown';
import PremiumDatePicker from './components/ui/PremiumDatePicker';
import './App.css';

// Protected Route Wrapper
const ProtectedRoute = ({ children, session }) => {
    if (!session) return <Navigate to="/profile" />;
    return children;
};

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();

    // Supabase Auth State
    const [session, setSession] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Profile State (from database)
    const [user, setUser] = useState(null);
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);
    const [pendingLocationPrompt, setPendingLocationPrompt] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);

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
    
    // GitHub repository stats (Stars & Forks)
    const [githubStats, setGithubStats] = useState({ stars: 0, forks: 0 });

    useEffect(() => {
        fetch('https://api.github.com/repos/imsayanpaul/Appliqa')
            .then(res => res.json())
            .then(data => {
                setGithubStats({
                    stars: data.stargazers_count ?? 0,
                    forks: data.forks_count ?? 0
                });
            })
            .catch(err => console.error('Error fetching GitHub stats:', err));
    }, []);

    // GitHub Dropdown States
    const [starDropdownOpen, setStarDropdownOpen] = useState(false);
    const [forkDropdownOpen, setForkDropdownOpen] = useState(false);

    useEffect(() => {
        if (!starDropdownOpen && !forkDropdownOpen) return;
        const handleOutsideClick = () => {
            setStarDropdownOpen(false);
            setForkDropdownOpen(false);
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, [starDropdownOpen, forkDropdownOpen]);
    
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
        { name: 'Search', path: '/' },
        { name: 'Saved', path: '/saved' },
        { name: 'Career', path: '/career' },
        { name: 'Advisor', path: '/advisor' },
        { name: 'Resume Builder', path: '/resume-creator' }
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
        const saved = window.localStorage.getItem('appliqa_resume');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) setLoadingAuth(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (event === 'PASSWORD_RECOVERY') {
                navigate('/profile?reset=true');
            }
            if (!session) {
                setUser(null);
                setLoadingAuth(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Fetch user profile from DB when session exists
    useEffect(() => {
        if (session) {
            getUserProfile()
                .then(res => {
                    const profile = res.data.user;
                    setUser(profile);
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
                .catch(err => console.error("Could not fetch profile", err))
                .finally(() => setLoadingAuth(false));
        }
    }, [session]);

    // Re-fetch profile when navigating to /profile so stat counters are fresh
    useEffect(() => {
        if (session && location.pathname === '/profile') {
            getUserProfile()
                .then(res => {
                    if (res.data?.user) {
                        setUser(res.data.user);
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
                            setUser(res.data.user);
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
                        setUser(res.data.user);
                    }
                })
                .catch(err => console.error("Auto-clearing resume from profile failed:", err));
            }
        }
    }, [session]);

    const handleProfileUpdate = useCallback((updatedUser) => {
        setUser(updatedUser);
    }, []);

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
                setUser(updateRes.data.user);
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
            setUser(updatedUser);
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

    if (loadingAuth) {
        return <SplashScreen />;
    }



    return (
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
            {/* GitHub Social Buttons (Star & Fork) */}
            <div className="fixed top-6 right-6 z-[110] hidden sm:flex items-center gap-2.5 select-none">
                {/* Star Button */}
                <div className="relative">
                    <div className="flex items-center bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-lg text-xs font-semibold shadow-xl hover:border-white/20 transition-all duration-200">
                        <a 
                            href="https://github.com/imsayanpaul/Appliqa" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 border-r border-white/10 hover:bg-white/5 transition-all duration-200 rounded-l-lg"
                            style={{ color: '#F4F4F5', textDecoration: 'none' }}
                        >
                            <FiStar className="size-3.5 text-zinc-400" style={{ color: '#A1A1AA' }} />
                            <span style={{ color: '#F4F4F5' }}>Star</span>
                            <span 
                                className="px-1.5 py-0.5 ml-1 rounded bg-white/10 border border-white/10 text-[10px] font-mono font-medium"
                                style={{ color: '#F97316', borderColor: 'rgba(249, 115, 22, 0.2)', backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
                            >
                                {githubStats.stars}
                            </span>
                        </a>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setStarDropdownOpen(!starDropdownOpen);
                                setForkDropdownOpen(false);
                            }}
                            className="px-2 py-1.5 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white transition-colors duration-200 flex items-center justify-center self-stretch rounded-r-lg"
                            style={{ color: '#A1A1AA', border: 'none', cursor: 'pointer' }}
                        >
                            <FiChevronDown className="size-3" />
                        </button>
                    </div>
                    <AnimatePresence>
                        {starDropdownOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-1.5 w-40 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl py-1 z-50 text-left"
                            >
                                <a 
                                    href="https://github.com/imsayanpaul/Appliqa/stargazers" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-xs no-underline"
                                    onClick={() => setStarDropdownOpen(false)}
                                >
                                    View Stargazers
                                </a>
                                <a 
                                    href="https://github.com/imsayanpaul/Appliqa" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-xs no-underline"
                                    onClick={() => setStarDropdownOpen(false)}
                                >
                                    Repo Insights
                                </a>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Fork Button */}
                <div className="relative">
                    <div className="flex items-center bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-lg text-xs font-semibold shadow-xl hover:border-white/20 transition-all duration-200">
                        <a 
                            href="https://github.com/imsayanpaul/Appliqa/fork" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 border-r border-white/10 hover:bg-white/5 transition-all duration-200 rounded-l-lg"
                            style={{ color: '#F4F4F5', textDecoration: 'none' }}
                        >
                            <FiGitBranch className="size-3.5 text-zinc-400" style={{ color: '#A1A1AA' }} />
                            <span style={{ color: '#F4F4F5' }}>Fork</span>
                            <span 
                                className="px-1.5 py-0.5 ml-1 rounded bg-white/10 border border-white/10 text-[10px] font-mono font-medium"
                                style={{ color: '#F97316', borderColor: 'rgba(249, 115, 22, 0.2)', backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
                            >
                                {githubStats.forks}
                            </span>
                        </a>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setForkDropdownOpen(!forkDropdownOpen);
                                setStarDropdownOpen(false);
                            }}
                            className="px-2 py-1.5 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white transition-colors duration-200 flex items-center justify-center self-stretch rounded-r-lg"
                            style={{ color: '#A1A1AA', border: 'none', cursor: 'pointer' }}
                        >
                            <FiChevronDown className="size-3" />
                        </button>
                    </div>
                    <AnimatePresence>
                        {forkDropdownOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-1.5 w-40 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl py-1 z-50 text-left"
                            >
                                <a 
                                    href="https://github.com/imsayanpaul/Appliqa/fork" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-xs no-underline"
                                    onClick={() => setForkDropdownOpen(false)}
                                >
                                    Create new fork
                                </a>
                                <a 
                                    href="https://github.com/imsayanpaul/Appliqa/forks" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-xs no-underline"
                                    onClick={() => setForkDropdownOpen(false)}
                                >
                                    View forks
                                </a>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            {user && (
                <div className="navbar-wrapper">
                <motion.div 
                    className="navbar-pill"
                    animate={{
                        maxWidth: scrolled ? '720px' : '820px',
                        padding: scrolled ? '7px 20px' : '10px 24px',
                        y: visible ? 0 : -100,
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 140,
                        damping: 20,
                        mass: 0.8
                    }}
                >
                    <div className="navbar-brand-container" onClick={() => handleNavClick('/')}>
                        <motion.div
                            className="logo-icon-motion"
                            initial={{ scale: 0.95, opacity: 0.9 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                        >
                            <span className="navbar-logo">
                                Appli<span>qa</span>
                            </span>
                        </motion.div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="navbar-desktop-nav">
                        {navItems.map((item) => (
                            <motion.div
                                key={item.name}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                whileHover={{ scale: 1.05 }}
                            >
                                 <span
                                    onClick={() => handleNavClick(item.path)}
                                    className={`navbar-link-item ${isActive(item.path) ? 'active' : ''} flex items-center gap-1.5`}
                                >
                                    {item.name}
                                    {item.name === 'Resume Builder' && (
                                        <span className="premium-ai-badge self-center">AI</span>
                                    )}
                                </span>
                            </motion.div>
                        ))}
                    </nav>

                    {/* Desktop CTA Button */}
                    <motion.div
                        className="navbar-desktop-cta"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        <button
                            onClick={() => handleNavClick('/profile')}
                            className={`navbar-cta-btn ${isActive('/profile') ? 'cta-active' : ''}`}
                        >
                            {ctaText}
                        </button>
                    </motion.div>

                    {/* Mobile Menu Button */}
                    <motion.button 
                        className="navbar-mobile-toggle" 
                        onClick={toggleMenu} 
                        whileTap={{ scale: 0.9 }}
                    >
                        <Menu size={24} />
                    </motion.button>
                </motion.div>

                {/* Mobile Menu Overlay */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            className="navbar-mobile-overlay"
                            initial={{ opacity: 0, x: '100%' }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            <motion.button
                                className="navbar-mobile-close"
                                onClick={toggleMenu}
                                whileTap={{ scale: 0.9 }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <X size={24} />
                            </motion.button>
                            <div className="navbar-mobile-links">
                                {navItems.map((item, i) => (
                                    <motion.div
                                        key={item.name}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 + 0.1 }}
                                        exit={{ opacity: 0, x: 20 }}
                                    >
                                         <span 
                                            className={`navbar-mobile-link ${isActive(item.path) ? 'active' : ''} flex items-center gap-2`}
                                            onClick={() => handleNavClick(item.path)}
                                        >
                                            {item.name}
                                            {item.name === 'Resume Builder' && (
                                                <span className="premium-ai-badge">AI</span>
                                            )}
                                        </span>
                                    </motion.div>
                                ))}

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    style={{ paddingTop: '24px' }}
                                >
                                    <button
                                        className="navbar-cta-btn"
                                        style={{ width: '100%', padding: '12px' }}
                                        onClick={() => handleNavClick('/profile')}
                                    >
                                        {ctaText}
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            )}

            <main onScroll={handleScroll} style={{ height: '100%', overflowY: 'auto', paddingTop: user ? '106px' : '0px', scrollBehavior: 'smooth' }}>
                <Routes>
                    <Route path="/" element={
                        <Home user={user} resumeData={resumeData} onResumeAnalyzed={updateResumeData} />
                    } />
                    <Route path="/search" element={
                        <SearchResults user={user} resumeData={resumeData} />
                    } />
                    
                    {/* Protected Routes */}
                    <Route path="/saved" element={
                        <ProtectedRoute session={session}><SavedJobs user={user} resumeData={resumeData} /></ProtectedRoute>
                    } />
                    <Route path="/career" element={
                        <ProtectedRoute session={session}><CareerPath user={user} resumeData={resumeData} /></ProtectedRoute>
                    } />
                    <Route path="/advisor" element={
                        <ProtectedRoute session={session}><Advisor user={user} resumeData={resumeData} /></ProtectedRoute>
                    } />
                    <Route path="/resume-creator" element={
                        <ProtectedRoute session={session}><ResumeCreator user={user} resumeData={resumeData} onResumeAnalyzed={updateResumeData} onUpdateUser={handleProfileUpdate} /></ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                        <Profile user={user} session={session} onUpdateUser={handleProfileUpdate} resumeData={resumeData} onResumeAnalyzed={updateResumeData} />
                    } />
                </Routes>
                <Footer />
            </main>

            {showLocationPrompt && !customAlert.show && (
                <div 
                    style={{ 
                        position: 'fixed', 
                        bottom: '24px', 
                        right: '24px', 
                        width: '380px', 
                        background: 'radial-gradient(circle at top left, rgba(249, 115, 22, 0.05) 0%, transparent 60%), rgba(13, 13, 17, 0.75)', 
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '20px',
                        padding: '24px',
                        boxShadow: '0 24px 50px -12px rgba(0, 0, 0, 0.7), 0 0 32px rgba(249, 115, 22, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                        zIndex: 1100,
                        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    <button 
                        onClick={() => handleDismissLocationPrompt(false)}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            color: 'var(--text-muted)',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            padding: '0'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                        }}
                    >
                        <FiX size={14} />
                    </button>
                    
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            width: '42px', 
                            height: '42px', 
                            borderRadius: '12px', 
                            background: 'rgba(249, 115, 22, 0.08)', 
                            border: '1px solid rgba(249, 115, 22, 0.25)', 
                            color: 'var(--accent-primary)',
                            flexShrink: 0, 
                            boxShadow: '0 0 16px rgba(249, 115, 22, 0.1)'
                        }}>
                            <FiMapPin size={18} />
                        </div>
                        <div style={{ flex: 1, paddingRight: '20px' }}>
                            <h3 style={{ fontSize: '15.5px', fontWeight: 650, color: '#FFFFFF', letterSpacing: '-0.01em', marginBottom: '4px' }}>Set Default Location</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', lineHeight: '1.5' }}>
                                Automatically detect country and city to optimize your job searches and matching scores.
                            </p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleDetectLocation} 
                            disabled={detectingLocation}
                            style={{ 
                                justifyContent: 'center', 
                                width: '100%', 
                                padding: '12px 20px', 
                                borderRadius: '12px',
                                fontSize: '13.5px',
                                fontWeight: '600',
                                letterSpacing: '-0.01em',
                                background: 'linear-gradient(135deg, var(--accent-primary), #EA580C)',
                                color: '#FFFFFF',
                                border: 'none',
                                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.25)',
                                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                cursor: 'pointer'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #ea580c, #c2410c)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(249, 115, 22, 0.4)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, var(--accent-primary), #EA580C)';
                                e.currentTarget.style.boxShadow = '0 4px 14px rgba(249, 115, 22, 0.25)';
                                e.currentTarget.style.transform = 'none';
                            }}
                        >
                            {detectingLocation ? (
                                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 8 }}></div> Detecting...</>
                            ) : (
                                'Detect Automatically'
                            )}
                        </button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => handleDismissLocationPrompt(true)}
                                disabled={detectingLocation}
                                style={{ 
                                    justifyContent: 'center', 
                                    padding: '10px 16px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: 'var(--text-primary)',
                                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                    cursor: 'pointer'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                }}
                            >
                                Choose Manually
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => handleDismissLocationPrompt(false)}
                                disabled={detectingLocation}
                                style={{ 
                                    justifyContent: 'center', 
                                    padding: '10px 16px', 
                                    background: 'transparent', 
                                    borderColor: 'transparent', 
                                    color: 'var(--text-muted)',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                    cursor: 'pointer'
                                }}
                                onMouseOver={(e) => e.target.style.color = '#fff'}
                                onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
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
                            bottom: '24px',
                            right: '24px',
                            width: '340px',
                            background: `radial-gradient(circle at top left, ${customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(249, 115, 22, 0.06)'} 0%, transparent 60%), rgba(13, 13, 17, 0.85)`,
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            padding: '16px',
                            boxShadow: `0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 24px ${customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.02)' : 'rgba(249, 115, 22, 0.02)'}, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
                            zIndex: 2000,
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'flex-start',
                            cursor: 'pointer',
                        }}
                    >
                        {/* Icon wrapper */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(249, 115, 22, 0.08)',
                            border: `1px solid ${customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(249, 115, 22, 0.25)'}`,
                            color: customAlert.type === 'error' ? '#ef4444' : 'var(--accent-primary)',
                            flexShrink: 0,
                            boxShadow: `0 0 12px ${customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(249, 115, 22, 0.05)'}`
                        }}>
                            {customAlert.type === 'success' ? (
                                <FiCheckCircle size={18} />
                            ) : customAlert.type === 'error' ? (
                                <FiAlertCircle size={18} />
                            ) : (
                                <FiInfo size={18} />
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                            <h4 style={{
                                fontSize: '14px',
                                fontWeight: 650,
                                color: '#FFFFFF',
                                letterSpacing: '-0.01em',
                                margin: '0 0 4px 0',
                            }}>
                                {customAlert.title}
                            </h4>
                            <p style={{
                                color: 'var(--text-muted)',
                                fontSize: '12.5px',
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
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                marginRight: '-4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.2s',
                            }}
                            onMouseOver={(e) => e.target.style.color = '#fff'}
                            onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
                        >
                            <FiX size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
