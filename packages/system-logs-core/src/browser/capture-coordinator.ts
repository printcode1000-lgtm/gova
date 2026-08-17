import { CLIENT_DEDUPE_WINDOW_MS } from '../domain/constants';
import { buildClientSubmitFingerprint } from '../domain/fingerprint';
import { createCorrelationId } from '../domain/correlation';
import type { SystemLogInput, SystemLogLevel } from '../domain/entities';
import { systemLogsClientSubmit, systemLogsMonitor } from '../ports';
import { addMemorySystemLog } from './memory-store';

const sentRecently = new Map<string, number>();

export interface CaptureOptions {
  persist?: boolean;
  memory?: boolean;
  emitConsole?: boolean;
  correlationId?: string;
}

export interface SystemIssueContext {
  level?: Extract<SystemLogLevel, 'warning' | 'error'>;
  feature: string;
  operation: string;
  error: unknown;
  page?: string;
  appVersion?: string;
  nativeVersion?: string;
}

export type PreAuthFailureLevel = 'error' | 'warn';
export type PreAuthFailureContext = Record<
  string,
  string | number | boolean | null | undefined
>;

function describeForConsole(input: SystemLogInput) {
  return {
    platform: input.platform,
    feature: input.feature,
    operation: input.operation,
    errorName: input.errorName,
    message: input.message,
    page: input.page,
    correlationId: input.correlationId,
  };
}

function enrichWithCorrelation(input: SystemLogInput): SystemLogInput {
  return {
    ...input,
    correlationId: input.correlationId ?? createCorrelationId(),
    requestFlowId:
      input.requestFlowId ?? systemLogsMonitor().getCurrentFlowId() ?? undefined,
    sessionId: input.sessionId ?? systemLogsMonitor().getSessionId() ?? undefined,
  };
}

export function shouldSkipClientSubmit(input: SystemLogInput) {
  if (input.level === 'normal') return true;
  const key = buildClientSubmitFingerprint(input);
  const now = Date.now();
  const last = sentRecently.get(key) ?? 0;
  if (now - last < CLIENT_DEDUPE_WINDOW_MS) return true;
  sentRecently.set(key, now);
  return false;
}

export async function captureSystemLog(
  input: SystemLogInput,
  options: CaptureOptions = {},
) {
  const enriched = enrichWithCorrelation(input);
  const persist = options.persist ?? enriched.level !== 'normal';
  const memory = options.memory ?? true;
  const emitConsole = options.emitConsole ?? false;

  if (emitConsole) {
    const details = describeForConsole(enriched);
    if (enriched.level === 'warning') {
      console.warn('[Asol][SystemIssue] Operation did not complete', details);
    } else if (enriched.level === 'error') {
      console.error('[Asol][SystemIssue] Operation failed', details);
    }
  }

  if (memory) {
    addMemorySystemLog({
      ...enriched,
      userAgent: enriched.userAgent ?? '',
    });
  }

  if (persist && !shouldSkipClientSubmit(enriched)) {
    await systemLogsClientSubmit()
      .submit(enriched)
      .catch(() => undefined);
  }

  return enriched;
}

export function reportPreAuthFailure(
  operation: string,
  error: unknown,
  context: Record<string, string | number | boolean | null | undefined> = {},
  level: 'error' | 'warn' = 'error',
  versions: { appVersion?: string; nativeVersion?: string } = {},
) {
  const details =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: typeof error, message: String(error), stack: undefined };
  const platform =
    typeof window !== 'undefined'
      ? (() => {
          const capacitor = (window as Window & {
            Capacitor?: { getPlatform?: () => string };
          }).Capacitor;
          const value = capacitor?.getPlatform?.();
          return value === 'android' || value === 'ios' ? value : 'web';
        })()
      : 'web';

  const label = `[Asol][PreAuth][${platform}] ${operation} failed`;
  const payload = { platform, operation, ...context, ...details };
  if (level === 'warn') console.warn(label, payload);
  else console.error(label, payload);

  if (typeof window === 'undefined') return;

  void captureSystemLog(
    {
      level: level === 'warn' ? 'warning' : 'error',
      source: 'client',
      consoleMethod:
        level === 'warn' ? 'asol.preauth.warn' : 'asol.preauth.error',
      message: details.message,
      page: `${window.location.pathname}${window.location.search}`,
      platform: platform as 'web' | 'android' | 'ios',
      errorName: details.name,
      userAgent: navigator.userAgent,
      feature: 'PreAuthentication',
      operation,
      stack: details.stack,
      appVersion: versions.appVersion,
      nativeVersion: versions.nativeVersion,
    },
    { memory: false, emitConsole: false },
  );
}

export function reportSystemIssue(input: SystemIssueContext) {
  const error = input.error;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);
  const page =
    input.page ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : 'unknown');
  const platform =
    typeof window !== 'undefined'
      ? (() => {
          const capacitor = (window as Window & {
            Capacitor?: { getPlatform?: () => string };
          }).Capacitor;
          const value = capacitor?.getPlatform?.();
          return value === 'android' || value === 'ios' ? value : 'web';
        })()
      : 'web';

  return captureSystemLog(
    {
      level: input.level ?? 'error',
      source: 'client',
      consoleMethod: 'asol.issue',
      message,
      page,
      platform: platform as 'web' | 'android' | 'ios',
      errorName: error instanceof Error ? error.name : 'ApplicationIssue',
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      feature: input.feature,
      operation: input.operation,
      stack:
        error instanceof Error
          ? error.stack
          : new Error(`${input.feature}: ${input.operation}`).stack,
      appVersion: input.appVersion,
      nativeVersion: input.nativeVersion,
    },
    { emitConsole: false },
  );
}
