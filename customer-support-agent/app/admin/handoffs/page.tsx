'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, Clock } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useSidebar } from '../components/SidebarContext';
import { cn } from '@/lib/utils';

const PALETTE = [
    'from-violet-500 to-indigo-600',
    'from-pink-500 to-rose-600',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-600',
    'from-sky-400 to-blue-600',
];

function avatarColor(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

function priorityPill(priority: number) {
    switch (priority) {
        case 3:
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">Urgent</span>;
        case 2:
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">Tinggi</span>;
        case 1:
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Sedang</span>;
        default:
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Rendah</span>;
    }
}

function statusPill(status: string) {
    switch (status) {
        case 'PENDING':
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Menunggu</span>;
        case 'IN_PROGRESS':
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-violet-100 text-violet-700">Diproses</span>;
        case 'RESOLVED':
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Selesai</span>;
        default:
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">{status}</span>;
    }
}

export default function HandoffQueuePage() {
    const router = useRouter();
    const { toggle } = useSidebar();
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

    const formatWaiting = (date: string) => {
        const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}j ${mins % 60}m`;
        return `${Math.floor(hrs / 24)}h`;
    };

    return (
        <div>
            <PageHeader
                title="Antrian Handoff"
                subtitle="Daftar percakapan yang membutuhkan agen manusia"
                toggleSidebar={toggle}
            />

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">Permintaan Tertunda</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Klaim untuk mulai menangani percakapan</p>
                </div>

                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/60 border-b border-gray-100">
                    <div className="col-span-1">Prioritas</div>
                    <div className="col-span-3">Customer</div>
                    <div className="col-span-3">Alasan</div>
                    <div className="col-span-1">Menunggu</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-2">Ditugaskan</div>
                    <div className="col-span-1 text-right">Aksi</div>
                </div>

                {loading ? (
                    <div className="py-16 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                    </div>
                ) : handoffs.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 text-sm">
                        Tidak ada handoff yang menunggu
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {handoffs.map((handoff) => {
                            const name = handoff.conversation.customer.name || 'Unknown';
                            const initials = name
                                .split(' ')
                                .map((p: string) => p[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase();
                            return (
                                <div
                                    key={handoff.id}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-violet-50/30 transition-colors items-center"
                                >
                                    <div className="md:col-span-1">{priorityPill(handoff.priority)}</div>
                                    <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                                        <div className={cn('h-10 w-10 rounded-full bg-gradient-to-br text-white flex items-center justify-center text-xs font-semibold shrink-0', avatarColor(name))}>
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-gray-900 truncate">{name}</div>
                                            <div className="text-xs text-gray-500 truncate">{handoff.conversation.customer.phoneNumber}</div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-3 text-sm text-gray-600 truncate" title={handoff.handoffReason}>
                                        {handoff.handoffReason}
                                    </div>
                                    <div className="md:col-span-1">
                                        <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                                            <Clock className="h-3 w-3" />
                                            {formatWaiting(handoff.handoffAt)}
                                        </div>
                                    </div>
                                    <div className="md:col-span-1">{statusPill(handoff.status)}</div>
                                    <div className="md:col-span-2 text-sm text-gray-700 truncate">
                                        {handoff.assignedAgent?.name || <span className="text-gray-400">—</span>}
                                    </div>
                                    <div className="md:col-span-1 flex justify-end gap-2">
                                        {handoff.status === 'PENDING' && (
                                            <Button
                                                size="sm"
                                                onClick={() => claimHandoff(handoff.id)}
                                                className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
                                            >
                                                Klaim
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-400 hover:text-violet-600"
                                            onClick={() => router.push(`/admin/conversations/${handoff.conversationId}`)}
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
