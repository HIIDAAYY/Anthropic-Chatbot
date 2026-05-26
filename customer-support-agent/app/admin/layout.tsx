'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar';
import { SidebarContext } from './components/SidebarContext';
import { useAdminSSE, SSEEvent } from './hooks/useAdminSSE';
import EscalationAlertModal, { EscalationAlert } from './components/EscalationAlertModal';
import { ActivityContext, ActivityItem } from './components/ActivityContext';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [escalationAlert, setEscalationAlert] = useState<EscalationAlert | null>(null);
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const router = useRouter();
    const pathname = usePathname();

    useAdminSSE((event: SSEEvent) => {
        if (event.type === 'escalation') {
            setEscalationAlert(event.payload as EscalationAlert);
        }
        setRecentActivity(prev => [
            { id: Date.now(), type: event.type, payload: event.payload },
            ...prev.slice(0, 19),
        ]);
    }, pathname !== '/admin/login' && authChecked);

    useEffect(() => {
        if (pathname === '/admin/login') {
            setAuthChecked(true);
            return;
        }
        fetch('/api/admin/auth/me')
            .then((res) => {
                if (res.status === 401) {
                    router.replace('/admin/login');
                } else {
                    setAuthChecked(true);
                }
            })
            .catch(() => {
                router.replace('/admin/login');
            });
    }, [pathname, router]);

    if (!authChecked) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
        );
    }

    return (
        <ActivityContext.Provider value={{ activity: recentActivity }}>
            <SidebarContext.Provider
                value={{
                    toggle: () => setSidebarOpen((v) => !v),
                    isOpen: sidebarOpen,
                }}
            >
                <div className="min-h-screen bg-gray-50 flex">
                    <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

                    <div className="flex-1 flex flex-col min-w-0">
                        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                            {children}
                        </main>
                    </div>
                </div>
                <EscalationAlertModal
                    alert={escalationAlert}
                    onDismiss={() => setEscalationAlert(null)}
                />
            </SidebarContext.Provider>
        </ActivityContext.Provider>
    );
}
