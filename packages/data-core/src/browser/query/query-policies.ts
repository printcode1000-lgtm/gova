import type { DefaultOptions } from '@tanstack/react-query';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Persisted query data survives application releases until this schema changes.
 * Do not use a build id here: a deploy is not, by itself, a cache incompatibility.
 */
export const ASOL_QUERY_CACHE_SCHEMA_VERSION = 'asol-query-cache-v2';

/** Maximum age of a dehydrated client kept in AsolDB. */
export const ASOL_QUERY_PERSIST_MAX_AGE_MS = 7 * DAY;

/**
 * Named policies let features express freshness requirements without rebuilding
 * the transport/cache defaults in every hook.
 */
export const ASOL_QUERY_POLICIES = {
  localFirst: {
    staleTime: 30 * MINUTE,
    gcTime: 7 * DAY,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  userOwned: {
    staleTime: HOUR,
    gcTime: 7 * DAY,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  static: {
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * DAY,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
  volatile: {
    staleTime: 30 * 1000,
    gcTime: HOUR,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
} as const;

/** Global browser defaults. A normal page revisit within 30 minutes is a cache hit. */
export const ASOL_QUERY_DEFAULT_OPTIONS: DefaultOptions = {
  queries: {
    ...ASOL_QUERY_POLICIES.localFirst,
    retry: 1,
    networkMode: 'offlineFirst',
  },
  mutations: {
    retry: 0,
    networkMode: 'offlineFirst',
  },
};
