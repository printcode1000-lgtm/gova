import type { AuthSession, StartSessionInput } from '../entities/session.entity';

export interface ISessionService {
  restoreSession(): Promise<AuthSession | null>;
  startSession(input: StartSessionInput): Promise<AuthSession>;
  getCurrentSession(): Promise<AuthSession | null>;
  updateSession(
    patch: Partial<Pick<AuthSession, 'displayName' | 'phone'>>,
  ): Promise<AuthSession | null>;
  clearSession(): Promise<null>;
}
