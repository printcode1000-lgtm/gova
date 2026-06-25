import { ReactNode } from 'react';

import { AppHeader } from './AppHeader';
import { BottomNavBar } from './BottomNavBar';

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
      <main className="pt-16 pb-24 md:pb-6 min-h-screen gova-canvas">{children}</main>
      <BottomNavBar />
    </>
  );
}
