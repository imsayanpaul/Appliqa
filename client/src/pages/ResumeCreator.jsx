import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { certificationLabel, newId } from '../lib/resumeProfile';
import { readProfiles, writeProfiles, makeProfile, uniqueName, stripCollection, dataFromAnalysis, formatUpdated, MAX_PROFILES, MAX_NAME_LENGTH } from '../lib/resumeProfiles';
import { normalizeDesign, readPhoto } from '../lib/resumeDesign';
import ResumeDocument from '../components/resume/ResumeDocument';
import ResumePreview from '../components/resume/ResumePreview';
import { analyzeResumeText, expandAnalysis } from '../lib/resumeAnalysis';
import { extractPdfText } from '../lib/pdfText';
import DesignPanel from '../components/resume/DesignPanel';
import SectionsPanel from '../components/resume/SectionsPanel';
import LatexSheet from '../components/resume/LatexSheet';
import { latexToResume } from '../lib/latexImport';
import { ProjectsEditor, AchievementsEditor } from '../components/resume/ProjectsEditor';
import { 
    User, Briefcase, GraduationCap, Compass, AlignLeft, Layers, ShieldCheck, Globe,
    Sparkles, Sparkle, Download, Save, Upload, X, 
    Plus, Trash2, Check, ArrowRight, RefreshCw,
    MessageSquare, Send, Wand2, Gauge, Activity, AlertCircle, CheckCircle2,
    Sliders, Monitor, FileText, FileCheck, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
    enhanceResumeBullet, suggestResumeSkills, createOrUpdateUser, incrementStat,
    tailorResume, getAchievementFinderChat, getATSScore
} from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// "Fit to 1 page": each level only ever tightens a setting, never loosens it.
// Spacing goes first, then line height and margins, then text size.
const FIT_LEVELS = [
    { sectionGap: 10, blockGap: 6, titleGap: 4, itemGap: 1.5 },
    { lineHeight: 1.25, marginY: 0.4, marginX: 0.5 },
    { sectionGap: 8, blockGap: 4, titleGap: 3, itemGap: 1 },
    { bodySize: 9.5, headingSize: 10, sectionSize: 11, lineHeight: 1.2 },
    { marginY: 0.35, marginX: 0.45, nameSize: 20, photoSize: 70 },
    { bodySize: 9, headingSize: 9.5, sectionSize: 10.5, sectionGap: 6, blockGap: 3, itemGap: 0.5, titleGap: 2, lineHeight: 1.15 },
];
const A4_HEIGHT_PX = (297 * 96) / 25.4;

export default function ResumeCreator({ user, resumeData, onResumeAnalyzed, onUpdateUser }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const collection = readProfiles(user?.builderData);
    const [activeResumeId, setActiveResumeId] = useState(() => searchParams.get('resume') || null);
    const activeResume = collection.profiles.find((p) => p.id === activeResumeId)
        || collection.profiles.find((p) => p.id === collection.primaryId)
        || null;
    const activeBuilderData = activeResume ? activeResume.data : null;
    const [saveMenuOpen, setSaveMenuOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const [confirmReplaceId, setConfirmReplaceId] = useState(null);
    const saveMenuRef = useRef(null);
    const [notice, setNotice] = useState('');
    const [tailorError, setTailorError] = useState('');
    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(''), 8000);
        return () => clearTimeout(t);
    }, [notice]);
    useEffect(() => {
        if (!saveMenuOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') setSaveMenuOpen(false); };
        const onClick = (e) => { if (saveMenuRef.current && !saveMenuRef.current.contains(e.target)) setSaveMenuOpen(false); };
        window.addEventListener('keydown', onKey);
        window.addEventListener('mousedown', onClick);
        return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick); };
    }, [saveMenuOpen]);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // Current Active Edit Tab
    const [activeTab, setActiveTab] = useState('personal');
    const [editorMode, setEditorMode] = useState('content'); // content | design

    useEffect(() => {
        tabsRef.current?.querySelector(`[data-tab="${activeTab}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }, [activeTab]);

    // Section tab row: wheel scrolls sideways, arrows appear when tabs overflow
    const tabsRef = useRef(null);
    const [tabScroll, setTabScroll] = useState({ left: false, right: false });
    const scrollTabs = (dir) => tabsRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });
    useEffect(() => {
        const el = tabsRef.current;
        if (!el) return;
        const update = () => setTabScroll({
            left: el.scrollLeft > 2,
            right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
        });
        const onWheel = (e) => {
            if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };
        update();
        el.addEventListener('scroll', update, { passive: true });
        el.addEventListener('wheel', onWheel, { passive: false });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', update);
            el.removeEventListener('wheel', onWheel);
            ro.disconnect();
        };
    }, [editorMode, isMobile]);
    // Look and layout (template, colour, sizes, section order) and extra content
    const [design, setDesign] = useState(() => normalizeDesign(null));
    const [customSections, setCustomSections] = useState([]);
    const [photo, setPhoto] = useState('');
    // Edited LaTeX for this resume: { code, base } or null when it's just generated
    const [latexDraft, setLatexDraft] = useState(null);
    const [photoError, setPhotoError] = useState('');
    // Ref keeps the newest custom sections for updates queued in the same event
    const customRef = useRef([]);
    customRef.current = customSections;
    const designRef = useRef(design);
    designRef.current = design;
    const fitUndoRef = useRef(null);
    const [fitting, setFitting] = useState(false);
    const [canUndoFit, setCanUndoFit] = useState(false);

    // Pages the preview will print to (same estimate the preview shows)
    const printedPages = () => {
        const doc = document.querySelector('.resume-creator-preview-panel .rd-screen');
        if (!doc) return 1;
        const margin = designRef.current.marginY * 96 * 2;
        return Math.max(1, Math.ceil((doc.offsetHeight - margin - 2) / (A4_HEIGHT_PX - margin)));
    };

    const fitToOnePage = async () => {
        if (fitting) return;
        if (printedPages() <= 1) { setNotice('It already fits on one page.'); return; }
        fitUndoRef.current = designRef.current;
        setFitting(true);
        try {
            for (const level of FIT_LEVELS) {
                const current = designRef.current;
                const patch = Object.fromEntries(Object.entries(level).map(([k, v]) => [k, Math.min(current[k], v)]));
                updateDesign(patch);
                await new Promise((r) => setTimeout(r, 120)); // let the preview re-render before measuring
                if (printedPages() <= 1) {
                    setCanUndoFit(true);
                    setNotice('Fitted on one page by tightening the spacing and sizes. Check it reads well, or undo.');
                    return;
                }
            }
            setCanUndoFit(true);
            setNotice('Still more than one page at the tightest settings. Shorten a few bullets or hide a section, then try again.');
        } finally {
            setFitting(false);
        }
    };

    const undoFit = () => {
        if (fitUndoRef.current) setDesign(fitUndoRef.current);
        fitUndoRef.current = null;
        setCanUndoFit(false);
    };

    const updateDesign = (patch) => setDesign((d) => normalizeDesign({ ...d, ...patch }, customRef.current));
    const updateCustomSections = (next) => {
        customRef.current = next;
        setCustomSections(next);
        setDesign((d) => normalizeDesign(d, next));
    };

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
    const [projects, setProjects] = useState([]);
    const [achievements, setAchievements] = useState([]);

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
    const serializeResumeState = (pInfo, exp, edu, sk, expList, certs, langs, summ, look) => {
        return JSON.stringify({
            personalInfo: pInfo,
            experience: exp,
            education: edu,
            skills: sk,
            expertise: expList,
            certifications: certs,
            languages: langs,
            summary: summ,
            look
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
            { design, customSections, photo, projects, achievements, latexDraft }
        );

        if (currentSnapshot !== initialSnapshotRef.current) {
            setIsDirty(true);
            setSaved(false);
        } else {
            setIsDirty(false);
        }
    }, [personalInfo, experience, education, skills, expertise, certifications, languages, summary, design, customSections, photo, projects, achievements, latexDraft]);

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
    }, [personalInfo, experience, education, skills, expertise, certifications, languages, summary, design, customSections, photo, projects, achievements, latexDraft, user]);

    // Advanced Premium Features State
    // 1. ATS Score Checker
    const [showATSPanel, setShowATSPanel] = useState(false);
    const [atsTargetJD, setAtsTargetJD] = useState('');
    const [atsTargetTitle, setAtsTargetTitle] = useState('');
    const [atsResult, setAtsResult] = useState(null);
    const [loadingATS, setLoadingATS] = useState(false);

    // 2. Tailor Mode
    const [showTailorModal, setShowTailorModal] = useState(false);
    const [showLatex, setShowLatex] = useState(false);
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

    // Escape closes the builder sheets (not while they are working)
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            setShowEnhancer(false);
            setShowChatbot(false);
            setShowLatex(false);
            if (!uploading) setShowUploadModal(false);
            if (!tailoring) setShowTailorModal(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [uploading, tailoring]);

    // Initial load tracking refs to prevent redundant resets during editing
    const lastPropResumeDataRef = useRef(null);
    const lastPropBuilderDataRef = useRef(null);
    const hasInitializedRef = useRef(false);

    // Initial load: Import from account if exists
    useEffect(() => {
        // If we have already initialized, we do not want to overwrite local state edits
        if (hasInitializedRef.current) {
            // Exception: if builderData or resumeData was initially null and is now available
            if (activeBuilderData && !lastPropBuilderDataRef.current) {
                loadFromResumeData(activeBuilderData);
                lastPropBuilderDataRef.current = activeBuilderData;
            } else if (resumeData && !lastPropResumeDataRef.current && !activeBuilderData) {
                loadFromResumeData(resumeData);
                lastPropResumeDataRef.current = resumeData;
            }
            return;
        }

        if (activeBuilderData) {
            loadFromResumeData(activeBuilderData);
            lastPropBuilderDataRef.current = activeBuilderData;
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
                { design, customSections, photo, projects, achievements, latexDraft }
            );
            setIsDirty(false);
        }
    }, [resumeData, user]);

    // Load data utility
    const loadFromResumeData = (data, { keepLook = false } = {}) => {
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
                    ...item,
                    company: item.company || '',
                    role: item.role || '',
                    dates: item.dates || '',
                    bullets: Array.isArray(item.bullets) ? item.bullets.filter(b => b && b !== 'Key achievement or responsibility.') : []
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
                    ...item,
                    school: item.school || '',
                    degree: item.degree || '',
                    dates: item.dates || ''
                };
            });
        }
        setEducation(formattedEdu);
        const nextProjects = (Array.isArray(data.projects) ? data.projects : [])
            .filter((p) => p && typeof p === 'object')
            .map((p) => ({ ...p, id: p.id || newId(), tech: Array.isArray(p.tech) ? p.tech : [] }));
        const nextAchievements = (Array.isArray(data.achievements) ? data.achievements : []).filter((a) => typeof a === 'string');
        setProjects(nextProjects);
        setAchievements(nextAchievements);

        // An imported file has no design: keep the current look and photo
        const nextCustom = keepLook ? customSections : (Array.isArray(data.customSections) ? data.customSections : []);
        const nextDesign = keepLook ? design : normalizeDesign(data.design, nextCustom);
        const nextPhoto = keepLook ? photo : (typeof data.photo === 'string' ? data.photo : '');
        setCustomSections(nextCustom);
        setDesign(nextDesign);
        setPhoto(nextPhoto);
        const nextDraft = keepLook ? latexDraft : (data.latexDraft?.code ? data.latexDraft : null);
        setLatexDraft(nextDraft);

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
            { design: nextDesign, customSections: nextCustom, photo: nextPhoto, projects: nextProjects, achievements: nextAchievements, latexDraft: nextDraft }
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
            bullets: []
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
            bullets: ['']
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
        setTailorError('');
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
                setNotice('Tailored to the job. Review the changes, then use Save as → Save as new resume to keep your original.');
            }
        } catch (err) {
            console.error(err);
            setTailorError(err.response?.data?.error || 'Tailoring didn’t work this time. Please try again.');
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
        setNotice('Bullet added to your experience.');
    };

    const switchResume = (id) => {
        if (id === activeResume?.id) return;
        if (isDirty && !window.confirm('You have unsaved changes in this resume. Switch anyway and lose them?')) return;
        const next = collection.profiles.find((p) => p.id === id);
        if (!next) return;
        setActiveResumeId(id);
        lastPropBuilderDataRef.current = next.data;
        loadFromResumeData(next.data);
        setIsDirty(false);
    };

    // Save to the open resume, a new resume, or over another one
    const handleSync = async (target = { mode: 'current' }) => {
        if (target?.nativeEvent) target = { mode: 'current' }; // called from onClick
        setSyncing(true);
        const resumeData_ = {
            ...stripCollection(activeBuilderData || {}),
            projects,
            achievements,
            profileUpdatedAt: new Date().toISOString(),
            fileName: activeBuilderData?.fileName || 'Appliqa_AI_Resume.pdf',
            skills,
            expertise,
            certifications,
            languages,
            experience,
            education,
            summary,
            personalInfo,
            design,
            customSections,
            photo,
            latexDraft,
            rawText: `${personalInfo.name}\n${personalInfo.title}\n${summary}\n${skills.join(', ')}\nExpertise: ${expertise.join(', ')}\nCertifications: ${certifications.map(certificationLabel).join(', ')}\nLanguages: ${languages.join(', ')}`,
            suggestedRoles: personalInfo.title ? [personalInfo.title] : [],
            experienceLevel: user?.resumeData?.experienceLevel || 'mid'
        };

        let list = collection.profiles;
        let primaryId = collection.primaryId;
        let savedId;
        const now = new Date().toISOString();
        if (target.mode === 'new') {
            if (list.length >= MAX_PROFILES) {
                setSyncing(false);
                alert(`You can keep up to ${MAX_PROFILES} resumes. Delete one on your profile first.`);
                return;
            }
            const created = makeProfile(target.name || `${activeResume?.name || 'Resume'} copy`, resumeData_, list);
            list = [...list, created];
            savedId = created.id;
        } else {
            savedId = target.mode === 'replace' ? target.id : activeResume?.id;
            if (!savedId) {
                const first = { ...makeProfile('Main resume', resumeData_), id: 'main' };
                list = [first];
                savedId = first.id;
            } else {
                list = list.map((p) => (p.id === savedId ? { ...p, data: resumeData_, updatedAt: now } : p));
            }
        }
        if (!primaryId) primaryId = savedId;
        const payload = writeProfiles(user?.builderData, list, primaryId);
        const savingPrimary = savedId === primaryId;

        try {
            // Only the primary resume updates account details (name, links, target role)
            const res = await createOrUpdateUser(savingPrimary ? {
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
            } : { builderData: payload });
            if (res.data?.user) {
                if (onUpdateUser) {
                    onUpdateUser(res.data.user);
                }
                setActiveResumeId(savedId);
                lastPropBuilderDataRef.current = res.data.user.builderData;
                setSaveMenuOpen(false);
                setSaveAsName('');
                setConfirmReplaceId(null);
                initialSnapshotRef.current = serializeResumeState(
                    personalInfo,
                    experience,
                    education,
                    skills,
                    expertise,
                    certifications,
                    languages,
                    summary,
                    { design, customSections, photo, projects, achievements, latexDraft }
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
        // Keeps line breaks so the sections can be found
        let fullText = await extractPdfText(pdf);

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

            const data = expandAnalysis(await analyzeResumeText(text, { onStatus: setUploadStatus }));

            loadFromResumeData(data, { keepLook: true });
            initialSnapshotRef.current = '__imported__'; // imported content is unsaved
            setShowUploadModal(false);
            setNotice('Resume imported. Check each section, then save.');
        } catch (err) {
            console.error(err);
            setUploadError(`Parsing failed: ${err.message || 'Make sure it is a readable PDF/TXT'}`);
        } finally {
            setUploading(false);
            setUploadStatus('');
        }
    };

    // What the resume document renders (preview and print)
    const docData = { personalInfo, summary, experience, education, skills, expertise, certifications, languages, projects, achievements, customSections, photo };
    const sectionCounts = {
        summary: summary?.trim() ? 1 : 0, experience: experience.length, projects: projects.length, education: education.length,
        skills: skills.length, expertise: expertise.length, certifications: certifications.length, achievements: achievements.length, languages: languages.length,
    };

    // Read edited LaTeX back into the builder. Returns an error message or null.
    const applyLatex = (code) => {
        try {
            const { data, designPatch, sectionCount } = latexToResume(code, { design, customSections, personalInfo });
            loadFromResumeData(data, { keepLook: true });
            updateCustomSections(data.customSections);
            updateDesign(designPatch);
            setLatexDraft(null);
            initialSnapshotRef.current = '__imported__';
            setNotice(`Applied your LaTeX: ${sectionCount} section${sectionCount === 1 ? '' : 's'} read into the builder. Review them, then save.`);
            return null;
        } catch (err) {
            console.error('LaTeX apply failed:', err);
            return err.message || 'That code could not be read.';
        }
    };

    // Copy another saved resume (or the last uploaded file) into the editor.
    // The current design and photo stay; nothing is saved until Save.
    const importFrom = (data, label) => {
        if (!data) return;
        if (isDirty && !window.confirm(`Replace what's in the editor with “${label}”? Your unsaved changes will be lost.`)) return;
        loadFromResumeData(data, { keepLook: true });
        if (Array.isArray(data.customSections) && data.customSections.length) updateCustomSections(data.customSections);
        initialSnapshotRef.current = '__imported__';
        setShowUploadModal(false);
        setNotice(`Copied from “${label}”. Check each section, then save.`);
    };
    const importSources = [
        ...collection.profiles
            .filter((p) => p.id !== activeResume?.id)
            .map((p) => ({
                key: p.id,
                label: p.name,
                meta: [p.id === collection.primaryId ? 'primary' : '', formatUpdated(p.updatedAt), `${p.data?.skills?.length || 0} skills`].filter(Boolean).join(' · '),
                load: () => importFrom(p.data, p.name),
            })),
        ...(resumeData?.fileName ? [{
            key: 'upload',
            label: resumeData.fileName,
            meta: 'last uploaded file',
            load: () => importFrom(dataFromAnalysis(resumeData), resumeData.fileName),
        }] : []),
    ];

    const handlePhoto = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setPhotoError('');
        try {
            setPhoto(await readPhoto(file));
            updateDesign({ photoShow: true });
        } catch (err) {
            setPhotoError(err.message);
        }
    };

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
                        border: '1px solid rgba(202, 60, 10, 0.3)',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#CA3C0A',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: '20px'
                    }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: '#CA3C0A'
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
                        border: '1px solid rgba(202, 60, 10, 0.25)',
                        margin: '0 auto 20px auto'
                    }}>
                        <Monitor size={28} className="text-[#CA3C0A]" />
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
                                e.currentTarget.style.background = '#CA3C0A';
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
    return (
        <div className="resume-creator-outer-wrapper">
            {/* Main Full-Page Studio Container */}
            <div className="resume-creator-container">
                {/* Left Workspace Panel: Form Editor */}
                <div className="resume-creator-editor-panel">
                    {/* Which resume is open, and save-as */}
                    <div ref={saveMenuRef} className="shrink-0 relative flex items-stretch border-0 border-b border-[#D8D4CC] bg-white">
                        <label htmlFor="rc-resume" className="ds-mono ds-mono-muted self-center pl-5 pr-3 shrink-0">resume</label>
                        <select
                            id="rc-resume"
                            value={activeResume?.id || ''}
                            onChange={(e) => switchResume(e.target.value)}
                            disabled={!collection.profiles.length || syncing}
                            className="ds-select flex-1 min-w-0 !h-12 !border-0 !border-l !border-[#D8D4CC] !text-[15px] !font-semibold"
                        >
                            {collection.profiles.length ? collection.profiles.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}{p.id === collection.primaryId ? '  ·  primary' : ''}</option>
                            )) : <option value="">Main resume (not saved yet)</option>}
                        </select>
                        <button
                            type="button"
                            onClick={() => { setSaveMenuOpen((o) => !o); setConfirmReplaceId(null); }}
                            aria-haspopup="true"
                            aria-expanded={saveMenuOpen}
                            className="shrink-0 h-12 px-4 inline-flex items-center gap-2 text-[14px] font-medium text-[#171717] bg-transparent hover:bg-[#F7F5F2] border-0 border-l border-[#D8D4CC] cursor-pointer"
                        >
                            Save as <ChevronDown size={15} className={saveMenuOpen ? 'rotate-180' : ''} />
                        </button>

                        {saveMenuOpen && (
                            <div className="absolute right-0 top-full z-40 w-[min(340px,100%)] bg-white border border-[#171717] shadow-xl" role="dialog" aria-label="Save as">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSync({ mode: 'new', name: saveAsName }); }}
                                    className="p-4 border-0 border-b border-[#D8D4CC]"
                                >
                                    <label htmlFor="rc-save-as" className="ds-label">save as a new resume</label>
                                    <input
                                        id="rc-save-as"
                                        type="text"
                                        autoFocus
                                        maxLength={MAX_NAME_LENGTH}
                                        value={saveAsName}
                                        onChange={(e) => setSaveAsName(e.target.value)}
                                        placeholder={uniqueName(`${activeResume?.name || 'Main resume'} copy`, collection.profiles)}
                                        className="resume-input-field"
                                    />
                                    <button
                                        type="submit"
                                        disabled={syncing || collection.profiles.length >= MAX_PROFILES}
                                        className="ds-btn ds-btn-accent w-full mt-3 !min-h-[44px] !text-[14px]"
                                    >
                                        {syncing ? 'Saving…' : 'Save as new resume'} <Plus size={15} />
                                    </button>
                                    {collection.profiles.length >= MAX_PROFILES && (
                                        <p className="ds-mono ds-mono-muted m-0 mt-2">limit of {MAX_PROFILES} resumes reached · delete one on your profile</p>
                                    )}
                                </form>
                                {collection.profiles.filter((p) => p.id !== activeResume?.id).length > 0 && (
                                    <div className="py-2">
                                        <p className="ds-mono ds-mono-muted m-0 px-4 py-2">or overwrite another resume</p>
                                        {collection.profiles.filter((p) => p.id !== activeResume?.id).map((p) => {
                                            const armed = confirmReplaceId === p.id;
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    disabled={syncing}
                                                    onClick={() => (armed ? handleSync({ mode: 'replace', id: p.id }) : setConfirmReplaceId(p.id))}
                                                    className={`w-full px-4 py-2.5 text-left text-[14px] border-0 cursor-pointer flex items-center justify-between gap-3 ${armed ? 'bg-[#FFF0E8] text-[#CA3C0A] font-semibold' : 'bg-transparent text-[#171717] hover:bg-[#F7F5F2]'}`}
                                                >
                                                    <span className="truncate">{armed ? `Click again to overwrite “${p.name}”` : p.name}</span>
                                                    {p.id === collection.primaryId && !armed && <span className="ds-mono text-[#CA3C0A] shrink-0">primary</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions strip */}
                    <div className="shrink-0 grid grid-cols-3 border-0 border-b border-[#D8D4CC] bg-[#F7F5F2]">
                        <button
                            type="button"
                            onClick={() => setShowTailorModal(true)}
                            className="ds-btn !min-h-14 !px-4 sm:!px-5 !text-[14px] bg-transparent text-[#171717] hover:bg-white border-0 border-r border-[#D8D4CC]"
                            title="Rewrite your resume to match a job description"
                        >
                            Tailor to a job <Sliders size={15} className="shrink-0 text-[#CA3C0A]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowUploadModal(true)}
                            className="ds-btn !min-h-14 !px-4 sm:!px-5 !text-[14px] bg-transparent text-[#171717] hover:bg-white border-0 border-r border-[#D8D4CC]"
                        >
                            Import resume <Upload size={15} className="shrink-0" />
                        </button>
                        <button
                            type="button"
                            onClick={handleSync}
                            disabled={syncing}
                            className={`ds-btn !min-h-14 !px-4 sm:!px-5 !text-[14px] ${isDirty || saved ? 'ds-btn-accent' : 'ds-btn-ink'}`}
                            title="Save to your profile (Ctrl+S)"
                        >
                            {syncing ? 'Saving…' : saved ? 'Saved' : isDirty ? 'Save changes' : 'Save'}
                            {syncing ? <RefreshCw size={15} className="animate-spin shrink-0" /> : saved ? <Check size={15} className="shrink-0" /> : <Save size={15} className="shrink-0" />}
                        </button>
                    </div>

                    {notice && (
                        <div role="status" className="shrink-0 flex items-start justify-between gap-3 px-5 py-3 bg-[#FFF0E8] border-0 border-b border-[#D8D4CC] text-[14px] text-[#171717]">
                            <span className="flex items-start gap-2"><span className="ds-square mt-1.5" />{notice}</span>
                            <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="shrink-0 bg-transparent border-0 p-0 cursor-pointer text-[#6F6A65] hover:text-[#171717]"><X size={16} /></button>
                        </div>
                    )}

                    {/* Content or design */}
                    <div role="tablist" aria-label="Builder mode" className="shrink-0 grid grid-cols-2 border-0 border-b border-[#D8D4CC] bg-white">
                        {[
                            { id: 'content', label: 'Content', hint: 'what it says' },
                            { id: 'design', label: 'Design', hint: 'how it looks' },
                        ].map((m) => {
                            const on = editorMode === m.id;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={on}
                                    onClick={() => setEditorMode(m.id)}
                                    className={`relative h-12 px-5 flex items-center justify-between gap-3 text-[15px] font-semibold border-0 border-l first:border-l-0 border-[#D8D4CC] cursor-pointer ${on ? 'bg-[#171717] text-white' : 'bg-white text-[#171717] hover:bg-[#F7F5F2]'}`}
                                >
                                    {m.label}
                                    <span className={`ds-mono ${on ? '!text-white/60' : 'ds-mono-muted'}`}>{m.hint}</span>
                                </button>
                            );
                        })}
                    </div>

                    {editorMode === 'design' ? (
                        <div className="flex-1 overflow-y-auto resume-creator-form-scroll" data-lenis-prevent>
                            <DesignPanel design={design} onChange={updateDesign} hasPhoto={Boolean(photo)} />
                        </div>
                    ) : (<>
                    {/* Section tabs */}
                    {/* One row of tabs: the mouse wheel scrolls it sideways, arrows show when there is more */}
                    <div className="shrink-0 relative border-0 border-b border-[#D8D4CC] bg-[#EFECE6]">
                    <div ref={tabsRef} role="tablist" aria-label="Resume sections" style={{ scrollbarWidth: 'none', scrollPaddingInline: 44 }} className="flex overflow-x-auto overflow-y-hidden">
                        {[
                            { id: 'sections', name: 'Sections' },
                            { id: 'personal', name: 'Personal' },
                            { id: 'summary', name: 'Summary' },
                            { id: 'experience', name: 'Experience' },
                            { id: 'projects', name: 'Projects' },
                            { id: 'education', name: 'Education' },
                            { id: 'skills', name: 'Skills' },
                            { id: 'expertise', name: 'Expertise' },
                            { id: 'certifications', name: 'Certifications' },
                            { id: 'achievements', name: 'Achievements' },
                            { id: 'languages', name: 'Languages' }
                        ].map((tab, i) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setActiveTab(tab.id)}
                                    data-tab={tab.id}
                                    className={`relative h-12 px-4 shrink-0 flex items-center gap-2 text-[14px] font-medium cursor-pointer border-0 border-r border-[#D8D4CC] whitespace-nowrap ${
                                        isActive ? 'bg-white text-[#171717]' : 'bg-transparent text-[#4A4540] hover:bg-white/60'
                                    }`}
                                >
                                    <span className={`ds-mono ${isActive ? 'text-[#CA3C0A]' : 'ds-mono-muted'}`}>{String(i + 1).padStart(2, '0')}</span>
                                    {tab.name}
                                    {isActive && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#CA3C0A]" />}
                                </button>
                            );
                        })}
                    </div>
                    {tabScroll.left && (
                        <button type="button" onClick={() => scrollTabs(-1)} aria-label="Show earlier sections" className="absolute left-0 top-0 bottom-0 w-10 inline-flex items-center justify-center border-0 border-r border-[#D8D4CC] bg-[#EFECE6] hover:bg-white cursor-pointer text-[#171717] shadow-[8px_0_12px_-6px_rgba(23,23,23,0.18)]">
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    {tabScroll.right && (
                        <button type="button" onClick={() => scrollTabs(1)} aria-label="Show more sections" className="absolute right-0 top-0 bottom-0 w-10 inline-flex items-center justify-center border-0 border-l border-[#D8D4CC] bg-[#EFECE6] hover:bg-white cursor-pointer text-[#171717] shadow-[-8px_0_12px_-6px_rgba(23,23,23,0.18)]">
                            <ChevronRight size={16} />
                        </button>
                    )}
                    </div>

                    {/* Scrollable Tab Content Container */}
                    <div className="flex-1 overflow-y-auto py-6 px-6 sm:px-8 space-y-6 resume-creator-form-scroll" data-lenis-prevent>
                        {activeTab === 'sections' && (
                            <SectionsPanel
                                design={design}
                                onDesignChange={updateDesign}
                                customSections={customSections}
                                onCustomChange={updateCustomSections}
                                counts={sectionCounts}
                            />
                        )}

                        {activeTab === 'personal' && (
                            <div className="space-y-3">
                                <div className="flex items-stretch border border-[#D8D4CC] bg-white mb-2">
                                    <div className="w-[84px] h-[84px] shrink-0 border-0 border-r border-[#D8D4CC] bg-[#F7F5F2] flex items-center justify-center overflow-hidden">
                                        {photo
                                            ? <img src={photo} alt="Your resume photo" className="w-full h-full object-cover" />
                                            : <User size={26} className="text-[#B5B0A8]" aria-hidden="true" />}
                                    </div>
                                    <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center">
                                        <p className="m-0 text-[15px] font-semibold text-[#171717]">Photo <span className="ds-mono ds-mono-muted font-normal">optional</span></p>
                                        <p className="m-0 mt-0.5 text-[13px] text-[#6F6A65]">Common in India and Europe; usually left off for US and UK jobs.</p>
                                        {photoError && <p role="alert" className="m-0 mt-1 text-[13px] text-[#B91C1C]">{photoError}</p>}
                                    </div>
                                    <div className="flex flex-col border-0 border-l border-[#D8D4CC] shrink-0">
                                        <label className="flex-1 px-4 inline-flex items-center gap-2 text-[14px] font-medium text-[#171717] cursor-pointer hover:bg-[#F7F5F2]">
                                            <Upload size={14} /> {photo ? 'Replace' : 'Upload'}
                                            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhoto} className="sr-only" />
                                        </label>
                                        {photo && (
                                            <button type="button" onClick={() => setPhoto('')} className="flex-1 px-4 inline-flex items-center gap-2 text-[14px] font-medium text-[#6F6A65] hover:text-[#B91C1C] bg-transparent border-0 border-t border-[#D8D4CC] cursor-pointer hover:bg-[#FEF2F2]">
                                                <Trash2 size={14} /> Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
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
                                        <Sliders size={13} className="text-[#CA3C0A] group-hover:text-white transition-colors" />
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
                                                <label className="resume-input-label">bullet points · start with an action, add a result</label>
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
                                                    className="h-7 px-2.5 rounded-md bg-[#FAF8F5] hover:bg-[#FFF0E8] text-[#171717] hover:text-[#CA3C0A] text-[11px] font-bold border border-[#D8D4CC] hover:border-[#CA3C0A]/40 transition-all flex items-center gap-1.5 cursor-pointer"
                                                    style={{ boxShadow: 'none' }}
                                                >
                                                    <MessageSquare size={12} className="text-[#CA3C0A]" />
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
                                        <h3 className="ds-mono ds-mono-muted m-0">suggested skills</h3>
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

                        {activeTab === 'projects' && (
                            <ProjectsEditor projects={projects} onChange={setProjects} />
                        )}

                        {activeTab === 'achievements' && (
                            <AchievementsEditor achievements={achievements} onChange={setAchievements} />
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
                                        <div key={certificationLabel(item)} className="resume-skill-tag">
                                            <span>{certificationLabel(item)}</span>
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
                    </>)}
                </div>

                {/* Right Panel: Interactive ATS Live Preview */}
                <div className="resume-creator-preview-panel">
                    {/* Template Selection & ATS Checker Row */}
                    <div className="w-full flex items-center justify-between gap-4 mb-6 shrink-0">
                        <button
                            type="button"
                            onClick={() => setEditorMode(editorMode === 'design' ? 'content' : 'design')}
                            className="h-10 px-4 inline-flex items-center gap-2 bg-white border border-[#D8D4CC] hover:border-[#171717] text-[14px] font-medium text-[#171717] cursor-pointer"
                        >
                            <span className="w-3.5 h-3.5 shrink-0" style={{ background: design.accent }} aria-hidden="true" />
                            {editorMode === 'design' ? 'Back to content' : 'Change design'}
                        </button>
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
                                type="button"
                                onClick={() => setShowLatex(true)}
                                className="h-10 px-4 bg-white border border-[#D8D4CC] hover:border-[#171717] text-[14px] font-medium text-[#171717] flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                title="Get your resume as LaTeX code"
                            >
                                <span className="font-mono text-[12px] text-[#CA3C0A]" aria-hidden="true">{'{}'}</span>
                                <span>LaTeX</span>
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="h-10 px-4 bg-[#CA3C0A] hover:bg-[#B73609] text-white text-[14px] font-semibold border-0 flex items-center gap-2 cursor-pointer whitespace-nowrap"
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
                            <motion.section
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                aria-label="ATS check"
                                className="w-full max-w-[760px] relative z-10 mb-6 shrink-0 bg-[#F7F5F2] border border-[#D8D4CC]"
                            >
                                <div className="flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                                    <span className="ds-mono self-center px-5 py-3 flex items-center gap-2"><span className="ds-square" /> ats check</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowATSPanel(false)}
                                        aria-label="Close ATS check"
                                        className="w-12 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 2xl:grid-cols-2">
                                    <div className="p-5 space-y-4 border-0 2xl:border-r border-[#D8D4CC]">
                                        <div>
                                            <label htmlFor="ats-target-title" className="resume-input-label">target job title</label>
                                            <input
                                                id="ats-target-title"
                                                type="text"
                                                value={atsTargetTitle}
                                                onChange={(e) => setAtsTargetTitle(e.target.value)}
                                                className="resume-input-field"
                                                placeholder="e.g. Senior Product Designer"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="ats-target-jd" className="resume-input-label">job description</label>
                                            <textarea
                                                id="ats-target-jd"
                                                value={atsTargetJD}
                                                onChange={(e) => setAtsTargetJD(e.target.value)}
                                                rows={5}
                                                className="resume-input-field resize-none"
                                                placeholder="Paste the job description here…"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleATSCheck}
                                            disabled={loadingATS}
                                            className="ds-btn ds-btn-ink w-full"
                                        >
                                            {loadingATS ? 'Scoring…' : atsResult ? 'Score again' : 'Score my resume'}
                                            {loadingATS ? <RefreshCw size={16} className="animate-spin" /> : <FileCheck size={16} />}
                                        </button>
                                    </div>

                                    <div className="p-5 border-0 border-t 2xl:border-t-0 border-[#D8D4CC] bg-white" aria-live="polite">
                                        {atsResult ? (
                                            <div>
                                                <p className="ds-mono ds-mono-muted m-0 mb-2">score</p>
                                                <p className="m-0 flex items-baseline gap-2">
                                                    <span className="font-[900] leading-none tracking-[-0.04em]" style={{ fontSize: '64px', fontStretch: '125%' }}>{atsResult.atsScore}</span>
                                                    <span className="ds-mono ds-mono-muted">/100</span>
                                                </p>
                                                <p className="ds-mono mt-2 mb-0 flex items-center gap-2">
                                                    <span className="ds-square" />
                                                    {atsResult.atsScore >= 80 ? 'well optimised' : atsResult.atsScore >= 60 ? 'needs some work' : 'weak match'}
                                                </p>
                                                <div className="mt-4 h-1.5 bg-[#EFECE6]">
                                                    <div className="h-full bg-[#CA3C0A] report-bar" style={{ width: `${Math.min(100, Math.max(0, atsResult.atsScore || 0))}%` }} />
                                                </div>
                                                {atsResult.verdict && <p className="m-0 mt-4 text-[15px] leading-relaxed text-[#2A2622]">{atsResult.verdict}</p>}

                                                {atsResult.keywords?.found?.length > 0 && (
                                                    <div className="mt-5">
                                                        <p className="ds-mono ds-mono-muted m-0 mb-2">found · {atsResult.keywords.found.length}</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {atsResult.keywords.found.slice(0, 8).map(k => <span key={k} className="ds-tag">{k}</span>)}
                                                        </div>
                                                    </div>
                                                )}
                                                {atsResult.keywords?.missing?.length > 0 && (
                                                    <div className="mt-4">
                                                        <p className="ds-mono ds-mono-muted m-0 mb-2">missing · click to add to skills</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {atsResult.keywords.missing.slice(0, 10).map(k => {
                                                                const isAdded = skills.includes(k);
                                                                return (
                                                                    <button
                                                                        key={k}
                                                                        type="button"
                                                                        onClick={() => { if (!isAdded) setSkills([...skills, k]); }}
                                                                        disabled={isAdded}
                                                                        aria-label={isAdded ? `${k} added to skills` : `Add ${k} to skills`}
                                                                        className={`ds-tag gap-1.5 ${isAdded ? '!bg-[#171717] !text-white !border-[#171717] cursor-default' : '!border-[#CA3C0A] !text-[#CA3C0A] cursor-pointer hover:!bg-[#FFF0E8]'}`}
                                                                    >
                                                                        {isAdded ? <Check size={11} /> : <Plus size={11} />}
                                                                        {k}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-full min-h-[220px] flex flex-col justify-center">
                                                <p className="ds-mono ds-mono-muted m-0 mb-2">no score yet</p>
                                                <p className="m-0 text-[18px] font-medium tracking-[-0.015em] leading-snug">Paste a job description to see how this resume scores against it.</p>
                                                <p className="m-0 mt-2 text-[14px] text-[#4A4540]">You’ll get a score, the keywords you’re missing, and what to fix.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {atsResult?.improvements?.length > 0 && (
                                    <div className="border-0 border-t border-[#D8D4CC] px-5 py-4">
                                        <p className="ds-mono ds-mono-muted m-0 mb-1">what to fix</p>
                                        <ol className="list-none m-0 p-0">
                                            {atsResult.improvements.map((imp, idx) => {
                                                const isObj = imp && typeof imp === 'object';
                                                const title = isObj ? (imp.issue || imp.tip) : String(imp);
                                                const fix = isObj ? imp.fix : null;
                                                return (
                                                    <li key={idx} className="grid grid-cols-[28px_1fr] gap-2 py-3 border-0 border-t border-[#D8D4CC] first:border-t-0">
                                                        <span className="ds-mono text-[#CA3C0A] pt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                                                        <div>
                                                            <p className="m-0 flex flex-wrap items-baseline gap-x-3">
                                                                <span className="text-[15px] font-semibold text-[#171717]">{title}</span>
                                                                {isObj && imp.priority && (
                                                                    <span className={`ds-mono ${imp.priority === 'high' ? 'text-[#CA3C0A]' : 'ds-mono-muted'}`}>{imp.priority} priority</span>
                                                                )}
                                                            </p>
                                                            {fix && <p className="m-0 mt-1 text-[14px] leading-relaxed text-[#4A4540]">{fix}</p>}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    </div>
                                )}
                            </motion.section>
                        )}
                    </AnimatePresence>

                    {/* A4 preview: same component as the PDF */}
                    <div className="w-full max-w-[820px] shrink-0">
                        <ResumePreview
                            data={docData}
                            design={design}
                            onFit={fitToOnePage}
                            onUndoFit={undoFit}
                            fitting={fitting}
                            canUndoFit={canUndoFit}
                        />
                    </div>
                </div>
            </div>

            {/* Print-only copy: page margins come from the design settings */}
            <div className="print-only-resume-container hidden">
                <style>{`@media print { @page { margin: ${design.marginY}in ${design.marginX}in !important; } }`}</style>
                <ResumeDocument data={docData} design={design} print />
            </div>

            {/* AI Bullet Enhancer Modal Overlay */}
            {showEnhancer && createPortal(
                <div className="modal-overlay" onClick={() => setShowEnhancer(false)} data-lenis-prevent>
                    <div className="modal-content ds-sheet" role="dialog" aria-modal="true" aria-labelledby="enh-title" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
                        <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                            <span className="ds-mono self-center px-6 sm:px-8 truncate">resume builder / improve a bullet</span>
                            <button
                                type="button"
                                onClick={() => setShowEnhancer(false)}
                                aria-label="Close"
                                className="w-14 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-white disabled:opacity-40"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="ds-sheet-body" data-lenis-prevent>
                            <header className="ds-sheet-section !pt-8">
                                <h2 id="enh-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em]">Make this point stronger</h2>
                                <p className="ds-body mt-3 mb-0">Get rewrites that lead with an action and show a result. Pick one to replace your text.</p>
                            </header>
                            <section className="ds-sheet-section">
                                <label htmlFor="enh-original" className="ds-label">your text</label>
                                <textarea
                                    id="enh-original"
                                    value={enhancerData.originalText}
                                    onChange={(e) => setEnhancerData({ ...enhancerData, originalText: e.target.value })}
                                    rows={4}
                                    className="resume-input-field resize-y"
                                    placeholder="e.g. Worked on the payments page"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label htmlFor="enh-role" className="ds-label">for a role like</label>
                                        <input id="enh-role" type="text" value={enhancerData.roleContext} onChange={(e) => setEnhancerData({ ...enhancerData, roleContext: e.target.value })} className="resume-input-field" placeholder="e.g. Frontend developer" />
                                    </div>
                                    <div>
                                        <label htmlFor="enh-verb" className="ds-label">start with (optional)</label>
                                        <input id="enh-verb" type="text" value={enhancerData.actionVerb} onChange={(e) => setEnhancerData({ ...enhancerData, actionVerb: e.target.value })} className="resume-input-field" placeholder="e.g. Built, Led, Reduced" />
                                    </div>
                                </div>
                            </section>
                            {enhancerData.variations.length > 0 && (
                                <section className="ds-sheet-section border-b-0">
                                    <h3 className="ds-mono ds-mono-muted m-0 mb-3">pick one</h3>
                                    <ul className="list-none m-0 p-0 border border-[#D8D4CC] bg-white">
                                        {enhancerData.variations.map((variant, i) => (
                                            <li key={i} className="border-0 border-t border-[#D8D4CC] first:border-t-0">
                                                <button type="button" onClick={() => applyVariation(variant)} className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-4 bg-transparent hover:bg-[#F7F5F2] border-0 cursor-pointer group">
                                                    <span className="flex items-start gap-3 text-[15px] leading-relaxed text-[#171717]">
                                                        <span className="ds-mono text-[#CA3C0A] pt-0.5">0{i + 1}</span>
                                                        {variant}
                                                    </span>
                                                    <span className="ds-mono ds-mono-muted shrink-0 pt-0.5 group-hover:text-[#CA3C0A]">use</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </div>
                        <div className="shrink-0 border-0 border-t border-[#D8D4CC]">
                            <button type="button" onClick={handleEnhanceBullet} disabled={enhancerData.loading || !enhancerData.originalText.trim()} className="ds-btn ds-btn-accent w-full !min-h-[64px] !px-6 sm:!px-8">
                                {enhancerData.loading ? 'Writing…' : enhancerData.variations.length ? 'Write new options' : 'Write stronger options'}
                                {enhancerData.loading ? <RefreshCw size={17} className="animate-spin" /> : <Sparkles size={17} />}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showUploadModal && createPortal(
                <div className="modal-overlay" onClick={() => !uploading && setShowUploadModal(false)} data-lenis-prevent>
                    <div className="modal-content ds-sheet" role="dialog" aria-modal="true" aria-labelledby="scan-title" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
                        <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                            <span className="ds-mono self-center px-6 sm:px-8 truncate">resume builder / import</span>
                            <button
                                type="button"
                                onClick={() => setShowUploadModal(false)}
                                disabled={uploading}
                                aria-label="Close"
                                className="w-14 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-white disabled:opacity-40"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="ds-sheet-body" data-lenis-prevent>
                            <header className="ds-sheet-section !pt-8">
                                <h2 id="scan-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em]">Import an existing resume</h2>
                                <p className="ds-body mt-3 mb-0">We’ll read your file and fill in each section here. You can review everything before saving.</p>
                            </header>
                            <section className="ds-sheet-section">
                                <label className={`relative flex flex-col items-center justify-center text-center gap-2 px-6 py-14 border border-dashed bg-white ${uploading ? 'border-[#CA3C0A] cursor-wait' : 'border-[#8A8580] hover:border-[#171717] cursor-pointer'}`}>
                                    <input
                                        type="file"
                                        accept=".pdf,.txt"
                                        onChange={handleFileScan}
                                        disabled={uploading}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                                        aria-label="Choose a PDF or TXT resume"
                                    />
                                    <span className="w-12 h-12 inline-flex items-center justify-center border border-[#D8D4CC] bg-[#F7F5F2]">
                                        {uploading ? <RefreshCw size={20} className="animate-spin text-[#CA3C0A]" /> : <Upload size={20} />}
                                    </span>
                                    <span className="text-[16px] font-semibold text-[#171717]">{uploading ? (uploadStatus || 'Reading your resume…') : 'Choose a file or drop it here'}</span>
                                    <span className="ds-mono ds-mono-muted">pdf or txt · up to 5 mb</span>
                                </label>
                                {uploadError && <p role="alert" className="m-0 mt-4 text-[15px] text-[#991B1B]">{uploadError}</p>}
                            </section>
                            {importSources.length > 0 && (
                                <section className="ds-sheet-section" aria-labelledby="import-saved-title">
                                    <p id="import-saved-title" className="ds-mono ds-mono-muted m-0 mb-3">or copy from a saved resume</p>
                                    <ul className="list-none m-0 p-0 border border-[#D8D4CC] bg-white">
                                        {importSources.map((src) => (
                                            <li key={src.key} className="border-0 border-t first:border-t-0 border-[#D8D4CC]">
                                                <button
                                                    type="button"
                                                    onClick={src.load}
                                                    disabled={uploading}
                                                    className="group w-full px-4 py-3.5 flex items-center justify-between gap-4 text-left bg-transparent hover:bg-[#F7F5F2] border-0 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                                                >
                                                    <span className="min-w-0 flex items-center gap-3">
                                                        <span className="w-9 h-9 shrink-0 inline-flex items-center justify-center border border-[#D8D4CC] bg-[#F7F5F2]" aria-hidden="true">
                                                            {src.key === 'upload' ? <Upload size={15} /> : <FileText size={15} />}
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="block text-[15px] font-semibold text-[#171717] truncate">{src.label}</span>
                                                            <span className="ds-mono ds-mono-muted block mt-0.5">{src.meta}</span>
                                                        </span>
                                                    </span>
                                                    <span className="shrink-0 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#171717] group-hover:text-[#CA3C0A]">
                                                        Use this <ArrowRight size={15} />
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                            <section className="ds-sheet-section border-b-0">
                                <p className="ds-mono ds-mono-muted m-0 mb-2">good to know</p>
                                <ul className="ds-list">
                                    <li>This replaces what’s in the editor, not your saved resumes. Nothing is saved until you click Save.</li>
                                    <li>Copying from a saved resume keeps your current design and photo.</li>
                                    <li>To keep the current version too, use Save as → Save as new resume after importing.</li>
                                </ul>
                            </section>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showLatex && (
                <LatexSheet
                    data={docData}
                    design={design}
                    draft={latexDraft}
                    onDraftChange={setLatexDraft}
                    onApply={(code) => {
                        const err = applyLatex(code);
                        if (!err) setShowLatex(false);
                        return err;
                    }}
                    onClose={() => setShowLatex(false)}
                />
            )}

            {showTailorModal && createPortal(
                <div className="modal-overlay" onClick={() => !tailoring && setShowTailorModal(false)} data-lenis-prevent>
                    <div className="modal-content ds-sheet" role="dialog" aria-modal="true" aria-labelledby="tailor-title" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
                        <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                            <span className="ds-mono self-center px-6 sm:px-8 truncate">resume builder / tailor</span>
                            <button
                                type="button"
                                onClick={() => setShowTailorModal(false)}
                                disabled={tailoring}
                                aria-label="Close"
                                className="w-14 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-white disabled:opacity-40"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="ds-sheet-body" data-lenis-prevent>
                            <header className="ds-sheet-section !pt-8">
                                <h2 id="tailor-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em]">Tailor this resume to a job</h2>
                                <p className="ds-body mt-3 mb-0">We’ll rewrite your summary and bullet points around the job’s keywords and suggest skills to add.</p>
                            </header>
                            <section className="ds-sheet-section">
                                <label htmlFor="tailor-jd" className="ds-label">job description</label>
                                <textarea
                                    id="tailor-jd"
                                    value={tailorJD}
                                    onChange={(e) => setTailorJD(e.target.value)}
                                    rows={12}
                                    className="resume-input-field resize-y"
                                    placeholder="Paste the full job post: responsibilities, requirements and nice-to-haves."
                                    disabled={tailoring}
                                />
                                <p className="ds-mono ds-mono-muted m-0 mt-2">{tailorJD.trim() ? `${tailorJD.trim().split(/\s+/).length} words` : 'longer posts give better results'}</p>
                                {tailorError && <p role="alert" className="m-0 mt-4 text-[15px] text-[#991B1B]">{tailorError}</p>}
                            </section>
                            <section className="ds-sheet-section border-b-0">
                                <p className="ds-mono ds-mono-muted m-0 mb-2">tip</p>
                                <p className="m-0 text-[15px] leading-relaxed text-[#4A4540]">
                                    Tailoring changes the open resume (“{activeResume?.name || 'Main resume'}”). To keep it as it is, save the result with Save as → Save as new resume, named after the company.
                                </p>
                            </section>
                        </div>
                        <div className="shrink-0 border-0 border-t border-[#D8D4CC]">
                            <button type="button" onClick={handleTailorResume} disabled={tailoring || !tailorJD.trim()} className="ds-btn ds-btn-accent w-full !min-h-[64px] !px-6 sm:!px-8">
                                {tailoring ? 'Tailoring your resume…' : 'Tailor my resume'}
                                {tailoring ? <RefreshCw size={17} className="animate-spin" /> : <Sliders size={17} />}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Bullet-writing chat: a sheet like the other builder tools */}
            {showChatbot && createPortal(
                <div className="modal-overlay" onClick={() => setShowChatbot(false)} data-lenis-prevent>
                    <div className="modal-content ds-sheet" role="dialog" aria-modal="true" aria-labelledby="chat-title" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
                        <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                            <span className="ds-mono self-center px-6 sm:px-8 truncate">resume builder / write a bullet</span>
                            <button type="button" onClick={() => setShowChatbot(false)} aria-label="Close" className="w-14 shrink-0 inline-flex items-center justify-center bg-transparent border-0 border-l border-[#D8D4CC] cursor-pointer text-[#171717] hover:bg-white">
                                <X size={18} />
                            </button>
                        </div>

                        <header className="ds-sheet-section !pt-8 shrink-0">
                            <h2 id="chat-title" className="m-0 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.025em]">Find an achievement</h2>
                            <p className="ds-mono ds-mono-muted mt-3 mb-0 truncate">
                                {selectedExpIndexForChat !== null && experience[selectedExpIndexForChat]
                                    ? [experience[selectedExpIndexForChat].role, experience[selectedExpIndexForChat].company].filter(Boolean).join(' · ').toLowerCase()
                                    : 'answer a few questions and get a bullet point'}
                            </p>
                        </header>

                        <ol className="ds-sheet-body list-none m-0 p-0" aria-live="polite" data-lenis-prevent>
                            {chatbotHistory.map((msg, idx) => (
                                <li key={idx} className={`grid grid-cols-[84px_1fr] gap-4 px-6 sm:px-8 py-5 border-0 border-b border-[#D8D4CC] ${msg.role === 'user' ? 'bg-white' : ''}`}>
                                    <span className={`ds-mono pt-0.5 ${msg.role === 'user' ? 'ds-mono-muted' : 'text-[#CA3C0A]'}`}>{msg.role === 'user' ? 'you' : 'coach'}</span>
                                    <p className="m-0 text-[15px] leading-relaxed text-[#171717] whitespace-pre-wrap">{msg.text}</p>
                                </li>
                            ))}
                            {chatbotLoading && (
                                <li className="grid grid-cols-[84px_1fr] gap-4 px-6 sm:px-8 py-5 border-0 border-b border-[#D8D4CC]">
                                    <span className="ds-mono text-[#CA3C0A]">coach</span>
                                    <span className="ds-mono ds-mono-muted animate-pulse">thinking…</span>
                                </li>
                            )}
                            <li ref={chatbotEndRef} aria-hidden="true" />
                        </ol>

                        {chatbotSuggestedBullet && (
                            <div className="shrink-0 px-6 sm:px-8 py-5 border-0 border-t border-[#D8D4CC] bg-[#FFF0E8]">
                                <p className="ds-mono text-[#CA3C0A] m-0 mb-2 flex items-center gap-2"><span className="ds-square" /> suggested bullet</p>
                                <p className="m-0 text-[16px] leading-relaxed text-[#171717]">{chatbotSuggestedBullet}</p>
                                <button type="button" onClick={handleApplyChatbotBullet} className="ds-btn ds-btn-ink mt-4 !min-h-[44px] !text-[14px]">
                                    Use this bullet <Check size={15} />
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSendChatbotMessage} className="shrink-0 flex items-stretch border-0 border-t border-[#D8D4CC] bg-white focus-within:shadow-[inset_0_2px_0_#CA3C0A]">
                            <label htmlFor="chat-input" className="sr-only">Message</label>
                            <input
                                id="chat-input"
                                type="text"
                                autoComplete="off"
                                value={chatbotInput}
                                onChange={(e) => setChatbotInput(e.target.value)}
                                placeholder={chatbotSuggestedBullet ? 'Add details to refine it…' : 'Describe what you worked on…'}
                                disabled={chatbotLoading}
                                className="flex-1 min-w-0 h-16 px-6 sm:px-8 bg-transparent border-0 outline-none text-[16px] text-[#171717] placeholder:text-[#8A8580] focus-visible:!outline-none"
                            />
                            <button type="submit" disabled={!chatbotInput.trim() || chatbotLoading} className="ds-btn ds-btn-accent !min-h-16 !px-6 shrink-0">
                                Send <Send size={15} />
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
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
                            <span className="w-2.5 h-2.5 rounded-full bg-[#CA3C0A] animate-ping shrink-0" />
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
                                className="h-8 px-4 rounded-xl bg-[#CA3C0A] hover:bg-[#B73609] text-white text-xs font-bold border-none transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-[#CA3C0A]/30"
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
