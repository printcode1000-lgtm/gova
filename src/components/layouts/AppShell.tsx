'use client';

import { ReactNode } from 'react';

import { AppHeader } from './AppHeader';
import { BottomNavBar } from './BottomNavBar';
import { BOTTOM_NAV_CLEARANCE } from './bottom-nav-layout';

interface AppShellProps {
  children: ReactNode;
}

/**
 * App shell for in-app routes (all pages except splash `/`).
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <AppHeader />
      <main
        className="gova-canvas min-h-screen pt-16"
        style={{ paddingBottom: BOTTOM_NAV_CLEARANCE }}
      >
        {children}
      </main>
      <BottomNavBar />
    </>
  );
}
