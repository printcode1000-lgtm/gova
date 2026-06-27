import type { QueryClient } from '@tanstack/react-query';
import { CURRENT_SESSION_QUERY_KEY } from '../constants/session-query-keys';
import type { SessionState } from '../entities/session.entity';

/** Sync session state to React Query after IDB write (login / logout / register). */
export function setSessionCache(queryClient: QueryClient, session: SessionState): void {
  queryClient.setQueryData(CURRENT_SESSION_QUERY_KEY, session);
}
