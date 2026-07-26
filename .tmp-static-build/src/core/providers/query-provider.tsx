'use client';

import * as React from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  type PersistedClient,
  PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client';
import { createAsolDbPersister } from '@/core/database/asol-db-persister';
import { attachQueryObserver } from '@/core/monitor/query-observer';
import { publicEnv } from '@/core/config/public-env';

/** 24 hours in milliseconds */
const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

/** 5 minutes in milliseconds */
const FIVE_MINUTES = 1000 * 60 * 5;

function shouldPersistQuery(query: { state: { status: string } }): boolean {
  // Pending queries may contain Promise refs in v5 — only persist settled success data.
  return query.state.status === 'success';
}

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

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

interface AppQueryProviderProps {
  children: React.ReactNode;
}

export function AppQueryProvider({ children }: AppQueryProviderProps) {
  const queryClient = getQueryClient();
  const persister = React.useMemo(() => createAsolDbPersister(), []);

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
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
