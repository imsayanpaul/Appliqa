import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, X, ArrowUpRight, Copy, Check, Sparkles, ExternalLink, Sliders } from 'lucide-react';
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
            <div className="w-full">
                {/* Header */}
                <p className="ds-body m-0 mb-5">Upload your resume to pull out your skills, experience and the roles you fit.</p>

                {/* Dropzone */}
                <div
                    {...getRootProps()}
                    className={`w-full flex flex-col justify-center items-center border border-dashed bg-white px-6 py-14 transition-all duration-150 cursor-pointer ${isDragActive ? 'border-[#CA3C0A] bg-[#FFF0E8]' : 'border-[#D8D4CC] hover:border-[#171717] hover:bg-[#F7F5F2]'} ${uploading || analyzing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-11 h-11 rounded-md bg-white border border-[#D8D4CC] flex items-center justify-center text-[#66615C]">
                            <Upload className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-[16px] font-semibold text-[#171717] m-0">
                                Drop your resume here or{' '}
                                <span className="text-[#CA3C0A] font-bold">browse</span>
                            </p>
                            <p className="ds-mono ds-mono-muted mt-2 mb-0">pdf or txt · 5 mb max</p>
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
                                    'text-[#CA3C0A] font-bold animate-pulse'
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
                    className={`mt-4 w-full flex items-center justify-center gap-2 h-14 px-4 text-[15px] font-semibold transition-colors duration-150 border cursor-pointer ${
                        selectedFile && !uploading && !analyzing
                            ? 'bg-[#CA3C0A] hover:bg-[#B73609] text-white border-[#CA3C0A]'
                            : 'bg-[#EFECE6] text-[#8A8580] border-[#D8D4CC] cursor-not-allowed'
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
                    <p role="alert" className="mt-3 text-[15px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] p-3">
                        {error}
                    </p>
                )}
            </div>

            {analysis && (
                <div className="mt-10 border border-[#D8D4CC] bg-[#F7F5F2]">
                    <div className="flex items-stretch justify-between border-0 border-b border-[#D8D4CC] min-h-14">
                        <span className="ds-mono self-center px-5 sm:px-6 py-3 truncate">
                            your resume{fileName ? ` / ${fileName.toLowerCase()}` : ''}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                const savedRole = user?.preferences?.desiredRole?.trim() || user?.desiredRole?.trim();
                                const queryRole = savedRole || analysis.suggestedRoles?.[0] || 'Software Engineer';
                                navigate(`/search?query=${encodeURIComponent(queryRole)}`);
                            }}
                            className="ds-btn ds-btn-accent shrink-0 !min-h-14 !px-5 sm:!px-6 !text-[14px]"
                        >
                            Find matching jobs <ArrowUpRight size={16} className="ds-btn-arrow" />
                        </button>
                    </div>

                    {analysis.summary && (
                        <section className="bg-white px-5 sm:px-6 py-6 border-0 border-b border-[#D8D4CC]">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h3 className="ds-mono ds-mono-muted m-0">summary</h3>
                                <button
                                    type="button"
                                    onClick={handleCopySummary}
                                    className="h-8 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium bg-transparent border border-[#D8D4CC] hover:border-[#171717] cursor-pointer"
                                >
                                    {copiedSummary ? <Check size={13} /> : <Copy size={13} />}
                                    {copiedSummary ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <p className="m-0 text-[17px] sm:text-[19px] leading-relaxed text-[#171717] max-w-4xl">{analysis.summary}</p>
                        </section>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        <div className="lg:col-span-7 border-0 lg:border-r border-[#D8D4CC]">
                            {analysis.experience?.length > 0 && (
                                <section className="px-5 sm:px-6 py-6 border-0 border-b border-[#D8D4CC]">
                                    <h3 className="ds-mono ds-mono-muted m-0 mb-2">experience · {analysis.experience.length}</h3>
                                    <ul className="list-none m-0 p-0">
                                        {analysis.experience.map((expStr, i) => {
                                            const { title, company, duration } = parseExperienceItem(expStr);
                                            return (
                                                <li key={i} className="py-3.5 border-0 border-t border-[#D8D4CC] first:border-t-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                                        <span className="text-[16px] font-semibold text-[#171717]">{title}</span>
                                                        {duration && <span className="ds-mono ds-mono-muted shrink-0">{duration.toLowerCase()}</span>}
                                                    </div>
                                                    {company && <p className="m-0 mt-0.5 text-[14px] text-[#4A4540]">{company}</p>}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            )}

                            {analysis.education?.length > 0 && (
                                <section className="px-5 sm:px-6 py-6 border-0 border-b lg:border-b-0 border-[#D8D4CC]">
                                    <h3 className="ds-mono ds-mono-muted m-0 mb-2">education</h3>
                                    <ul className="list-none m-0 p-0">
                                        {analysis.education.map((eduStr, i) => {
                                            const { degree, school } = parseEducationItem(eduStr);
                                            return (
                                                <li key={i} className="py-3.5 border-0 border-t border-[#D8D4CC] first:border-t-0">
                                                    <span className="text-[16px] font-semibold text-[#171717]">{degree}</span>
                                                    {school && <p className="m-0 mt-0.5 text-[14px] text-[#4A4540]">{school}</p>}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            )}

                            {analysis.certifications?.length > 0 && (
                                <section className="px-5 sm:px-6 py-6 border-0 border-t border-[#D8D4CC]">
                                    <h3 className="ds-mono ds-mono-muted m-0 mb-3">certifications</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.certifications.map((cert, i) => (
                                            <span key={i} className="ds-tag !font-sans !text-[13px]">{cert}</span>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            {analysis.suggestedRoles?.length > 0 && (
                                <section className="border-0 border-b border-[#D8D4CC]">
                                    <h3 className="ds-mono ds-mono-muted m-0 px-5 sm:px-6 pt-6 pb-3">roles that fit</h3>
                                    <ul className="list-none m-0 p-0">
                                        {analysis.suggestedRoles.map((role, i) => (
                                            <li key={i} className="border-0 border-t border-[#D8D4CC]">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/search?query=${encodeURIComponent(role)}`)}
                                                    className="w-full px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 bg-transparent hover:bg-white border-0 cursor-pointer text-left text-[15px] font-medium text-[#171717] group"
                                                >
                                                    {role}
                                                    <ArrowUpRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {analysis.skills?.length > 0 && (
                                <section className="px-5 sm:px-6 py-6">
                                    <h3 className="ds-mono ds-mono-muted m-0 mb-3">skills · {analysis.skills.length}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.skills.map((skill, i) => (
                                            <span key={i} className="ds-tag !font-sans !text-[13px]">{skill}</span>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ResumeUpload;
