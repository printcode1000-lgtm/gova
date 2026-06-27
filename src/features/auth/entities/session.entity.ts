/** Authenticated session persisted in GovaDB (auth store, key: current). */
export interface AuthSession {
  token: string;
  uid: string;
  phone: string;
  email: string;
  displayName: string;
  loginAt: string;
}

export interface StartSessionInput {
  token: string;
  uid: string;
  phone: string;
  email?: string;
  displayName?: string;
}

/** `null` = guest (not stored in IndexedDB). */
export type SessionState = AuthSession | null;

export function isAuthenticated(session: SessionState): boolean {
  return session !== null && !!session.token;
}

export function formatSessionPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('20') ? `+${digits}` : `+20 ${digits}`;
}

/** Normalize IDB payload (current or legacy shapes). */
export function normalizeStoredSession(raw: unknown): AuthSession | null {
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  if ('status' in record && record.status !== 'authenticated') return null;

  const token = typeof record.token === 'string' ? record.token.trim() : '';
  if (!token) return null;

  const uid = typeof record.uid === 'string' ? record.uid : '';
  const phone = typeof record.phone === 'string' ? record.phone : '';
  const email = typeof record.email === 'string' ? record.email : '';
  const displayName =
    typeof record.displayName === 'string' && record.displayName.trim()
      ? record.displayName
      : email.trim() || phone || uid || 'User';
  const loginAt =
    typeof record.loginAt === 'string' && record.loginAt
      ? record.loginAt
      : new Date().toISOString();

  return { token, uid, phone, email, displayName, loginAt };
}
