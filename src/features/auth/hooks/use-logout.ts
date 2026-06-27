'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth-service';
import { sessionService } from '../services/session-service';
import { CURRENT_SESSION_QUERY_KEY } from './use-session-query';
import { authMonitorMeta } from './auth-monitor-meta';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authService.logout();
      await sessionService.clearSession();
    },
    meta: authMonitorMeta('useLogout', 'AppSidebar', 'Logout', 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_SESSION_QUERY_KEY });
    },
  });
}
