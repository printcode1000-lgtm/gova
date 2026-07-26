import { NextResponse } from 'next/server';
import { isDevelopment } from '@/core/config';
import { DEV_TRACE_HEADER } from '@/core/monitor/dev-trace-types';
import { getDevTrace, serializeDevTrace } from '@/core/monitor/server-trace';
import { logServerSystemIssue } from '@/features/system-logs/services/persistent-system-log-service.server';

function attachDevTraceHeaders(response: NextResponse): NextResponse {
  if (!isDevelopment) return response;
  const trace = getDevTrace();
  if (trace.length > 0) {
    response.headers.set(DEV_TRACE_HEADER, serializeDevTrace(trace));
  }
  return response;
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return attachDevTraceHeaders(NextResponse.json(data, { status }));
}

export function apiError(message: string, status = 400): NextResponse {
  if (status >= 500 && !message.includes('/api/system-logs')) {
    void logServerSystemIssue({
      error: new Error(message),
      feature: 'BusinessAPI',
      operation: 'api-error-response',
      statusCode: status,
    }).catch(() => undefined);
  }
  return attachDevTraceHeaders(
    NextResponse.json({ error: message }, { status }),
  );
}

function isJsonBodyParseError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    /JSON|Unexpected end of JSON input/i.test(error.message)
  );
}

export function mapServiceError(error: unknown): NextResponse {
  if (isJsonBodyParseError(error)) {
    return apiError('invalidJsonBody', 400);
  }

  const message =
    error instanceof Error ? error.message : 'Internal Server Error';
  const knownCodes = [
    'userNotFound',
    'invalidPassword',
    'phoneAlreadyRegistered',
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
    'notificationBroadcastForbidden',
    'vapidSaveFailed',
    'vapidNotConfigured',
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
    'devCloudBackupDevelopmentOnly',
    'devCloudBackupFileInvalid',
    'devCloudBackupFileRequired',
    'devCloudBackupNotFound',
    'devCloudBackupManifestMissing',
    'devCloudBackupManifestUnsupported',
    'devCloudBackupManifestInvalidEnvironment',
    'devCloudBackupTursoSourceMissing',
    'devCloudBackupRestoreConfirmationRequired',
    'devCloudBackupArchiveIncomplete',
    'googlePlayConsoleDevelopmentOnly',
    'googlePlayConsoleCredentialsMissing',
  ];
  const quietKnownCodes = new Set([
    'dataHealthNoOrdersToPurge',
  ]);

  if (knownCodes.includes(message)) {
    if (!quietKnownCodes.has(message)) {
      void logMappedServiceError(error, message, 400);
    }
    return apiError(message, 400);
  }

  if (message === 'forbidden') {
    void logMappedServiceError(error, message, 403);
    return apiError(message, 403);
  }

  if (message === 'passwordRecoveryRateLimited') {
    void logMappedServiceError(error, message, 429);
    return apiError(message, 429);
  }

  if (message === 'contactRateLimited') {
    void logMappedServiceError(error, message, 429);
    return apiError(message, 429);
  }
  if (message === 'specialtyChatRateLimited') {
    void logMappedServiceError(error, message, 429);
    return apiError(message, 429);
  }
  if (message === 'accountDeletionSuperAdminForbidden') {
    void logMappedServiceError(error, message, 403);
    return apiError(message, 403);
  }

  if (message === 'passwordRecoveryNotConfigured') {
    void logMappedServiceError(error, message, 503);
    return apiError(message, 503);
  }
  if (message === 'sessionSigningSecretNotConfigured') {
    void logMappedServiceError(error, message, 503);
    return apiError(message, 503);
  }

  void logMappedServiceError(error, message, 500);
  return apiError(message, 500);
}

async function logMappedServiceError(
  error: unknown,
  message: string,
  statusCode: number,
) {
  if (typeof message === 'string' && message.includes('/api/system-logs')) return;
  await logServerSystemIssue({
    error,
    feature: 'BusinessAPI',
    operation: 'mapped-service-error',
    statusCode,
  }).catch(() => undefined);
}
