import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, X, Cpu, SlidersHorizontal, Target, Briefcase, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { analyzeResume, incrementStat } from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/* ── Reusable Dark Grid Card ── */
function DarkGridCard({ icon: Icon, title, badge, children, colSpan = '' }) {
    return (
        <div
            className={`group relative overflow-visible rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950/60 to-zinc-950/30 p-0 transition-colors duration-300 hover:border-orange-500/50 ${colSpan}`}
        >
            {/* subtle gradient on hover */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent" />
            </div>

            {/* faint inner glow on hover */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 to-white/0 group-hover:from-orange-500/[0.03] group-hover:to-orange-500/[0.06] transition-colors" />

            {/* orange corner squares on hover */}
            <div className="pointer-events-none absolute inset-0 hidden group-hover:block">
                <div className="absolute -left-1.5 -top-1.5 h-2.5 w-2.5 bg-orange-500" />
                <div className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 bg-orange-500" />
                <div className="absolute -left-1.5 -bottom-1.5 h-2.5 w-2.5 bg-orange-500" />
                <div className="absolute -right-1.5 -bottom-1.5 h-2.5 w-2.5 bg-orange-500" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex flex-row items-start gap-3 p-5 pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/70 text-zinc-200">
                    <Icon className="h-5 w-5 text-zinc-200" />
                </div>
                <div className="flex-1 pt-1.5">
                    <div className="flex items-center gap-2">
                        <h4 className="text-lg font-medium text-zinc-100">{title}</h4>
                        {badge && (
                            <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] leading-none text-zinc-300">
                                {badge}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 px-5 pb-5 pt-4 text-sm text-zinc-400">
                {children}
            </div>
        </div>
    );
}

function ResumeUpload({ onResumeAnalyzed, existingData = null }) {
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [fileName, setFileName] = useState(existingData?.fileName || '');
    const [analysis, setAnalysis] = useState(existingData || null);
    const [error, setError] = useState('');
    
    // Staged file states for the horizontal upload layout
    const [selectedFile, setSelectedFile] = useState(null);
    const [tempFileName, setTempFileName] = useState('');
    const [tempFileSize, setTempFileSize] = useState('');
    const [statusText, setStatusText] = useState(existingData ? 'Completed' : '');

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

        // If the digital text layer is empty or too short, run OCR fallback
        if (fullText.trim().length < 50) {
            console.log("Empty or short PDF text layer. Falling back to Tesseract OCR...");
            fullText = await extractTextWithOCR(pdf);
        }

        return fullText.trim();
    };

    const handleClear = (e) => {
        if (e) e.stopPropagation();
        setSelectedFile(null);
        setTempFileName('');
        setTempFileSize('');
        setStatusText('');
        setFileName('');
        setAnalysis(null);
        setError('');
        if (onResumeAnalyzed) onResumeAnalyzed(null);
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setError('');
        
        if (file.type !== 'application/pdf' && !file.type.includes('text') && !file.name.endsWith('.txt')) {
            setError('Please upload a PDF or TXT file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('File size exceeds recommended 5 MB limit');
            return;
        }

        setSelectedFile(file);
        setTempFileName(file.name);
        const formattedSize = file.size >= 1024 * 1024
            ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
            : (file.size / 1024).toFixed(0) + ' KB';
        setTempFileSize(formattedSize);
        setStatusText('Selected');
        setFileName('');
        setAnalysis(null);
        if (onResumeAnalyzed) onResumeAnalyzed(null);
    }, [onResumeAnalyzed]);

    const handleUpload = async (e) => {
        if (e) e.preventDefault();
        if (!selectedFile) return;

        setError('');
        setUploading(true);
        setStatusText('Reading resume...');

        try {
            let text = '';

            if (selectedFile.type === 'application/pdf') {
                text = await extractTextFromPdf(selectedFile);
            } else if (selectedFile.type.includes('text') || selectedFile.name.endsWith('.txt')) {
                text = await selectedFile.text();
            }

            if (!text || text.length < 50) {
                setError('Could not extract enough text from the file. Try a different format.');
                setUploading(false);
                setStatusText('Failed');
                return;
            }

            setUploading(false);
            setAnalyzing(true);
            setStatusText('AI is analyzing...');

            const res = await analyzeResume(text);
            const analysisData = {
                ...res.data.analysis,
                fileName: selectedFile.name,
                fileSize: tempFileSize,
                rawText: text.substring(0, 5000)
            };

            setAnalysis(analysisData);
            setFileName(selectedFile.name);
            setSelectedFile(null);
            setStatusText('Completed');
            
            // Increment resumes optimized count
            try { await incrementStat('resumes_optimized_count'); } catch (_) {}
            
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

    return (
        <div>
            {/* ── Upload Card — Dark Grid Style ── */}
            <div className="group relative w-full max-w-[520px] mx-auto overflow-visible rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950/60 to-zinc-950/30 p-0 transition-colors duration-300 hover:border-orange-500/50">
                {/* subtle gradient on hover */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent" />
                </div>

                {/* faint inner glow on hover */}
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 to-white/0 group-hover:from-orange-500/[0.03] group-hover:to-orange-500/[0.06] transition-colors" />

                {/* orange corner squares on hover */}
                <div className="pointer-events-none absolute inset-0 hidden group-hover:block">
                    <div className="absolute -left-1.5 -top-1.5 h-2.5 w-2.5 bg-orange-500" />
                    <div className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 bg-orange-500" />
                    <div className="absolute -left-1.5 -bottom-1.5 h-2.5 w-2.5 bg-orange-500" />
                    <div className="absolute -right-1.5 -bottom-1.5 h-2.5 w-2.5 bg-orange-500" />
                </div>

                {/* Card Header */}
                <div className="relative z-10 flex flex-row items-start gap-3 p-5 pb-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/70 text-zinc-200">
                        <Upload className="h-5 w-5 text-zinc-200" />
                    </div>
                    <div className="flex-1 pt-1.5">
                        <h3 className="text-lg font-medium text-zinc-100">Resume Upload</h3>
                    </div>
                </div>

                {/* Card Content */}
                <div className="relative z-10 px-5 pb-5 pt-4">
                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={`w-full flex justify-center items-center rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/30 hover:bg-zinc-900/50 px-6 py-7 transition-all duration-200 cursor-pointer ${isDragActive ? 'border-zinc-500 bg-zinc-900/50' : ''} ${uploading || analyzing ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <input {...getInputProps()} />
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-zinc-500" aria-hidden="true" />
                            <div className="text-sm font-medium text-zinc-300">
                                <span>Drag and drop or </span>
                                <span className="text-zinc-100 underline underline-offset-2 decoration-zinc-600 hover:decoration-zinc-400 transition-colors">choose file</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Hint */}
                    <p className="mt-2 text-[11px] text-zinc-600">
                        Max 5 MB · PDF, TXT
                    </p>

                    {/* File Status */}
                    {(selectedFile || fileName) && (
                        <div className="relative mt-4 flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/70">
                                <FileText className="h-4 w-4 text-zinc-300" aria-hidden="true" />
                            </span>
                            <div className="flex-1 min-w-0 pr-6">
                                <p className="text-sm font-medium text-zinc-200 truncate">
                                    {selectedFile ? tempFileName : fileName}
                                </p>
                                <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                                    <span className="text-zinc-500">{selectedFile ? tempFileSize : (analysis?.fileSize || '—')}</span>
                                    <span className="text-zinc-700">·</span>
                                    <span className={
                                        statusText === 'Completed' ? 'text-orange-500 font-medium' :
                                        statusText === 'Failed' ? 'text-rose-400 font-medium' :
                                        'text-zinc-400 font-medium animate-pulse'
                                    }>
                                        {statusText}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="absolute right-2.5 top-2.5 rounded-md p-1 text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer border-none bg-transparent"
                                aria-label="Remove"
                                onClick={handleClear}
                                disabled={uploading || analyzing}
                            >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {selectedFile && (
                        <div className="mt-4 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-transparent hover:bg-zinc-800/60 border border-zinc-700 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                                onClick={handleClear}
                                disabled={uploading || analyzing}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white border border-zinc-100 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5"
                                onClick={handleUpload}
                                disabled={uploading || analyzing}
                            >
                                {uploading || analyzing ? (
                                    <>
                                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-zinc-950 border-t-transparent" />
                                        Processing…
                                    </>
                                ) : (
                                    'Upload'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="mt-4 text-sm text-rose-400 text-center font-medium max-w-[520px] mx-auto">
                    {error}
                </div>
            )}

            {/* ── Analysis Results — Dark Grid Cards ── */}
            {analysis && !analyzing && (
                <motion.div
                    className="mt-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    <p className="text-xs tracking-widest text-zinc-500 uppercase mb-2">[ Analysis ]</p>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-8">
                        Resume Insights
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* AI Summary — full width */}
                        {analysis.summary && (
                            <motion.div
                                className="sm:col-span-2 lg:col-span-3"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.4 }}
                            >
                                <DarkGridCard icon={Cpu} title="AI Summary">
                                    <p className="text-[15px] leading-relaxed text-zinc-300">
                                        {analysis.summary}
                                    </p>
                                </DarkGridCard>
                            </motion.div>
                        )}

                        {/* Skills */}
                        {analysis.skills?.length > 0 && (
                            <motion.div
                                className="sm:col-span-1 lg:col-span-1"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                <DarkGridCard icon={SlidersHorizontal} title="Skills" badge={`${analysis.skills.length}`}>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.skills.map((skill, i) => (
                                            <span
                                                key={i}
                                                className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </DarkGridCard>
                            </motion.div>
                        )}

                        {/* Suggested Roles */}
                        {analysis.suggestedRoles?.length > 0 && (
                            <motion.div
                                className="sm:col-span-1 lg:col-span-1"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25, duration: 0.4 }}
                            >
                                <DarkGridCard icon={Target} title="Suggested Roles">
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.suggestedRoles.map((role, i) => (
                                            <span
                                                key={i}
                                                className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
                                            >
                                                {role}
                                            </span>
                                        ))}
                                    </div>
                                </DarkGridCard>
                            </motion.div>
                        )}

                        {/* Experience */}
                        {analysis.experience?.length > 0 && (
                            <motion.div
                                className="sm:col-span-1 lg:col-span-1"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.4 }}
                            >
                                <DarkGridCard icon={Briefcase} title="Experience" badge={`${analysis.experience.length}`}>
                                    <div className="space-y-3">
                                        {analysis.experience.map((exp, i) => (
                                            <div key={i} className="flex items-start gap-2.5">
                                                <div className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                                                <p className="text-[13px] leading-relaxed text-zinc-400">{exp}</p>
                                            </div>
                                        ))}
                                    </div>
                                </DarkGridCard>
                            </motion.div>
                        )}

                        {/* Education */}
                        {analysis.education?.length > 0 && (
                            <motion.div
                                className="sm:col-span-1 lg:col-span-2"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, duration: 0.4 }}
                            >
                                <DarkGridCard icon={GraduationCap} title="Education">
                                    <div className="space-y-3">
                                        {analysis.education.map((edu, i) => (
                                            <div key={i} className="flex items-start gap-2.5">
                                                <div className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                                                <p className="text-[13px] leading-relaxed text-zinc-400">{edu}</p>
                                            </div>
                                        ))}
                                    </div>
                                </DarkGridCard>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default ResumeUpload;
