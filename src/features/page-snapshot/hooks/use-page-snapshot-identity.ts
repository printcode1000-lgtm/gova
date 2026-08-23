'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { useSession } from '@/features/auth/ui';

import type { PageSnapshotIdentity } from '../domain/page-snapshot.types';
import {
  installNavigationEvents,
  searchParamsToRecord,
} from './page-snapshot-browser';

export function usePageSnapshotIdentity(namespace?: string): PageSnapshotIdentity {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const { session } = useSession();
  const querySignature = searchParams.toString();
  const query = React.useMemo(
    () => searchParamsToRecord(new URLSearchParams(querySignature)),
    [querySignature],
  );
  const route = namespace ? `${namespace}:${pathname}` : pathname;

  React.useEffect(() => {
    installNavigationEvents();
  }, []);

  return React.useMemo(
    () => ({
      userId: session?.uid || 'anonymous',
      route,
      pathname,
      params: {},
      query,
    }),
    [pathname, query, route, session?.uid],
  );
}
