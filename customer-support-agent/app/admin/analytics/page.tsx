'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, Star, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useSidebar } from '../components/SidebarContext';

const CONV_TREND = [135, 158, 175, 145, 180, 168, 190];
const CONV_RESOLVED = [115, 138, 155, 130, 165, 150, 175];
const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const CHANNELS = [
    { name: 'Web Chat', percent: 42, color: '#7c3aed' },
    { name: 'WhatsApp', percent: 25, color: '#a78bfa' },
    { name: 'Email', percent: 18, color: '#c4b5fd' },
    { name: 'Lainnya', percent: 15, color: '#e9d5ff' },
];

const TOPIK = [
    { name: 'Info Produk', count: 340, percent: 100 },
    { name: 'Pengiriman', count: 245, percent: 72 },
    { name: 'Retur', count: 180, percent: 53 },
    { name: 'Pembayaran', count: 120, percent: 35 },
];

function Sparkline({ data, color = '#7c3aed' }: { data: number[]; color?: string }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 120;
    const height = 36;
    const step = width / (data.length - 1);
    const points = data
        .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
        .join(' ');
    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function LineChart({ data, dataResolved, days }: { data: number[]; dataResolved: number[]; days: string[] }) {
    const max = Math.max(...data, ...dataResolved);
    const min = 50;
    const range = max - min;
    const width = 560;
    const height = 220;
    const padLeft = 36;
    const padRight = 12;
    const padTop = 14;
    const padBottom = 24;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;
    const step = innerW / (data.length - 1);

    const toPath = (arr: number[]) =>
        arr
            .map((v, i) => {
                const x = padLeft + i * step;
                const y = padTop + (1 - (v - min) / range) * innerH;
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
            })
            .join(' ');

    const toArea = (arr: number[]) => {
        const top = arr
            .map((v, i) => {
                const x = padLeft + i * step;
                const y = padTop + (1 - (v - min) / range) * innerH;
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
            })
            .join(' ');
        const baseY = padTop + innerH;
        return `${top} L${padLeft + innerW},${baseY} L${padLeft},${baseY} Z`;
    };

    const yTicks = [50, 100, 150, 200];

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56">
            <defs>
                <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
            </defs>

            {yTicks.map((t) => {
                const y = padTop + (1 - (t - min) / range) * innerH;
                return (
                    <g key={t}>
                        <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#f3f4f6" strokeDasharray="3 3" />
                        <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                            {t}
                        </text>
                    </g>
                );
            })}

            <path d={toArea(data)} fill="url(#lineGradient)" />
            <path d={toPath(data)} fill="none" stroke="#7c3aed" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            <path d={toPath(dataResolved)} fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />

            {data.map((v, i) => {
                const x = padLeft + i * step;
                const y = padTop + (1 - (v - min) / range) * innerH;
                const isLast = i === data.length - 1;
                return (
                    <g key={i}>
                        <circle cx={x} cy={y} r={isLast ? 5 : 3} fill="white" stroke="#7c3aed" strokeWidth={2} />
                        {isLast && (
                            <g>
                                <rect x={x - 22} y={y - 28} width={44} height={20} rx={4} fill="#111827" />
                                <text x={x} y={y - 14} textAnchor="middle" fontSize="11" fill="white" fontWeight="600">
                                    {v}
                                </text>
                            </g>
                        )}
                    </g>
                );
            })}

            {days.map((d, i) => {
                const x = padLeft + i * step;
                return (
                    <text key={d} x={x} y={height - 6} textAnchor="middle" fontSize="10" fill="#9ca3af">
                        {d}
                    </text>
                );
            })}
        </svg>
    );
}

function DonutChart({ data }: { data: { name: string; percent: number; color: string }[] }) {
    const size = 130;
    const radius = 50;
    const cx = size / 2;
    const cy = size / 2;
    const stroke = 18;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
            {data.map((d) => {
                const dash = (d.percent / 100) * circumference;
                const el = (
                    <circle
                        key={d.name}
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill="none"
                        stroke={d.color}
                        strokeWidth={stroke}
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={-offset}
                        transform={`rotate(-90 ${cx} ${cy})`}
                        strokeLinecap="butt"
                    />
                );
                offset += dash;
                return el;
            })}
        </svg>
    );
}

export default function AnalyticsPage() {
    const { toggle } = useSidebar();
    const [period, setPeriod] = useState('7d');
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/analytics/overview?period=${period}`);
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <PageHeader
                title="Analytics"
                subtitle="Pantau performa HAI Assistant secara real-time"
                toggleSidebar={toggle}
                actions={
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[160px] bg-white border-gray-200 rounded-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Hari Ini</SelectItem>
                            <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                            <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                            <SelectItem value="90d">90 Hari Terakhir</SelectItem>
                        </SelectContent>
                    </Select>
                }
            />

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
            ) : (
                <>
                    {/* Top hero stats */}
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-700">Rata-rata Respon</div>
                                    <div className="text-xs text-rose-500 flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3" /> 12% dari minggu lalu
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-4xl font-bold text-violet-600">{analytics?.avgResponseTime || '0.8'}</span>
                                    <span className="text-sm text-gray-500 ml-1">detik</span>
                                </div>
                                <Sparkline data={[1.2, 1.0, 1.1, 0.9, 0.95, 0.85, 0.8]} color="#7c3aed" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <Star className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-700">Kepuasan Pelanggan</div>
                                    <div className="text-xs text-emerald-600 flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" /> 3% dari minggu lalu
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <span className="text-4xl font-bold text-violet-600">96</span>
                                    <span className="text-sm text-gray-500 ml-1">%</span>
                                </div>
                                <div className="flex-1 max-w-[140px]">
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '96%' }} />
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1 text-right">Target: 95%</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <MessageSquare className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-700">Total Percakapan</div>
                                    <div className="text-xs text-emerald-600 flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" /> 8% dari minggu lalu
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <div className="text-4xl font-bold text-violet-600">
                                    {(analytics?.totalConversations || 1240).toLocaleString()}
                                </div>
                                <div className="flex items-end gap-1 h-9">
                                    {[35, 45, 55, 40, 60, 70, 85].map((h, i) => (
                                        <div
                                            key={i}
                                            className="w-2 bg-violet-300 rounded-sm"
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts row */}
                    <div className="grid gap-4 lg:grid-cols-3 mb-6">
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="font-bold text-gray-900">Volume Percakapan</h3>
                                    <p className="text-xs text-gray-500">Tren percakapan 7 hari terakhir</p>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                                        <span className="text-gray-600">Percakapan</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                        <span className="text-gray-600">Terselesaikan</span>
                                    </div>
                                </div>
                            </div>
                            <LineChart data={CONV_TREND} dataResolved={CONV_RESOLVED} days={DAYS} />
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="font-bold text-gray-900 mb-3">Distribusi Channel</h3>
                            <div className="flex items-center gap-4">
                                <DonutChart data={CHANNELS} />
                                <div className="flex-1 space-y-2">
                                    {CHANNELS.map((c) => (
                                        <div key={c.name} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                                                <span className="text-gray-600">{c.name}</span>
                                            </div>
                                            <span className="font-semibold text-gray-700">{c.percent}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Topik populer */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                        <h3 className="font-bold text-gray-900 mb-4">Topik Populer</h3>
                        <div className="space-y-4">
                            {TOPIK.map((t, i) => (
                                <div key={t.name} className="flex items-center gap-4">
                                    <div className="w-28 text-sm text-gray-700">{t.name}</div>
                                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${t.percent}%`,
                                                background: i % 2 === 0 ? '#7c3aed' : '#a78bfa',
                                            }}
                                        />
                                    </div>
                                    <div className="w-12 text-right text-sm font-semibold text-gray-700">{t.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="text-xs text-gray-500 mb-1">Handled by AI</div>
                            <div className="text-3xl font-bold text-violet-600">87%</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="text-xs text-gray-500 mb-1">Avg. Handling Time</div>
                            <div className="text-3xl font-bold text-violet-600">2m 15s</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="text-xs text-gray-500 mb-1">Escalation Rate</div>
                            <div className="text-3xl font-bold text-violet-600">13%</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="text-xs text-gray-500 mb-1">Active Now</div>
                            <div className="text-3xl font-bold text-violet-600">{analytics?.activeUsers ?? 24}</div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
