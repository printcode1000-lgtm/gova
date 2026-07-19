'use client';

import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/features/auth/components/SessionProvider';
import { authApiService } from '../services/auth-api-service';
import { sessionService } from '../services/session-service';
import { authMonitorMeta } from './auth-monitor-meta';

/** Clears session in IndexedDB and updates in-memory session state. */
export function useLogout() {
  const { setSession } = useSession();

  return useMutation({
    mutationFn: async () => {
      try {
        await authApiService.logout();
      } catch {
        // Local logout must still finish even if the best-effort server hook is unavailable.
      } finally {
        await sessionService.clearSession();
      }
    },
    meta: authMonitorMeta('useLogout', 'AppSidebar', 'Logout', 'DELETE'),
    onSuccess: () => {
      setSession(null);
    },
  });
}
