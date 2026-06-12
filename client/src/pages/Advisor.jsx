import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Sparkles, FileText, PlusCircle, Compass, Cpu, HelpCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAdvisorChat } from '../services/api';

// Simple Markdown-to-HTML parser helper for rich AI responses
const renderMarkdown = (text) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    let inList = false;
    let listItems = [];
    const elements = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        // Match headers (e.g. ### Header)
        if (trimmed.startsWith('###')) {
            if (inList) {
                elements.push(<ul key={`list-${index}`} className="list-disc pl-5 mb-4 space-y-1.5">{listItems}</ul>);
                inList = false;
                listItems = [];
            }
            elements.push(<h4 key={index} className="text-sm font-bold text-white mt-4 mb-2 tracking-tight flex items-center gap-1.5">{parseInline(trimmed.replace('###', '').trim())}</h4>);
            return;
        }
        if (trimmed.startsWith('##')) {
            if (inList) {
                elements.push(<ul key={`list-${index}`} className="list-disc pl-5 mb-4 space-y-1.5">{listItems}</ul>);
                inList = false;
                listItems = [];
            }
            elements.push(<h3 key={index} className="text-base font-extrabold text-white mt-5 mb-2.5 border-b border-white/5 pb-1">{parseInline(trimmed.replace('##', '').trim())}</h3>);
            return;
        }
        if (trimmed.startsWith('#')) {
            if (inList) {
                elements.push(<ul key={`list-${index}`} className="list-disc pl-5 mb-4 space-y-1.5">{listItems}</ul>);
                inList = false;
                listItems = [];
            }
            elements.push(<h2 key={index} className="text-lg font-black text-white mt-6 mb-3 bg-gradient-to-r from-white via-slate-100 to-zinc-400 bg-clip-text text-transparent">{parseInline(trimmed.replace('#', '').trim())}</h2>);
            return;
        }

        // Match list items starting with '-' or '*'
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            inList = true;
            listItems.push(
                <li key={`li-${index}`} className="text-[12px] text-zinc-200 leading-relaxed mb-1.5">
                    {parseInline(trimmed.substring(2))}
                </li>
            );
            return;
        }

        // Match numbered list items
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
            inList = true;
            listItems.push(
                <li key={`li-${index}`} className="text-[12px] text-zinc-200 list-decimal leading-relaxed mb-1.5 ml-4">
                    {parseInline(numMatch[2])}
                </li>
            );
            return;
        }

        // Standard paragraph
        if (trimmed.length > 0) {
            if (inList) {
                elements.push(<ul key={`list-${index}`} className="list-disc pl-5 mb-4 space-y-1.5">{listItems}</ul>);
                inList = false;
                listItems = [];
            }
            elements.push(<p key={index} className="text-[12px] leading-relaxed mb-4 text-zinc-200">{parseInline(trimmed)}</p>);
        } else {
            if (inList) {
                elements.push(<ul key={`list-${index}`} className="list-disc pl-5 mb-4 space-y-1.5">{listItems}</ul>);
                inList = false;
                listItems = [];
            }
        }
    });

    if (inList) {
        elements.push(<ul key={`list-end`} className="list-disc pl-5 mb-4 space-y-1.5">{listItems}</ul>);
    }

    return elements;
};

// Parse inline styles: bold (**text**) and highlights
const parseInline = (text) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        // Add bolded text
        parts.push(<strong key={match.index} className="font-semibold text-white bg-white/10 px-1 py-0.5 rounded text-[11px]">{match[1]}</strong>);
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
                    ? `Hi! I'm your Appliqa Career Advisor. I have analyzed your resume (${resumeData.fileName || 'uploaded resume'}) and synchronized your skills. How can I help you level up your career goals today?`
                    : "Hi! I'm your Appliqa Career Advisor. Upload your resume on the Home page to get customized, tailored feedback! How can I help you with your career search today?"
            }
        ];
    });
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Interactive button hover states
    const [hoveredPromptIndex, setHoveredPromptIndex] = useState(null);
    const [hoveredSkillIndex, setHoveredSkillIndex] = useState(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [newSessionHovered, setNewSessionHovered] = useState(false);
    const [isSendHovered, setIsSendHovered] = useState(false);

    // Starter prompts
    const suggestedPrompts = [
        "How can I stand out for a Tech Lead role?",
        "What skills are missing from my resume?",
        "How should I structure my answer for 'Tell me about yourself'?",
        "Analyze my resume for senior software engineering roles.",
        "Give me a study checklist for a system design interview."
    ];

    // Scroll to bottom of chat messages container when messages update
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

        // Add user message
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
            // Build history only from complete turns (user message followed by assistant message)
            const apiHistory = [];
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                if (msg.role === 'user') {
                    const nextMsg = messages[i + 1];
                    if (nextMsg && (nextMsg.role === 'assistant' || nextMsg.role === 'model')) {
                        apiHistory.push({ role: 'user', text: msg.text });
                        apiHistory.push({ role: 'assistant', text: nextMsg.text });
                        i++; // skip assistant message
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
                setMessages(prev => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        text: response.data.response
                    }
                ]);
            } else {
                throw new Error("Invalid API response format");
            }
        } catch (err) {
            console.error("Advisor chat error:", err);
            setError("Oops! I couldn't reach the AI model. Please verify your connection or backend server status.");
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = () => {
        const initialGreeting = [
            {
                id: 'greeting',
                role: 'assistant',
                text: resumeData 
                    ? `Chat reset. I'm ready to assist with your career. Ask me anything about your resume or job search.`
                    : "Chat reset. How can I help you with your career search today?"
            }
        ];
        setMessages(initialGreeting);
        window.localStorage.setItem('appliqa_advisor_chat', JSON.stringify(initialGreeting));
        setError(null);
    };

    return (
        <div style={{
            height: 'calc(100vh - 106px)',
            maxWidth: '1280px',
            margin: '0 auto',
            width: '100%',
            background: 'transparent',
            color: '#FFFFFF',
            padding: '24px 32px 32px 32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
        }} className="fade-in">
            
            {/* Glowing Accent Orbs */}
            <div style={{
                position: 'absolute',
                top: '15%',
                right: '25%',
                width: '350px',
                height: '350px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(249, 115, 22, 0.035) 0%, transparent 70%)',
                filter: 'blur(60px)',
                pointerEvents: 'none',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                bottom: '10%',
                left: '20%',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(253, 186, 116, 0.02) 0%, transparent 70%)',
                filter: 'blur(50px)',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            {/* Header Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '20px',
                marginBottom: '24px',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-primary)',
                        boxShadow: '0 0 12px rgba(249, 115, 22, 0.8)',
                        flexShrink: 0
                    }} />
                    <div>
                        <h1 style={{ 
                            fontSize: '20px', 
                            fontWeight: '800', 
                            letterSpacing: '-0.03em',
                            background: 'linear-gradient(to right, #ffffff 30%, #f4f4f5 70%, #a1a1aa 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0,
                            lineHeight: '1.2'
                        }}>
                            AI Resume & Career Advisor
                        </h1>
                        <p style={{ 
                            fontSize: '11.5px', 
                            color: 'var(--text-muted)', 
                            marginTop: '4px', 
                            fontWeight: '500',
                            margin: 0
                        }}>
                            Unlock expert recruiter insights and mock coaching powered by Gemini-3.5
                        </p>
                    </div>
                </div>

                <button 
                    onClick={handleClearChat}
                    onMouseEnter={() => setNewSessionHovered(true)}
                    onMouseLeave={() => setNewSessionHovered(false)}
                    style={{
                        background: newSessionHovered ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.03)',
                        border: newSessionHovered ? '1px solid rgba(249, 115, 22, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
                        color: '#FFFFFF',
                        padding: '9px 18px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '650',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: newSessionHovered 
                            ? '0 0 20px rgba(249, 115, 22, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)' 
                            : 'inset 0 1px 0 rgba(255,255,255,0.03)'
                    }}
                >
                    <PlusCircle size={15} style={{ color: newSessionHovered ? 'var(--accent-primary)' : '#FFFFFF', transition: 'color 0.25s' }} />
                    New Session
                </button>
            </div>

            {/* Main Content Layout */}
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '24px',
                flex: 1,
                alignItems: 'stretch',
                minHeight: 0,
                position: 'relative',
                zIndex: 10
            }} className="flex-col md:flex-row min-h-0 overflow-hidden">
                
                {/* Left Sidebar: Resume Context & Quick Actions */}
                <div style={{
                    width: '100%',
                    maxWidth: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                    overflowY: 'auto'
                }} className="w-full md:w-[300px] shrink-0">
                    
                    {/* Resume Context Card */}
                    <div style={{
                        background: 'rgba(10, 10, 12, 0.35)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.002) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '18px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <FileText size={16} className="text-orange-500" />
                            <span style={{ fontSize: '12.5px', fontWeight: '750', color: '#FFFFFF', letterSpacing: '-0.01em' }}>Resume Context</span>
                        </div>

                        {resumeData ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: '550',
                                    color: 'var(--text-secondary)',
                                    wordBreak: 'break-all',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255, 255, 255, 0.04)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--accent-primary)', borderRadius: '50%', boxShadow: '0 0 8px var(--accent-primary)', flexShrink: 0 }} />
                                    <span className="truncate">{resumeData.fileName || 'Uploaded Resume'}</span>
                                </div>
                                
                                {resumeData.experienceLevel && (
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        fontSize: '11.5px', 
                                        borderBottom: '1px solid rgba(255,255,255,0.04)', 
                                        paddingBottom: '8px' 
                                    }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Experience Level:</span>
                                        <span style={{ 
                                            color: 'var(--accent-primary)', 
                                            fontWeight: '700', 
                                            textTransform: 'capitalize',
                                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '10.5px',
                                            border: '1px solid rgba(249, 115, 22, 0.2)',
                                            display: 'inline-block'
                                        }}>
                                            {resumeData.experienceLevel}
                                        </span>
                                    </div>
                                )}

                                {resumeData.skills && resumeData.skills.length > 0 && (
                                    <div>
                                        <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>Skills Synced:</span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                            {resumeData.skills.slice(0, 10).map((skill, index) => (
                                                <span 
                                                    key={skill}
                                                    onMouseEnter={() => setHoveredSkillIndex(index)}
                                                    onMouseLeave={() => setHoveredSkillIndex(null)}
                                                    style={{
                                                        fontSize: '9.5px',
                                                        fontWeight: '600',
                                                        background: hoveredSkillIndex === index 
                                                            ? 'rgba(249, 115, 22, 0.12)' 
                                                            : 'rgba(249, 115, 22, 0.05)',
                                                        border: hoveredSkillIndex === index 
                                                            ? '1px solid rgba(249, 115, 22, 0.35)' 
                                                            : '1px solid rgba(249, 115, 22, 0.15)',
                                                        color: 'var(--accent-pink)',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        transition: 'all 0.2s ease',
                                                        cursor: 'default'
                                                    }}
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                            {resumeData.skills.length > 10 && (
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '2px', fontWeight: '500' }}>
                                                    +{resumeData.skills.length - 10} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.5', fontWeight: '500' }}>
                                    No resume analyzed yet. Upload one on the home screen to optimize matching.
                                </p>
                                <button
                                    onClick={() => navigate('/')}
                                    style={{
                                        background: 'rgba(249, 115, 22, 0.08)',
                                        border: '1px solid rgba(249, 115, 22, 0.25)',
                                        color: 'var(--accent-primary)',
                                        fontSize: '11.5px',
                                        fontWeight: '700',
                                        padding: '7px 14px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 12px rgba(249, 115, 22, 0.05)'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(249, 115, 22, 0.15)';
                                        e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(249, 115, 22, 0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.25)';
                                    }}
                                >
                                    Upload Resume
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quick Starter Prompts */}
                    <div style={{
                        background: 'rgba(10, 10, 12, 0.35)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.002) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <Compass size={16} className="text-orange-500" />
                            <span style={{ fontSize: '12.5px', fontWeight: '750', color: '#FFFFFF', letterSpacing: '-0.01em' }}>Suggested Prompts</span>
                        </div>

                        {suggestedPrompts.map((prompt, i) => (
                            <button
                                key={i}
                                onClick={() => handleSendMessage(prompt)}
                                disabled={loading}
                                onMouseEnter={() => setHoveredPromptIndex(i)}
                                onMouseLeave={() => setHoveredPromptIndex(null)}
                                style={{
                                    textAlign: 'left',
                                    fontSize: '11px',
                                    fontWeight: '550',
                                    color: hoveredPromptIndex === i ? '#FFFFFF' : 'var(--text-secondary)',
                                    background: hoveredPromptIndex === i ? 'rgba(249, 115, 22, 0.03)' : 'rgba(255, 255, 255, 0.015)',
                                    border: hoveredPromptIndex === i ? '1px solid rgba(249, 115, 22, 0.25)' : '1px solid rgba(255, 255, 255, 0.04)',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transform: hoveredPromptIndex === i ? 'translateX(4px)' : 'none',
                                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <HelpCircle size={13} style={{ color: hoveredPromptIndex === i ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)', transition: 'color 0.2s', flexShrink: 0 }} />
                                <span className="line-clamp-2 leading-snug">{prompt}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Chat Panel */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(10, 10, 12, 0.3)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.001) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
                }}>
                    
                    {/* Chat Messages Log */}
                    <div 
                        ref={chatContainerRef}
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '28px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px'
                        }}
                    >
                        <AnimatePresence initial={false}>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '100%'
                                    }}
                                >
                                    {/* Sender Badge */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginBottom: '6px',
                                        fontSize: '9.5px',
                                        color: 'var(--text-muted)',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em'
                                    }}>
                                        {msg.role === 'user' ? (
                                            <>
                                                <span>You</span>
                                                <div style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(255, 255, 255, 0.06)',
                                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '9px',
                                                    color: '#FFFFFF'
                                                }}>
                                                    <User size={10} />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(249, 115, 22, 0.15)',
                                                    border: '1px solid rgba(249, 115, 22, 0.35)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '9px',
                                                    color: 'var(--accent-primary)',
                                                    boxShadow: '0 0 8px rgba(249,115,22,0.2)'
                                                }}>
                                                    <Cpu size={10} />
                                                </div>
                                                <span>Advisor</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Message Text Bubble */}
                                    <div 
                                        style={{
                                            wordBreak: 'break-word',
                                            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                            boxShadow: msg.role === 'user' 
                                                ? '0 8px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)' 
                                                : '0 10px 40px rgba(234, 88, 12, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                                            background: msg.role === 'user'
                                                ? 'rgba(20, 20, 25, 0.95)'
                                                : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                                            border: msg.role === 'user'
                                                ? '1px solid rgba(255, 255, 255, 0.08)'
                                                : '1px solid rgba(255, 255, 255, 0.12)',
                                            color: '#FFFFFF',
                                            padding: '16px 20px',
                                            fontSize: '12.5px',
                                            lineHeight: '1.6',
                                            maxWidth: '80%'
                                        }}
                                    >
                                        {msg.role === 'user' ? (
                                            <p style={{ margin: 0, color: '#F4F4F5' }}>{msg.text}</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                {renderMarkdown(msg.text)}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Typing / Loading Indicator */}
                        {loading && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '6px',
                                    fontSize: '9.5px',
                                    color: 'var(--text-muted)',
                                    fontWeight: '700',
                                    textTransform: 'uppercase'
                                }}>
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: 'rgba(249, 115, 22, 0.15)',
                                        border: '1px solid rgba(249, 115, 22, 0.35)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '9px',
                                        color: 'var(--accent-primary)'
                                    }}>
                                        <Cpu size={10} />
                                    </div>
                                    <span>Advisor is analyzing...</span>
                                </div>
                                <div style={{
                                    background: 'rgba(249, 115, 22, 0.04)',
                                    border: '1px solid rgba(249, 115, 22, 0.25)',
                                    padding: '14px 22px',
                                    borderRadius: '4px 16px 16px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                                }}>
                                    <span className="dot-pulse" style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent-primary)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both' }} />
                                    <span className="dot-pulse" style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent-primary)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }} />
                                    <span className="dot-pulse" style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent-primary)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }} />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#fca5a5',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <Cpu size={16} className="text-red-400" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Chat Input Field Container */}
                    <div style={{
                        padding: '12px 28px 16px 28px',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#222226',
                                borderRadius: '28px',
                                padding: '6px 6px 6px 18px',
                                transition: 'all 0.25s ease',
                                border: isInputFocused ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.05)',
                                boxShadow: isInputFocused ? '0 8px 32px rgba(0, 0, 0, 0.3)' : 'none'
                            }}
                        >
                            <input 
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                                disabled={loading}
                                placeholder="Ask me anything about your resume, skills, or target jobs"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#FFFFFF',
                                    fontSize: '14px',
                                    padding: '8px 0',
                                    fontWeight: '450'
                                }}
                            />
                            
                            <button
                                type="submit"
                                disabled={loading || !inputValue.trim()}
                                onMouseEnter={() => setIsSendHovered(true)}
                                onMouseLeave={() => setIsSendHovered(false)}
                                style={{
                                    background: inputValue.trim() && !loading 
                                        ? (isSendHovered ? '#f97316' : '#ea580c')
                                        : '#ea580c',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: inputValue.trim() && !loading ? 'pointer' : 'default',
                                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                    transform: isSendHovered && inputValue.trim() && !loading ? 'scale(1.06)' : 'scale(1)',
                                    marginRight: '2px',
                                    flexShrink: 0
                                }}
                            >
                                <Send size={13} style={{ transform: 'translateX(0.5px)' }} />
                            </button>
                        </form>
                        
                        <p style={{
                            fontSize: '9px',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                            margin: 0,
                            letterSpacing: '0.01em',
                            fontWeight: '500',
                            opacity: 0.6
                        }}>
                            AI-generated responses can sometimes be inaccurate. Please cross-verify critical information.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Advisor;
