import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FiFileText, 
    FiSend, 
    FiPlus, 
    FiUser, 
    FiArrowRight, 
    FiZap,
    FiMessageSquare,
    FiCheck,
    FiTrendingUp,
    FiTarget,
    FiAward,
    FiShield,
    FiCpu
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { getAdvisorChat } from '../services/api';

// Markdown-to-HTML parser helper for structured advisor responses
const renderMarkdown = (text) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    let inList = false;
    let listItems = [];
    const elements = [];

    const flushList = (key) => {
        if (inList && listItems.length > 0) {
            elements.push(
                <ul key={key} className="space-y-1.5 my-2.5 pl-4 list-disc text-neutral-700">
                    {listItems}
                </ul>
            );
            inList = false;
            listItems = [];
        }
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('###')) {
            flushList(`list-before-h3-${index}`);
            elements.push(
                <h4 key={index} className="text-sm font-bold text-[#171717] mt-3.5 mb-1.5 tracking-tight">
                    {parseInline(trimmed.replace(/^###\s*/, ''))}
                </h4>
            );
            return;
        }
        if (trimmed.startsWith('##')) {
            flushList(`list-before-h2-${index}`);
            elements.push(
                <h3 key={index} className="text-sm font-black text-[#171717] mt-4 mb-2 pb-1 border-b border-neutral-100">
                    {parseInline(trimmed.replace(/^##\s*/, ''))}
                </h3>
            );
            return;
        }
        if (trimmed.startsWith('#')) {
            flushList(`list-before-h1-${index}`);
            elements.push(
                <h2 key={index} className="text-base font-black text-[#171717] mt-4 mb-2">
                    {parseInline(trimmed.replace(/^#\s*/, ''))}
                </h2>
            );
            return;
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            inList = true;
            listItems.push(
                <li key={`li-${index}`} className="text-xs sm:text-[13px] text-neutral-700 leading-relaxed">
                    {parseInline(trimmed.substring(2))}
                </li>
            );
            return;
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
            inList = true;
            listItems.push(
                <li key={`li-${index}`} className="text-xs sm:text-[13px] text-neutral-700 leading-relaxed list-decimal ml-2">
                    {parseInline(numMatch[2])}
                </li>
            );
            return;
        }

        if (trimmed.length > 0) {
            flushList(`list-before-p-${index}`);
            elements.push(
                <p key={index} className="text-xs sm:text-[13px] leading-relaxed mb-2.5 text-neutral-700 font-normal">
                    {parseInline(trimmed)}
                </p>
            );
        } else {
            flushList(`list-gap-${index}`);
        }
    });

    flushList('list-end');
    return elements;
};

const parseInline = (text) => {
    if (!text) return '';
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        parts.push(
            <strong key={match.index} className="font-bold text-[#171717]">
                {match[1]}
            </strong>
        );
        lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
};

function Advisor({ user, resumeData }) {
    const navigate = useNavigate();
    const chatContainerRef = useRef(null);
    const inputRef = useRef(null);
    const [messages, setMessages] = useState(() => {
        const saved = window.localStorage.getItem('appliqa_advisor_chat');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved advisor chat:", e);
            }
        }
        return [
            {
                id: 'greeting',
                role: 'assistant',
                text: resumeData 
                    ? `I've analyzed your profile and active resume (${resumeData.fileName || 'synced resume'}). Ask me about targeted role positioning, interview strategy, ATS keyword optimization, or skill development roadmaps.`
                    : "Welcome to your Career Intelligence workspace. Upload your resume on Profile to get hyper-tailored advice, ATS scoring, and interview prep."
            }
        ];
    });
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const bentoModules = [
        {
            title: "ATS Keyword Alignment",
            desc: "Audit resume keywords against senior benchmarks",
            query: "Analyze my resume for ATS keyword alignment and identify missing technical competencies for senior roles."
        },
        {
            title: "Leadership Promotion Gap",
            desc: "Roadmap milestones from Mid-Level to Staff/Lead",
            query: "What specific leadership and architectural milestones do I need to reach a Lead/Staff level from my current baseline?"
        },
        {
            title: "Behavioral Interview Prep",
            desc: "Structure high-impact STAR responses for leadership rounds",
            query: "Give me 3 challenging behavioral interview questions for my profile and coach me through the best STAR framework answers."
        },
        {
            title: "Resume Bullet Polish",
            desc: "Transform tasks into quantified executive wins",
            query: "Take my resume's core responsibilities and rewrite them into high-impact, quantified achievement bullet points."
        }
    ];

    const strategyPlaybooks = [
        {
            label: "Target Role Gap Analysis",
            prompt: "What skills are missing on my resume to qualify for top-tier senior roles?"
        },
        {
            label: "Executive Resume Polish",
            prompt: "How can I rewrite my experience bullets to show measurable business impact?"
        },
        {
            label: "Mock 'Tell Me About Yourself'",
            prompt: "How should I structure a powerful 90-second elevator pitch based on my profile?"
        },
        {
            label: "Salary & Compensation Leverage",
            prompt: "What is the expected compensation band for my experience level and how should I negotiate?"
        }
    ];

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, loading]);

    const handleSendMessage = async (textToSend) => {
        const text = textToSend?.trim() || inputValue.trim();
        if (!text) return;

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: text
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setLoading(true);
        setError(null);

        try {
            const apiHistory = [];
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                if (msg.role === 'user') {
                    const nextMsg = messages[i + 1];
                    if (nextMsg && (nextMsg.role === 'assistant' || nextMsg.role === 'model')) {
                        apiHistory.push({ role: 'user', text: msg.text });
                        apiHistory.push({ role: 'assistant', text: nextMsg.text });
                        i++;
                    }
                } else {
                    apiHistory.push({ role: 'assistant', text: msg.text });
                }
            }

            const response = await getAdvisorChat({
                message: text,
                chatHistory: apiHistory,
                resumeData: resumeData || null
            });

            if (response.data && response.data.success) {
                const updatedMessages = [
                    ...messages,
                    userMessage,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        text: response.data.response
                    }
                ];
                setMessages(updatedMessages);
                window.localStorage.setItem('appliqa_advisor_chat', JSON.stringify(updatedMessages));
            } else {
                throw new Error("Invalid API response format");
            }
        } catch (err) {
            console.error("Advisor chat error:", err);
            setError("Could not reach career intelligence advisor. Please check your network connection and try again.");
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleClearChat = () => {
        const initialGreeting = [
            {
                id: 'greeting',
                role: 'assistant',
                text: resumeData 
                    ? `Workspace reset. I have your synced resume context ready (${resumeData.fileName || 'synced resume'}). What would you like to focus on today?`
                    : "Workspace reset. Upload your resume or ask me any question regarding your job search and interview prep."
            }
        ];
        setMessages(initialGreeting);
        window.localStorage.setItem('appliqa_advisor_chat', JSON.stringify(initialGreeting));
        setError(null);
    };

    const isOnlyGreeting = messages.length === 1;

    return (
        <div className="w-full h-[calc(100vh-64px)] flex bg-[#FAF8F5] overflow-hidden">
            
            {/* Left Sidebar: Candidate Profile & Strategy Rail */}
            <div className="w-80 bg-white border-r border-neutral-200/90 hidden md:flex flex-col shrink-0 overflow-y-auto justify-between">
                <div className="p-5 space-y-6">
                    
                    {/* Active Profile Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                Active Profile
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#F45B25]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F45B25] animate-pulse" />
                                <span>Synced</span>
                            </span>
                        </div>

                        {resumeData ? (
                            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-neutral-200/80 space-y-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-[#FFF0E8] text-[#F45B25] flex items-center justify-center shrink-0">
                                        <FiFileText size={14} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-[#171717] truncate m-0">
                                            {resumeData.fileName || 'sayan cv.pdf'}
                                        </p>
                                    </div>
                                </div>
                                {resumeData.experienceLevel && (
                                    <div className="flex items-center justify-between pt-1 border-t border-neutral-200/50 text-[11px]">
                                        <span className="text-neutral-500">Seniority</span>
                                        <span className="font-bold text-[#171717] uppercase text-[10px] px-1.5 py-0.5 rounded bg-white border border-neutral-200">
                                            {resumeData.experienceLevel} Level
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-neutral-200/80 text-center">
                                <p className="text-xs text-neutral-500 mb-2 font-medium">No resume attached.</p>
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="w-full py-1.5 px-3 rounded-lg bg-[#FFF0E8] text-[#F45B25] text-xs font-bold transition-all border border-[#F45B25]/20 cursor-pointer flex items-center justify-center gap-1"
                                >
                                    <span>Upload Resume</span>
                                    <FiArrowRight size={12} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Synced Skills Cloud */}
                    {resumeData?.skills && resumeData.skills.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                    Profile Skills ({resumeData.skills.length})
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                {resumeData.skills.slice(0, 10).map((skill, index) => (
                                    <button 
                                        key={index}
                                        type="button"
                                        onClick={() => handleSendMessage(`How can I best demonstrate my expertise in ${skill} for target roles?`)}
                                        className="px-2 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#FFF0E8] hover:text-[#F45B25] hover:border-[#F45B25] text-neutral-800 text-[11px] font-medium border border-[#D8D4CC] transition-all cursor-pointer"
                                        title={`Ask advisor about ${skill}`}
                                    >
                                        {skill}
                                    </button>
                                ))}
                                {resumeData.skills.length > 10 && (
                                    <span className="text-[10px] text-neutral-400 font-medium self-center pl-1">
                                        +{resumeData.skills.length - 10} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quick Strategy Playbooks */}
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                            Strategy Presets
                        </div>
                        <div className="space-y-1.5">
                            {strategyPlaybooks.map((play, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSendMessage(play.prompt)}
                                    disabled={loading}
                                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-[#FFF8F5] text-neutral-800 hover:text-[#171717] text-xs font-medium border border-[#D8D4CC] hover:border-[#F45B25] transition-all cursor-pointer flex items-center justify-between gap-1.5 group disabled:opacity-50"
                                    style={{ boxShadow: 'none' }}
                                >
                                    <span className="truncate">{play.label}</span>
                                    <FiArrowRight size={11} className="text-neutral-400 group-hover:text-[#F45B25] shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer disclaimer */}
                <div className="p-4 border-t border-neutral-100 text-center">
                    <p className="text-[10px] text-neutral-400 m-0 font-medium">
                        Appliqa Career Intelligence
                    </p>
                </div>
            </div>

            {/* Right Chat Workspace Area */}
            <div className="flex-1 flex flex-col bg-[#FAF8F5] overflow-hidden">
                
                {/* Top Workspace Header Bar */}
                <div className="h-14 px-6 bg-white border-b border-neutral-200 flex items-center justify-between shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#FFF0E8] text-[#F45B25] flex items-center justify-center font-bold">
                            <FiTrendingUp size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm text-[#171717] tracking-tight">
                                    Career Advisor & Intelligence
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleClearChat}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold border border-[#D8D4CC] transition-all cursor-pointer flex items-center gap-1.5"
                            style={{ boxShadow: 'none' }}
                        >
                            <FiPlus size={13} className="text-[#F45B25]" />
                            <span>New Chat</span>
                        </button>
                    </div>
                </div>

                {/* Messages Feed */}
                <div 
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
                >
                    {isOnlyGreeting ? (
                        <div className="max-w-3xl mx-auto py-8 text-center space-y-6">
                            
                            {/* Header Intro */}
                            <div>
                                <h2 className="text-2xl font-black text-[#171717] tracking-tight">
                                    How can I assist your career progression today?
                                </h2>
                                <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-lg mx-auto">
                                    {resumeData 
                                        ? `Context synchronized for ${resumeData.fileName || 'your profile'}. Ready to evaluate promotion paths, target skills, and interview strategy.`
                                        : "Upload your resume to receive custom gap analysis, ATS score feedback, and tailored interview answers."}
                                </p>
                            </div>

                            {/* Bento Grid Action Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl mx-auto text-left pt-2">
                                {bentoModules.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSendMessage(item.query)}
                                        className="p-4 rounded-2xl bg-white hover:bg-[#FFFDFB] border border-[#D8D4CC] hover:border-[#F45B25] text-neutral-800 transition-all text-left group cursor-pointer flex flex-col justify-between"
                                        style={{ boxShadow: 'none' }}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <h4 className="text-xs font-bold text-[#171717] group-hover:text-[#F45B25] transition-colors">
                                                    {item.title}
                                                </h4>
                                                <FiArrowRight size={13} className="text-neutral-400 group-hover:text-[#F45B25] group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                            <p className="text-[11px] text-neutral-500 leading-relaxed m-0">
                                                {item.desc}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-5">
                            <AnimatePresence initial={false}>
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-full`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                            {msg.role === 'user' ? (
                                                <>
                                                    <span>You</span>
                                                    <FiUser size={10} className="text-neutral-500" />
                                                </>
                                            ) : (
                                                <>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#F45B25]" />
                                                    <span className="text-[#F45B25]">Advisor</span>
                                                </>
                                            )}
                                        </div>

                                        <div 
                                            className={`p-4 text-xs sm:text-[13px] leading-relaxed max-w-[90%] sm:max-w-[85%] ${
                                                msg.role === 'user'
                                                    ? 'bg-[#171717] text-white rounded-2xl rounded-tr-xs font-normal'
                                                    : 'bg-white border border-[#D8D4CC] text-[#171717] rounded-2xl rounded-tl-xs'
                                            }`}
                                            style={{ boxShadow: 'none' }}
                                        >
                                            {msg.role === 'user' ? (
                                                <p className="m-0 leading-relaxed text-white whitespace-pre-wrap">{msg.text}</p>
                                            ) : (
                                                <div className="space-y-0.5 text-neutral-800 font-normal">
                                                    {renderMarkdown(msg.text)}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Loading State */}
                            {loading && (
                                <div className="flex flex-col items-start">
                                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-[#F45B25]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#F45B25] animate-pulse" />
                                        <span>Analyzing Profile Context...</span>
                                    </div>
                                    <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-[#D8D4CC] flex items-center gap-1.5" style={{ boxShadow: 'none' }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#F45B25] animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#F45B25] animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#F45B25] animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 rounded-xl bg-[#FFF0E8] border border-[#F45B25]/30 text-xs font-semibold text-[#F45B25] flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#F45B25]" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Fixed Bottom Input Composer */}
                <div className="p-4 bg-white border-t border-neutral-200 shrink-0">
                    <div className="max-w-3xl mx-auto">
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                            className="flex items-center gap-2 bg-[#FAF8F5] rounded-xl p-2 border border-[#D8D4CC] focus-within:border-[#F45B25] focus-within:ring-2 focus-within:ring-[#F45B25]/15 transition-all"
                        >
                            <input 
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={loading}
                                placeholder="Ask anything about role transitions, resume tailoring, or interview questions..."
                                className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-[#171717] placeholder-neutral-400 font-medium px-3 py-1"
                            />
                            <button
                                type="submit"
                                disabled={loading || !inputValue.trim()}
                                className="px-4 py-2 rounded-lg bg-[#F45B25] hover:bg-[#E04D1B] text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            >
                                <span>Send</span>
                                <FiSend size={11} />
                            </button>
                        </form>
                        <p className="text-[10px] text-neutral-400 text-center mt-2 mb-0 font-medium">
                            Press Enter to send. Responses are synthesized from your verified resume profile and target career preferences.
                        </p>
                    </div>
                </div>

            </div>

        </div>
    );
}

export default Advisor;
