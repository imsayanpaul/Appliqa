import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiSend, FiPlus, FiArrowRight, FiArrowUpRight } from 'react-icons/fi';
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
                <ul key={key}>
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
                <h4 key={index}>
                    {parseInline(trimmed.replace(/^###\s*/, ''))}
                </h4>
            );
            return;
        }
        if (trimmed.startsWith('##')) {
            flushList(`list-before-h2-${index}`);
            elements.push(
                <h3 key={index}>
                    {parseInline(trimmed.replace(/^##\s*/, ''))}
                </h3>
            );
            return;
        }
        if (trimmed.startsWith('#')) {
            flushList(`list-before-h1-${index}`);
            elements.push(
                <h2 key={index}>
                    {parseInline(trimmed.replace(/^#\s*/, ''))}
                </h2>
            );
            return;
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            inList = true;
            listItems.push(
                <li key={`li-${index}`}>
                    {parseInline(trimmed.substring(2))}
                </li>
            );
            return;
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
            inList = true;
            listItems.push(
                <li key={`li-${index}`}>
                    {parseInline(numMatch[2])}
                </li>
            );
            return;
        }

        if (trimmed.length > 0) {
            flushList(`list-before-p-${index}`);
            elements.push(
                <p key={index}>
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
            <strong key={match.index}>
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
                    ? `I have your resume${resumeData.fileName ? ` (${resumeData.fileName})` : ''}. Ask me about roles to target, interviews, your resume or pay.`
                    : "Hi. Add your resume on your profile for advice specific to you, or ask me anything about your job search."
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
            setError("The advisor couldn’t answer just now. Check your connection and try again.");
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
        <div className="h-[calc(100vh-64px)] bg-[#F7F5F2] text-[#171717] overflow-hidden">
            <div className="ds-frame h-full flex">
                {/* Context rail */}
                <aside className="w-80 shrink-0 hidden md:flex flex-col border-0 border-r border-[#D8D4CC] overflow-y-auto" aria-label="Advisor context" data-lenis-prevent>
                    <div className="h-14 shrink-0 px-6 flex items-center border-0 border-b border-[#D8D4CC]">
                        <span className="ds-mono">your context</span>
                    </div>

                    <section className="px-6 py-5 border-0 border-b border-[#D8D4CC]">
                        <h2 className="ds-mono ds-mono-muted m-0 mb-3">resume</h2>
                        {resumeData ? (
                            <>
                                <p className="m-0 text-[15px] font-semibold truncate flex items-center gap-2">
                                    <FiFileText size={15} className="shrink-0 text-[#CA3C0A]" />
                                    {resumeData.fileName || 'Uploaded resume'}
                                </p>
                                {resumeData.experienceLevel && (
                                    <p className="ds-mono ds-mono-muted mt-2 mb-0">{resumeData.experienceLevel.toLowerCase()} level</p>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="m-0 text-[15px] text-[#4A4540]">No resume yet. Answers will be general.</p>
                                <button type="button" onClick={() => navigate('/profile')} className="ds-btn ds-btn-ink w-full mt-4 !min-h-[44px] !text-[14px]">
                                    Add your resume <FiArrowRight size={15} />
                                </button>
                            </>
                        )}
                    </section>

                    {resumeData?.skills?.length > 0 && (
                        <section className="px-6 py-5 border-0 border-b border-[#D8D4CC]">
                            <h2 className="ds-mono ds-mono-muted m-0 mb-3">ask about a skill</h2>
                            <div className="flex flex-wrap gap-1.5">
                                {resumeData.skills.slice(0, 12).map((skill) => (
                                    <button
                                        key={skill}
                                        type="button"
                                        disabled={loading}
                                        onClick={() => handleSendMessage(`How can I best demonstrate my expertise in ${skill} for target roles?`)}
                                        className="ds-tag cursor-pointer hover:border-[#171717] disabled:opacity-50"
                                    >
                                        {skill}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="flex-1">
                        <h2 className="ds-mono ds-mono-muted m-0 px-6 pt-5 pb-3">quick prompts</h2>
                        <ul className="list-none m-0 p-0">
                            {strategyPlaybooks.map((play) => (
                                <li key={play.label} className="border-0 border-t border-[#D8D4CC]">
                                    <button
                                        type="button"
                                        onClick={() => handleSendMessage(play.prompt)}
                                        disabled={loading}
                                        className="w-full px-6 py-3.5 flex items-center justify-between gap-3 text-left text-[15px] text-[#171717] bg-transparent hover:bg-white border-0 cursor-pointer disabled:opacity-50 group"
                                    >
                                        {play.label}
                                        <FiArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                </aside>

                {/* Conversation */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="h-14 shrink-0 flex items-stretch justify-between border-0 border-b border-[#D8D4CC]">
                        <h1 className="ds-mono self-center px-6 sm:px-8 m-0 font-normal">advisor / chat</h1>
                        <button
                            type="button"
                            onClick={handleClearChat}
                            className="ds-btn !min-h-0 !px-5 sm:!px-6 !text-[14px] bg-transparent text-[#171717] hover:bg-white border-0 border-l border-[#D8D4CC]"
                        >
                            New chat <FiPlus size={15} />
                        </button>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto" data-lenis-prevent aria-live="polite">
                        {isOnlyGreeting ? (
                            <div className="px-6 sm:px-10 py-12 sm:py-16 max-w-4xl">
                                <h2 className="ds-slash m-0" style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}>advisor</h2>
                                <p className="ds-lede mt-5 mb-0 max-w-2xl">
                                    {resumeData
                                        ? 'Ask about your next role, your resume, interviews or pay. Answers use your resume and profile.'
                                        : 'Ask about your next role, your resume, interviews or pay. Add your resume for answers specific to you.'}
                                </p>
                                <ul className="ds-gridlines grid-cols-1 sm:grid-cols-2 list-none m-0 mt-10 p-0 border border-[#D8D4CC]">
                                    {bentoModules.map((item) => (
                                        <li key={item.title}>
                                            <button
                                                type="button"
                                                onClick={() => handleSendMessage(item.query)}
                                                className="w-full h-full text-left px-5 py-5 bg-transparent hover:bg-white border-0 cursor-pointer flex items-start justify-between gap-4 group"
                                            >
                                                <span>
                                                    <span className="block text-[17px] font-semibold text-[#171717]">{item.title}</span>
                                                    <span className="block mt-1 text-[14px] text-[#4A4540]">{item.desc}</span>
                                                </span>
                                                <FiArrowUpRight size={18} className="shrink-0 text-[#171717] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <ol className="list-none m-0 p-0">
                                {messages.map((msg) => (
                                    <li
                                        key={msg.id}
                                        className={`grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 sm:gap-6 px-6 sm:px-10 py-6 border-0 border-b border-[#D8D4CC] ${msg.role === 'user' ? 'bg-white' : ''}`}
                                    >
                                        <span className={`ds-mono pt-0.5 flex items-start gap-2 ${msg.role === 'user' ? 'ds-mono-muted' : 'text-[#CA3C0A]'}`}>
                                            {msg.role !== 'user' && <span className="ds-square mt-1" />}
                                            {msg.role === 'user' ? 'you' : 'advisor'}
                                        </span>
                                        <div className="min-w-0 max-w-3xl">
                                            {msg.role === 'user' ? (
                                                <p className="m-0 text-[16px] font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                            ) : (
                                                <div className="advisor-md">{renderMarkdown(msg.text)}</div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                                {loading && (
                                    <li className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 sm:gap-6 px-6 sm:px-10 py-6 border-0 border-b border-[#D8D4CC]">
                                        <span className="ds-mono text-[#CA3C0A] flex items-start gap-2"><span className="ds-square mt-1 animate-pulse" />advisor</span>
                                        <span className="ds-mono ds-mono-muted animate-pulse">thinking…</span>
                                    </li>
                                )}
                                {error && (
                                    <li role="alert" className="px-6 sm:px-10 py-5 border-0 border-b border-[#D8D4CC] bg-[#FEF2F2] text-[#991B1B] text-[15px]">
                                        {error}
                                    </li>
                                )}
                            </ol>
                        )}
                    </div>

                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="shrink-0 flex items-stretch border-0 border-t border-[#D8D4CC] bg-white focus-within:shadow-[inset_0_2px_0_#CA3C0A]"
                    >
                        <label htmlFor="advisor-input" className="sr-only">Message the advisor</label>
                        <input
                            id="advisor-input"
                            ref={inputRef}
                            type="text"
                            autoComplete="off"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={loading}
                            placeholder="Ask about roles, your resume, interviews or salary…"
                            className="flex-1 min-w-0 h-16 px-6 sm:px-8 bg-transparent border-0 outline-none text-[16px] text-[#171717] placeholder:text-[#8A8580] focus-visible:!outline-none"
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputValue.trim()}
                            className="ds-btn ds-btn-accent !min-h-16 !px-6 sm:!px-8 shrink-0"
                        >
                            Send <FiSend size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Advisor;
