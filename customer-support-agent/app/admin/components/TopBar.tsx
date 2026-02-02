'use client';

import { Bell, Menu, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import NotificationBell from './NotificationBell';

interface TopBarProps {
    toggleSidebar: () => void;
}

export default function TopBar({ toggleSidebar }: TopBarProps) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Fetch current user
        fetch('/api/admin/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) setUser(data.user);
            })
            .catch(console.error);
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/admin/auth/logout', { method: 'POST' });
            router.push('/admin/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <header className="h-16 border-b bg-white dark:bg-gray-900 flex items-center justify-between px-4 sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="hidden md:block text-sm text-muted-foreground">
                    {/* Breadcrumbs placeholder */}
                    Dashboard
                </div>
            </div>

            <div className="flex items-center gap-4">
                <NotificationBell />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <User className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>
                            {user ? user.name : 'Loading...'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
