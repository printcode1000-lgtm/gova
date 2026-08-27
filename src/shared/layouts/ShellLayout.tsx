'use client';

import { usePathname } from 'next/navigation';

import { AppShell } from '@/shared/layouts/AppShell';
import { UiPageBoundary } from '@/shared/ui/UiPageBoundary';

const ROUTES_WITHOUT_SHELL = ['/'];

export function ShellLayout({ id, children }: { children: React.ReactNode } & { id?: string }) {
  const pathname = usePathname();

  if (ROUTES_WITHOUT_SHELL.includes(pathname)) {
    return <UiPageBoundary id={id}>{children}</UiPageBoundary>;
  }

  return <AppShell id={id}>{children}</AppShell>;
}
