'use client';

import { useQuery } from '@tanstack/react-query';
import { sessionService } from '../services/session-service';
import { createGuestSession } from '../entities/session.entity';
import { authMonitorMeta } from './auth-monitor-meta';

/** Stable query key for the current session — shared across hooks and invalidations */
export const CURRENT_SESSION_QUERY_KEY = ['current_session'] as const;

/** @deprecated Use CURRENT_SESSION_QUERY_KEY */
export const AUTH_STATUS_QUERY_KEY = CURRENT_SESSION_QUERY_KEY;

/**
 * Reads the current session via SessionService.restoreSession().
 * IndexedDB (GovaDB) is the single source of truth; React Query caches the result.
 */
export function useSessionQuery() {
  return useQuery({
    queryKey: CURRENT_SESSION_QUERY_KEY,
    queryFn: () => sessionService.restoreSession(),
    meta: authMonitorMeta('useSessionQuery', 'AppShell', 'RestoreSession', 'SELECT'),
  });
}

export function useSession() {
  const query = useSessionQuery();
  const session = query.data ?? createGuestSession();

  return {
    ...query,
    session,
    isAuthenticated: session.status === 'authenticated',
    isGuest: session.status === 'guest',
  };
}

/** @deprecated Use useSessionQuery or useSession */
export function useAuthQuery() {
  const query = useSessionQuery();
  return {
    ...query,
    data: query.data ? query.data.status === 'authenticated' : undefined,
  };
}
