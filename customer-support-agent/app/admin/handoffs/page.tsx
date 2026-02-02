'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Loader2, ArrowRight, AlertCircle, Clock } from 'lucide-react';

export default function HandoffQueuePage() {
    const router = useRouter();
    const [handoffs, setHandoffs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        fetchUser();
        fetchHandoffs();
        const interval = setInterval(fetchHandoffs, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/admin/auth/me');
            const data = await res.json();
            setCurrentUser(data.user);
        } catch (error) {
            console.error('Failed to fetch user', error);
        }
    };

    const fetchHandoffs = async () => {
        try {
            const res = await fetch('/api/admin/handoff/list');
            const data = await res.json();
            setHandoffs(data.handoffs || []);
        } catch (error) {
            console.error('Failed to fetch handoffs', error);
        } finally {
            setLoading(false);
        }
    };

    const claimHandoff = async (handoffId: string) => {
        if (!currentUser) return;
        try {
            await fetch('/api/admin/handoff/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ handoffId, agentId: currentUser.id }),
            });
            fetchHandoffs();
        } catch (error) {
            console.error('Failed to claim handoff', error);
        }
    };

    const getPriorityBadge = (priority: number) => {
        switch (priority) {
            case 3: return <Badge variant="destructive">Urgent</Badge>;
            case 2: return <Badge className="bg-orange-500">High</Badge>;
            case 1: return <Badge className="bg-yellow-500">Medium</Badge>;
            default: return <Badge variant="secondary">Low</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Handoff Queue</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Priority</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Waiting Time</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : handoffs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No pending handoffs
                                    </TableCell>
                                </TableRow>
                            ) : (
                                handoffs.map((handoff) => (
                                    <TableRow key={handoff.id}>
                                        <TableCell>{getPriorityBadge(handoff.priority)}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{handoff.conversation.customer.name || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">{handoff.conversation.customer.phoneNumber}</div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={handoff.handoffReason}>
                                            {handoff.handoffReason}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {Math.floor((Date.now() - new Date(handoff.handoffAt).getTime()) / 60000)}m ago
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={handoff.status === 'PENDING' ? 'outline' : 'default'}>
                                                {handoff.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {handoff.assignedAgent?.name || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {handoff.status === 'PENDING' && (
                                                    <Button size="sm" onClick={() => claimHandoff(handoff.id)}>
                                                        Claim
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => router.push(`/admin/conversations/${handoff.conversationId}`)}
                                                >
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
