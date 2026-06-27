import {
  govaDbDeleteCurrentSession,
  govaDbGetAuth,
  govaDbGetCurrentSession,
  govaDbSetAuth,
  govaDbSetCurrentSession,
} from '@/lib/gova-db';
import {
  createGuestSession,
  isAuthenticatedSession,
  type CurrentSession,
  type StartSessionInput,
} from '../entities/session.entity';
import type { ISessionService } from './session-service.interface';

function createAuthenticatedSession(input: StartSessionInput): CurrentSession {
  return {
    status: 'authenticated',
    sessionId: crypto.randomUUID(),
    token: input.token,
    uid: input.uid,
    phone: input.phone,
    displayName: input.displayName ?? input.phone,
    loginAt: new Date().toISOString(),
  };
}

/**
 * Client-side session adapter — sole owner of current-session IndexedDB reads/writes.
 */
export class SessionApiService implements ISessionService {
  private async resolveStoredSession(): Promise<CurrentSession | null> {
    const stored = await govaDbGetCurrentSession<CurrentSession>();
    if (stored) return stored;

    const legacy = await govaDbGetAuth();
    if (!legacy.authToken) return null;

    const migrated: CurrentSession = {
      status: 'authenticated',
      sessionId: crypto.randomUUID(),
      token: legacy.authToken,
      uid: '',
      loginAt: new Date().toISOString(),
    };
    await govaDbSetCurrentSession(migrated);
    await govaDbSetAuth({ authToken: undefined });
    return migrated;
  }

  async restoreSession(): Promise<CurrentSession> {
    return this.getCurrentSession();
  }

  async getCurrentSession(): Promise<CurrentSession> {
    const stored = await this.resolveStoredSession();
    if (!stored || !isAuthenticatedSession(stored)) {
      return createGuestSession();
    }
    return stored;
  }

  async startSession(input: StartSessionInput): Promise<CurrentSession> {
    const session = createAuthenticatedSession(input);
    await govaDbSetCurrentSession(session);
    await govaDbSetAuth({ authToken: undefined });
    return session;
  }

  async updateSession(
    patch: Partial<Pick<CurrentSession, 'displayName' | 'phone'>>,
  ): Promise<CurrentSession> {
    const current = await this.getCurrentSession();
    if (!isAuthenticatedSession(current)) {
      return current;
    }
    const updated: CurrentSession = { ...current, ...patch };
    await govaDbSetCurrentSession(updated);
    return updated;
  }

  async clearSession(): Promise<CurrentSession> {
    await govaDbDeleteCurrentSession();
    await govaDbSetAuth({ authToken: undefined });
    return createGuestSession();
  }
}

export const sessionApiService = new SessionApiService();
