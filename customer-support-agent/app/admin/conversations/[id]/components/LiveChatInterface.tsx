'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface LiveChatInterfaceProps {
    conversationId: string;
    agentName: string;
    onMessageSent: () => void;
}

export default function LiveChatInterface({ conversationId, agentName, onMessageSent }: LiveChatInterfaceProps) {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const quickReplies = [
        "Halo, saya akan membantu Anda hari ini.",
        "Mohon tunggu sebentar, saya cek dulu ya.",
        "Terima kasih sudah menunggu.",
        "Apakah ada hal lain yang bisa saya bantu?",
        "Baik, saya mengerti.",
    ];

    const handleSend = async () => {
        if (!message.trim()) return;
        setSending(true);

        try {
            const res = await fetch('/api/admin/handoff/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, message }),
            });

            if (res.ok) {
                setMessage('');
                onMessageSent();
            }
        } catch (error) {
            console.error('Failed to send message', error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-blue-600">
                    Chatting as {agentName}
                </div>
                <Select onValueChange={(val) => setMessage(val)}>
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="Quick Reply" />
                    </SelectTrigger>
                    <SelectContent>
                        {quickReplies.map((reply, i) => (
                            <SelectItem key={i} value={reply}>{reply}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex gap-2">
                <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="min-h-[80px]"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <Button
                    className="h-auto px-4"
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}
