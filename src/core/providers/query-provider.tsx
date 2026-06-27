'use client';

import * as React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createGovaDbPersister } from '@/core/database/gova-db-persister';
import { attachQueryObserver } from '@/core/monitor/query-observer';
import { publicEnv } from '@/core/config/public-env';

/** 24 hours in milliseconds */
const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

/** 5 minutes in milliseconds */
const FIVE_MINUTES = 1000 * 60 * 5;

/**
 * Creates the singleton QueryClient.
 *
 * Default options apply project-wide:
 *   - staleTime  : 5 min  → serve cached data without refetching for 5 min
 *   - gcTime     : 24 h   → keep unused query data in memory/IndexedDB for 24 h
 *   - retry      : 1      → retry failed requests once before showing an error
 *   - networkMode: 'offlineFirst' → serve cache immediately; refetch silently in background
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: FIVE_MINUTES,
        gcTime: TWENTY_FOUR_HOURS,
        retry: 1,
        networkMode: 'offlineFirst',
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
        networkMode: 'offlineFirst',
      },
    },
  });
}

// Keep a module-level reference so the client is not recreated on every render.
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always create a fresh client
    return makeQueryClient();
  }
  // Browser: reuse the same client for the lifetime of the tab
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

interface AppQueryProviderProps {
  children: React.ReactNode;
}

/**
 * AppQueryProvider
 *
 * Wraps the application with TanStack Query and wires up GovaDB
 * as the persistence layer, enabling:
 *   - offline-first reads from IndexedDB on page load
 *   - automatic cache persistence after every query/mutation
 *   - duplicate-request prevention (staleTime / gcTime)
 *   - query invalidation after successful mutations
 */
export function AppQueryProvider({ children }: AppQueryProviderProps) {
  const queryClient = getQueryClient();
  const persister = React.useMemo(() => createGovaDbPersister(), []);

  React.useEffect(() => {
    const cleanup = attachQueryObserver(queryClient);
    return () => {
      cleanup();
    };
  }, [queryClient]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: TWENTY_FOUR_HOURS,
        buster: publicEnv.buildId,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
