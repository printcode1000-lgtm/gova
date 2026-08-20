import 'server-only';

import type { NextResponse } from 'next/server';
import { pushDevTrace, runWithDevTrace } from '@asol/observability-core/server';
import {
  isErrorAlreadyLogged,
  markErrorAsLogged,
} from '@asol/system-logs-core/server';
import { logServerSystemIssue } from '@/features/system-logs/services/persistent-system-log-service.server';

export async function runTracedBusinessRoute(
  routeName: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
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
