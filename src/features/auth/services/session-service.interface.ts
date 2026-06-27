import type { CurrentSession, StartSessionInput } from '../entities/session.entity';

export interface ISessionService {
  restoreSession(): Promise<CurrentSession>;
  startSession(input: StartSessionInput): Promise<CurrentSession>;
  getCurrentSession(): Promise<CurrentSession>;
  updateSession(
    patch: Partial<Pick<CurrentSession, 'displayName' | 'phone'>>,
  ): Promise<CurrentSession>;
  clearSession(): Promise<CurrentSession>;
}
