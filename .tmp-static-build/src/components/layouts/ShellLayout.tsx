'use client';

import { usePathname } from 'next/navigation';

import { AppShell } from '@/components/layouts/AppShell';

const ROUTES_WITHOUT_SHELL = ['/'];

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (ROUTES_WITHOUT_SHELL.includes(pathname)) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
