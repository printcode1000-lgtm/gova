export {
  MIN_PASSWORD_LENGTH,
  ACCOUNT_DELETION_PHRASE_EN,
  ACCOUNT_DELETION_PHRASE_AR,
  ACCOUNT_DELETION_PHRASES,
  isAccountDeletionPhraseValid,
} from './domain/constants';

export type {
  UserProfile,
  UpdateProfileInput,
  LoginResult,
  ProfileSpecialtiesSelection,
  DeleteAccountInput,
  DeleteAccountResult,
  RegistrationInput,
  LoginInput,
  SignedSessionClaims,
} from './domain/entities';

export type {
  AuthUserRecord,
  AuthUserRepositoryPort,
  ProfileSpecialtiesPort,
} from './ports/auth-repository.port';

export type {
  DeletionImage,
  AccountDeletionUser,
  AccountDeletionRepositoryPort,
  ImageDeletionPort,
} from './ports/account-deletion.port';

export { registerSessionSigningSecret, getSessionSigningSecret } from './ports/session-signing-secret.port';

export { hashPassword, verifyPassword } from './server/password';
export { createSignedSessionToken, verifySignedSessionToken } from './server/session-token';
export { extractSessionToken, assertSessionMatchesUid } from './server/session-auth';
export { normalizeAuthPhone, normalizeAuthEmail } from './server/normalize';
export {
  registerSuperAdminIdentity,
  isSuperAdminIdentity,
  isSuperAdminSession,
} from './server/super-admin';

export { AuthOperationsService } from './server/auth-operations-service';
export { AccountDeletionService } from './server/account-deletion-service';
