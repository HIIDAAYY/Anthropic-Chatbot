'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, Shield, User, Mail, Users as UsersIcon } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useSidebar } from '../components/SidebarContext';
import { cn } from '@/lib/utils';

interface Agent {
    id: string;
    username: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
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

function rolePill(role: string) {
    switch (role) {
        case 'SUPER_ADMIN':
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-violet-100 text-violet-700">Super Admin</span>;
        case 'ADMIN':
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-100 text-sky-700">Admin</span>;
        case 'VIEWER':
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Viewer</span>;
        default:
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">{role}</span>;
    }
}

const MOCK_AGENTS: Agent[] = [
    { id: 'admin-1', username: 'admin', name: 'Super Admin', email: 'admin@example.com', role: 'SUPER_ADMIN', isActive: true, createdAt: new Date().toISOString() },
    { id: 'agent-1', username: 'agent1', name: 'Agent One', email: 'agent1@example.com', role: 'ADMIN', isActive: true, createdAt: new Date().toISOString() },
    { id: 'agent-2', username: 'agent2', name: 'Agent Two', email: 'agent2@example.com', role: 'ADMIN', isActive: true, createdAt: new Date().toISOString() },
];

export default function AgentsPage() {
    const { toggle } = useSidebar();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/admin/agents');
            if (res.ok) {
                const data = await res.json();
                setAgents(data.agents || MOCK_AGENTS);
            } else {
                setAgents(MOCK_AGENTS);
            }
        } catch (error) {
            console.error('Failed to fetch agents:', error);
            setAgents(MOCK_AGENTS);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        { title: 'Total Agen', value: agents.length, sub: 'Anggota tim aktif', icon: UsersIcon, iconBg: 'bg-violet-100 text-violet-600' },
        { title: 'Super Admin', value: agents.filter((a) => a.role === 'SUPER_ADMIN').length, sub: 'Akses penuh', icon: Shield, iconBg: 'bg-amber-100 text-amber-600' },
        { title: 'Aktif Sekarang', value: agents.filter((a) => a.isActive).length, sub: 'Sedang online', icon: User, iconBg: 'bg-emerald-100 text-emerald-600' },
    ];

    return (
        <div>
            <PageHeader
                title="Agen"
                subtitle="Kelola anggota tim dan akses"
                toggleSidebar={toggle}
                actions={
                    <Button disabled className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Tambah Agen
                    </Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-3 mb-6">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                            <div className="flex items-start justify-between mb-3">
                                <div className="text-sm text-gray-500 font-medium">{s.title}</div>
                                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', s.iconBg)}>
                                    <Icon className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</div>
                            <div className="text-xs text-gray-500 mt-1">{s.sub}</div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">Anggota Tim</h2>
                </div>

                {loading ? (
                    <div className="py-16 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                    </div>
                ) : (
                    <>
                        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/60 border-b border-gray-100">
                            <div className="col-span-3">Nama</div>
                            <div className="col-span-2">Username</div>
                            <div className="col-span-3">Email</div>
                            <div className="col-span-2">Peran</div>
                            <div className="col-span-1">Status</div>
                            <div className="col-span-1 text-right">Aksi</div>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {agents.map((agent) => {
                                const initials = agent.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                                return (
                                    <div key={agent.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-violet-50/30 transition-colors items-center">
                                        <div className="md:col-span-3 flex items-center gap-3">
                                            <div className={cn('h-10 w-10 rounded-full bg-gradient-to-br text-white flex items-center justify-center text-xs font-semibold', avatarColor(agent.name))}>
                                                {initials}
                                            </div>
                                            <div className="font-semibold text-gray-900">{agent.name}</div>
                                        </div>
                                        <div className="md:col-span-2 text-sm text-gray-700">{agent.username}</div>
                                        <div className="md:col-span-3 flex items-center gap-1.5 text-sm text-gray-600">
                                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                                            <span className="truncate">{agent.email}</span>
                                        </div>
                                        <div className="md:col-span-2">{rolePill(agent.role)}</div>
                                        <div className="md:col-span-1">
                                            {agent.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" /> Nonaktif
                                                </span>
                                            )}
                                        </div>
                                        <div className="md:col-span-1 flex justify-end">
                                            <Button variant="ghost" size="sm" disabled className="text-gray-400">
                                                Edit
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            <div className="text-center text-xs text-gray-400 mt-6 space-y-0.5">
                <p>Fitur pengelolaan agen akan segera hadir.</p>
                <p>Saat ini menampilkan agen dari database seed.</p>
            </div>
        </div>
    );
}
