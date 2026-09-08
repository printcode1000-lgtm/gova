'use client';

import { publicEnv } from '@/core/config/public-env';
import { reportPreAuthFailure as reportPreAuthFailureCore } from '@asol/system-logs-core';

export type PreAuthFailureLevel = 'error' | 'warn';
export type PreAuthFailureContext = Record<
  string,
  string | number | boolean | null | undefined
>;

export function reportPreAuthFailure(
  operation: string,
  error: unknown,
  context: PreAuthFailureContext = {},
  level: PreAuthFailureLevel = 'error',
) {
  reportPreAuthFailureCore(operation, error, context, level, {
    appVersion: publicEnv.webBundleVersion,
    nativeVersion: publicEnv.nativeVersion,
  });
}
