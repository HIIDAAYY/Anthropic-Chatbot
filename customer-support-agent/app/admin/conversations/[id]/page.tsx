'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Phone } from 'lucide-react';
import ChatViewer from './components/ChatViewer';
import HandoffControls from './components/HandoffControls';

export default function ConversationDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [conversation, setConversation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        fetchUser();
        fetchConversation();
    }, [id]);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/admin/auth/me');
            const data = await res.json();
            setCurrentUser(data.user);
        } catch (error) {
            console.error('Failed to fetch user', error);
        }
    };

    const fetchConversation = async () => {
        try {
            const res = await fetch(`/api/admin/conversations/${id}`);
            const data = await res.json();
            setConversation(data.conversation);
        } catch (error) {
            console.error('Failed to fetch conversation', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!conversation) {
        return <div>Conversation not found</div>;
    }

    const { customer, metadata } = conversation;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            {/* Left Column: Chat Area */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                <Card className="flex-1 flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <CardTitle className="text-lg">{customer.name || 'Unknown Customer'}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3" /> {customer.phoneNumber}
                                </div>
                            </div>
                            <Badge variant={conversation.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {conversation.status}
                            </Badge>
                        </div>
                        <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ChatViewer
                            messages={conversation.messages}
                            customerName={customer.name || 'User'}
                        />
                    </CardContent>
                </Card>

                {/* Handoff Controls */}
                {currentUser && (
                    <HandoffControls
                        conversationId={conversation.id}
                        handoff={conversation.handoff}
                        currentUser={currentUser}
                        onUpdate={fetchConversation}
                    />
                )}
            </div>

            {/* Right Column: Metadata & Info */}
            <div className="space-y-6 overflow-y-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Customer Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-muted-foreground">Name</div>
                            <div>{customer.name || '-'}</div>
                            <div className="text-muted-foreground">Phone</div>
                            <div>{customer.phoneNumber}</div>
                            <div className="text-muted-foreground">First Seen</div>
                            <div>{new Date(customer.createdAt).toLocaleDateString()}</div>
                        </div>
                    </CardContent>
                </Card>

                {metadata && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Insights</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">User Mood</div>
                                <Badge variant="outline">{metadata.userMood || 'Unknown'}</Badge>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Sales Stage</div>
                                <Badge variant="secondary">{metadata.salesStage || 'None'}</Badge>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Intent Score</div>
                                <div className="text-lg font-bold">{metadata.intentScore || 0}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Interested In</div>
                                <div className="flex flex-wrap gap-1">
                                    {metadata.servicesInterested.map((s: string) => (
                                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                                    ))}
                                    {metadata.servicesInterested.length === 0 && '-'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
