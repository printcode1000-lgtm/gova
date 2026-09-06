import { getAsolQueryClient } from './query-client';
import {
  ensureAsolQueryCacheRestored,
  persistAsolQueryCacheNow,
} from './query-persistence-runtime';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const REMOTE_READ_ROOT = 'asol-remote-read-v1';

export type AsolLocalReadPolicy =
  | 'localFirst'
  | 'volatile'
  | 'static'
  | 'networkAuthoritative';

export interface AsolLocalReadRequest<T> {
  cacheKey: string;
  policy: AsolLocalReadPolicy;
  load: () => Promise<T>;
}

const POLICY = {
  localFirst: { staleTime: 5 * MINUTE, gcTime: 7 * DAY, persist: true },
  volatile: { staleTime: 30 * 1000, gcTime: HOUR, persist: true },
  static: { staleTime: Number.POSITIVE_INFINITY, gcTime: 30 * DAY, persist: true },
  networkAuthoritative: { staleTime: 0, gcTime: 5 * MINUTE, persist: false },
} as const;

/** Memory -> restored AsolDB Query cache -> network queryFn, in that order. */
export async function readAsolLocalFirstData<T>(
  request: AsolLocalReadRequest<T>,
): Promise<T> {
  const queryClient = getAsolQueryClient();
  await ensureAsolQueryCacheRestored(queryClient);
  const policy = POLICY[request.policy];
  const data = await queryClient.fetchQuery({
    queryKey: [REMOTE_READ_ROOT, request.cacheKey],
    queryFn: request.load,
    staleTime: policy.staleTime,
    gcTime: policy.gcTime,
    meta: { persist: policy.persist },
  });
  if (policy.persist) {
    await persistAsolQueryCacheNow(queryClient);
  }
  return data;
}

/** Any successful mutation invalidates the transport-level read cache. */
export async function invalidateAsolLocalFirstData(): Promise<void> {
  const queryClient = getAsolQueryClient();
  await queryClient.invalidateQueries({ queryKey: [REMOTE_READ_ROOT] });
  await persistAsolQueryCacheNow(queryClient);
}
