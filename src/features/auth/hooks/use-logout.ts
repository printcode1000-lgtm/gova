'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth-service';
import { sessionService } from '../services/session-service';
import { CURRENT_SESSION_QUERY_KEY } from '../constants/session-query-keys';
import { authMonitorMeta } from './auth-monitor-meta';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authService.logout();
      return sessionService.clearSession();
    },
    meta: authMonitorMeta('useLogout', 'AppSidebar', 'Logout', 'DELETE'),
    onSuccess: (session) => {
      queryClient.setQueryData(CURRENT_SESSION_QUERY_KEY, session);
    },
  });
}
