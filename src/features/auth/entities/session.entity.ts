/** Authenticated session persisted in GovaDB (auth store, key: current). */
export interface AuthSession {
  token: string;
  uid: string;
  phone: string;
  displayName: string;
  loginAt: string;
}

export interface StartSessionInput {
  token: string;
  uid: string;
  phone: string;
  displayName?: string;
}

/** `null` = guest (not stored in IndexedDB). */
export type SessionState = AuthSession | null;

export function isAuthenticated(session: SessionState): boolean {
  return session !== null && !!session.token;
}

/** Normalize IDB payload (current or legacy CurrentSession shape). */
export function normalizeStoredSession(raw: unknown): AuthSession | null {
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  if ('status' in record && record.status !== 'authenticated') return null;

  const token = typeof record.token === 'string' ? record.token.trim() : '';
  if (!token) return null;

  const uid = typeof record.uid === 'string' ? record.uid : '';
  const phone = typeof record.phone === 'string' ? record.phone : '';
  const displayName =
    typeof record.displayName === 'string' && record.displayName.trim()
      ? record.displayName
      : phone || uid || 'User';
  const loginAt =
    typeof record.loginAt === 'string' && record.loginAt
      ? record.loginAt
      : new Date().toISOString();

  return { token, uid, phone, displayName, loginAt };
}
