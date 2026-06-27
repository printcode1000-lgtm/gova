'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionService } from '../services/session-service';
import { setSessionCache } from './session-cache';
import { authMonitorMeta } from './auth-monitor-meta';

/** Clears session in IndexedDB and updates the UI cache. No server call — logout is client-only. */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => sessionService.clearSession(),
    meta: authMonitorMeta('useLogout', 'AppSidebar', 'Logout', 'DELETE'),
    onSuccess: () => {
      setSessionCache(queryClient, null);
    },
  });
}
