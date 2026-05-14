'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationBell from './NotificationBell';
import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    toggleSidebar?: () => void;
    actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, toggleSidebar, actions }: PageHeaderProps) {
    return (
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div className="flex items-start gap-3">
                {toggleSidebar && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden mt-1"
                        onClick={toggleSidebar}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
                    {subtitle && (
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {actions}
                <NotificationBell />
            </div>
        </div>
    );
}
