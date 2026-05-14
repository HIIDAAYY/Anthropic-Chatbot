'use client';

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import { SidebarContext } from './components/SidebarContext';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
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
        </SidebarContext.Provider>
    );
}
