'use client';

import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/features/auth/components/SessionProvider';
import { sessionService } from '../services/session-service';
import { authMonitorMeta } from './auth-monitor-meta';

/** Clears session in IndexedDB and updates in-memory session state. */
export function useLogout() {
  const { setSession } = useSession();

  return useMutation({
    mutationFn: () => sessionService.clearSession(),
    meta: authMonitorMeta('useLogout', 'AppSidebar', 'Logout', 'DELETE'),
    onSuccess: () => {
      setSession(null);
    },
  });
}
