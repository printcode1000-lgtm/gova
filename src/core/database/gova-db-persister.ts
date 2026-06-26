'use client';

import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { govaDbGet, govaDbSet, GOVA_DB_STORES } from '@/lib/gova-db';

const CACHE_KEY = 'rq_cache';

/**
 * Creates a TanStack Query Persister backed by the GovaDB IndexedDB store.
 *
 * This persister is generic and reusable across all features —
 * no feature-specific code is needed here.
 *
 * It reads and writes the full React Query client state to the
 * existing `queryCache` object store inside `GovaDB` IndexedDB,
 * enabling offline-first behaviour and cache restoration after page reloads.
 */
export function createGovaDbPersister(): Persister {
  return {
    /** Serialize and save the entire React Query client state to IndexedDB. */
    persistClient: async (client: PersistedClient) => {
      await govaDbSet(GOVA_DB_STORES.QUERY_CACHE, CACHE_KEY, client);
    },

    /** Restore the React Query client state from IndexedDB. */
    restoreClient: async (): Promise<PersistedClient | undefined> => {
      const stored = await govaDbGet<PersistedClient>(GOVA_DB_STORES.QUERY_CACHE, CACHE_KEY);
      return stored ?? undefined;
    },

    /** Remove the persisted cache from IndexedDB (e.g. on logout or reset). */
    removeClient: async () => {
      await govaDbSet(GOVA_DB_STORES.QUERY_CACHE, CACHE_KEY, null);
    },
  };
}
