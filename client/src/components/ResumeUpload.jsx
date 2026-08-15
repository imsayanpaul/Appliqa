import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, X, ArrowUpRight, Copy, Check, Sparkles, ExternalLink, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';
import { analyzeResume, incrementStat } from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Helper: Parse raw experience string into structured object
function parseExperienceItem(str) {
    if (!str) return { title: '', company: '', duration: '' };
    // Pattern 1: "Title at Company (Duration)" or "Title @ Company (Duration)"
    const match1 = str.match(/^(.*?)\s+(?:at|@)\s+(.*?)(?:\s*\((.*?)\))?$/i);
    if (match1) {
        return {
            title: match1[1].trim(),
            company: match1[2].trim(),
            duration: match1[3]?.trim() || ''
        };
    }
    // Pattern 2: "Title (Duration)"
    const match2 = str.match(/^(.*?)(?:\s*\((.*?)\))$/i);
    if (match2) {
        return {
            title: match2[1].trim(),
            company: '',
            duration: match2[2]?.trim() || ''
        };
    }
    return { title: str, company: '', duration: '' };
}

// Helper: Parse raw education string into structured object
function parseEducationItem(str) {
    if (!str) return { degree: '', school: '' };
    const match = str.match(/^(.*?)\s+from\s+(.*)$/i);
    if (match) {
        return { degree: match[1].trim(), school: match[2].trim() };
    }
    return { degree: str, school: '' };
}

function ensureArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return [val];
    return [];
}

function getCleanAnalysis(data) {
    if (!data) return null;
    let base = data;
    if (data.data?.analysis) {
        base = { ...data.data.analysis, ...data };
    } else if (data.analysis) {
        base = { ...data.analysis, ...data };
    }
    return {
        ...base,
        skills: ensureArray(base.skills),
        experience: ensureArray(base.experience),
        education: ensureArray(base.education),
        suggestedRoles: ensureArray(base.suggestedRoles),
        certifications: ensureArray(base.certifications),
        languages: ensureArray(base.languages),
        industries: ensureArray(base.industries)
    };
}

function ResumeUpload({ onResumeAnalyzed, existingData = null, user = null }) {
    const navigate = useNavigate();
    const cleanExisting = getCleanAnalysis(existingData);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [fileName, setFileName] = useState(cleanExisting?.fileName || '');
    const [analysis, setAnalysis] = useState(cleanExisting || null);
    const [error, setError] = useState('');
    const [copiedSummary, setCopiedSummary] = useState(false);
    
    // Staged file states
    const [selectedFile, setSelectedFile] = useState(null);
    const [tempFileName, setTempFileName] = useState('');
    const [tempFileSize, setTempFileSize] = useState('');
    const [statusText, setStatusText] = useState(cleanExisting ? 'Completed' : '');

    // Sync when existingData changes
    useEffect(() => {
        if (existingData) {
            const cleaned = getCleanAnalysis(existingData);
            setAnalysis(cleaned);
            if (cleaned.fileName) setFileName(cleaned.fileName);
            setStatusText('Completed');
        }
    }, [existingData]);

    const extractTextWithOCR = async (pdf) => {
        let ocrText = '';
        const worker = await createWorker('eng');

        for (let i = 1; i <= pdf.numPages; i++) {
            setStatusText(`OCR scan: Page ${i}/${pdf.numPages}...`);
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

        const cleanedText = fullText.trim();

        if (cleanedText.length < 50) {
            console.log('PDF text is empty or image-based, falling back to OCR...');
            return await extractTextWithOCR(pdf);
        }

        return cleanedText;
    };

    const onDrop = useCallback((acceptedFiles) => {
        if (!acceptedFiles || acceptedFiles.length === 0) return;
        const file = acceptedFiles[0];
        
        setError('');
        setSelectedFile(file);
        setTempFileName(file.name);
        
        const sizeInKB = (file.size / 1024).toFixed(1);
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
        setTempFileSize(file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`);
        setStatusText('Ready to analyze');
    }, []);

    const handleClear = (e) => {
        if (e) e.stopPropagation();
        setSelectedFile(null);
        setTempFileName('');
        setTempFileSize('');
        setFileName('');
        setAnalysis(null);
        setError('');
        setStatusText('');
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setError('');
        setStatusText('Reading file...');

        try {
            let extractedText = '';

            if (selectedFile.type === 'application/pdf') {
                setStatusText('Extracting PDF text...');
                extractedText = await extractTextFromPdf(selectedFile);
            } else {
                setStatusText('Reading text file...');
                extractedText = await selectedFile.text();
            }

            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('Could not extract any text from the file. Please ensure it contains readable text.');
            }

            setStatusText('Analyzing with AI...');
            setUploading(false);
            setAnalyzing(true);

            const res = await analyzeResume(extractedText);
            const parsedAnalysis = res?.data?.analysis || res?.data || res || {};
            
            const analysisData = {
                ...parsedAnalysis,
                fileName: selectedFile.name,
                fileSize: tempFileSize,
                rawText: extractedText,
                analyzedAt: new Date().toISOString()
            };

            setAnalysis(analysisData);
            setFileName(selectedFile.name);
            setStatusText('Completed');

            localStorage.setItem('appliqa_resume_analysis', JSON.stringify(analysisData));

            try {
                incrementStat('resumes_parsed');
            } catch (err) {
                console.warn('Failed to increment parsed stat:', err);
            }
            
            if (onResumeAnalyzed) onResumeAnalyzed(analysisData);
        } catch (err) {
            console.error('Resume processing failed:', err);
            setError(`Failed to process resume: ${err.message || 'Unknown error'}`);
            setStatusText('Failed');
        } finally {
            setUploading(false);
            setAnalyzing(false);
        }
    };

    const handleCopySummary = () => {
        if (!analysis?.summary) return;
        navigator.clipboard.writeText(analysis.summary);
        setCopiedSummary(true);
        setTimeout(() => setCopiedSummary(false), 2000);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt']
        },
        maxFiles: 1,
        maxSize: 5 * 1024 * 1024,
        disabled: uploading || analyzing
    });

    const experienceLevel = analysis?.experienceLevel || 'Mid-Level';
    const industries = analysis?.industries || ['Technology & Software'];

    return (
        <div>
            {/* ── Upload Box ── */}
            <div className="w-full max-w-[540px] mx-auto rounded-lg border border-[#D8D4CC] bg-white p-6" style={{ boxShadow: 'none' }}>
                {/* Header */}
                <div className="mb-5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F45B25] block mb-1">
                        RESUME SCANNER
                    </span>
                    <p className="text-xs text-[#66615C]">Upload your resume to extract skills, experience, and get matched career roles.</p>
                </div>

                {/* Dropzone */}
                <div
                    {...getRootProps()}
                    className={`w-full flex flex-col justify-center items-center rounded-md border-2 border-dashed bg-[#FAF8F5] px-6 py-10 transition-all duration-150 cursor-pointer ${isDragActive ? 'border-[#F45B25] bg-[#FFF0E8]' : 'border-[#D8D4CC] hover:border-[#171717] hover:bg-[#F7F5F2]'} ${uploading || analyzing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-11 h-11 rounded-md bg-white border border-[#D8D4CC] flex items-center justify-center text-[#66615C]">
                            <Upload className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[#171717]">
                                Drop your resume here or{' '}
                                <span className="text-[#F45B25] font-bold">browse</span>
                            </p>
                            <p className="text-[11px] text-[#8A8580] mt-1">PDF or TXT · 5 MB max</p>
                        </div>
                    </div>
                </div>

                {/* Staged File Details */}
                {(selectedFile || fileName) && (
                    <div className="relative mt-4 flex items-center gap-3 rounded-md border border-[#D8D4CC] bg-[#FAF8F5] p-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#D8D4CC] bg-white">
                            <FileText className="h-4 w-4 text-[#171717]" aria-hidden="true" />
                        </span>
                        <div className="flex-1 min-w-0 pr-6">
                            <p className="text-sm font-bold text-[#171717] truncate">
                                {selectedFile ? tempFileName : fileName}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                                <span className="text-[#66615C] font-medium">{selectedFile ? tempFileSize : (analysis?.fileSize || '—')}</span>
                                <span className="text-[#D8D4CC]">·</span>
                                <span className={
                                    statusText === 'Completed' ? 'text-emerald-600 font-bold' :
                                    statusText === 'Failed' ? 'text-rose-500 font-bold' :
                                    'text-[#F45B25] font-bold animate-pulse'
                                }>
                                    {statusText}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#8A8580] hover:text-[#171717] hover:bg-neutral-200/50 transition-all cursor-pointer border-none bg-transparent"
                            aria-label="Remove"
                            onClick={handleClear}
                            disabled={uploading || analyzing}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* Action Trigger */}
                <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading || analyzing}
                    className={`mt-4 w-full flex items-center justify-center gap-2 rounded-md h-10 px-4 text-xs font-bold transition-all duration-150 border cursor-pointer ${
                        selectedFile && !uploading && !analyzing
                            ? 'bg-[#171717] hover:bg-[#2a2a2a] text-white border-[#171717]'
                            : 'bg-[#FAF8F5] text-[#D8D4CC] border-[#D8D4CC] cursor-not-allowed'
                    }`}
                >
                    {uploading ? (
                        <>
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>{statusText || 'Uploading...'}</span>
                        </>
                    ) : analyzing ? (
                        <>
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>{statusText || 'Analyzing...'}</span>
                        </>
                    ) : (
                        <span>{analysis ? 'Re-analyze Resume' : 'Analyze Resume'}</span>
                    )}
                </button>

                {error && (
                    <p className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md p-3">
                        {error}
                    </p>
                )}
            </div>

            {/* ── Authentic Editorial Dossier Layout with Extra Details ── */}
            {analysis && (
                <motion.div
                    className="mt-16 w-full"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-4 border-b border-neutral-200/80">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#F45B25] mb-1 font-mono">
                                [ Candidate Profile Dossier ]
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#171717]">
                                Intelligence & Career Summary
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {fileName && (
                                <span className="text-xs font-mono text-[#66615C] bg-white px-3.5 py-1.5 rounded-full border border-neutral-200/80 shadow-2xs">
                                    {fileName}
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    const savedRole = user?.preferences?.desiredRole?.trim() || user?.desiredRole?.trim();
                                    const queryRole = savedRole || analysis.suggestedRoles?.[0] || 'Software Engineer';
                                    navigate(`/search?query=${encodeURIComponent(queryRole)}`);
                                }}
                                className="px-4 py-1.5 rounded-full bg-[#171717] hover:bg-[#F45B25] text-white text-xs font-bold transition-all border-none cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                            >
                                Match Jobs <ArrowUpRight size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Editorial Surface */}
                    <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-10 shadow-xs space-y-8">

                        {/* Executive Summary */}
                        {analysis.summary && (
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A8580] font-mono">
                                        01 // Professional Summary
                                    </p>
                                    <button
                                        onClick={handleCopySummary}
                                        className="text-xs font-semibold text-[#66615C] hover:text-[#171717] inline-flex items-center gap-1 bg-transparent border-none cursor-pointer"
                                    >
                                        {copiedSummary ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        {copiedSummary ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <p className="text-base sm:text-[17px] leading-relaxed font-normal text-[#171717] max-w-4xl">
                                    {analysis.summary}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8 border-t border-neutral-100">
                            {/* Left: Experience & Education (7 cols) */}
                            <div className="lg:col-span-7 space-y-10">
                                {/* Experience Timeline */}
                                {analysis.experience?.length > 0 && (
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A8580] font-mono mb-4">
                                            02 // Work Experience & Track Record ({analysis.experience.length})
                                        </p>
                                        <div className="space-y-4">
                                            {analysis.experience.map((expStr, i) => {
                                                const { title, company, duration } = parseExperienceItem(expStr);
                                                return (
                                                    <div 
                                                        key={i} 
                                                        className="p-4 rounded-2xl bg-[#F7F5F2]/70 hover:bg-[#F7F5F2] border border-neutral-200/60 transition-colors"
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-1">
                                                            <h4 className="text-sm sm:text-[15px] font-bold text-[#171717]">
                                                                {title}
                                                            </h4>
                                                            {duration && (
                                                                <span className="text-xs font-mono text-[#8A8580] bg-white px-2.5 py-0.5 rounded-md border border-neutral-200/70 w-fit">
                                                                    {duration}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {company && (
                                                            <p className="text-xs font-semibold text-[#66615C]">
                                                                {company}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Education */}
                                {analysis.education?.length > 0 && (
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A8580] mb-4 font-mono">
                                            03 // Academic Credentials & Degrees
                                        </p>
                                        <div className="space-y-3">
                                            {analysis.education.map((eduStr, i) => {
                                                const { degree, school } = parseEducationItem(eduStr);
                                                return (
                                                    <div key={i} className="p-4 rounded-2xl bg-[#F7F5F2]/70 border border-neutral-200/60">
                                                        <h4 className="text-sm font-bold text-[#171717]">
                                                            {degree}
                                                        </h4>
                                                        {school && (
                                                            <p className="text-xs font-semibold text-[#66615C] mt-0.5">
                                                                {school}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Certifications & Languages (if present) */}
                                {analysis.certifications?.length > 0 && (
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A8580] mb-3 font-mono">
                                            04 // Verified Certifications
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.certifications.map((cert, i) => (
                                                <span key={i} className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200/80 text-xs font-semibold text-[#171717]">
                                                    {cert}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Matched Roles & Skills (5 cols) */}
                            <div className="lg:col-span-5 space-y-10">
                                {/* Matched Roles */}
                                {analysis.suggestedRoles?.length > 0 && (
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A8580] mb-4 font-mono">
                                            05 // High-Match Target Roles
                                        </p>
                                        <div className="space-y-2">
                                            {analysis.suggestedRoles.map((role, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => navigate(`/search?query=${encodeURIComponent(role)}`)}
                                                    className="w-full px-4 py-3 rounded-2xl bg-[#F7F5F2] hover:bg-[#171717] text-[#171717] hover:text-white transition-all duration-200 flex items-center justify-between text-xs font-bold border border-neutral-200/60 hover:border-[#171717] cursor-pointer group"
                                                >
                                                    <span>{role}</span>
                                                    <span className="text-[11px] font-mono text-[#8A8580] group-hover:text-white inline-flex items-center gap-1">
                                                        Find Roles <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Skills */}
                                {analysis.skills?.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A8580] font-mono">
                                                06 // Core Skills & Technologies ({analysis.skills.length})
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {analysis.skills.map((skill, i) => (
                                                <span
                                                    key={i}
                                                    className="rounded-lg bg-[#F7F5F2] px-2.5 py-1 text-xs font-medium text-[#171717] border border-neutral-200/60 hover:border-[#171717] hover:bg-neutral-200/50 transition-colors cursor-default"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default ResumeUpload;
