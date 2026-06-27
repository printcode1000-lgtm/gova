'use client';

import { useSessionQuery } from '../hooks/use-session-query';

/** Restores the current session from Gova IndexedDB on app mount. */
export function SessionRestore() {
  useSessionQuery();
  return null;
}
