import { QueryClient } from '@tanstack/react-query';
import { createAsolDbPersister } from '../asol-db-persister';
import { ASOL_QUERY_DEFAULT_OPTIONS } from './query-policies';

let browserQueryClient: QueryClient | undefined;

export function createAsolQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: ASOL_QUERY_DEFAULT_OPTIONS });
}

/** One stable client in the browser; isolated clients during server rendering. */
export function getAsolQueryClient(): QueryClient {
  if (typeof window === 'undefined') return createAsolQueryClient();
  browserQueryClient ??= createAsolQueryClient();
  return browserQueryClient;
}

/**
 * Clear both memory and the durable AsolDB snapshot. Use this at identity/reset
 * boundaries so one account can never hydrate another account's cached data.
 */
export async function clearAsolQueryCache(client: QueryClient = getAsolQueryClient()): Promise<void> {
  client.clear();
  await createAsolDbPersister().removeClient();
}
