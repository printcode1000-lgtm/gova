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
  DeleteAccountImageFailure,
  RegistrationInput,
  LoginInput,
  SignedSessionClaims,
} from './domain/entities';

export {
  ACCOUNT_DELETION_REGISTRY_VERSION,
  ACCOUNT_DELETION_STEP_ORDER,
  ACCOUNT_DELETION_STEPS,
  ACCOUNT_DELETION_TABLE_REGISTRY,
  ACCOUNT_DELETION_IMAGE_SOURCES,
  ACCOUNT_DELETION_REGISTRY_EXEMPT_TABLES,
  ACCOUNT_DELETION_IMAGE_RETRY_DEFAULTS,
  type AccountDeletionDatabase,
  type AccountDeletionStepId,
  type DeletionTableAction,
  type DeletionTableRegistryEntry,
  type DeletionImageSource,
  type DeletionRegistryExemptTable,
  type FailedDeletionImage,
  type DeletionImageCleanupResult,
} from './domain/account-deletion-registry';

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
export { normalizeAuthPhone, normalizeAuthEmail, authPhoneCandidates } from './server/normalize';
export {
  registerSuperAdminIdentity,
  isSuperAdminIdentity,
  isSuperAdminSession,
} from './server/super-admin';

export { AuthOperationsService } from './server/auth-operations-service';
export { AccountDeletionService } from './server/account-deletion-service';
export { deleteImagesWithRetry } from './server/delete-images-with-retry';
