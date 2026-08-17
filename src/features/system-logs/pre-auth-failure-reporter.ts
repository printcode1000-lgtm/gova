import {
  reportPreAuthFailure as reportPreAuthFailureCore,
  type PreAuthFailureLevel,
  type PreAuthFailureContext,
} from '@asol/system-logs-core';
import { publicEnv } from '@/core/config/public-env';

export type { PreAuthFailureLevel, PreAuthFailureContext };

export function reportPreAuthFailure(
  operation: string,
  error: unknown,
  context: PreAuthFailureContext = {},
  level: PreAuthFailureLevel = 'error',
) {
  return reportPreAuthFailureCore(operation, error, context, level, {
    appVersion: publicEnv.webBundleVersion,
    nativeVersion: publicEnv.nativeVersion,
  });
}
