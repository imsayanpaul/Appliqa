import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, X } from 'lucide-react';
import { analyzeResume } from '../services/api';
import ResumeProfiles from './ResumeProfiles';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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

function ResumeUpload({ onResumeAnalyzed, onUpdateUser, existingData = null, user = null }) {
    const navigate = useNavigate();
    const cleanExisting = getCleanAnalysis(existingData);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [fileName, setFileName] = useState(cleanExisting?.fileName || '');
    const [analysis, setAnalysis] = useState(cleanExisting || null);
    const [error, setError] = useState('');
    const analyzedAtRef = useRef(0);
    
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

            analyzedAtRef.current = Date.now();

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

    // When the current upload happened; newer than every saved resume -> offer to import it
    const uploadedAt = Math.max(
        new Date(user?.resumeData?.uploadedAt || existingData?.uploadedAt || 0).getTime() || 0,
        analyzedAtRef.current
    ) || null;

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

            {(analysis || user?.builderData || user) && (
                <ResumeProfiles
                    user={user}
                    onUpdateUser={onUpdateUser}
                    analysis={analysis}
                    uploadedAt={uploadedAt}
                    suggestedRoles={analysis?.suggestedRoles || []}
                    onFindJobs={() => {
                        const savedRole = user?.preferences?.desiredRole?.trim() || user?.desiredRole?.trim();
                        const queryRole = savedRole || analysis?.suggestedRoles?.[0] || 'Software Engineer';
                        navigate(`/search?query=${encodeURIComponent(queryRole)}`);
                    }}
                    onSearchRole={(role) => navigate(`/search?query=${encodeURIComponent(role)}`)}
                />
            )}
        </div>
    );
}

export default ResumeUpload;
