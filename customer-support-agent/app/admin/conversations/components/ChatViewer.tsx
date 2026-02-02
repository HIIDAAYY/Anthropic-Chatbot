'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface ChatViewerProps {
    messages: Message[];
    customerName: string;
}

export default function ChatViewer({ messages, customerName }: ChatViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="flex flex-col h-[600px] border rounded-md bg-gray-50 dark:bg-gray-900">
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex w-full max-w-[80%] gap-2",
                                isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            <Avatar className="h-8 w-8 mt-1">
                                <AvatarFallback className={isUser ? "bg-blue-500 text-white" : "bg-gray-500 text-white"}>
                                    {isUser ? customerName.charAt(0).toUpperCase() : 'AI'}
                                </AvatarFallback>
                            </Avatar>

                            <div className={cn(
                                "group relative rounded-lg px-4 py-2 text-sm shadow-sm",
                                isUser
                                    ? "bg-blue-600 text-white rounded-tr-none"
                                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none"
                            )}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                <div className={cn(
                                    "text-[10px] mt-1 opacity-70",
                                    isUser ? "text-blue-100" : "text-gray-500"
                                )}>
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "absolute top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                                        isUser ? "-left-8 text-gray-500" : "-right-8 text-gray-500"
                                    )}
                                    onClick={() => copyToClipboard(msg.content, msg.id)}
                                >
                                    {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
