// ── SafeSpeak — Chatbot Panel Component ─────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { api } from '@/services/api';
import { FileUploadZone } from './FileUploadZone';
import type { ChatbotMessage } from '@/types';

export function ChatbotPanel() {
    const [messages, setMessages] = useState<ChatbotMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleImageAnalysis = async (file: File) => {
        setIsProcessing(true);

        setMessages((prev) => [...prev, {
            role: 'user',
            content: `📷 Uploaded screenshot: ${file.name}`,
            type: 'image_analysis',
        }]);

        try {
            const formData = new FormData();
            formData.append('file', file);
            if (sessionId) formData.append('sessionId', sessionId);

            const response = await api.post('/api/chatbot/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000, // 60s for OCR + ML + LLM pipeline
            });

            const data = response.data;
            setSessionId(data.sessionId);

            // Build structured response
            const label = data.classification.label;
            const confidence = data.classification.confidence;
            const labelEmoji = label === 'clean' ? '✅' : '🚨';

            const botMessage = `🔍 **Text Extracted:**\n"${data.extractedText}"\n\n${labelEmoji} **Classification:** ${label.toUpperCase().replace('_', ' ')} (${Math.round(confidence * 100)}% confidence)\n\n${data.chatbotResponse}`;

            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: botMessage,
                classification: { label, confidence },
            }]);
        } catch (err: any) {
            const backendMessage = err?.response?.data?.detail
                || err?.response?.data?.message
                || err?.message
                || 'Failed to analyze the image.';
            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: `❌ ${backendMessage}`,
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || isProcessing) return;

        const text = inputText.trim();
        setInputText('');
        setIsProcessing(true);

        setMessages((prev) => [...prev, { role: 'user', content: text }]);

        try {
            const response = await api.post('/api/chatbot/message', {
                sessionId: sessionId || 'new',
                message: text,
            });

            setSessionId(response.data.sessionId);
            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: response.data.response,
            }]);
        } catch {
            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const getLabelBadge = (msg: ChatbotMessage) => {
        if (!msg.classification) return null;
        const { label, confidence } = msg.classification;
        if (label === 'clean') return <span className="badge-success"><CheckCircle className="w-3 h-3" />Clean</span>;
        if (label === 'offensive') return <span className="badge-amber"><AlertTriangle className="w-3 h-3" />Offensive ({Math.round(confidence * 100)}%)</span>;
        return <span className="badge-rose"><AlertTriangle className="w-3 h-3" />{label.replace('_', ' ').toUpperCase()} ({Math.round(confidence * 100)}%)</span>;
    };

    return (
        <div className="h-full flex flex-col bg-navy-900">
            {/* Header */}
            <div className="px-3 md:px-6 py-3 md:py-4 border-b border-surface-border bg-navy-950/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-teal to-accent-blue flex items-center justify-center">
                        <Bot className="w-5 h-5 text-navy-900" />
                    </div>
                    <div>
                        <h3 className="text-white font-display font-semibold text-sm">SafeSpeak AI Assistant</h3>
                        <p className="text-white/30 text-xs">Upload screenshots for hate speech analysis</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-4 touch-scroll">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-teal/10 to-accent-blue/10 flex items-center justify-center mb-5">
                            <Shield className="w-10 h-10 text-accent-teal/40" />
                        </div>
                        <h3 className="text-white font-display font-semibold text-lg mb-2">
                            Screenshot Analysis
                        </h3>
                        <p className="text-white/30 text-sm max-w-sm mb-6">
                            Upload a screenshot of a conversation and I'll analyze it for hate speech,
                            classify the content, and suggest next steps.
                        </p>

                        {/* Upload Zone */}
                        <div className="w-full max-w-md">
                            <FileUploadZone onFileSelect={handleImageAnalysis} isUploading={isProcessing} />
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                            >
                                <div
                                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-accent-teal/10 border border-accent-teal/20 text-white rounded-br-md'
                                        : 'bg-surface border border-surface-border text-white/90 rounded-bl-md'
                                        }`}
                                >
                                    {msg.role === 'assistant' && msg.classification && (
                                        <div className="mb-2">{getLabelBadge(msg)}</div>
                                    )}
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                            </div>
                        ))}

                        {isProcessing && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-surface border border-surface-border rounded-2xl rounded-bl-md px-4 py-3">
                                    <div className="flex items-center gap-2 text-accent-teal">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Analyzing...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Upload zone at bottom after first message */}
                        <div className="pt-2">
                            <FileUploadZone onFileSelect={handleImageAnalysis} isUploading={isProcessing} />
                        </div>

                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Message Input */}
            <div className="px-4 md:px-5 py-2.5 md:py-3 border-t border-surface-border bg-navy-950/50 safe-bottom flex-shrink-0">
                <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            placeholder="Ask about hate speech, reporting, or upload a screenshot..."
                            className="input-field py-2 md:py-2.5 text-sm"
                            disabled={isProcessing}
                        />
                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || isProcessing}
                        className="p-2.5 rounded-xl bg-gradient-to-r from-accent-teal to-accent-blue text-navy-900 hover:shadow-lg hover:shadow-accent-teal/25 transition-all active:scale-95 disabled:opacity-30"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-white/20 text-[10px] mt-2 text-center">
                    Session limited to 10 turns · Responses are AI-generated
                </p>
            </div>
        </div>
    );
}
