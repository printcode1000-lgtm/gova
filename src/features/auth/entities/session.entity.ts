export type SessionStatus = 'guest' | 'authenticated';

/** Current session — persisted in Gova IndexedDB (auth store, key: current). */
export interface CurrentSession {
  status: SessionStatus;
  sessionId: string;
  uid?: string;
  token?: string;
  phone?: string;
  displayName?: string;
  loginAt?: string;
}

export interface StartSessionInput {
  token: string;
  uid: string;
  phone: string;
  displayName?: string;
}

export function createGuestSession(): CurrentSession {
  return {
    status: 'guest',
    sessionId: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  };
}

export function isAuthenticatedSession(session: CurrentSession): boolean {
  return session.status === 'authenticated' && !!session.token && !!session.uid;
}
