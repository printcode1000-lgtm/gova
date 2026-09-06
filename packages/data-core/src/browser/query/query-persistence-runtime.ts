import type { Query, QueryClient } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSave,
  persistQueryClientSubscribe,
  type Persister,
} from '@tanstack/react-query-persist-client';
import { createAsolDbPersister } from '../asol-db-persister';
import {
  ASOL_QUERY_CACHE_SCHEMA_VERSION,
  ASOL_QUERY_PERSIST_MAX_AGE_MS,
} from './query-policies';

export type QueryPersistenceOperation = 'persist' | 'restore' | 'remove';
export type QueryPersistenceErrorReporter = (
  operation: QueryPersistenceOperation,
  error: unknown,
) => void;

const restorePromises = new WeakMap<QueryClient, Promise<void>>();

function shouldPersistQuery(query: Query): boolean {
  return query.state.status === 'success' && query.meta?.persist !== false;
}

function resilientPersister(onError?: QueryPersistenceErrorReporter): Persister {
  const persister = createAsolDbPersister();
  return {
    persistClient: async (client) => {
      try {
        await persister.persistClient(client);
      } catch (error) {
        onError?.('persist', error);
      }
    },
    restoreClient: async () => {
      try {
        return await persister.restoreClient();
      } catch (error) {
        onError?.('restore', error);
        try {
          await persister.removeClient();
        } catch (removeError) {
          onError?.('remove', removeError);
        }
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await persister.removeClient();
      } catch (error) {
        onError?.('remove', error);
      }
    },
  };
}

function persistenceOptions(queryClient: QueryClient, persister: Persister) {
  return {
    queryClient,
    persister,
    maxAge: ASOL_QUERY_PERSIST_MAX_AGE_MS,
    buster: ASOL_QUERY_CACHE_SCHEMA_VERSION,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
  };
}

/** Shared restore barrier used by both hooks and imperative API reads. */
export function ensureAsolQueryCacheRestored(
  queryClient: QueryClient,
  onError?: QueryPersistenceErrorReporter,
): Promise<void> {
  const existing = restorePromises.get(queryClient);
  if (existing) return existing;
  const promise = persistQueryClientRestore(
    persistenceOptions(queryClient, resilientPersister(onError)),
  ).then(() => undefined);
  restorePromises.set(queryClient, promise);
  return promise;
}

/** Persist one successful imperative read immediately, before a provider event is required. */
export async function persistAsolQueryCacheNow(queryClient: QueryClient): Promise<void> {
  await persistQueryClientSave(
    persistenceOptions(queryClient, resilientPersister()),
  );
}

export function subscribeAsolQueryCache(
  queryClient: QueryClient,
  onError?: QueryPersistenceErrorReporter,
): () => void {
  return persistQueryClientSubscribe(
    persistenceOptions(queryClient, resilientPersister(onError)),
  );
}
