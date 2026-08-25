export {
  MIN_PASSWORD_LENGTH,
  ACCOUNT_DELETION_PHRASE_EN,
  ACCOUNT_DELETION_PHRASE_AR,
  ACCOUNT_DELETION_PHRASES,
  isAccountDeletionPhraseValid,
} from './domain/constants';

export {
  readPasswordInput,
  assertPasswordMeetsMinimum,
} from './domain/password-input';

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

export {
  createRegistrationSchema,
  createLoginSchema,
  type RegistrationFormData,
  type LoginFormData,
  type AuthTranslateFn,
} from './validation/auth-schemas';

export {
  createProfileSchema,
  toProfileFormData,
  isProfileFormDirty,
  type ProfileFormData,
  type ProfileTranslateFn,
} from './validation/profile-schema';

export {
  registerSuperAdminIdentity,
  isSuperAdminIdentity,
  isSuperAdminSession,
} from './domain/super-admin';
