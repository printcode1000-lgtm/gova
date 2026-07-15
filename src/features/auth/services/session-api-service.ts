import {
  asolDbDeleteAuthLegacy,
  asolDbDeleteCurrentSession,
  asolDbGetCurrentSession,
  asolDbSetCurrentSession,
} from '@/lib/asol-db';
import {
  parseStoredSession,
  type SaveSessionInput,
  type UserSession,
} from '../entities/session.entity';
import type { ISessionService } from './session-service.interface';

function toStoredSession(input: SaveSessionInput): UserSession {
  const email = input.email?.trim();
  const specialties = input.specialties ?? { main: [], sub: {} };
  return email
    ? { uid: input.uid, phone: input.phone, email, specialties }
    : { uid: input.uid, phone: input.phone, specialties };
}

/**
 * Client-side session adapter — sole owner of user session IndexedDB reads/writes.
 * Stores uid + phone + optional email only.
 */
export class SessionApiService implements ISessionService {
  async cleanLegacyStore(): Promise<void> {
    await asolDbDeleteAuthLegacy();

    const raw = await asolDbGetCurrentSession<unknown>();
    if (!raw) return;

    const parsed = parseStoredSession(raw);
    if (!parsed) {
      await asolDbDeleteCurrentSession();
      return;
    }

    const normalized = toStoredSession(parsed);
    await asolDbSetCurrentSession(normalized);
  }

  async getSession(): Promise<UserSession | null> {
    return parseStoredSession(await asolDbGetCurrentSession<unknown>());
  }

  async saveSession(input: SaveSessionInput): Promise<UserSession> {
    const session = toStoredSession(input);
    await asolDbSetCurrentSession(session);
    await asolDbDeleteAuthLegacy();
    return session;
  }

  async clearSession(): Promise<void> {
    await asolDbDeleteCurrentSession();
    await asolDbDeleteAuthLegacy();
  }
}

export const sessionApiService = new SessionApiService();
