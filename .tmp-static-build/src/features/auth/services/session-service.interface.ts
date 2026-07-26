import type { SaveSessionInput, UserSession } from '../entities/session.entity';

export interface ISessionService {
  /** Remove legacy auth rows and normalize stored session shape. */
  cleanLegacyStore(): Promise<void>;
  getSession(): Promise<UserSession | null>;
  saveSession(input: SaveSessionInput): Promise<UserSession>;
  clearSession(): Promise<void>;
}
