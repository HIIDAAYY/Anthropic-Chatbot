'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    BarChart3,
    Settings,
    LogOut,
    X,
    ArrowLeftRight,
    ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [pendingHandoffs, setPendingHandoffs] = useState(0);

    useEffect(() => {
        fetch('/api/admin/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) setUser(data.user);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        const fetchHandoffs = async () => {
            try {
                const res = await fetch('/api/admin/handoff/list');
                const data = await res.json();
                const pending = (data.handoffs || []).filter((h: any) => h.status === 'PENDING').length;
                setPendingHandoffs(pending);
            } catch {
                // ignore
            }
        };
        fetchHandoffs();
        const interval = setInterval(fetchHandoffs, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/admin/auth/logout', { method: 'POST' });
            router.push('/admin/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const menuItems = [
        { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/conversations', label: 'Conversations', icon: MessageSquare },
        { href: '/admin/handoffs', label: 'Antrian Handoff', icon: ArrowLeftRight, badge: pendingHandoffs > 0 ? pendingHandoffs : undefined },
        { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/admin/agents', label: 'Agen', icon: Users },
        { href: '/admin/settings', label: 'Pengaturan', icon: Settings },
    ];

    const initials = (user?.name || 'Admin')
        .split(' ')
        .map((p: string) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={cn(
                    'fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-100 transition-transform duration-300 ease-in-out md:translate-x-0 md:static flex flex-col',
                    isOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                {/* Brand */}
                <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                            H
                        </div>
                        <div className="leading-tight">
                            <div className="font-bold text-gray-900 text-base">HAI</div>
                            <div className="text-xs text-gray-500">Assistant Dashboard</div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Menu */}
                <nav className="flex-1 px-4 py-5 overflow-y-auto">
                    <div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-3 px-2">
                        Menu Utama
                    </div>
                    <div className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                                        isActive
                                            ? 'bg-violet-50 text-violet-700 font-medium'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'h-2 w-2 rounded-full transition-colors',
                                            isActive ? 'bg-violet-600' : 'bg-gray-200 group-hover:bg-gray-300',
                                        )}
                                    />
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge !== undefined && (
                                        <span
                                            className={cn(
                                                'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                                                isActive
                                                    ? 'bg-violet-600 text-white'
                                                    : 'bg-violet-100 text-violet-700',
                                            )}
                                        >
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* User card */}
                <div className="border-t border-gray-100 p-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                                    {initials}
                                </div>
                                <div className="flex-1 text-left leading-tight min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 truncate">
                                        {user?.name || 'Admin Staff'}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        {user?.email || 'admin@hai.co'}
                                    </div>
                                </div>
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="top" className="w-56">
                            <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled>
                                {user?.name || 'Loading...'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                                <LogOut className="mr-2 h-4 w-4" />
                                Keluar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>
        </>
    );
}
