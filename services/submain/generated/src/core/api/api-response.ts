import { NextResponse } from 'next/server';
import { isDevelopment } from '@/core/config';
import { DEV_TRACE_HEADER } from '@asol/observability-core/dev-trace';
import { getDevTrace, serializeDevTrace } from '@asol/observability-core/server';
import { isQuietMappedServiceError } from '@/core/api/expected-business-error-codes';
import { sanitizeApiErrorCodeForClient } from '@/core/api/business-api-error-codes';
import {
  businessApiErrorStatus,
  INVALID_JSON_BODY_STATUS,
} from '@/core/api/business-api-error-status';
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
  options: { skipPersistence?: boolean; cause?: unknown } = {},
): NextResponse {
  const clientMessage = sanitizeApiErrorCodeForClient(message, status);
  if (
    status >= 500 &&
    !options.skipPersistence &&
    !message.includes('/api/system-logs')
  ) {
    void logServerSystemIssue({
      // The caller's original error carries the real stack. Creating one here
      // instead would record a trace that points at this logger, which is what
      // made persisted API failures untraceable.
      error: options.cause instanceof Error ? options.cause : new Error(message),
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
    return apiError(INVALID_JSON_BODY_STATUS.code, INVALID_JSON_BODY_STATUS.status);
  }

  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const mapped = businessApiErrorStatus(message);

  // Two failures are business state rather than server fault and must not log.
  //
  // A second deploy arriving while one is running is the concurrency lock doing
  // its job; logging it made every poll of a running deployment emit a
  // server.error event. `skipPersistence` already kept it out of the store — the
  // log call was the remaining noise. Every other 409 still logs, because an
  // unexpected conflict is exactly what must stay visible.
  const quiet =
    message === 'productionDeployAlreadyRunning' ||
    (mapped.status === 400 && isQuietMappedServiceError(message));
  if (!quiet) void logMappedServiceError(error, mapped.code, mapped.status);

  return apiError(mapped.code, mapped.status, { skipPersistence: mapped.skipPersistence });
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
