'use client';

import { publicEnv } from '@/core/config/public-env';

export type PreAuthFailureLevel = 'error' | 'warn';
export type PreAuthFailureContext = Record<
  string,
  string | number | boolean | null | undefined
>;

function describeFailure(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: typeof error, message: String(error), stack: undefined };
}

function fallbackLog(
  operation: string,
  error: unknown,
  loadError?: unknown,
) {
  const details = describeFailure(error);
  if (loadError !== undefined) {
    console.error(
      '[Asol][pre-auth-failure-reporter] failed to load system-logs-core',
      loadError,
    );
  }
  console.error(`[Asol][pre-auth-failure] ${operation}`, details);
}

export function reportPreAuthFailure(
  operation: string,
  error: unknown,
  context: PreAuthFailureContext = {},
  level: PreAuthFailureLevel = 'error',
) {
  void import('@asol/system-logs-core')
    .then(({ reportPreAuthFailure: reportPreAuthFailureCore }) =>
      reportPreAuthFailureCore(operation, error, context, level, {
        appVersion: publicEnv.webBundleVersion,
        nativeVersion: publicEnv.nativeVersion,
      }),
    )
    .catch((loadError) => {
      fallbackLog(operation, error, loadError);
    });
}
