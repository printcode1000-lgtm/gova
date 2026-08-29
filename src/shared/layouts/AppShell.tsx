'use client';

import type { CSSProperties, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { useOpenInAsolHeaderPrompt } from '@/features/sharing';

import { AppHeader } from './AppHeader';
import { BottomNavBar } from './BottomNavBar';
import { BOTTOM_NAV_CLEARANCE } from './bottom-nav-layout';
import { PageSaveRuntimeInit } from '@/features/page-save/ui';
import {
  resolveUiPage,
  uiAttributes,
  uiPageContextAttributes,
} from '@asol/ui-registry-core';

interface AppShellProps {
  children: ReactNode;
  id?: string;
}

/**
 * App shell for in-app routes (all pages except splash `/`).
 */
export function AppShell({ children, id }: AppShellProps) {
  const installPrompt = useOpenInAsolHeaderPrompt();
  const page = resolveUiPage(usePathname());
  const shellStyle = {
    '--asol-header-install-height': installPrompt ? '3rem' : '0px',
  } as CSSProperties;

  // System insets are owned by `SafeAreaController` at the root layout, so the
  // shell only has to consume the resulting CSS variables.
  return (
    <div {...uiAttributes({ uid: "shared.layouts.app-shell.div-C6uPGF", id: "shared.layouts.app-shell.div" })} id={id} style={shellStyle}>
      <PageSaveRuntimeInit />
      <AppHeader installPrompt={installPrompt} />
      <main
        {...uiAttributes({ uid: "shared.layouts.app-shell.main-HR3f5i", id: "shared.layouts.app-shell.main" })}
        {...uiPageContextAttributes(page)}
        className="asol-canvas asol-shell-main min-h-screen"
        style={{ paddingBottom: BOTTOM_NAV_CLEARANCE }}
      >
        {children}
      </main>
      <BottomNavBar />
    </div>
  );
}
