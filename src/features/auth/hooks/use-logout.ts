'use client';

import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/features/auth/components/SessionProvider';
import { authApiService } from '../services/auth-api-service';
import { sessionService } from '../services/session-service';
import { authMonitorMeta } from './auth-monitor-meta';
import { clearImageUploadClientState } from '@/features/storage/services/image-upload-client-lifecycle';
import { notifications } from '@/features/notifications';

/** Clears session in IndexedDB and updates in-memory session state. */
export function useLogout() {
  const { session, setSession } = useSession();

  return useMutation({
    mutationFn: async () => {
      await clearImageUploadClientState();
      // The device keeps receiving this user's push until its token is removed
      // server-side, so unregistering has to happen on every platform — not
      // only where a native push controller observes the uid change.
      if (session?.uid) {
        try {
          await notifications.unregisterDevice({
            uid: session.uid,
            phone: session.phone ?? '',
          });
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
    onSuccess: () => {
      setSession(null);
    },
  });
}
