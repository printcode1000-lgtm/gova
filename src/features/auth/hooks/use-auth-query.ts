'use client';

import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/auth-service';

/** Stable query key for authentication status — shared across all hooks and invalidations */
export const AUTH_STATUS_QUERY_KEY = ['auth_status'] as const;

/**
 * useAuthQuery
 *
 * Reads the authenticated state by calling authService.isAuthenticated().
 * TanStack Query caches this result and rehydrates it from GovaDB IndexedDB
 * on page reload, giving instant offline-first auth detection.
 *
 * - staleTime is inherited from the global QueryClient (5 min)
 * - gcTime    is inherited from the global QueryClient (24 h)
 */
export function useAuthQuery() {
  return useQuery({
    queryKey: AUTH_STATUS_QUERY_KEY,
    queryFn: () => authService.isAuthenticated(),
  });
}
