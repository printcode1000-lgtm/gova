'use client';

import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/features/auth/presentation/SessionProvider';
import { authApiService } from '../application/services/auth-api-service';
import { sessionService } from '../application/services/session-service';
import { authMonitorMeta } from './auth-monitor-meta';
import { clearImageUploadClientState } from '@/features/storage';
import { notifications } from '@/features/notifications';

/** Clears session in IndexedDB and updates in-memory session state. */
export function useLogout() {
  const { session, setSession } = useSession();

  return useMutation({
    mutationFn: async () => {
      await clearImageUploadClientState();
      if (session?.uid) {
        try {
          await notifications.unregisterDevice({ uid: session.uid, phone: session.phone ?? '' });
        } catch {
          // Never block sign-out on a push cleanup failure.
        }
      }
      try {
        await authApiService.logout();
      } catch {
        // Local logout must still finish even if the best-effort server hook is unavailable.
      } finally {
        await sessionService.clearSession();
      }
    },
    meta: authMonitorMeta('useLogout', 'AppSidebar', 'Logout', 'DELETE'),
    onSuccess: () => setSession(null),
  });
}