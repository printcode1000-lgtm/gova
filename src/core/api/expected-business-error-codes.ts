/**
 * Known Business API error codes that represent expected user/input rejection.
 * These must not be persisted as system faults or surfaced as console errors.
 */
export const QUIET_MAPPED_SERVICE_ERROR_CODES = new Set([
  'userNotFound',
  'invalidPassword',
  'invalidCurrentPassword',
  'currentPasswordRequired',
  'phoneAlreadyRegistered',
  'emailAlreadyRegistered',
  'phoneVerificationRequired',
  'passwordTooShort',
  'dataHealthNoOrdersToPurge',
  'devCloudBackupFileRequired',
  'sessionTokenInvalid',
  'sessionTokenExpired',
]);

const PROFILE_SAVE_REJECTION_CODES = new Set([
  'invalidCurrentPassword',
  'currentPasswordRequired',
  'phoneAlreadyRegistered',
  'emailAlreadyRegistered',
  'phoneVerificationRequired',
  'sessionTokenInvalid',
  'sessionTokenExpired',
  'userNotFound',
]);

export function isQuietMappedServiceError(message: string): boolean {
  return QUIET_MAPPED_SERVICE_ERROR_CODES.has(message);
}

export function isExpectedProfileSaveRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return PROFILE_SAVE_REJECTION_CODES.has(message);
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
