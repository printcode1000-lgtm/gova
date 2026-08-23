import { NextResponse } from 'next/server';
import { isDevelopment } from '@/core/config';
import { DEV_TRACE_HEADER } from '@asol/observability-core/dev-trace';
import { getDevTrace, serializeDevTrace } from '@asol/observability-core/server';
import { isQuietMappedServiceError } from '@/core/api/expected-business-error-codes';
import {
  KNOWN_BUSINESS_API_ERROR_CODES,
  sanitizeApiErrorCodeForClient,
} from '@/core/api/business-api-error-codes';
import { logServerSystemIssue } from '@/features/system-logs/server';
import { isErrorAlreadyLogged } from '@asol/system-logs-core/server';

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

export function apiError(
  message: string,
  status = 400,
  options: { skipPersistence?: boolean } = {},
): NextResponse {
  const clientMessage = sanitizeApiErrorCodeForClient(message, status);
  if (
    status >= 500 &&
    !options.skipPersistence &&
    !message.includes('/api/system-logs')
  ) {
    void logServerSystemIssue({
      error: new Error(message),
      feature: 'BusinessAPI',
      operation: 'api-error-response',
      statusCode: status,
    }).catch((loggingError) => {
      console.error('[Asol][BusinessAPI] Failed to persist API error', {
        statusCode: status,
        message:
          loggingError instanceof Error ? loggingError.message : String(loggingError),
      });
    });
  }
  return attachDevTraceHeaders(
    NextResponse.json({ error: clientMessage }, { status }),
  );
}

/** Raised only by `readJsonBody`, so the 400 below always means the client's body. */
export class InvalidJsonBodyError extends Error {
  constructor() {
    super('invalidJsonBody');
    this.name = 'InvalidJsonBodyError';
  }
}

/**
 * Parses a request body and marks a malformed one explicitly.
 *
 * Prefer this over `request.json()` in routes: the fallback below infers
 * "invalid body" from any JSON `SyntaxError` reaching `mapServiceError`, which
 * also catches server-side parsing (reading a state file, for example) and
 * blames the client with a 400 for what is really a server fault.
 */
export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new InvalidJsonBodyError();
  }
}

function isJsonBodyParseError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    /JSON|Unexpected end of JSON input/i.test(error.message)
  );
}

export function mapServiceError(error: unknown): NextResponse {
  if (error instanceof InvalidJsonBodyError || isJsonBodyParseError(error)) {
    return apiError('invalidJsonBody', 400);
  }

  const message =
    error instanceof Error ? error.message : 'Internal Server Error';
  const knownCodes = KNOWN_BUSINESS_API_ERROR_CODES.filter(
    (code) =>
      !['forbidden', 'invalidJsonBody', 'internalServerError', 'unexpectedError', 'requestFailed', 'invalidLoginResponse'].includes(code),
  );
  if (knownCodes.includes(message as (typeof knownCodes)[number])) {
    if (!isQuietMappedServiceError(message)) {
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
    return apiError(message, 503, { skipPersistence: true });
  }
  if (message === 'sessionSigningSecretNotConfigured') {
    void logMappedServiceError(error, message, 503);
    return apiError(message, 503, { skipPersistence: true });
  }
  if (
    message === 'mobilePushUnlockNotConfigured' ||
    message === 'mobilePushCredentialBlobMissing'
  ) {
    void logMappedServiceError(error, message, 503);
    return apiError(message, 503, { skipPersistence: true });
  }
  if (message === 'mobilePushCredentialBlobInvalid') {
    void logMappedServiceError(error, message, 400);
    return apiError(message, 400);
  }
  if (message === 'mobilePushCredentialBlobMismatch') {
    void logMappedServiceError(error, message, 403);
    return apiError(message, 403);
  }

  void logMappedServiceError(error, message, 500);
  return apiError('internalServerError', 500, { skipPersistence: true });
}

async function logMappedServiceError(
  error: unknown,
  message: string,
  statusCode: number,
) {
  if (typeof message === 'string' && message.includes('/api/system-logs')) return;
  if (isErrorAlreadyLogged(error)) return;
  await logServerSystemIssue({
    error,
    feature: 'BusinessAPI',
    operation: 'mapped-service-error',
    statusCode,
  }).catch((loggingError) => {
    console.error('[Asol][BusinessAPI] Failed to persist mapped service error', {
      statusCode,
      message:
        loggingError instanceof Error ? loggingError.message : String(loggingError),
    });
  });
}
