/**
 * Stable Business API error codes returned as JSON `{ error: "<code>" }`.
 * Server routes must never leak raw exception text to clients.
 */
export const KNOWN_BUSINESS_API_ERROR_CODES = [
  'userNotFound',
  'invalidPassword',
  'passwordTooShort',
  'phoneAlreadyRegistered',
  'emailAlreadyRegistered',
  'invalidCurrentPassword',
  'currentPasswordRequired',
  'invalidStoreDetails',
  'invalidProfileContacts',
  'invalidProfileEditor',
  'invalidDeliveryCarrier',
  'phoneVerificationRequired',
  'invalidNotificationToken',
  'notificationTokenSaveFailed',
  'notificationTokenIdentifierRequired',
  'notificationRecipientsRequired',
  'notificationDedupeKeyRequired',
  'notificationContentRequired',
  'notificationContentTooLong',
  'notificationRouteInvalid',
  'notificationTestScenarioInvalid',
  'notificationBroadcastForbidden',
  'webPushNotConfigured',
  'invalidFollowTarget',
  'followLoginRequired',
  'followSelfNotAllowed',
  'otaReleaseIdentityRequired',
  'otaReleaseNotFound',
  'otaReleaseNotCurrent',
  'otaReleaseSaveFailed',
  'otaManifestInvalid',
  'otaManifestUnavailable',
  'otaManifestSignatureInvalid',
  'otaNotConfigured',
  'otaBaseReleaseRequired',
  'otaBaseReleaseMatchesCurrent',
  'otaStoredManifestInvalid',
  'passwordRecoveryInvalidPhone',
  'passwordRecoveryInvalidCode',
  'passwordRecoveryWeakPassword',
  'passwordRecoveryPasswordMismatch',
  'passwordRecoveryInvalidToken',
  'invalidContactMessage',
  'accountDeletionConfirmationInvalid',
  'specialtyChatMessageInvalid',
  'specialtyChatRequestInvalid',
  'specialtyChatSelectionInvalid',
  'specialtyChatCapabilityInvalid',
  'specialtyChatCapabilityExpired',
  'specialtyChatReceiptInvalid',
  'sessionTokenInvalid',
  'sessionTokenExpired',
  'specialtyChatLoginRefreshRequired',
  'invalidImpersonationTarget',
  'dataHealthCleanupConfirmationRequired',
  'dataHealthSelectionRequired',
  'dataHealthSelectionTooLarge',
  'dataHealthSelectionChanged',
  'dataHealthPlanInvalid',
  'dataHealthPlanConsumed',
  'dataHealthPlanExpired',
  'dataHealthEnvironmentChanged',
  'dataHealthCleanupBusy',
  'dataHealthQuarantineInvalid',
  'dataHealthQuarantineNotEligible',
  'dataHealthQuarantineNoLongerOrphan',
  'dataHealthNoOrdersToPurge',
  'dataHealthOrderPurgePlanInvalid',
  'dataHealthOrderPurgePlanConsumed',
  'dataHealthOrderPurgePlanExpired',
  'dataHealthOrderPurgeConfirmationRequired',
  'dataHealthOrderPurgeBusy',
  'dataHealthOrderPurgeSelectionChanged',
  'dataHealthOrderPurgeIncomplete',
  'dataHealthDevelopmentOnly',
  'devCloudBackupDevelopmentOnly',
  'devCloudBackupFileRequired',
  'devCloudBackupFileInvalid',
  'devCloudBackupNotFound',
  'devCloudBackupManifestMissing',
  'devCloudBackupManifestUnsupported',
  'devCloudBackupManifestInvalidEnvironment',
  'devCloudBackupTursoSourceMissing',
  'devCloudBackupRestoreConfirmationRequired',
  'devCloudBackupArchiveIncomplete',
  'googlePlayConsoleDevelopmentOnly',
  'googlePlayConsoleCredentialsMissing',
  'googlePlayEditMissing',
  'googlePlayImageFileRequired',
  'googlePlayImageIdRequired',
  'googlePlayFastlaneActionRequired',
  'googlePlayProductionConfirmationRequired',
  'forbidden',
  'passwordRecoveryRateLimited',
  'contactRateLimited',
  'specialtyChatRateLimited',
  'accountDeletionSuperAdminForbidden',
  'passwordRecoveryNotConfigured',
  'sessionSigningSecretNotConfigured',
  'mobilePushUnlockNotConfigured',
  'mobilePushCredentialBlobMissing',
  'mobilePushCredentialBlobInvalid',
  'mobilePushCredentialBlobMismatch',
  'invalidJsonBody',
  'internalServerError',
  'unexpectedError',
  'requestFailed',
  'invalidLoginResponse',
] as const;

export type BusinessApiErrorCode = (typeof KNOWN_BUSINESS_API_ERROR_CODES)[number];

const KNOWN_CODE_SET = new Set<string>(KNOWN_BUSINESS_API_ERROR_CODES);

const TECHNICAL_ERROR_PATTERNS = [
  /sqlite/i,
  /\bsql error\b/i,
  /no such (column|table)/i,
  /unique constraint/i,
  /foreign key constraint/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /ETIMEDOUT/i,
  /\/var\/task\b/i,
  /node_modules/i,
  /\bat\s+[\w./\\-]+\.(?:ts|tsx|js|mjs):\d+/i,
  /^\s*Error:/i,
  /Request failed \(\d{3}\)/,
  /Expected JSON response/i,
];

export function isKnownBusinessApiErrorCode(message: string): boolean {
  return KNOWN_CODE_SET.has(message);
}

export function looksLikeTechnicalErrorMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }
  if (/^[A-Z][A-Z0-9_]+:/.test(trimmed)) return true;
  if (trimmed.includes('\n') || trimmed.includes('\r')) return true;
  if (trimmed.length > 120) return true;
  return false;
}

/**
 * Returns a stable code safe to expose in API JSON and client error state.
 * Raw exception text is replaced with generic codes; known business codes pass through.
 */
export function sanitizeApiErrorCodeForClient(
  message: string,
  status = 500,
): string {
  const trimmed = message.trim();
  if (!trimmed || trimmed === 'Internal Server Error') {
    return status >= 500 ? 'internalServerError' : 'unexpectedError';
  }
  if (isKnownBusinessApiErrorCode(trimmed)) return trimmed;
  if (looksLikeTechnicalErrorMessage(trimmed)) {
    return status >= 500 ? 'internalServerError' : 'requestFailed';
  }
  if (/^[a-z][a-zA-Z0-9]*$/.test(trimmed) && trimmed.length <= 80) {
    return trimmed;
  }
  return status >= 500 ? 'internalServerError' : 'unexpectedError';
}
