'use client';

import * as React from 'react';
import {
  IsRestoringProvider,
  QueryClientProvider,
  type QueryClient,
} from '@tanstack/react-query';
import { getAsolQueryClient } from './query-client';
import {
  ensureAsolQueryCacheRestored,
  subscribeAsolQueryCache,
  type QueryPersistenceErrorReporter,
  type QueryPersistenceOperation,
} from './query-persistence-runtime';

export type { QueryPersistenceOperation } from './query-persistence-runtime';

export interface AsolQueryProviderProps {
  children: React.ReactNode;
  /** Application-owned observability seam. data-core never imports the monitor. */
  observeQueryClient?: (client: QueryClient) => void | (() => void);
  /** Application-owned error reporting seam. */
  onPersistenceError?: QueryPersistenceErrorReporter;
}

export function AsolQueryProvider({
  children,
  observeQueryClient,
  onPersistenceError,
}: AsolQueryProviderProps) {
  const queryClient = getAsolQueryClient();
  const [isRestoring, setIsRestoring] = React.useState(true);

  React.useEffect(() => observeQueryClient?.(queryClient), [observeQueryClient, queryClient]);

  React.useEffect(() => {
    let active = true;
    void ensureAsolQueryCacheRestored(queryClient, onPersistenceError).finally(() => {
      if (active) setIsRestoring(false);
    });
    return () => {
      active = false;
    };
  }, [onPersistenceError, queryClient]);

  React.useEffect(() => {
    if (isRestoring) return undefined;
    return subscribeAsolQueryCache(queryClient, onPersistenceError);
  }, [isRestoring, onPersistenceError, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <IsRestoringProvider value={isRestoring}>{children}</IsRestoringProvider>
    </QueryClientProvider>
  );
}
