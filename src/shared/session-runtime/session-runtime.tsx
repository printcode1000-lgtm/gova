'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';

/** Logged-in identity for UI surfaces outside the auth feature. */
export interface SessionRuntimeUser {
  uid: string;
  phone: string;
  email?: string;
  specialties?: unknown;
  sessionToken?: string;
}

export type SessionRuntimeUserSession = SessionRuntimeUser;

export interface SessionRuntimeValue {
  session: SessionRuntimeUser | null;
  isLoggedIn: boolean;
  isGuest: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  setSession: (session: SessionRuntimeUser | null) => void;
}

const SessionRuntimeContext = createContext<SessionRuntimeValue | null>(null);

export function SessionRuntimeProvider({
  value,
  children,
}: {
  value: SessionRuntimeValue;
  children: ReactNode;
}) {
  return (
    <SessionRuntimeContext.Provider value={value}>
      {children}
    </SessionRuntimeContext.Provider>
  );
}

export function useSessionRuntime(): SessionRuntimeValue {
  const ctx = useContext(SessionRuntimeContext);
  if (!ctx) {
    throw new Error('useSessionRuntime must be used within SessionRuntimeProvider');
  }
  return ctx;
}
