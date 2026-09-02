'use client';

import type { CSSProperties, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { useOpenInAsolHeaderPrompt } from '@/features/sharing';
import STATIC_DOM_IDS from '@/shared/dom/identity/static-ids.json';

import { AppHeader } from './AppHeader';
import { BottomNavBar } from './BottomNavBar';
import { BOTTOM_NAV_CLEARANCE } from './bottom-nav-layout';
import { PageSaveRuntimeInit } from '@/features/page-save/ui';

interface AppShellProps {
  children: ReactNode;
  id?: string;
}

/**
 * App shell for in-app routes (all pages except splash `/`).
 */
export function AppShell({ children, id }: AppShellProps) {
  const installPrompt = useOpenInAsolHeaderPrompt();
  const shellStyle = {
    '--asol-header-install-height': installPrompt ? '3rem' : '0px',
  } as CSSProperties;

  // System insets are owned by `SafeAreaController` at the root layout, so the
  // shell only has to consume the resulting CSS variables.
  return (
    <div id={id} style={shellStyle}>
      <PageSaveRuntimeInit />
      <AppHeader installPrompt={installPrompt} />
      <main id={STATIC_DOM_IDS.ids.shell.appShellMain}
        className="asol-canvas asol-shell-main min-h-screen"
        style={{ paddingBottom: BOTTOM_NAV_CLEARANCE }}
      >
        {children}
      </main>
      <BottomNavBar />
    </div>
  );
}
