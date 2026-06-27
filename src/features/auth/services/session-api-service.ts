import {
  govaDbDeleteAuthLegacy,
  govaDbDeleteCurrentSession,
  govaDbGetAuth,
  govaDbGetCurrentSession,
  govaDbSetCurrentSession,
} from '@/lib/gova-db';
import {
  normalizeStoredSession,
  type AuthSession,
  type StartSessionInput,
} from '../entities/session.entity';
import type { ISessionService } from './session-service.interface';

function createSession(input: StartSessionInput): AuthSession {
  const email = input.email?.trim() ?? '';
  return {
    token: input.token,
    uid: input.uid,
    phone: input.phone,
    email,
    displayName: input.displayName?.trim() || email || input.phone,
    loginAt: new Date().toISOString(),
  };
}

/**
 * Client-side session adapter — sole owner of session IndexedDB reads/writes.
 * Guest = no record in IDB (null). Authenticated = AuthSession under auth/current.
 */
export class SessionApiService implements ISessionService {
  private async readStoredSession(): Promise<AuthSession | null> {
    const stored = normalizeStoredSession(await govaDbGetCurrentSession<unknown>());
    if (stored) return stored;

    const legacy = await govaDbGetAuth();
    if (!legacy.authToken) return null;

    const migrated = normalizeStoredSession({
      status: 'authenticated',
      token: legacy.authToken,
      uid: '',
      loginAt: new Date().toISOString(),
    });
    if (!migrated) return null;

    await govaDbSetCurrentSession(migrated);
    await govaDbDeleteAuthLegacy();
    return migrated;
  }

  async restoreSession(): Promise<AuthSession | null> {
    return this.readStoredSession();
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    return this.readStoredSession();
  }

  async startSession(input: StartSessionInput): Promise<AuthSession> {
    const session = createSession(input);
    await govaDbSetCurrentSession(session);
    await govaDbDeleteAuthLegacy();
    return session;
  }

  async updateSession(
    patch: Partial<Pick<AuthSession, 'displayName' | 'phone' | 'email'>>,
  ): Promise<AuthSession | null> {
    const current = await this.readStoredSession();
    if (!current) return null;

    const updated: AuthSession = { ...current, ...patch };
    await govaDbSetCurrentSession(updated);
    return updated;
  }

  async clearSession(): Promise<null> {
    await govaDbDeleteCurrentSession();
    await govaDbDeleteAuthLegacy();
    return null;
  }
}

export const sessionApiService = new SessionApiService();
