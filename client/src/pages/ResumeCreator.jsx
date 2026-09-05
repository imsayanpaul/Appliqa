import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    User, Briefcase, GraduationCap, Compass, AlignLeft, Layers, ShieldCheck, Globe,
    Sparkles, Sparkle, Download, Save, Upload, X, 
    Plus, Trash2, Check, ArrowRight, RefreshCw,
    MessageSquare, Send, Wand2, Gauge, Activity, AlertCircle, CheckCircle2,
    Sliders, Monitor, FileText, FileCheck
} from 'lucide-react';
import { 
    enhanceResumeBullet, suggestResumeSkills, analyzeResume, createOrUpdateUser, incrementStat,
    tailorResume, getAchievementFinderChat, getATSScore
} from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function ResumeCreator({ user, resumeData, onResumeAnalyzed, onUpdateUser }) {
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isMobile) {
        return (
            <div className="resume-creator-mobile-notice-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - 64px)',
                padding: '32px 20px',
                textAlign: 'center',
                background: '#FAF8F5',
                color: '#171717',
                boxSizing: 'border-box'
            }}>
                <div className="resume-creator-mobile-notice-card" style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '420px',
                    background: '#FFFFFF',
                    border: '1px solid #D8D4CC',
                    borderRadius: '8px',
                    padding: '36px 24px',
                    boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)'
                }}>
                    {/* Accent Badge */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#FFF0E8',
                        border: '1px solid rgba(244, 91, 37, 0.3)',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#F45B25',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: '20px'
                    }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: '#F45B25'
                        }} />
                        Desktop Recommended
                    </div>

                    {/* Monitor Icon Container */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '56px',
                        height: '56px',
                        borderRadius: '8px',
                        background: '#FFF0E8',
                        border: '1px solid rgba(244, 91, 37, 0.25)',
                        margin: '0 auto 20px auto'
                    }}>
                        <Monitor size={28} className="text-[#F45B25]" />
                    </div>

                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: '800',
                        lineHeight: '1.3',
                        letterSpacing: '-0.02em',
                        color: '#171717',
                        margin: '0 0 10px 0'
                    }}>
                        Optimize Your Builder Experience
                    </h2>

                    <p style={{
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: '#66615C',
                        margin: '0 0 24px 0',
                        fontWeight: '400'
                    }}>
                        Appliqa's real-time visual resume generator, live ATS scanner, and split-screen design editor require a larger screen. Please open Appliqa on your computer or tablet to build and export your resume.
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <button
                            onClick={() => navigate('/advisor')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                padding: '11px 20px',
                                borderRadius: '6px',
                                background: '#171717',
                                color: '#FFFFFF',
                                fontWeight: '700',
                                fontSize: '13px',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = '#F45B25';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = '#171717';
                            }}
                        >
                            Ask Career Advisor
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                padding: '10px 20px',
                                borderRadius: '6px',
                                background: '#FAF8F5',
                                border: '1px solid #D8D4CC',
                                color: '#171717',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
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
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Current Active Edit Tab
    const [activeTab, setActiveTab] = useState('personal');
    const [template, setTemplate] = useState('modern'); // 'modern' | 'classic' | 'elegant'

    // Resume Creator Form State
    const [personalInfo, setPersonalInfo] = useState({
        name: user?.name || '',
        title: '',
        email: user?.email || '',
        phone: '',
        location: user?.preferences?.location 
            ? `${user.preferences.location}${user.preferences.country ? ', ' + user.preferences.country : ''}` 
            : '',
        website: '',
        linkedin: user?.portfolioLinkedin || '',
        github: user?.portfolioGithub || '',
        address: '',
        dob: '',
        country: '',
        nationality: ''
    });

    const [experience, setExperience] = useState([]);
    const [education, setEducation] = useState([]);
    const [skills, setSkills] = useState([]);
    const [expertise, setExpertise] = useState([]);
    const [certifications, setCertifications] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [summary, setSummary] = useState('');

    // AI Bullet Enhancer State
    const [showEnhancer, setShowEnhancer] = useState(false);
    const [enhancerData, setEnhancerData] = useState({
        expIndex: null,
        bulletIndex: null,
        originalText: '',
        roleContext: '',
        actionVerb: '',
        variations: [],
        loading: false
    });

    // AI Skills Suggestions State
    const [suggestedSkills, setSuggestedSkills] = useState([]);
    const [loadingSkills, setLoadingSkills] = useState(false);

    // Scan File Upload Modal State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadError, setUploadError] = useState('');

    // Helper to serialize current builder state for comparison
    const serializeResumeState = (pInfo, exp, edu, sk, expList, certs, langs, summ, tmpl) => {
        return JSON.stringify({
            personalInfo: pInfo,
            experience: exp,
            education: edu,
            skills: sk,
            expertise: expList,
            certifications: certs,
            languages: langs,
            summary: summ,
            template: tmpl
        });
    };

    // Sync / Save state & Dirty tracker
    const [syncing, setSyncing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const initialSnapshotRef = useRef(null);

    // Track user changes across all resume sections using exact snapshot comparison
    useEffect(() => {
        if (!hasInitializedRef.current || !initialSnapshotRef.current) return;

        const currentSnapshot = serializeResumeState(
            personalInfo,
            experience,
            education,
            skills,
            expertise,
            certifications,
            languages,
            summary,
            template
        );

        if (currentSnapshot !== initialSnapshotRef.current) {
            setIsDirty(true);
            setSaved(false);
        } else {
            setIsDirty(false);
        }
    }, [personalInfo, experience, education, skills, expertise, certifications, languages, summary, template]);

    // Global keyboard shortcut (Ctrl+S / Cmd+S) to save resume from anywhere
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSync();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [personalInfo, experience, education, skills, expertise, certifications, languages, summary, template, user]);

    // Advanced Premium Features State
    // 1. ATS Score Checker
    const [showATSPanel, setShowATSPanel] = useState(false);
    const [atsTargetJD, setAtsTargetJD] = useState('');
    const [atsTargetTitle, setAtsTargetTitle] = useState('');
    const [atsResult, setAtsResult] = useState(null);
    const [loadingATS, setLoadingATS] = useState(false);

    // 2. Tailor Mode
    const [showTailorModal, setShowTailorModal] = useState(false);
    const [tailorJD, setTailorJD] = useState('');
    const [tailoring, setTailoring] = useState(false);

    // 3. Achievement Finder Chatbot
    const [showChatbot, setShowChatbot] = useState(false);
    const [chatbotInput, setChatbotInput] = useState('');
    const [chatbotHistory, setChatbotHistory] = useState([
        { role: 'assistant', text: 'Hi! Let\'s build a high-impact, metrics-driven bullet point for your resume. Tell me about a key project or task you worked on in this role.' }
    ]);
    const [chatbotLoading, setChatbotLoading] = useState(false);
    const [selectedExpIndexForChat, setSelectedExpIndexForChat] = useState(null);
    const [chatbotSuggestedBullet, setChatbotSuggestedBullet] = useState(null);
    const chatbotEndRef = useRef(null);

    // Initial load tracking refs to prevent redundant resets during editing
    const lastPropResumeDataRef = useRef(null);
    const lastPropBuilderDataRef = useRef(null);
    const hasInitializedRef = useRef(false);

    // Initial load: Import from account if exists
    useEffect(() => {
        // If we have already initialized, we do not want to overwrite local state edits
        if (hasInitializedRef.current) {
            // Exception: if builderData or resumeData was initially null and is now available
            if (user?.builderData && !lastPropBuilderDataRef.current) {
                loadFromResumeData(user.builderData);
                lastPropBuilderDataRef.current = user.builderData;
            } else if (resumeData && !lastPropResumeDataRef.current && !user?.builderData) {
                loadFromResumeData(resumeData);
                lastPropResumeDataRef.current = resumeData;
            }
            return;
        }

        if (user?.builderData) {
            loadFromResumeData(user.builderData);
            lastPropBuilderDataRef.current = user.builderData;
            hasInitializedRef.current = true;
        } else if (resumeData) {
            loadFromResumeData(resumeData);
            lastPropResumeDataRef.current = resumeData;
            hasInitializedRef.current = true;
        } else if (user) {
            const fallbackInfo = {
                name: user.name || '',
                title: user.preferences?.desiredRole || '',
                email: user.email || '',
                phone: user.phone || '',
                location: user.preferences?.location 
                    ? `${user.preferences.location}${user.preferences.country ? ', ' + user.preferences.country : ''}` 
                    : '',
                website: user.portfolioWebsite || '',
                linkedin: user.portfolioLinkedin || '',
                github: user.portfolioGithub || '',
                address: '',
                dob: '',
                country: user.preferences?.country || '',
                nationality: ''
            };
            setPersonalInfo(fallbackInfo);
            hasInitializedRef.current = true;
            initialSnapshotRef.current = serializeResumeState(
                fallbackInfo,
                [],
                [],
                [],
                [],
                [],
                [],
                '',
                template
            );
            setIsDirty(false);
        }
    }, [resumeData, user]);

    // Load data utility
    const loadFromResumeData = (data) => {
        if (!data) return;
        
        hasInitializedRef.current = true;
        
        const newPersonalInfo = {
            name: data.personalInfo?.name || data.name || user?.name || '',
            title: data.personalInfo?.title || data.title || data.suggestedRoles?.[0] || user?.preferences?.desiredRole || '',
            email: data.personalInfo?.email || data.email || user?.email || '',
            phone: data.personalInfo?.phone || data.phone || user?.phone || '',
            location: data.personalInfo?.location || data.location || user?.preferences?.location || '',
            website: data.personalInfo?.website || data.website || user?.portfolioWebsite || '',
            linkedin: data.personalInfo?.linkedin || data.linkedin || user?.portfolioLinkedin || '',
            github: data.personalInfo?.github || data.github || user?.portfolioGithub || '',
            address: data.personalInfo?.address || data.address || '',
            dob: data.personalInfo?.dob || data.dob || '',
            country: data.personalInfo?.country || data.country || user?.preferences?.country || '',
            nationality: data.personalInfo?.nationality || data.nationality || ''
        };
        setPersonalInfo(newPersonalInfo);

        const newSummary = data.summary || '';
        const newSkills = data.skills || [];
        const newExpertise = data.expertise || [];
        const newCerts = data.certifications || [];
        const newLangs = data.languages || [];

        setSummary(newSummary);
        setSkills(newSkills);
        setExpertise(newExpertise);
        setCertifications(newCerts);
        setLanguages(newLangs);

        // Format Experience
        let formattedExp = [];
        if (data.experience && data.experience.length > 0) {
            formattedExp = data.experience.map(item => {
                if (typeof item === 'string') {
                    return parseExperienceStr(item);
                }
                return {
                    company: item.company || '',
                    role: item.role || '',
                    dates: item.dates || '',
                    bullets: item.bullets || ['Key achievement or responsibility.']
                };
            });
        }
        setExperience(formattedExp);

        // Format Education
        let formattedEdu = [];
        if (data.education && data.education.length > 0) {
            formattedEdu = data.education.map(item => {
                if (typeof item === 'string') {
                    return parseEducationStr(item);
                }
                return {
                    school: item.school || '',
                    degree: item.degree || '',
                    dates: item.dates || ''
                };
            });
        }
        setEducation(formattedEdu);

        // Set baseline initial snapshot
        initialSnapshotRef.current = serializeResumeState(
            newPersonalInfo,
            formattedExp,
            formattedEdu,
            newSkills,
            newExpertise,
            newCerts,
            newLangs,
            newSummary,
            template
        );
        setIsDirty(false);
    };

    const parseExperienceStr = (str) => {
        const dateMatch = str.match(/\(([^)]+)\)/);
        const dates = dateMatch ? dateMatch[1] : 'Dates';
        const cleanStr = str.replace(/\([^)]+\)/, '').trim();
        
        let role = cleanStr;
        let company = 'Company';
        if (cleanStr.includes(' at ')) {
            const parts = cleanStr.split(' at ');
            role = parts[0].trim();
            company = parts[1].trim();
        } else if (cleanStr.includes(' @ ')) {
            const parts = cleanStr.split(' @ ');
            role = parts[0].trim();
            company = parts[1].trim();
        }
        
        return {
            company,
            role,
            dates,
            bullets: ['Core responsibility or project milestone achieved.']
        };
    };

    const parseEducationStr = (str) => {
        const dateMatch = str.match(/\(([^)]+)\)/);
        const dates = dateMatch ? dateMatch[1] : 'Graduation Date';
        const cleanStr = str.replace(/\([^)]+\)/, '').trim();
        
        let degree = cleanStr;
        let school = 'Institution';
        if (cleanStr.includes(' from ')) {
            const parts = cleanStr.split(' from ');
            degree = parts[0].trim();
            school = parts[1].trim();
        } else if (cleanStr.includes(' at ')) {
            const parts = cleanStr.split(' at ');
            degree = parts[0].trim();
            school = parts[1].trim();
        }
        
        return {
            school,
            degree,
            dates
        };
    };

    // Experience Actions
    const addExperience = () => {
        setExperience([...experience, {
            company: '',
            role: '',
            dates: '',
            bullets: ['Collaborated with cross-functional teams to build and deploy key technical items.']
        }]);
    };

    const removeExperience = (index) => {
        setExperience(experience.filter((_, i) => i !== index));
    };

    const updateExperienceField = (index, field, value) => {
        const updated = [...experience];
        updated[index][field] = value;
        setExperience(updated);
    };

    const addBullet = (expIndex) => {
        const updated = [...experience];
        updated[expIndex].bullets.push('New milestone achievement description.');
        setExperience(updated);
    };

    const updateBulletText = (expIndex, bulletIndex, text) => {
        const updated = [...experience];
        updated[expIndex].bullets[bulletIndex] = text;
        setExperience(updated);
    };

    const removeBullet = (expIndex, bulletIndex) => {
        const updated = [...experience];
        updated[expIndex].bullets = updated[expIndex].bullets.filter((_, i) => i !== bulletIndex);
        setExperience(updated);
    };

    // Education Actions
    const addEducation = () => {
        setEducation([...education, {
            school: '',
            degree: '',
            dates: ''
        }]);
    };

    const removeEducation = (index) => {
        setEducation(education.filter((_, i) => i !== index));
    };

    const updateEducationField = (index, field, value) => {
        const updated = [...education];
        updated[index][field] = value;
        setEducation(updated);
    };

    // Skills Actions
    const [skillInput, setSkillInput] = useState('');
    const addSkill = (e) => {
        if (e) e.preventDefault();
        const clean = skillInput.trim();
        if (clean && !skills.includes(clean)) {
            setSkills([...skills, clean]);
        }
        setSkillInput('');
    };

    const removeSkill = (skill) => {
        setSkills(skills.filter(s => s !== skill));
    };

    // AI Enhance Bullet Logic
    const triggerEnhanceBullet = (expIndex, bulletIndex, currentText) => {
        setEnhancerData({
            expIndex,
            bulletIndex,
            originalText: currentText,
            roleContext: personalInfo.title || '',
            actionVerb: '',
            variations: [],
            loading: false
        });
        setShowEnhancer(true);
    };

    const handleEnhanceBullet = async () => {
        if (!enhancerData.originalText.trim()) return;
        setEnhancerData(prev => ({ ...prev, loading: true }));
        try {
            const res = await enhanceResumeBullet({
                bulletText: enhancerData.originalText,
                roleContext: enhancerData.roleContext,
                actionVerb: enhancerData.actionVerb,
                type: enhancerData.expIndex === null ? 'summary' : 'bullet'
            });
            setEnhancerData(prev => ({
                ...prev,
                variations: res.data.variations || [],
                loading: false
            }));
        } catch (err) {
            console.error(err);
            alert("AI Bullet Enhancement failed. Please try again.");
            setEnhancerData(prev => ({ ...prev, loading: false }));
        }
    };

    const applyVariation = (variant) => {
        if (enhancerData.expIndex === null) {
            setSummary(variant);
        } else {
            updateBulletText(enhancerData.expIndex, enhancerData.bulletIndex, variant);
        }
        setShowEnhancer(false);
    };

    // AI Suggest Skills Logic
    const handleSuggestSkills = async () => {
        setLoadingSkills(true);
        try {
            const res = await suggestResumeSkills({
                experience: experience.map(exp => `${exp.role} at ${exp.company}`),
                education: education.map(edu => `${edu.degree} from ${edu.school}`),
                currentSkills: skills
            });
            setSuggestedSkills(res.data.suggestedSkills || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingSkills(false);
        }
    };

    // Scroll chatbot to bottom
    useEffect(() => {
        if (chatbotEndRef.current) {
            chatbotEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatbotHistory]);

    // ATS Match Scorer
    const handleATSCheck = async () => {
        setLoadingATS(true);
        // Combine raw resume text
        let rawResumeText = `${personalInfo.name || ''}\n${personalInfo.title || ''}\n\nSUMMARY:\n${summary || ''}\n\n`;
        rawResumeText += `EXPERIENCE:\n`;
        experience.forEach(exp => {
            rawResumeText += `${exp.role} at ${exp.company} (${exp.dates})\n`;
            exp.bullets.forEach(b => { rawResumeText += `- ${b}\n`; });
        });
        rawResumeText += `\nEDUCATION:\n`;
        education.forEach(edu => {
            rawResumeText += `${edu.degree} from ${edu.school} (${edu.dates})\n`;
        });
        rawResumeText += `\nSKILLS:\n${skills.join(', ')}`;

        try {
            const res = await getATSScore({
                resumeText: rawResumeText,
                jobTitle: atsTargetTitle || personalInfo.title || '',
                jobDescription: atsTargetJD || ''
            });
            if (res.data?.atsResult) {
                setAtsResult(res.data.atsResult);
            }
        } catch (err) {
            console.error(err);
            alert("ATS scoring failed: " + (err.response?.data?.error || err.message));
        } finally {
            setLoadingATS(false);
        }
    };

    // Role-Specific Resume Tailoring
    const handleTailorResume = async () => {
        if (!tailorJD.trim()) return;
        setTailoring(true);
        try {
            const res = await tailorResume({
                personalInfo,
                summary,
                experience,
                education,
                skills,
                jobDescription: tailorJD
            });
            if (res.data?.tailoredData) {
                const data = res.data.tailoredData;
                if (data.summary) setSummary(data.summary);
                if (data.experience && data.experience.length > 0) {
                    const mappedExp = experience.map((item) => {
                        const tailoredItem = data.experience.find(
                            t => t.company?.toLowerCase() === item.company?.toLowerCase() ||
                                 t.role?.toLowerCase() === item.role?.toLowerCase()
                        );
                        return {
                            ...item,
                            bullets: tailoredItem?.bullets || item.bullets
                        };
                    });
                    setExperience(mappedExp);
                }
                if (data.suggestedSkills && data.suggestedSkills.length > 0) {
                    setSkills(prev => [...new Set([...prev, ...data.suggestedSkills])]);
                    setSuggestedSkills(prev => [...new Set([...prev, ...data.suggestedSkills])]);
                    setActiveTab('skills');
                }
                setShowTailorModal(false);
                setTailorJD('');
                alert("Successfully tailored your resume summary and bullet points to match the target job description!");
            }
        } catch (err) {
            console.error(err);
            alert("Tailoring failed: " + (err.response?.data?.error || err.message));
        } finally {
            setTailoring(false);
        }
    };

    // Achievement Finder Chatbot logic
    const handleStartChatbot = (expIndex) => {
        setSelectedExpIndexForChat(expIndex);
        const exp = experience[expIndex];
        setChatbotSuggestedBullet(null);
        setChatbotHistory([
            { 
                role: 'assistant', 
                text: `Hi! Let's build a metrics-driven bullet point for your role as a ${exp.role || 'Professional'} at ${exp.company || 'Company'}. What is a key project or task you worked on in this role?` 
            }
        ]);
        setShowChatbot(true);
    };

    const handleSendChatbotMessage = async (e) => {
        if (e) e.preventDefault();
        const msgText = chatbotInput.trim();
        if (!msgText || chatbotLoading) return;

        const updatedHistory = [...chatbotHistory, { role: 'user', text: msgText }];
        setChatbotHistory(updatedHistory);
        setChatbotInput('');
        setChatbotLoading(true);

        const exp = selectedExpIndexForChat !== null ? experience[selectedExpIndexForChat] : null;

        try {
            const res = await getAchievementFinderChat({
                roleTitle: exp?.role || personalInfo.title || '',
                message: msgText,
                chatHistory: updatedHistory
            });
            if (res.data?.chatResult) {
                const result = res.data.chatResult;
                setChatbotHistory(prev => [...prev, { role: 'assistant', text: result.reply }]);
                if (result.suggestedBullet) {
                    setChatbotSuggestedBullet(result.suggestedBullet);
                }
            }
        } catch (err) {
            console.error(err);
            setChatbotHistory(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error. Please try answering again.' }]);
        } finally {
            setChatbotLoading(false);
        }
    };

    const handleApplyChatbotBullet = () => {
        if (selectedExpIndexForChat === null || !chatbotSuggestedBullet) return;
        const updated = [...experience];
        updated[selectedExpIndexForChat].bullets.push(chatbotSuggestedBullet);
        setExperience(updated);
        setShowChatbot(false);
        setChatbotSuggestedBullet(null);
        alert("Success! Added the metric-driven achievement bullet to your experience profile.");
    };

    // Sync to Account
    const handleSync = async () => {
        setSyncing(true);
        const payload = {
            fileName: 'Appliqa_AI_Resume.pdf',
            skills,
            expertise,
            certifications,
            languages,
            experience,
            education,
            summary,
            personalInfo,
            rawText: `${personalInfo.name}\n${personalInfo.title}\n${summary}\n${skills.join(', ')}\nExpertise: ${expertise.join(', ')}\nCertifications: ${certifications.join(', ')}\nLanguages: ${languages.join(', ')}`,
            suggestedRoles: personalInfo.title ? [personalInfo.title] : [],
            experienceLevel: user?.resumeData?.experienceLevel || 'mid'
        };

        try {
            const res = await createOrUpdateUser({ 
                builderData: payload,
                name: personalInfo.name,
                phone: personalInfo.phone,
                portfolioLinkedin: personalInfo.linkedin,
                portfolioGithub: personalInfo.github,
                portfolioWebsite: personalInfo.website,
                preferences: {
                    ...user?.preferences,
                    desiredRole: personalInfo.title,
                    location: personalInfo.location
                }
            });
            if (res.data?.user) {
                if (onUpdateUser) {
                    onUpdateUser(res.data.user);
                }
                initialSnapshotRef.current = serializeResumeState(
                    personalInfo,
                    experience,
                    education,
                    skills,
                    expertise,
                    certifications,
                    languages,
                    summary,
                    template
                );
                setIsDirty(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 3500);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to sync resume settings: " + (err.message || "Unknown error"));
        } finally {
            setSyncing(false);
        }
    };

    // Download PDF (Browser Print Trigger)
    const handleDownloadPDF = async () => {
        try {
            // Track in stats
            await incrementStat('resumes_optimized_count');
        } catch (_) {}
        window.print();
    };

    // OCR PDF Scan Ingestion Logic
    const extractTextWithOCR = async (pdf) => {
        let ocrText = '';
        const worker = await createWorker('eng');

        for (let i = 1; i <= pdf.numPages; i++) {
            setUploadStatus(`OCR scan: Page ${i}/${pdf.numPages}...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;

            const { data: { text } } = await worker.recognize(canvas);
            ocrText += text + '\n';
        }

        await worker.terminate();
        return ocrText.trim();
    };

    const extractTextFromPdf = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        if (fullText.trim().length < 50) {
            setUploadStatus("Extracting images. OCR Fallback activated...");
            fullText = await extractTextWithOCR(pdf);
        }

        return fullText.trim();
    };

    const handleFileScan = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError('');
        setUploading(true);
        setUploadStatus('Loading file...');

        try {
            let text = '';
            if (file.type === 'application/pdf') {
                text = await extractTextFromPdf(file);
            } else {
                text = await file.text();
            }

            if (!text || text.length < 50) {
                throw new Error("Extracted text was too short or empty.");
            }

            setUploadStatus('Analyzing text with AI...');
            const res = await analyzeResume(text);
            const data = res.data.analysis;

            loadFromResumeData(data);
            setShowUploadModal(false);
            alert("Successfully parsed and loaded your resume details into the creator workspace!");
        } catch (err) {
            console.error(err);
            setUploadError(`Parsing failed: ${err.message || 'Make sure it is a readable PDF/TXT'}`);
        } finally {
            setUploading(false);
            setUploadStatus('');
        }
    };

    // Styling helpers for templates
    const getTemplateStyle = () => {
        switch (template) {
            case 'classic':
                return { fontFamily: 'Georgia, serif', lineHeight: '1.6', color: '#111111' };
            case 'elegant':
                return { fontFamily: '"Helvetica Neue", Arial, sans-serif', letterSpacing: '0.02em', lineHeight: '1.5', color: '#222222' };
            default:
                return { fontFamily: '"Inter", sans-serif', lineHeight: '1.55', color: '#1d1d1f' };
        }
    };

    const getContactItems = () => {
        const items = [];
        
        // Combined Address, Location, Country
        const addressParts = [];
        if (personalInfo.address) addressParts.push(personalInfo.address);
        if (personalInfo.location) addressParts.push(personalInfo.location);
        if (personalInfo.country) addressParts.push(personalInfo.country);
        const fullAddress = addressParts.join(', ');
        if (fullAddress) items.push({ type: 'text', value: fullAddress });
        
        if (personalInfo.email) items.push({ type: 'email', value: personalInfo.email, href: `mailto:${personalInfo.email}` });
        if (personalInfo.phone) items.push({ type: 'text', value: personalInfo.phone });
        
        const ensureHttp = (url) => {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            return `https://${url}`;
        };
        
        if (personalInfo.website) items.push({ type: 'link', value: personalInfo.website, href: ensureHttp(personalInfo.website) });
        if (personalInfo.linkedin) items.push({ type: 'link', value: personalInfo.linkedin, href: ensureHttp(personalInfo.linkedin) });
        if (personalInfo.github) items.push({ type: 'link', value: personalInfo.github, href: ensureHttp(personalInfo.github) });
        
        return items;
    };

    const renderContactItems = (separator) => {
        return getContactItems().map((item, i) => (
            <span key={i}>
                {i > 0 && ` ${separator} `}
                {item.type === 'text' ? (
                    item.value
                ) : (
                    <a 
                        href={item.href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="underline"
                        style={{ color: '#2163CA' }}
                    >
                        {item.value}
                    </a>
                )}
            </span>
        ));
    };

    const renderPersonalDetails = (isPrint = false) => {
        if (!personalInfo.dob && !personalInfo.nationality) return null;
        
        const details = [];
        if (personalInfo.dob) details.push(`DOB: ${personalInfo.dob}`);
        if (personalInfo.location) details.push(personalInfo.location);
        if (personalInfo.nationality) details.push(personalInfo.nationality);
        
        const alignmentClass = template === 'classic' ? 'text-center' : 'text-left';
        const labelColor = isPrint ? 'text-black' : 'text-zinc-800';
        const textColor = isPrint ? 'text-zinc-900' : 'text-zinc-650';
        
        return (
            <div className={`text-xs mt-2 ${alignmentClass} ${textColor}`}>
                <div className={`font-semibold ${labelColor}`}>Personal Details:</div>
                <div className="mt-0.5">
                    {details.join(' | ')}
                </div>
            </div>
        );
    };

    return (
        <div className="resume-creator-outer-wrapper">
            {/* Main Full-Page Studio Container */}
            <div className="resume-creator-container">
                {/* Left Workspace Panel: Form Editor */}
                <div className="resume-creator-editor-panel">
                    {/* Creator Header Actions (Clean Single-Row Layout) */}
                    <div className="resume-creator-header-actions border-b border-[#D8D4CC] px-6 py-3.5 bg-white flex items-center justify-end gap-2">
                        <button 
                            onClick={() => setShowTailorModal(true)}
                            className="h-8 px-3 rounded-md bg-[#FFF0E8] hover:bg-[#FFE4D6] text-[#F45B25] text-xs font-bold transition-all border border-[#F45B25]/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            style={{ boxShadow: 'none' }}
                            title="Calibrate resume keywords to match a target job"
                        >
                            <Sliders size={13} className="stroke-[2.5]" />
                            <span>Tailor to Job</span>
                        </button>
                        <button 
                            onClick={() => setShowUploadModal(true)}
                            className="h-8 px-3 rounded-md bg-[#FAF8F5] hover:bg-neutral-200 text-[#171717] text-xs font-bold transition-all border border-[#D8D4CC] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            style={{ boxShadow: 'none' }}
                        >
                            <Upload size={13} />
                            <span>Scan Existing</span>
                        </button>
                        <button 
                            onClick={handleSync}
                            disabled={syncing}
                            className={`h-8 px-3.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap border-none shadow-sm ${
                                saved
                                    ? 'bg-[#F45B25] text-white shadow-[#F45B25]/30'
                                    : isDirty
                                    ? 'bg-[#F45B25] hover:bg-[#d94815] text-white shadow-[#F45B25]/25 animate-pulse'
                                    : 'bg-[#171717] hover:bg-[#F45B25] text-white'
                            }`}
                            style={{ boxShadow: 'none' }}
                            title="Save & sync resume changes to account profile (Ctrl+S)"
                        >
                            {syncing ? (
                                <>
                                    <RefreshCw size={13} className="animate-spin" />
                                    <span>Syncing...</span>
                                </>
                            ) : saved ? (
                                <>
                                    <Check size={13} />
                                    <span>Saved!</span>
                                </>
                            ) : (
                                <>
                                    <Save size={13} />
                                    <span>{isDirty ? 'Save Resume' : 'Sync Profile'}</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Sleek Integrated Section Tabs Bar */}
                    <div className="border-b border-[#D8D4CC] bg-[#FAF8F5] px-4 flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {[
                            { id: 'personal', name: 'Personal', icon: User },
                            { id: 'summary', name: 'Summary', icon: AlignLeft },
                            { id: 'experience', name: 'Experience', icon: Briefcase },
                            { id: 'education', name: 'Education', icon: GraduationCap },
                            { id: 'skills', name: 'Skills', icon: Layers },
                            { id: 'expertise', name: 'Expertise', icon: Compass },
                            { id: 'certifications', name: 'Certifications', icon: ShieldCheck },
                            { id: 'languages', name: 'Languages', icon: Globe }
                        ].map(tab => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative py-2.5 px-3 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border-none bg-transparent select-none shrink-0 ${
                                        isActive 
                                            ? 'text-[#171717]' 
                                            : 'text-[#8A8580] hover:text-[#171717]'
                                    }`}
                                >
                                    <Icon size={13} className={isActive ? 'text-[#F45B25]' : 'text-[#8A8580]'} />
                                    <span>{tab.name}</span>
                                    {isActive && (
                                        <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#F45B25] rounded-t-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Scrollable Tab Content Container */}
                    <div className="flex-1 overflow-y-auto py-4 px-6 space-y-5 resume-creator-form-scroll">
                        {activeTab === 'personal' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="resume-input-label">Full Name</label>
                                        <input 
                                            type="text"
                                            value={personalInfo.name}
                                            onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                                            className="resume-input-field"
                                            placeholder="Jane Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="resume-input-label">Job Title / Headline</label>
                                        <input 
                                            type="text"
                                            value={personalInfo.title}
                                            onChange={(e) => setPersonalInfo({ ...personalInfo, title: e.target.value })}
                                            className="resume-input-field"
                                            placeholder="Senior Frontend Developer"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="resume-input-label">Email Address</label>
                                        <input 
                                            type="email"
                                            value={personalInfo.email}
                                            onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                                            className="resume-input-field"
                                            placeholder="jane.doe@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="resume-input-label">Phone Number</label>
                                        <input 
                                            type="text"
                                            value={personalInfo.phone}
                                            onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                                            className="resume-input-field"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="resume-input-label">Location</label>
                                        <input 
                                            type="text"
                                            value={personalInfo.location}
                                            onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                                            className="resume-input-field"
                                            placeholder="New York, USA"
                                        />
                                    </div>
                                    <div>
                                        <label className="resume-input-label">Personal Website</label>
                                        <input 
                                            type="text"
                                            value={personalInfo.website}
                                            onChange={(e) => setPersonalInfo({ ...personalInfo, website: e.target.value })}
                                            className="resume-input-field"
                                            placeholder="janedoe.dev"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="resume-input-label">Address</label>
                                        <input 
                                            type="text"
                                            value={personalInfo.address || ''}
                                            onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                                            className="resume-input-field"
                                            placeholder="e.g. Flat 3B, 12 Park Street, Kolkata"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="resume-input-label">Date of Birth</label>
                                            <input 
                                                type="text"
                                                value={personalInfo.dob || ''}
                                                onChange={(e) => setPersonalInfo({ ...personalInfo, dob: e.target.value })}
                                                className="resume-input-field"
                                                placeholder="DD/MM/YYYY"
                                            />
                                        </div>
                                        <div>
                                            <label className="resume-input-label">Country</label>
                                            <input 
                                                type="text"
                                                value={personalInfo.country || ''}
                                                onChange={(e) => setPersonalInfo({ ...personalInfo, country: e.target.value })}
                                                className="resume-input-field"
                                                placeholder="e.g. India"
                                            />
                                        </div>
                                        <div>
                                            <label className="resume-input-label">Nationality</label>
                                            <input 
                                                type="text"
                                                value={personalInfo.nationality || ''}
                                                onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })}
                                                className="resume-input-field"
                                                placeholder="e.g. Indian"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="resume-input-label">LinkedIn Link</label>
                                        <input 
                                            type="text"
                                            value={personalInfo.linkedin}
                                            onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                                            className="resume-input-field"
                                            placeholder="linkedin.com/in/janedoe"
                                        />
                                    </div>
                                    <div>
                                        <label className="resume-input-label">GitHub Profile Link</label>
                                        <input 
                                            type="text"
                                            value={personalInfo.github}
                                            onChange={(e) => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                                            className="resume-input-field"
                                            placeholder="github.com/janedoe"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'summary' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="resume-input-label">Professional Summary</label>
                                    <textarea
                                        value={summary}
                                        onChange={(e) => setSummary(e.target.value)}
                                        rows={6}
                                        className="resume-input-field resize-none"
                                        placeholder="Brief narrative highlighting your key expertise, projects, and unique value proposition..."
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => triggerEnhanceBullet(null, null, summary)}
                                        disabled={!summary.trim()}
                                        className="h-8 px-3 rounded-md bg-[#FAF8F5] hover:bg-[#171717] text-[#171717] hover:text-white text-xs font-bold border border-[#D8D4CC] hover:border-[#171717] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
                                    >
                                        <Sliders size={13} className="text-[#F45B25] group-hover:text-white transition-colors" />
                                        <span>Enhance Summary with AI</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'experience' && (
                            <div className="space-y-6">
                                <AnimatePresence initial={false}>
                                    {experience.map((exp, expIdx) => (
                                        <motion.div
                                            key={expIdx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="resume-entry-card space-y-4"
                                        >
                                            <button
                                                onClick={() => removeExperience(expIdx)}
                                                className="resume-btn-icon absolute top-4 right-4"
                                            >
                                                <Trash2 size={13} />
                                            </button>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="resume-input-label">Company Name</label>
                                                    <input 
                                                        type="text"
                                                        value={exp.company}
                                                        onChange={(e) => updateExperienceField(expIdx, 'company', e.target.value)}
                                                        className="resume-input-field"
                                                        placeholder="Google"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="resume-input-label">Job Title</label>
                                                    <input 
                                                        type="text"
                                                        value={exp.role}
                                                        onChange={(e) => updateExperienceField(expIdx, 'role', e.target.value)}
                                                        className="resume-input-field"
                                                        placeholder="Software Engineer"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="resume-input-label">Employment Dates / Duration</label>
                                                <input 
                                                    type="text"
                                                    value={exp.dates}
                                                    onChange={(e) => updateExperienceField(expIdx, 'dates', e.target.value)}
                                                    className="resume-input-field"
                                                    placeholder="June 2022 – Present"
                                                />
                                            </div>

                                            {/* Experience Bullet Points */}
                                            <div className="space-y-3">
                                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Bullet Points (Action / Impact)</label>
                                                {exp.bullets.map((bullet, bulletIdx) => (
                                                    <div key={bulletIdx} className="flex gap-2.5 items-start group">
                                                        <textarea
                                                            value={bullet}
                                                            onChange={(e) => updateBulletText(expIdx, bulletIdx, e.target.value)}
                                                            rows={2}
                                                            className="flex-1 resume-input-field text-xs py-2 resize-none"
                                                            placeholder="Describe an accomplishment..."
                                                        />
                                                        <div className="flex flex-col gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => triggerEnhanceBullet(expIdx, bulletIdx, bullet)}
                                                                className="resume-bullet-ai-btn"
                                                                title="Enhance with AI"
                                                            >
                                                                <span className="text-[9px] font-black tracking-tight leading-none select-none">AI</span>
                                                            </button>
                                                            <button
                                                                onClick={() => removeBullet(expIdx, bulletIdx)}
                                                                className="resume-bullet-delete-btn"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => addBullet(expIdx)}
                                                    className="resume-add-bullet-btn"
                                                >
                                                    <Plus size={12} />
                                                    <span>Add Bullet Point</span>
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
                                                <span className="text-[11px] text-neutral-500 font-normal">
                                                    Need quantifiable impact metrics?
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartChatbot(expIdx)}
                                                    className="h-7 px-2.5 rounded-md bg-[#FAF8F5] hover:bg-[#FFF0E8] text-[#171717] hover:text-[#F45B25] text-[11px] font-bold border border-[#D8D4CC] hover:border-[#F45B25]/40 transition-all flex items-center gap-1.5 cursor-pointer"
                                                    style={{ boxShadow: 'none' }}
                                                >
                                                    <MessageSquare size={12} className="text-[#F45B25]" />
                                                    <span>Brainstorm Impact Bullets</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                <button
                                    onClick={addExperience}
                                    className="resume-add-entry-btn"
                                >
                                    <Plus size={14} />
                                    <span>Add Experience Entry</span>
                                </button>
                            </div>
                        )}

                        {activeTab === 'education' && (
                            <div className="space-y-6">
                                <AnimatePresence initial={false}>
                                    {education.map((edu, eduIdx) => (
                                        <motion.div
                                            key={eduIdx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="resume-entry-card space-y-4"
                                        >
                                            <button
                                                onClick={() => removeEducation(eduIdx)}
                                                className="resume-btn-icon absolute top-4 right-4"
                                            >
                                                <Trash2 size={13} />
                                            </button>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="resume-input-label">School / University</label>
                                                    <input 
                                                        type="text"
                                                        value={edu.school}
                                                        onChange={(e) => updateEducationField(eduIdx, 'school', e.target.value)}
                                                        className="resume-input-field"
                                                        placeholder="Stanford University"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="resume-input-label">Degree & Major</label>
                                                    <input 
                                                        type="text"
                                                        value={edu.degree}
                                                        onChange={(e) => updateEducationField(eduIdx, 'degree', e.target.value)}
                                                        className="resume-input-field"
                                                        placeholder="B.S. Computer Science"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="resume-input-label">Dates / Graduation Year</label>
                                                <input 
                                                    type="text"
                                                    value={edu.dates}
                                                    onChange={(e) => updateEducationField(eduIdx, 'dates', e.target.value)}
                                                    className="resume-input-field"
                                                    placeholder="2018 – 2022"
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                <button
                                    onClick={addEducation}
                                    className="resume-add-entry-btn"
                                >
                                    <Plus size={14} />
                                    <span>Add Education Entry</span>
                                </button>
                            </div>
                        )}

                        {activeTab === 'skills' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="resume-input-label">Skills Inventory</label>
                                    <form onSubmit={addSkill} className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={skillInput}
                                            onChange={(e) => setSkillInput(e.target.value)}
                                            className="flex-1 resume-input-field"
                                            placeholder="Type skill (e.g. React, SQL, Maestro) and press Enter"
                                        />
                                        <button
                                            type="submit"
                                            className="resume-skill-add-btn"
                                        >
                                            <Plus size={15} />
                                        </button>
                                    </form>
                                </div>

                                {/* Skills Tags List */}
                                <div className="flex flex-wrap gap-2">
                                    {skills.map(skill => (
                                        <div key={skill} className="resume-skill-tag">
                                            <span>{skill}</span>
                                            <button 
                                                onClick={() => removeSkill(skill)}
                                                className="text-zinc-550 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer"
                                            >
                                                <X size={11} />
                                            </button>
                                        </div>
                                    ))}
                                    {skills.length === 0 && (
                                        <p className="text-xs text-zinc-550 italic">No skills added yet.</p>
                                    )}
                                </div>

                                {/* AI Skills Suggestion Section */}
                                <div className="border-t border-neutral-100 pt-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider font-mono">AI Recommended Skills</h3>
                                        <button
                                            onClick={handleSuggestSkills}
                                            disabled={loadingSkills}
                                            className="resume-suggest-skills-btn"
                                        >
                                            <RefreshCw size={13} className={loadingSkills ? 'animate-spin' : ''} />
                                            <span>Suggest Skills</span>
                                        </button>
                                    </div>

                                    {suggestedSkills.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-[#F7F5F2] border border-neutral-200/60">
                                            {suggestedSkills.map(skill => {
                                                const isAdded = skills.includes(skill);
                                                return (
                                                    <button
                                                        key={skill}
                                                        onClick={() => !isAdded && setSkills([...skills, skill])}
                                                        disabled={isAdded}
                                                        className={`resume-rec-skill-btn ${isAdded ? 'added' : ''}`}
                                                    >
                                                        {isAdded ? <Check size={10} className="text-emerald-500" /> : <Plus size={10} />}
                                                        <span>{skill}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'expertise' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="resume-input-label">Areas of Expertise</label>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const val = e.target.elements.expertiseInput.value.trim();
                                        if (val && !expertise.includes(val)) {
                                            setExpertise([...expertise, val]);
                                        }
                                        e.target.elements.expertiseInput.value = '';
                                    }} className="flex gap-2">
                                        <input 
                                            name="expertiseInput"
                                            type="text"
                                            className="flex-1 resume-input-field"
                                            placeholder="e.g. Supply Chain Optimization"
                                        />
                                        <button
                                            type="submit"
                                            className="resume-skill-add-btn"
                                        >
                                            <Plus size={15} />
                                        </button>
                                    </form>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {expertise.map(item => (
                                        <div key={item} className="resume-skill-tag">
                                            <span>{item}</span>
                                            <button 
                                                onClick={() => setExpertise(expertise.filter(x => x !== item))}
                                                className="text-zinc-550 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer"
                                            >
                                                <X size={11} />
                                            </button>
                                        </div>
                                    ))}
                                    {expertise.length === 0 && (
                                        <p className="text-xs text-zinc-550 italic">No expertise areas added yet.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'certifications' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="resume-input-label">Certifications</label>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const val = e.target.elements.certInput.value.trim();
                                        if (val && !certifications.includes(val)) {
                                            setCertifications([...certifications, val]);
                                        }
                                        e.target.elements.certInput.value = '';
                                    }} className="flex gap-2">
                                        <input 
                                            name="certInput"
                                            type="text"
                                            className="flex-1 resume-input-field"
                                            placeholder="e.g. AWS Certified Solutions Architect"
                                        />
                                        <button
                                            type="submit"
                                            className="resume-skill-add-btn"
                                        >
                                            <Plus size={15} />
                                        </button>
                                    </form>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {certifications.map(item => (
                                        <div key={item} className="resume-skill-tag">
                                            <span>{item}</span>
                                            <button 
                                                onClick={() => setCertifications(certifications.filter(x => x !== item))}
                                                className="text-zinc-550 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer"
                                            >
                                                <X size={11} />
                                            </button>
                                        </div>
                                    ))}
                                    {certifications.length === 0 && (
                                        <p className="text-xs text-zinc-550 italic">No certifications added yet.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'languages' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="resume-input-label">Languages</label>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const val = e.target.elements.langInput.value.trim();
                                        if (val && !languages.includes(val)) {
                                            setLanguages([...languages, val]);
                                        }
                                        e.target.elements.langInput.value = '';
                                    }} className="flex gap-2">
                                        <input 
                                            name="langInput"
                                            type="text"
                                            className="flex-1 resume-input-field"
                                            placeholder="e.g. English (Fluent)"
                                        />
                                        <button
                                            type="submit"
                                            className="resume-skill-add-btn"
                                        >
                                            <Plus size={15} />
                                        </button>
                                    </form>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {languages.map(item => (
                                        <div key={item} className="resume-skill-tag">
                                            <span>{item}</span>
                                            <button 
                                                onClick={() => setLanguages(languages.filter(x => x !== item))}
                                                className="text-zinc-550 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer"
                                            >
                                                <X size={11} />
                                            </button>
                                        </div>
                                    ))}
                                    {languages.length === 0 && (
                                        <p className="text-xs text-zinc-550 italic">No languages added yet.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Interactive ATS Live Preview */}
                <div className="resume-creator-preview-panel">
                    {/* Template Selection & ATS Checker Row */}
                    <div className="w-full flex items-center justify-between gap-4 mb-6 shrink-0">
                        <div className="resume-template-selector">
                            {['modern', 'classic', 'elegant'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTemplate(t)}
                                    className={`resume-template-btn ${template === t ? 'active' : ''}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowATSPanel(!showATSPanel)}
                                className={`ats-checker-btn ${showATSPanel ? 'active' : 'inactive'}`}
                            >
                                <span className="ats-icon-wrapper">
                                    <FileCheck size={14} className="stroke-[2.5]" />
                                </span>
                                <span>ATS Checker</span>
                            </button>
                            <button 
                                onClick={handleDownloadPDF}
                                className="h-8 px-3.5 rounded-md bg-[#171717] hover:bg-[#F45B25] text-white text-xs font-bold transition-all border border-[#171717] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                                style={{ boxShadow: 'none' }}
                            >
                                <Download size={13} />
                                <span>Download PDF</span>
                            </button>
                        </div>
                    </div>

                    {/* ATS Score & Keyword Matcher Section */}
                    <AnimatePresence>
                        {showATSPanel && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="w-full max-w-[760px] ats-panel-container p-5 relative z-10 mb-6 shrink-0"
                            >
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#F45B25] shrink-0" />
                                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#171717] m-0">
                                            ATS OPTIMIZATION & KEYWORD SCANNER
                                        </h3>
                                    </div>
                                    <button 
                                        onClick={() => setShowATSPanel(false)}
                                        className="ats-panel-close-btn cursor-pointer"
                                        title="Close ATS Diagnostics"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 relative z-10">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Target Job Title</label>
                                            <input
                                                type="text"
                                                value={atsTargetTitle}
                                                onChange={(e) => setAtsTargetTitle(e.target.value)}
                                                className="ats-panel-input"
                                                placeholder="e.g. Senior Product Designer"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Target Job Description</label>
                                            <textarea
                                                value={atsTargetJD}
                                                onChange={(e) => setAtsTargetJD(e.target.value)}
                                                rows={4}
                                                className="ats-panel-textarea"
                                                placeholder="Paste the job description here..."
                                            />
                                        </div>
                                        <button
                                            onClick={handleATSCheck}
                                            disabled={loadingATS}
                                            className="ats-panel-calc-btn cursor-pointer"
                                        >
                                            {loadingATS ? (
                                                <>
                                                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-[2px] border-white border-t-transparent" />
                                                    <span>Calculating Score...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FileCheck size={13} />
                                                    <span>Calculate ATS Score</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* ATS Scorer Feedback results */}
                                    <div className="ats-panel-results-box">
                                        {atsResult ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between border-b border-[#D8D4CC] pb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="ats-result-score-ring">
                                                            <span>{atsResult.atsScore}</span>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider">Score Verdict</div>
                                                            <div className={`ats-verdict-badge ${
                                                                atsResult.atsScore >= 80 
                                                                    ? 'ats-verdict-high' 
                                                                    : atsResult.atsScore >= 60 
                                                                        ? 'ats-verdict-medium' 
                                                                        : 'ats-verdict-poor'
                                                            }`}>
                                                                {atsResult.atsScore >= 80 ? 'Highly Optimized' : atsResult.atsScore >= 60 ? 'Requires Optimization' : 'Poor Match'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <p className="text-xs text-neutral-700 leading-relaxed italic m-0">"{atsResult.verdict}"</p>

                                                {/* Keyword tags found/missing */}
                                                <div className="space-y-2 pt-1">
                                                    <div>
                                                        <div className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider mb-1">Found Keywords ({atsResult.keywords?.found?.length || 0})</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {atsResult.keywords?.found?.slice(0, 5).map(k => (
                                                                <span key={k} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">{k}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-mono font-bold text-[#F45B25] uppercase tracking-wider mb-1">Missing Keywords ({atsResult.keywords?.missing?.length || 0})</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {atsResult.keywords?.missing?.slice(0, 8).map(k => {
                                                                const isAdded = skills.includes(k);
                                                                return (
                                                                    <button 
                                                                        key={k} 
                                                                        onClick={() => {
                                                                            if (!isAdded) {
                                                                                setSkills([...skills, k]);
                                                                            }
                                                                        }}
                                                                        disabled={isAdded}
                                                                        title={isAdded ? "Added to skills" : "Click to add to skills"}
                                                                        className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold transition-all ${
                                                                            isAdded 
                                                                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 opacity-75' 
                                                                                : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300 cursor-pointer'
                                                                        }`}
                                                                    >
                                                                        {isAdded ? <Check size={8} /> : <Plus size={8} />}
                                                                        <span>{k}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="ats-scanner-placeholder">
                                                <div className="w-12 h-12 rounded-md bg-[#FFF0E8] border border-[#F45B25]/20 flex items-center justify-center text-[#F45B25] mb-3">
                                                    <FileCheck size={24} className="stroke-[2]" />
                                                </div>
                                                <span className="text-xs font-bold text-[#171717]">No score computed yet</span>
                                                <span className="text-[11px] text-neutral-600 max-w-[220px] mt-1 leading-relaxed">Enter job details and hit calculate to run optimization diagnostics</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {atsResult?.improvements && atsResult.improvements.length > 0 && (
                                    <div className="border-t border-neutral-100 pt-3 mt-3 relative z-10">
                                        <div className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider mb-2">Recommended Fixes</div>
                                        <div className="space-y-1.5 pr-2 ats-fixes-list">
                                            {atsResult.improvements.map((imp, idx) => (
                                                <div key={idx} className="flex gap-2 items-start text-xs bg-white p-2.5 rounded-md border border-[#D8D4CC]">
                                                    {imp.priority === 'high' ? (
                                                        <AlertCircle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                                                    ) : (
                                                        <CheckCircle2 size={13} className="text-[#F45B25] shrink-0 mt-0.5" />
                                                    )}
                                                    <span className="text-neutral-800 leading-relaxed font-medium">{imp.tip || imp}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Paper Preview Card */}
                    <div className={`resume-paper-preview template-${template}`} style={getTemplateStyle()}>
                        {/* Header depending on Template */}
                        {template === 'classic' ? (
                            <div className="text-center space-y-2">
                                <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>
                                    {personalInfo.name || 'Your Name'}
                                </h1>
                                {personalInfo.title && (
                                    <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#1d1d1f' }}>
                                        {personalInfo.title}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-zinc-600">
                                    {renderContactItems('•')}
                                </div>
                                {renderPersonalDetails(false)}
                                <div className="h-0.5 w-full my-2" style={{ backgroundColor: '#2163CA' }} />
                            </div>
                        ) : template === 'elegant' ? (
                            <div className="space-y-1 border-l-2 pl-4" style={{ borderLeft: '2px solid #2163CA' }}>
                                <h1 style={{ fontSize: '24px', letterSpacing: '0.04em', fontWeight: '600', textTransform: 'uppercase' }}>
                                    {personalInfo.name || 'Your Name'}
                                </h1>
                                {personalInfo.title && (
                                    <p style={{ fontSize: '11px', letterSpacing: '0.1em', fontWeight: 'bold', textTransform: 'uppercase', color: '#1d1d1f' }}>
                                        {personalInfo.title}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-550 pt-1">
                                    {renderContactItems('|')}
                                </div>
                                {renderPersonalDetails(false)}
                            </div>
                        ) : (
                            <div className="text-left space-y-1">
                                <h1 style={{ fontSize: '26px', fontWeight: '600', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                    {personalInfo.name || 'Your Name'}
                                </h1>
                                {personalInfo.title && (
                                    <p className="text-sm font-bold tracking-wider uppercase" style={{ color: '#1d1d1f' }}>
                                        {personalInfo.title}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mt-2">
                                    {renderContactItems('|')}
                                </div>
                                {renderPersonalDetails(false)}
                            </div>
                        )}

                        {/* Summary */}
                        {summary && (
                            <div className="space-y-1">
                                <h2>Professional Summary</h2>
                                <p className="text-justify leading-relaxed">{summary}</p>
                            </div>
                        )}

                        {/* Work Experience */}
                        {experience.length > 0 && (
                            <div className="space-y-4">
                                <h2>Work Experience</h2>
                                {experience.map((exp, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between items-baseline">
                                            <h3 className="font-bold text-black" style={{ fontSize: template === 'classic' ? '14px' : '13px' }}>
                                                {exp.company || 'Company Name'}
                                            </h3>
                                            <span className="text-[11px] text-zinc-500 font-semibold">{exp.dates || 'Dates'}</span>
                                        </div>
                                        <p className="text-xs font-semibold text-zinc-800">{exp.role || 'Job Title'}</p>
                                        <ul className="list-disc pl-5 space-y-1 mt-1.5">
                                            {exp.bullets.map((bullet, bulletIdx) => (
                                                <li key={bulletIdx} className="text-zinc-700 leading-relaxed text-justify">{bullet}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Education */}
                        {education.length > 0 && (
                            <div className="space-y-3">
                                <h2>Education</h2>
                                {education.map((edu, idx) => (
                                    <div key={idx} className="flex justify-between items-baseline">
                                        <div>
                                            <h3 className="font-bold text-black" style={{ fontSize: template === 'classic' ? '14px' : '13px' }}>
                                                {edu.school || 'Institution'}
                                            </h3>
                                            <p className="text-xs text-zinc-700">{edu.degree || 'Degree & Major'}</p>
                                        </div>
                                        <span className="text-[11px] text-zinc-500 font-semibold">{edu.dates || 'Graduation Date'}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Areas of Expertise */}
                        {expertise.length > 0 && (
                            <div className="space-y-1">
                                <h2>Areas of Expertise</h2>
                                <p className="text-zinc-750 leading-relaxed">
                                    {expertise.join(' • ')}
                                </p>
                            </div>
                        )}

                        {/* Skills */}
                        {skills.length > 0 && (
                            <div className="space-y-1">
                                <h2>Skills</h2>
                                <p className="text-zinc-750">
                                    <span className="font-bold text-black">Technical Skills:</span> {skills.join(', ')}
                                </p>
                            </div>
                        )}

                        {/* Certifications */}
                        {certifications.length > 0 && (
                            <div className="space-y-1">
                                <h2>Certifications</h2>
                                <ul className="list-disc pl-5 space-y-0.5 mt-1">
                                    {certifications.map((cert, idx) => (
                                        <li key={idx} className="text-zinc-700 leading-relaxed">{cert}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Languages */}
                        {languages.length > 0 && (
                            <div className="space-y-1">
                                <h2>Languages</h2>
                                <p className="text-zinc-750">
                                    {languages.join(', ')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Print Only Container (Mirrors the exact ATS paper preview styling for the browser printer) */}
                <div className="print-only-resume-container hidden">
                    <div className={`resume-paper-preview template-${template}`} style={getTemplateStyle()}>
                        {/* Header depending on Template */}
                        {template === 'classic' ? (
                            <div className="text-center space-y-2">
                                <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>
                                    {personalInfo.name || 'Your Name'}
                                </h1>
                                {personalInfo.title && (
                                    <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#000000' }}>
                                        {personalInfo.title}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
                                    {renderContactItems('•')}
                                </div>
                                {renderPersonalDetails(true)}
                                <div className="h-0.5 w-full my-2" style={{ backgroundColor: '#2163CA' }} />
                            </div>
                        ) : template === 'elegant' ? (
                            <div className="space-y-1 border-l-2 pl-4" style={{ borderLeft: '2px solid #2163CA' }}>
                                <h1 style={{ fontSize: '24px', letterSpacing: '0.04em', fontWeight: '600', textTransform: 'uppercase' }}>
                                    {personalInfo.name || 'Your Name'}
                                </h1>
                                {personalInfo.title && (
                                    <p style={{ fontSize: '11px', letterSpacing: '0.1em', fontWeight: 'bold', textTransform: 'uppercase', color: '#000000' }}>
                                        {personalInfo.title}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs pt-1">
                                    {renderContactItems('|')}
                                </div>
                                {renderPersonalDetails(true)}
                            </div>
                        ) : (
                            <div className="text-left space-y-1">
                                <h1 style={{ fontSize: '26px', fontWeight: '600', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                    {personalInfo.name || 'Your Name'}
                                </h1>
                                {personalInfo.title && (
                                    <p className="text-sm font-bold tracking-wider uppercase" style={{ color: '#000000' }}>
                                        {personalInfo.title}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-2">
                                    {renderContactItems('|')}
                                </div>
                                {renderPersonalDetails(true)}
                            </div>
                        )}

                        {/* Summary */}
                        {summary && (
                            <div className="space-y-1">
                                <h2>Professional Summary</h2>
                                <p className="text-justify leading-relaxed">{summary}</p>
                            </div>
                        )}

                        {/* Work Experience */}
                        {experience.length > 0 && (
                            <div className="space-y-4">
                                <h2>Work Experience</h2>
                                {experience.map((exp, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between items-baseline">
                                            <h3 className="font-bold" style={{ fontSize: template === 'classic' ? '14px' : '13px' }}>
                                                {exp.company || 'Company Name'}
                                            </h3>
                                            <span className="text-[11px] font-semibold">{exp.dates || 'Dates'}</span>
                                        </div>
                                        <p className="text-xs font-semibold">{exp.role || 'Job Title'}</p>
                                        <ul className="list-disc pl-5 space-y-1 mt-1.5">
                                            {exp.bullets.map((bullet, bulletIdx) => (
                                                <li key={bulletIdx} className="leading-relaxed text-justify">{bullet}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Education */}
                        {education.length > 0 && (
                            <div className="space-y-3">
                                <h2>Education</h2>
                                {education.map((edu, idx) => (
                                    <div key={idx} className="flex justify-between items-baseline">
                                        <div>
                                            <h3 className="font-bold" style={{ fontSize: template === 'classic' ? '14px' : '13px' }}>
                                                {edu.school || 'Institution'}
                                            </h3>
                                            <p className="text-xs">{edu.degree || 'Degree & Major'}</p>
                                        </div>
                                        <span className="text-[11px] font-semibold">{edu.dates || 'Graduation Date'}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Areas of Expertise */}
                        {expertise.length > 0 && (
                            <div className="space-y-1">
                                <h2>Areas of Expertise</h2>
                                <p className="leading-relaxed">
                                    {expertise.join(' • ')}
                                </p>
                            </div>
                        )}

                        {/* Skills */}
                        {skills.length > 0 && (
                            <div className="space-y-1">
                                <h2>Skills</h2>
                                <p>
                                    <span className="font-bold">Technical Skills:</span> {skills.join(', ')}
                                </p>
                            </div>
                        )}

                        {/* Certifications */}
                        {certifications.length > 0 && (
                            <div className="space-y-1">
                                <h2>Certifications</h2>
                                <ul className="list-disc pl-5 space-y-0.5 mt-1">
                                    {certifications.map((cert, idx) => (
                                        <li key={idx} className="leading-relaxed">{cert}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Languages */}
                        {languages.length > 0 && (
                            <div className="space-y-1">
                                <h2>Languages</h2>
                                <p>
                                    {languages.join(', ')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

            {/* AI Bullet Enhancer Modal Overlay */}
            {showEnhancer && (
                <div className="resume-modal-overlay" data-lenis-prevent>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="resume-modal-content max-w-[560px]"
                        data-lenis-prevent
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-[#FAF8F5]">
                            <div>
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25] block mb-0.5">
                                    [ Bullet Point Enhancer ]
                                </span>
                                <h3 className="text-base font-bold text-[#171717] tracking-tight leading-none m-0">
                                    Action & Metrics Optimization
                                </h3>
                            </div>
                            <button 
                                onClick={() => setShowEnhancer(false)}
                                className="resume-modal-close-btn"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="resume-modal-body p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider mb-2">Original Bullet Point</label>
                                <textarea
                                    value={enhancerData.originalText}
                                    onChange={(e) => setEnhancerData({ ...enhancerData, originalText: e.target.value })}
                                    rows={3}
                                    className="resume-modal-textarea"
                                    placeholder="Enter your rough bullet point or project milestone..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider mb-2">Target Role Context</label>
                                    <input
                                        type="text"
                                        value={enhancerData.roleContext}
                                        onChange={(e) => setEnhancerData({ ...enhancerData, roleContext: e.target.value })}
                                        className="resume-input-field"
                                        placeholder="e.g. Senior Frontend Dev"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider mb-2">Action Verb To Lead With</label>
                                    <input
                                        type="text"
                                        value={enhancerData.actionVerb}
                                        onChange={(e) => setEnhancerData({ ...enhancerData, actionVerb: e.target.value })}
                                        className="resume-input-field"
                                        placeholder="e.g. Spearheaded"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleEnhanceBullet}
                                    disabled={enhancerData.loading || !enhancerData.originalText.trim()}
                                    className="resume-modal-action-btn"
                                >
                                    {enhancerData.loading ? (
                                        <>
                                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-[2px] border-white border-t-transparent" />
                                            <span>Generating Variations...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Generate Enhanced Variations</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Variations list */}
                            {enhancerData.variations.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-neutral-100">
                                    <label className="block text-[10px] font-mono font-bold text-[#F45B25] uppercase tracking-wider">Select Enhanced Variation</label>
                                    <div className="space-y-2">
                                        {enhancerData.variations.map((variant, i) => (
                                            <button
                                                key={i}
                                                onClick={() => applyVariation(variant)}
                                                className="resume-modal-variation-btn group"
                                            >
                                                <span className="flex-1 pr-4 leading-relaxed font-medium">{variant}</span>
                                                <ArrowRight size={13} className="shrink-0 text-neutral-400 group-hover:text-[#F45B25] transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Scan Resume Upload Modal */}
            {showUploadModal && (
                <div className="resume-modal-overlay" data-lenis-prevent>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="resume-modal-content max-w-[460px]"
                        data-lenis-prevent
                    >
                        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-[#FAF8F5]">
                            <div>
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25] block mb-0.5">
                                    [ Resume Parser ]
                                </span>
                                <h3 className="text-base font-bold text-[#171717] tracking-tight leading-none m-0">
                                    Scan Existing Resume
                                </h3>
                            </div>
                            <button 
                                onClick={() => setShowUploadModal(false)}
                                className="resume-modal-close-btn"
                                disabled={uploading}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="resume-modal-body p-6 space-y-4">
                            <p className="text-xs text-neutral-600 leading-relaxed m-0">
                                Upload your existing PDF or TXT resume. We will scan its text contents and leverage AI to break down and map details directly into the workspace layout.
                            </p>
                            
                            <div className="resume-modal-dropzone">
                                <input 
                                    type="file" 
                                    accept=".pdf,.txt" 
                                    onChange={handleFileScan}
                                    disabled={uploading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <FileText size={32} className="dropzone-icon" />
                                <span className="text-xs font-semibold text-[#171717]">Click to browse or drop file here</span>
                                <span className="text-[10px] text-neutral-500 mt-1.5">PDF or TXT (Max 5MB)</span>
                            </div>

                            {uploadStatus && (
                                <div className="flex items-center gap-2 text-xs text-[#F45B25] font-medium bg-[#FFF0E8] p-3 rounded-md border border-[#F45B25]/20">
                                    <RefreshCw className="animate-spin" size={14} />
                                    <span>{uploadStatus}</span>
                                </div>
                            )}

                            {uploadError && (
                                <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-md border border-rose-200 text-center font-medium">
                                    {uploadError}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Tailor Resume Modal */}
            {showTailorModal && (
                <div className="resume-modal-overlay" data-lenis-prevent>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="resume-modal-content max-w-[480px]"
                        data-lenis-prevent
                    >
                        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-[#FAF8F5]">
                            <div>
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25] block mb-0.5">
                                    [ Target Alignment ]
                                </span>
                                <h3 className="text-base font-bold text-[#171717] tracking-tight leading-none m-0">
                                    Tailor Resume to Job Posting
                                </h3>
                            </div>
                            <button 
                                onClick={() => setShowTailorModal(false)}
                                className="resume-modal-close-btn"
                                disabled={tailoring}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="resume-modal-body p-6 space-y-4">
                            <p className="text-xs text-neutral-600 leading-relaxed m-0">
                                Paste the target job description. Our AI will automatically rewrite your professional summary, tailor your experience achievements using job-specific keywords, and suggest highly relevant skills.
                            </p>
                            
                            <div>
                                <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider mb-2">Job Description</label>
                                <textarea
                                    value={tailorJD}
                                    onChange={(e) => setTailorJD(e.target.value)}
                                    rows={8}
                                    className="resume-modal-textarea"
                                    placeholder="Paste full job description listing duties, requirements, and responsibilities..."
                                    disabled={tailoring}
                                />
                            </div>

                            {tailoring ? (
                                <div className="flex items-center gap-2.5 text-xs text-[#F45B25] font-medium bg-[#FFF0E8] p-3.5 rounded-md border border-[#F45B25]/20">
                                    <RefreshCw className="animate-spin" size={14} />
                                    <span>Orchestrating AI resume tailoring... mapping coordinates and metrics...</span>
                                </div>
                            ) : (
                                <button
                                    onClick={handleTailorResume}
                                    disabled={!tailorJD.trim()}
                                    className="resume-modal-action-btn"
                                >
                                    <Sliders size={13} />
                                    <span>Analyze & Tailor Resume</span>
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* AI Achievement Finder Chatbot Drawer */}
            {showChatbot && (
                <div className="resume-drawer-overlay">
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="resume-drawer-content"
                    >
                        {/* Chat Header */}
                        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 bg-[#FAF8F5] relative z-10">
                            <div>
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25] block mb-0.5">
                                    [ Bullet Architect ]
                                </span>
                                <h3 className="text-xs font-mono font-bold text-[#171717] uppercase tracking-wider m-0">
                                    {selectedExpIndexForChat !== null && experience[selectedExpIndexForChat]
                                        ? `${experience[selectedExpIndexForChat].role} · ${experience[selectedExpIndexForChat].company || 'Experience'}`
                                        : 'Experience Accomplishment Copilot'}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setShowChatbot(false)}
                                className="resume-modal-close-btn"
                                title="Close Drawer"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 relative z-10 chatbot-chat-scroll bg-white">
                            {chatbotHistory.map((msg, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] text-xs leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'chat-bubble-user'
                                            : 'chat-bubble-ai'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {chatbotLoading && (
                                <div className="flex justify-start">
                                    <div className="chat-bubble-ai px-4 py-3 flex items-center gap-1.5 shrink-0 bg-[#FAF8F5] border border-[#D8D4CC]">
                                        <span className="h-1.5 w-1.5 bg-[#F45B25] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="h-1.5 w-1.5 bg-[#F45B25] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="h-1.5 w-1.5 bg-[#F45B25] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={chatbotEndRef} />
                        </div>

                        {/* Suggested Bullet Display Card */}
                        {chatbotSuggestedBullet && (
                            <div className="chat-drawer-suggestion-card space-y-2.5 relative z-10">
                                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#F45B25] uppercase tracking-wider">
                                    <Sparkle size={11} />
                                    <span>Formulated XYZ Bullet Point</span>
                                </div>
                                <div className="text-xs text-[#171717] bg-white border border-[#F45B25]/25 p-3 rounded-md leading-relaxed italic font-medium">
                                    "{chatbotSuggestedBullet}"
                                </div>
                                <button
                                    onClick={handleApplyChatbotBullet}
                                    className="chat-drawer-apply-btn cursor-pointer"
                                >
                                    <Check size={13} />
                                    <span>Apply to Experience</span>
                                </button>
                            </div>
                        )}

                        {/* Chat Input */}
                        <form onSubmit={handleSendChatbotMessage} className="p-4 border-t border-neutral-100 flex gap-2 relative z-10 bg-[#FAF8F5]">
                            <input
                                type="text"
                                value={chatbotInput}
                                onChange={(e) => setChatbotInput(e.target.value)}
                                className="chat-drawer-input"
                                placeholder={chatbotSuggestedBullet ? "Keep chatting to refine..." : "Type project details here..."}
                                disabled={chatbotLoading}
                            />
                            <button
                                type="submit"
                                className="chat-drawer-send-btn cursor-pointer"
                                disabled={!chatbotInput.trim() || chatbotLoading}
                            >
                                <Send size={14} />
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}

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
                                You have unsaved resume changes
                            </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden sm:inline-block text-[10.5px] text-white/50 font-mono">
                                Ctrl+S
                            </span>
                            <button
                                type="button"
                                onClick={handleSync}
                                disabled={syncing}
                                className="h-8 px-4 rounded-xl bg-[#F45B25] hover:bg-[#d94815] text-white text-xs font-bold border-none transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-[#F45B25]/30"
                            >
                                {syncing ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
