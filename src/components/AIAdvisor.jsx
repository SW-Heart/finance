import React, { useState, useRef, useEffect, useCallback } from 'react';
import MarkdownIt from 'markdown-it';
import { X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatWithAdvisorStream } from '../api/aiAdvisor';
import './AIAdvisor.css';

// 初始化 markdown-it
const md = new MarkdownIt({
    html: false, // 禁用 HTML 标签以防止 XSS
    breaks: true, // 转换 \n 为 <br>
    linkify: true // 自动识别链接
});

// 独立的 AI 宠物图标组件
const AIPetIcon = ({ className = "", animated = true }) => (
    <svg className={`ai-pet-svg ${className} ${!animated ? 'static' : ''}`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g className="pet-ring-outer">
            <circle cx="50" cy="50" r="42" stroke="url(#paint0_linear)" strokeWidth="2" strokeDasharray="10 10" strokeOpacity="0.6" />
        </g>
        <g className="pet-ring-inner">
            <circle cx="50" cy="50" r="36" stroke="url(#paint1_linear)" strokeWidth="1.5" strokeDasharray="4 8" strokeOpacity="0.8" />
        </g>
        <g className="pet-main">
            <path d="M50 78C62 78 70 70 70 58C70 46 62 40 50 40C38 40 30 46 30 58C30 70 38 78 50 78Z" fill="#1E2332" stroke="#FFD700" strokeWidth="2" />
            <ellipse cx="50" cy="58" rx="14" ry="10" fill="#0F1219" />
            <g className="pet-eyes">
                <circle cx="45" cy="58" r="3" fill="#4A90E2" className="pet-eye-glow" />
                <circle cx="55" cy="58" r="3" fill="#4A90E2" className="pet-eye-glow" />
            </g>
            <path d="M30 52L22 44" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" className="pet-ear-left" />
            <path d="M70 52L78 44" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" className="pet-ear-right" />
            <circle cx="22" cy="44" r="3" fill="#FFD700" />
            <circle cx="78" cy="44" r="3" fill="#FFD700" />
            <path d="M50 40V30" stroke="#FFD700" strokeWidth="2" className="pet-antenna" />
            <circle cx="50" cy="28" r="4" fill="#FF4D4D" className="pet-sensor" />
        </g>
        <defs>
            <linearGradient id="paint0_linear" x1="50" y1="8" x2="50" y2="92" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFD700" stopOpacity="0" />
                <stop offset="0.5" stopColor="#FFD700" />
                <stop offset="1" stopColor="#FFD700" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="paint1_linear" x1="50" y1="14" x2="50" y2="86" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4A90E2" stopOpacity="0" />
                <stop offset="0.5" stopColor="#4A90E2" />
                <stop offset="1" stopColor="#4A90E2" stopOpacity="0" />
            </linearGradient>
        </defs>
    </svg>
);

const AIAdvisor = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const streamingContentRef = useRef('');
    const isProcessingRef = useRef(false);

    const [panelWidth, setPanelWidth] = useState(420);
    const [isResizing, setIsResizing] = useState(false);
    const resizeRef = useRef(false); // 用于避免频繁状态更新导致的性能问题

    // 自动滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    // 自动调整输入框高度
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    // 处理 Resize 逻辑
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsResizing(true);
        resizeRef.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    };

    const handleMouseMove = useCallback((e) => {
        if (!resizeRef.current) return;

        const maxWidth = window.innerWidth * 2 / 3;
        const minWidth = 420;

        // 计算新宽度：屏幕宽度 - 鼠标 X 坐标
        let newWidth = window.innerWidth - e.clientX;

        // 限制范围
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;

        setPanelWidth(newWidth);
    }, []);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
        resizeRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, [handleMouseMove]);

    // 发送消息（流式）
    const handleSend = async (e) => {
        e?.preventDefault();

        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) return;

        const userMessage = { role: 'user', content: trimmedInput };
        const newMessages = [...messages, userMessage];

        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        setStreamingContent('');
        streamingContentRef.current = '';
        isProcessingRef.current = false;

        await chatWithAdvisorStream(
            user.id,
            newMessages,
            // onChunk
            (chunk) => {
                streamingContentRef.current += chunk;
                setStreamingContent(streamingContentRef.current);
            },
            // onDone
            () => {
                // 防止重复处理
                if (isProcessingRef.current) return;
                isProcessingRef.current = true;

                const finalContent = streamingContentRef.current;
                if (finalContent) {
                    setMessages(msgs => [...msgs, { role: 'assistant', content: finalContent }]);
                }
                setStreamingContent('');
                streamingContentRef.current = '';
                setIsLoading(false);
            },
            // onError
            (error) => {
                console.error('AI 咨询错误:', error);
                setStreamingContent('');
                streamingContentRef.current = '';
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '抱歉，我暂时无法回答您的问题。请稍后再试。🙏'
                }]);
                setIsLoading(false);
            }
        );
    };

    // 处理快捷建议
    const handleSuggestion = (suggestion) => {
        setInput(suggestion);
        textareaRef.current?.focus();
    };

    // 处理回车发送
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestions = [
        '我的资产配置合理吗？',
        '给我一些理财建议',
        '如何优化负债结构？',
        '我的净资产是多少？'
    ];

    return (
        <>
            {/* 浮动按钮 */}
            {/* 浮动宠物精灵 (SVG版) */}
            <div
                className={`ai-pet-container ${isOpen ? 'hidden' : ''}`}
                onClick={() => setIsOpen(true)}
                title="点击咨询小金"
            >
                <div className="ai-pet-body">
                    {/* 背景光晕 */}
                    <div className="ai-pet-glow"></div>

                    {/* 动态 SVG 角色 */}
                    <AIPetIcon />

                    <div className="ai-pet-sparkles">
                        <span>✨</span>
                        <span>✨</span>
                    </div>
                </div>
                <div className="ai-pet-bubble">
                    点我咨询资产情况哦~
                </div>
            </div>

            {/* 遮罩层 */}
            <div
                className={`ai-advisor-overlay ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(false)}
            />

            {/* 对话面板 */}
            <aside
                className={`ai-advisor-panel ${isOpen ? 'open' : ''} ${isResizing ? 'resizing' : ''}`}
                style={{ width: isOpen ? panelWidth : 420 }}
            >
                {/* 拖拽把手 */}
                <div
                    className="ai-advisor-resize-handle"
                    onMouseDown={handleMouseDown}
                    title="拖动调整宽度"
                />

                {/* 头部 */}
                <header className="ai-advisor-header">
                    <div className="ai-advisor-title">
                        <div className="ai-advisor-avatar">
                            <AIPetIcon animated={false} />
                        </div>
                        <div className="ai-advisor-info">
                            <h3>小金 · AI 财务顾问</h3>
                            <p>个人/家庭资产规划师</p>
                        </div>
                    </div>
                    <button
                        className="ai-advisor-close"
                        onClick={() => setIsOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* 消息区域 */}
                <div className="ai-advisor-messages">
                    {messages.length === 0 && !streamingContent ? (
                        <div className="ai-welcome">
                            <div className="ai-welcome-icon">
                                <AIPetIcon style={{ width: 80, height: 80 }} />
                            </div>
                            <h4>您好！我是小金</h4>
                            <p>
                                我是您的专属 AI 财务顾问，可以根据您的资产情况，
                                为您提供个性化的财务分析和理财建议。
                            </p>
                            <div className="ai-suggestions">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        className="ai-suggestion-btn"
                                        onClick={() => handleSuggestion(s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => (
                                <div key={index} className={`ai-message ${msg.role}`}>
                                    <div className="ai-message-avatar">
                                        {msg.role === 'user' ? '👤' :
                                            <AIPetIcon animated={false} />
                                        }
                                    </div>
                                    <div className="ai-message-content"
                                        dangerouslySetInnerHTML={{
                                            __html: msg.role === 'assistant'
                                                ? md.render(msg.content)
                                                : msg.content
                                        }}
                                    />
                                </div>
                            ))}

                            {/* 流式输出中的内容 */}
                            {streamingContent && (
                                <div className="ai-message assistant">
                                    <div className="ai-message-avatar">
                                        <AIPetIcon animated={true} />
                                    </div>
                                    <div className="ai-message-content streaming"
                                        dangerouslySetInnerHTML={{ __html: md.render(streamingContent) }}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* 加载状态（仅在等待首个 chunk 时显示） */}
                    {isLoading && !streamingContent && (
                        <div className="ai-loading">
                            <div className="ai-message-avatar">
                                <AIPetIcon animated={true} />
                            </div>
                            <div className="ai-loading-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* 输入区域 */}
                <div className="ai-advisor-input">
                    <form onSubmit={handleSend}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="输入您的问题..."
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="ai-send-btn"
                            disabled={!input.trim() || isLoading}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </aside>
        </>
    );
};

export default AIAdvisor;
