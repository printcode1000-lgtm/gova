'use client';

import * as React from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  type PersistedClient,
  type Persister,
  PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client';
import { createAsolDbPersister } from '@asol/data-core/browser';
import { attachQueryObserver, registerMonitorTelemetry } from '@asol/observability-core';
import { publicEnv } from '@/core/config/public-env';
import { reportPreAuthFailure } from '@/features/system-logs/pre-auth-failure-reporter';

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

// The browser half of the telemetry seam. It runs at module scope so the IndexedDB persister
// created below is already announcing its operations by the time the first cache read happens.
registerMonitorTelemetry();

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
  const persister = React.useMemo<Persister>(() => {
    const storage = createAsolDbPersister();
    return {
      persistClient: async (client) => {
        try {
          await storage.persistClient(client);
        } catch (error) {
          reportPreAuthFailure('persist-query-cache', error);
          throw error;
        }
      },
      restoreClient: async () => {
        try {
          return await storage.restoreClient();
        } catch (error) {
          reportPreAuthFailure('restore-query-cache', error);
          throw error;
        }
      },
      removeClient: async () => {
        try {
          await storage.removeClient();
        } catch (error) {
          reportPreAuthFailure('remove-query-cache', error);
          throw error;
        }
      },
    };
  }, []);

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
