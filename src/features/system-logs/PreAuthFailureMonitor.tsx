'use client';

import { useEffect } from 'react';

import { reportPreAuthFailure } from './pre-auth-failure-reporter';

/** Captures errors that escape individual startup, login, and registration operations. */
export function PreAuthFailureMonitor() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportPreAuthFailure('unhandled-runtime-error', event.error ?? event.message, {
        source: event.filename || null,
        line: event.lineno || null,
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      reportPreAuthFailure('unhandled-promise-rejection', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
