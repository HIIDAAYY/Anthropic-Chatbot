'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useSidebar } from '../components/SidebarContext';
import { cn } from '@/lib/utils';

function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

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

function statusPill(status: string) {
    switch (status) {
        case 'ACTIVE':
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Aktif</span>;
        case 'ENDED':
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Selesai</span>;
        case 'REDIRECTED':
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">Dialihkan</span>;
        default:
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">{status}</span>;
    }
}

export default function ConversationsPage() {
    const router = useRouter();
    const { toggle } = useSidebar();

    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'ENDED' | 'REDIRECTED'>('ALL');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const debouncedSearch = useDebounceValue(search, 500);

    useEffect(() => {
        fetchConversations();
    }, [debouncedSearch, status, page]);

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (status !== 'ALL') params.append('status', status);
            params.append('page', page.toString());
            params.append('limit', '20');

            const res = await fetch(`/api/admin/conversations?${params.toString()}`);
            const data = await res.json();
            setConversations(data.conversations);
            setTotalPages(data.pagination.pages);
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        } finally {
            setLoading(false);
        }
    };

    const filterButtons: { value: typeof status; label: string }[] = [
        { value: 'ALL', label: 'Semua' },
        { value: 'ACTIVE', label: 'Aktif' },
        { value: 'ENDED', label: 'Selesai' },
        { value: 'REDIRECTED', label: 'Dialihkan' },
    ];

    return (
        <div>
            <PageHeader
                title="Conversations"
                subtitle="Kelola semua percakapan pelanggan"
                toggleSidebar={toggle}
                actions={
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Cari percakapan..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 w-64 bg-white border-gray-200 rounded-lg"
                            />
                        </div>
                    </div>
                }
            />

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Filter Pills */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 flex-wrap">
                    {filterButtons.map((btn) => (
                        <button
                            key={btn.value}
                            onClick={() => setStatus(btn.value)}
                            className={cn(
                                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                status === btn.value
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
                            )}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Table header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/60 border-b border-gray-100">
                    <div className="col-span-4">Customer</div>
                    <div className="col-span-4">Pesan Terakhir</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1">Waktu</div>
                    <div className="col-span-1 text-right">Aksi</div>
                </div>

                {/* Rows */}
                {loading ? (
                    <div className="py-16 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 text-sm">
                        Tidak ada percakapan ditemukan
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {conversations.map((conv) => {
                            const name = conv.customer.name || 'Unknown';
                            const initials = name
                                .split(' ')
                                .map((p: string) => p[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase();
                            const lastMsg = conv.lastMessage?.content || 'Belum ada pesan';
                            const safeMsg = typeof lastMsg === 'string' ? lastMsg : JSON.stringify(lastMsg);
                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => router.push(`/admin/conversations/${conv.id}`)}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-violet-50/30 cursor-pointer transition-colors items-center"
                                >
                                    <div className="md:col-span-4 flex items-center gap-3">
                                        <div className={cn('h-10 w-10 rounded-full bg-gradient-to-br text-white flex items-center justify-center text-xs font-semibold shrink-0', avatarColor(name))}>
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-gray-900 truncate">{name}</div>
                                            <div className="text-xs text-gray-500 truncate">{conv.customer.phoneNumber}</div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-4 text-sm text-gray-600 truncate">
                                        {safeMsg}
                                    </div>
                                    <div className="md:col-span-2">{statusPill(conv.status)}</div>
                                    <div className="md:col-span-1 text-xs text-gray-500">
                                        {new Date(conv.startedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                    </div>
                                    <div className="md:col-span-1 flex justify-end">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-violet-600">
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        Halaman {page} dari {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="rounded-lg"
                        >
                            Sebelumnya
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="rounded-lg"
                        >
                            Selanjutnya
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
