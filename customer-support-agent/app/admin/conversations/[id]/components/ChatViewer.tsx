'use client';

import { useEffect, useRef } from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface ChatViewerProps {
    messages: Message[];
    customerName?: string;
}

export default function ChatViewer({ messages, customerName = 'Customer' }: ChatViewerProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const copyMessage = async (id: string, content: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // Group messages by date
    const groupedMessages: { [date: string]: Message[] } = {};
    messages.forEach((msg) => {
        const date = formatDate(msg.timestamp);
        if (!groupedMessages[date]) {
            groupedMessages[date] = [];
        }
        groupedMessages[date].push(msg);
    });

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                        {/* Date Separator */}
                        <div className="flex justify-center mb-4">
                            <span className="px-3 py-1 text-xs text-muted-foreground bg-white dark:bg-gray-800 rounded-full shadow-sm">
                                {date}
                            </span>
                        </div>

                        {/* Messages */}
                        {msgs.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-2 mb-3 ${
                                    message.role === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                            >
                                {/* Avatar for assistant */}
                                {message.role === 'assistant' && (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-primary" />
                                    </div>
                                )}

                                {/* Message Bubble */}
                                <div
                                    className={`group relative max-w-[70%] ${
                                        message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-white dark:bg-gray-800 border'
                                    } rounded-2xl px-4 py-2 shadow-sm`}
                                >
                                    {/* Sender Label */}
                                    <div className={`text-xs mb-1 ${
                                        message.role === 'user'
                                            ? 'text-primary-foreground/70'
                                            : 'text-muted-foreground'
                                    }`}>
                                        {message.role === 'user' ? customerName : 'AI Assistant'}
                                    </div>

                                    {/* Message Content */}
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                        {message.content}
                                    </p>

                                    {/* Timestamp */}
                                    <div className={`text-xs mt-1 ${
                                        message.role === 'user'
                                            ? 'text-primary-foreground/60'
                                            : 'text-muted-foreground'
                                    }`}>
                                        {formatTime(message.timestamp)}
                                    </div>

                                    {/* Copy Button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 ${
                                            message.role === 'user' ? '-left-10 -right-auto' : ''
                                        }`}
                                        onClick={() => copyMessage(message.id, message.content)}
                                    >
                                        {copiedId === message.id ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                {/* Avatar for user */}
                                {message.role === 'user' && (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                        <User className="w-4 h-4 text-primary-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}

                {/* Empty State */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Bot className="h-12 w-12 mb-2 opacity-50" />
                        <p>No messages yet</p>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
