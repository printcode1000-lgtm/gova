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
  // System insets are owned by `SafeAreaController` at the root layout, so the
  // shell only has to consume the resulting CSS variables.
  return (
    <>
      <AppHeader />
      <main
        className="asol-canvas asol-shell-main min-h-screen"
        style={{ paddingBottom: BOTTOM_NAV_CLEARANCE }}
      >
        {children}
      </main>
      <BottomNavBar />
    </>
  );
}
