import {
  govaDbDeleteAuthLegacy,
  govaDbDeleteCurrentSession,
  govaDbGetCurrentSession,
  govaDbSetCurrentSession,
} from '@/lib/gova-db';
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
    await govaDbDeleteAuthLegacy();

    const raw = await govaDbGetCurrentSession<unknown>();
    if (!raw) return;

    const parsed = parseStoredSession(raw);
    if (!parsed) {
      await govaDbDeleteCurrentSession();
      return;
    }

    const normalized = toStoredSession(parsed);
    await govaDbSetCurrentSession(normalized);
  }

  async getSession(): Promise<UserSession | null> {
    return parseStoredSession(await govaDbGetCurrentSession<unknown>());
  }

  async saveSession(input: SaveSessionInput): Promise<UserSession> {
    const session = toStoredSession(input);
    await govaDbSetCurrentSession(session);
    await govaDbDeleteAuthLegacy();
    return session;
  }

  async clearSession(): Promise<void> {
    await govaDbDeleteCurrentSession();
    await govaDbDeleteAuthLegacy();
  }
}

export const sessionApiService = new SessionApiService();
