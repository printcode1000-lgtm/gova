'use client';

import { publicEnv } from '@/core/config/public-env';

import { submitPersistentClientLog } from './persistent-client-log';

export type PreAuthFailureLevel = 'error' | 'warn';
export type PreAuthFailureContext = Record<
  string,
  string | number | boolean | null | undefined
>;

function getPlatform(): 'web' | 'android' | 'ios' {
  if (typeof window === 'undefined') return 'web';
  const capacitor = (window as Window & {
    Capacitor?: { getPlatform?: () => string };
  }).Capacitor;
  const platform = capacitor?.getPlatform?.();
  return platform === 'android' || platform === 'ios' ? platform : 'web';
}

function describe(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: typeof error, message: String(error), stack: undefined };
}

/** Logs locally immediately, then best-effort forwards the same safe record to the server. */
export function reportPreAuthFailure(
  operation: string,
  error: unknown,
  context: PreAuthFailureContext = {},
  level: PreAuthFailureLevel = 'error',
) {
  const errorDetails = describe(error);
  const platform = getPlatform();
  const details = {
    platform,
    operation,
    ...context,
    name: errorDetails.name,
    message: errorDetails.message,
  };
  const label = `[Asol][PreAuth][${platform}] ${operation} failed`;

  if (level === 'warn') console.warn(label, details);
  else console.error(label, details);

  if (typeof window === 'undefined') return;
  submitPersistentClientLog({
    level: level === 'warn' ? 'warning' : 'error',
    source: 'client',
    consoleMethod: level === 'warn' ? 'asol.preauth.warn' : 'asol.preauth.error',
    message: errorDetails.message,
    page: `${window.location.pathname}${window.location.search}`,
    platform,
    errorName: errorDetails.name,
    userAgent: navigator.userAgent,
    feature: 'PreAuthentication',
    operation,
    stack: errorDetails.stack,
    appVersion: publicEnv.webBundleVersion,
    nativeVersion: publicEnv.nativeVersion,
  });
}
