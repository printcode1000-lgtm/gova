import {
  KNOWN_BUSINESS_API_ERROR_CODES,
  sanitizeApiErrorCodeForClient,
} from '@/core/api/business-api-error-codes';

/**
 * Which HTTP status a service error becomes.
 *
 * Extracted from `mapServiceError` so the control runtime answers exactly what
 * the application answered for the same failure. Control cannot call
 * `mapServiceError` itself — that function persists system logs and returns a
 * `NextResponse` — so before this module it carried its own mapping, and the two
 * had already drifted: `forbidden` was a `403` in the application and a `401` in
 * control, and an unrecognised error was a `500 internalServerError` in one and
 * a `400` in the other. A client cannot be moved to a new origin that answers
 * the same failures differently.
 *
 * Pure: no logging, no response construction, no environment. Both callers add
 * their own.
 */
export interface BusinessApiErrorStatus {
  /** The code that goes in `{ "error": ... }`. */
  code: string;
  status: number;
  /** True where `mapServiceError` deliberately does not persist a system log. */
  skipPersistence: boolean;
}

/** A malformed request body is always the caller's, and always a 400. */
export const INVALID_JSON_BODY_STATUS: BusinessApiErrorStatus = {
  code: 'invalidJsonBody',
  status: 400,
  skipPersistence: false,
};

const EXCLUDED_FROM_KNOWN_400 = [
  'forbidden',
  'invalidJsonBody',
  'internalServerError',
  'unexpectedError',
  'requestFailed',
  'invalidLoginResponse',
  'productionDeployAlreadyRunning',
  'productionDeployNotConfigured',
  'productionDeployCallbackRejected',
] as const;

const EXPLICIT_STATUSES: Readonly<Record<string, BusinessApiErrorStatus>> = {
  // Reachable as a message, not only as `InvalidJsonBodyError`: a runtime that
  // parses the body itself has no exception class to throw.
  invalidJsonBody: INVALID_JSON_BODY_STATUS,
  forbidden: { code: 'forbidden', status: 403, skipPersistence: false },
  passwordRecoveryRateLimited: { code: 'passwordRecoveryRateLimited', status: 429, skipPersistence: false },
  contactRateLimited: { code: 'contactRateLimited', status: 429, skipPersistence: false },
  specialtyChatRateLimited: { code: 'specialtyChatRateLimited', status: 429, skipPersistence: false },
  accountDeletionSuperAdminForbidden: { code: 'accountDeletionSuperAdminForbidden', status: 403, skipPersistence: false },
  productionDeployAlreadyRunning: { code: 'productionDeployAlreadyRunning', status: 409, skipPersistence: true },
  productionDeployCallbackRejected: { code: 'productionDeployCallbackRejected', status: 403, skipPersistence: false },
  productionDeployNotConfigured: { code: 'productionDeployNotConfigured', status: 503, skipPersistence: true },
  passwordRecoveryNotConfigured: { code: 'passwordRecoveryNotConfigured', status: 503, skipPersistence: true },
  sessionSigningSecretNotConfigured: { code: 'sessionSigningSecretNotConfigured', status: 503, skipPersistence: true },
  mobilePushUnlockNotConfigured: { code: 'mobilePushUnlockNotConfigured', status: 503, skipPersistence: true },
  mobilePushCredentialBlobMissing: { code: 'mobilePushCredentialBlobMissing', status: 503, skipPersistence: true },
  mobilePushCredentialBlobInvalid: { code: 'mobilePushCredentialBlobInvalid', status: 400, skipPersistence: false },
  mobilePushCredentialBlobMismatch: { code: 'mobilePushCredentialBlobMismatch', status: 403, skipPersistence: false },
};

const KNOWN_400 = new Set<string>(
  KNOWN_BUSINESS_API_ERROR_CODES.filter(
    (code) => !(EXCLUDED_FROM_KNOWN_400 as readonly string[]).includes(code),
  ),
);

export function businessApiErrorStatus(message: string): BusinessApiErrorStatus {
  if (KNOWN_400.has(message)) return { code: message, status: 400, skipPersistence: false };
  const explicit = EXPLICIT_STATUSES[message];
  if (explicit) return explicit;
  return {
    code: sanitizeApiErrorCodeForClient('internalServerError', 500),
    status: 500,
    skipPersistence: true,
  };
}
