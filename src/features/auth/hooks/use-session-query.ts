'use client';

import { useQuery } from '@tanstack/react-query';
import { sessionService } from '../services/session-service';
import { isAuthenticated } from '../entities/session.entity';
import { CURRENT_SESSION_QUERY_KEY } from '../constants/session-query-keys';
import { authMonitorMeta } from './auth-monitor-meta';

export { CURRENT_SESSION_QUERY_KEY, AUTH_STATUS_QUERY_KEY } from '../constants/session-query-keys';

/**
 * Reads session from IndexedDB via SessionService.
 * Cached in React Query; `null` = guest.
 */
export function useSessionQuery() {
  return useQuery({
    queryKey: CURRENT_SESSION_QUERY_KEY,
    queryFn: () => sessionService.restoreSession(),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    meta: authMonitorMeta('useSessionQuery', 'AppShell', 'RestoreSession', 'SELECT'),
  });
}

export function useSession() {
  const query = useSessionQuery();
  const session = query.data ?? null;

  return {
    ...query,
    session,
    isAuthenticated: isAuthenticated(session),
    isGuest: !isAuthenticated(session),
    isLoading: query.isPending && query.data === undefined,
  };
}

/** @deprecated Use useSessionQuery or useSession */
export function useAuthQuery() {
  const query = useSessionQuery();
  return {
    ...query,
    data: isAuthenticated(query.data ?? null),
  };
}
