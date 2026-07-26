'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { isLoggedIn, type UserSession } from '../entities/session.entity';
import { sessionService } from '../services/session-service';

interface SessionContextValue {
  session: UserSession | null;
  isLoggedIn: boolean;
  isGuest: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  setSession: (session: UserSession | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setSessionState(await sessionService.getSession());
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await sessionService.cleanLegacyStore();
        if (!active) return;
        await refreshSession();
      } catch (error) {
        console.error('[SessionProvider] Session bootstrap failed.', error);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshSession]);

  const setSession = useCallback((next: UserSession | null) => {
    setSessionState(next);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isLoggedIn: isLoggedIn(session),
      isGuest: !isLoggedIn(session),
      isLoading,
      refreshSession,
      setSession,
    }),
    [session, isLoading, refreshSession, setSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
