import 'server-only';

import type { NextResponse } from 'next/server';
import { pushDevTrace, runWithDevTrace } from '@/core/monitor/server-trace';

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
      return response;
    } catch (error) {
      pushDevTrace({
        layer: 'business-api',
        name: routeName,
        executionTimeMs: Date.now() - startedAt,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}
