'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, UserPlus, Lock } from 'lucide-react';
import LiveChatInterface from './LiveChatInterface';
import { useRouter } from 'next/navigation';

interface HandoffControlsProps {
    conversationId: string;
    handoff: any; // Type this properly if possible
    currentUser: any;
    onUpdate: () => void;
}

export default function HandoffControls({ conversationId, handoff, currentUser, onUpdate }: HandoffControlsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [reason, setReason] = useState('');
    const [priority, setPriority] = useState('1'); // Medium
    const [resolutionNotes, setResolutionNotes] = useState('');

    const createHandoff = async () => {
        setLoading(true);
        try {
            await fetch('/api/admin/handoff/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, reason, priority: parseInt(priority) }),
            });
            onUpdate();
        } catch (error) {
            console.error('Failed to create handoff', error);
        } finally {
            setLoading(false);
        }
    };

    const assignToMe = async () => {
        setLoading(true);
        try {
            await fetch('/api/admin/handoff/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ handoffId: handoff.id, agentId: currentUser.id }),
            });
            onUpdate();
        } catch (error) {
            console.error('Failed to assign handoff', error);
        } finally {
            setLoading(false);
        }
    };

    const resolveHandoff = async () => {
        setLoading(true);
        try {
            await fetch('/api/admin/handoff/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ handoffId: handoff.id, resolutionNotes }),
            });
            onUpdate();
        } catch (error) {
            console.error('Failed to resolve handoff', error);
        } finally {
            setLoading(false);
        }
    };

    if (!handoff || handoff.status === 'RESOLVED') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Handoff Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {handoff?.status === 'RESOLVED' ? (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-200 dark:border-green-900">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-1">
                                <CheckCircle className="h-4 w-4" /> Resolved
                            </div>
                            <p className="text-sm text-muted-foreground">{handoff.resolutionNotes}</p>
                            <div className="text-xs text-muted-foreground mt-2">
                                Resolved by {handoff.assignedAgent?.name} at {new Date(handoff.resolvedAt).toLocaleString()}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-sm text-muted-foreground">
                                This conversation is currently handled by AI.
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Reason for Handoff</label>
                                <Textarea
                                    placeholder="e.g. Customer requested human agent"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Priority</label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Low</SelectItem>
                                        <SelectItem value="1">Medium</SelectItem>
                                        <SelectItem value="2">High</SelectItem>
                                        <SelectItem value="3">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={createHandoff} disabled={loading || !reason} className="w-full">
                                Request Handoff
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Handoff is ACTIVE (Pending or In Progress)
    const isAssignedToMe = handoff.assignedAgentId === currentUser.id;
    const isPending = handoff.status === 'PENDING';

    return (
        <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-blue-50 dark:bg-blue-900/20 pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        Active Handoff
                    </CardTitle>
                    <Badge variant={isPending ? "outline" : "default"}>
                        {handoff.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="text-sm">
                    <span className="font-medium">Reason:</span> {handoff.handoffReason}
                </div>

                {isPending && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-900">
                        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-medium mb-1">
                            <AlertCircle className="h-4 w-4" /> Waiting for Agent
                        </div>
                        <Button onClick={assignToMe} disabled={loading} size="sm" className="w-full mt-2">
                            Assign to Me
                        </Button>
                    </div>
                )}

                {!isPending && !isAssignedToMe && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                        <div className="flex items-center gap-2 text-muted-foreground font-medium">
                            <Lock className="h-4 w-4" />
                            Handled by {handoff.assignedAgent?.name}
                        </div>
                    </div>
                )}

                {isAssignedToMe && (
                    <div className="space-y-4">
                        <LiveChatInterface
                            conversationId={conversationId}
                            agentName={currentUser.name}
                            onMessageSent={onUpdate}
                        />

                        <div className="pt-4 border-t space-y-2">
                            <label className="text-xs font-medium">Resolution Notes</label>
                            <Textarea
                                placeholder="How was this resolved?"
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                            />
                            <Button
                                onClick={resolveHandoff}
                                disabled={loading || !resolutionNotes}
                                variant="outline"
                                className="w-full"
                            >
                                Mark as Resolved
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
