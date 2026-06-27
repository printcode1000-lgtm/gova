'use client';

import { useQuery } from '@tanstack/react-query';
import { sessionService } from '../services/session-service';
import {
  createGuestSession,
  isAuthenticatedSession,
  type CurrentSession,
} from '../entities/session.entity';
import { CURRENT_SESSION_QUERY_KEY } from '../constants/session-query-keys';
import { authMonitorMeta } from './auth-monitor-meta';

export { CURRENT_SESSION_QUERY_KEY, AUTH_STATUS_QUERY_KEY } from '../constants/session-query-keys';

function isCurrentSession(value: unknown): value is CurrentSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'sessionId' in value &&
    ((value as CurrentSession).status === 'guest' ||
      (value as CurrentSession).status === 'authenticated')
  );
}

/**
 * Reads the current session via SessionService.restoreSession().
 * IndexedDB (GovaDB) is the single source of truth; React Query caches the result.
 */
export function useSessionQuery() {
  return useQuery({
    queryKey: CURRENT_SESSION_QUERY_KEY,
    queryFn: () => sessionService.restoreSession(),
    staleTime: 0,
    meta: authMonitorMeta('useSessionQuery', 'AppShell', 'RestoreSession', 'SELECT'),
  });
}

export function useSession() {
  const query = useSessionQuery();
  const session = isCurrentSession(query.data) ? query.data : createGuestSession();

  return {
    ...query,
    session,
    isAuthenticated: isAuthenticatedSession(session),
    isGuest: !isAuthenticatedSession(session),
  };
}

/** @deprecated Use useSessionQuery or useSession */
export function useAuthQuery() {
  const query = useSessionQuery();
  const session = isCurrentSession(query.data) ? query.data : createGuestSession();
  return {
    ...query,
    data: isAuthenticatedSession(session),
  };
}
