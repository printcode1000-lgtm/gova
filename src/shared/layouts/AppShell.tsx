'use client';

import type { CSSProperties, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { useOpenInAsolHeaderPrompt } from '@/features/sharing';

import { AppHeader } from './AppHeader';
import { BottomNavBar } from './BottomNavBar';
import { BOTTOM_NAV_CLEARANCE } from './bottom-nav-layout';
import { PageSaveRuntimeInit } from '@/features/page-save/ui';
import { resolveUiPage, uiPageAttributes } from '@asol/ui-registry-core';

interface AppShellProps {
  children: ReactNode;
}

/**
 * App shell for in-app routes (all pages except splash `/`).
 */
export function AppShell({ children }: AppShellProps) {
  const installPrompt = useOpenInAsolHeaderPrompt();
  const page = resolveUiPage(usePathname());
  const shellStyle = {
    '--asol-header-install-height': installPrompt ? '3rem' : '0px',
  } as CSSProperties;

  // System insets are owned by `SafeAreaController` at the root layout, so the
  // shell only has to consume the resulting CSS variables.
  return (
    <div style={shellStyle}>
      <PageSaveRuntimeInit />
      <AppHeader installPrompt={installPrompt} />
      <main
        {...uiPageAttributes(page)}
        className="asol-canvas asol-shell-main min-h-screen"
        style={{ paddingBottom: BOTTOM_NAV_CLEARANCE }}
      >
        {children}
      </main>
      <BottomNavBar />
    </div>
  );
}
