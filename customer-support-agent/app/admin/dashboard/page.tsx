'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, ArrowLeftRight, CheckCircle, TrendingUp } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useSidebar } from '../components/SidebarContext';

export default function DashboardPage() {
    const { toggle } = useSidebar();
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('today');

    useEffect(() => {
        fetchMetrics();
    }, [period]);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/analytics/overview?period=${period}`);
            const data = await res.json();
            setMetrics(data.metrics);
        } catch (error) {
            console.error('Failed to fetch metrics', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        {
            title: 'Total Percakapan',
            value: metrics?.totalConversations ?? 0,
            sub: 'Pada periode terpilih',
            icon: MessageSquare,
            iconBg: 'bg-violet-100 text-violet-600',
        },
        {
            title: 'Handoff Aktif',
            value: metrics?.activeHandoffs ?? 0,
            sub: 'Menunggu tindakan',
            icon: ArrowLeftRight,
            iconBg: 'bg-amber-100 text-amber-600',
        },
        {
            title: 'AI Resolution Rate',
            value: `${metrics?.aiResolutionRate ?? 0}%`,
            sub: 'Tanpa bantuan manusia',
            icon: CheckCircle,
            iconBg: 'bg-emerald-100 text-emerald-600',
        },
        {
            title: 'Avg Intent Score',
            value: metrics?.avgIntentScore ?? 0,
            sub: 'Potensi penjualan',
            icon: TrendingUp,
            iconBg: 'bg-indigo-100 text-indigo-600',
        },
    ];

    return (
        <div>
            <PageHeader
                title="Dashboard"
                subtitle="Ringkasan performa HAI Assistant"
                toggleSidebar={toggle}
                actions={
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[160px] bg-white border-gray-200 rounded-lg">
                            <SelectValue placeholder="Periode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Hari Ini</SelectItem>
                            <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                            <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                        </SelectContent>
                    </Select>
                }
            />

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                        {stats.map((s) => {
                            const Icon = s.icon;
                            return (
                                <div
                                    key={s.title}
                                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="text-sm text-gray-500 font-medium">{s.title}</div>
                                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</div>
                                    <div className="text-xs text-gray-500 mt-1">{s.sub}</div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Ikhtisar</h2>
                                    <p className="text-xs text-gray-500">Tren percakapan periode terpilih</p>
                                </div>
                            </div>
                            <div className="h-64 flex flex-col items-center justify-center text-center text-gray-400 bg-gray-50/60 rounded-xl">
                                <MessageSquare className="h-10 w-10 mb-2 opacity-40" />
                                <p className="text-sm">Grafik akan segera hadir</p>
                                <p className="text-xs">(Memerlukan library Recharts)</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Aktivitas Terbaru</h2>
                                <p className="text-xs text-gray-500">Update terkini sistem</p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">System Ready</p>
                                        <p className="text-xs text-gray-500">Dashboard telah dimuat</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
