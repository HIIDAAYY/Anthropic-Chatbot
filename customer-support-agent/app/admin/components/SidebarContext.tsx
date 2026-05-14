'use client';

import { createContext, useContext } from 'react';

interface SidebarCtx {
    toggle: () => void;
    isOpen: boolean;
}

export const SidebarContext = createContext<SidebarCtx>({
    toggle: () => {},
    isOpen: false,
});

export const useSidebar = () => useContext(SidebarContext);
