import 'server-only';

import type { NextResponse } from 'next/server';
import { pushDevTrace, runWithDevTrace } from '@asol/observability-core/server';
import {
  isErrorAlreadyLogged,
  markErrorAsLogged,
} from '@asol/system-logs-core/server';
import { logServerSystemIssue } from '@/features/system-logs/services/persistent-system-log-service.server';

/**
 * Generic over the response type rather than fixed to `NextResponse`.
 *
 * The wrapper only ever reads `.ok` and `.status`, both of which are plain
 * `Response` members, so pinning the signature to `NextResponse` bought nothing
 * and forced a cast on any route whose handler returns a plain `Response` — a
 * cast being exactly the thing that lets an untraced route slip through. Every
 * existing caller keeps its `NextResponse` return, because `T` is inferred.
 */
export async function runTracedBusinessRoute<T extends Response>(
  routeName: string,
  handler: () => Promise<T>
): Promise<T> {
  return runWithDevTrace(async () => {
    const startedAt = Date.now();
    try {
      const response = await handler();
      pushDevTrace({
        layer: 'business-api',
        name: routeName,
        executionTimeMs: Date.now() - startedAt,
        status: response.ok ? 'success' : 'error',
      });
      if (!response.ok) {
        console.error('[Asol][BusinessAPI] Request did not complete', {
          routeName,
          statusCode: response.status,
          executionTimeMs: Date.now() - startedAt,
        });
      }
      return response;
    } catch (error) {
      pushDevTrace({
        layer: 'business-api',
        name: routeName,
        executionTimeMs: Date.now() - startedAt,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      if (!routeName.includes('/api/system-logs') && !isErrorAlreadyLogged(error)) {
        markErrorAsLogged(error);
        await logServerSystemIssue({
          error,
          feature: 'BusinessAPI',
          operation: 'unhandled-route-error',
          routeName,
        }).catch((loggingError) => {
          console.error('[Asol][BusinessAPI] Failed to persist route error', {
            routeName,
            message:
              loggingError instanceof Error ? loggingError.message : String(loggingError),
          });
        });
      }
      throw error;
    }
  });
}
