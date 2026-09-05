import {
  INGEST_RATE_WINDOW_MS,
  MAX_INGEST_BATCH,
  MAX_INGEST_BODY_BYTES,
  MAX_INGEST_PER_CLIENT,
  MAX_INGEST_PER_INSTANCE,
} from '../domain/constants';
import type { SystemLogInput } from '../domain/entities';
import { sanitizePersistentSystemLog } from '../sanitization/sanitizer';
import { systemLogsEnvironment, systemLogsPersistence } from '../ports';
import { emitTerminalSystemLog } from './terminal-logger';
import { evaluateAlerts } from './alert-evaluator';
import { publishSystemLogEvent } from './stream-hub';

const clientAttempts = new Map<string, number[]>();
let instanceAttempts: number[] = [];

export function requestClientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0];
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    forwarded?.trim() ??
    'unknown'
  );
}

export function isIngestRateLimited(request: Request) {
  const cutoff = Date.now() - INGEST_RATE_WINDOW_MS;
  const now = Date.now();
  instanceAttempts = instanceAttempts.filter((time) => time >= cutoff);
  if (instanceAttempts.length >= MAX_INGEST_PER_INSTANCE) return true;

  const key = requestClientKey(request);
  const recent = (clientAttempts.get(key) ?? []).filter((time) => time >= cutoff);
  if (recent.length >= MAX_INGEST_PER_CLIENT) return true;

  instanceAttempts.push(now);
  clientAttempts.set(key, [...recent, now]);
  if (clientAttempts.size > 5_000) {
    for (const [storedKey, attempts] of clientAttempts) {
      if (!attempts.some((time) => time >= cutoff)) clientAttempts.delete(storedKey);
    }
  }
  return false;
}

export async function readBoundedJsonBody<T>(request: Request): Promise<T> {
  if (!request.body) throw new Error('invalidJsonBody');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_INGEST_BODY_BYTES) {
      await reader.cancel();
      throw new Error('systemLogPayloadTooLarge');
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('invalidJsonBody');
  }
}

function textValue(value: unknown, fallback: string, max: number) {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? String(value).slice(0, max)
    : fallback;
}

function optionalText(value: unknown, max: number) {
  const text = textValue(value, '', max).trim();
  return text || undefined;
}

function optionalNumber(value: unknown) {
  const number = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
}

export function normalizeIngestPayload(
  input: Partial<SystemLogInput>,
): SystemLogInput {
  return {
    level:
      input.level === 'normal' ||
      input.level === 'warning' ||
      input.level === 'error'
        ? input.level
        : 'error',
    source:
      input.source === 'client' ||
      input.source === 'server' ||
      input.source === 'api' ||
      input.source === 'react' ||
      input.source === 'resource' ||
      input.source === 'native'
        ? input.source
        : 'client',
    consoleMethod: textValue(input.consoleMethod, 'client.error', 100),
    message: textValue(input.message, 'Unknown client issue', 20_000),
    page: textValue(input.page, '', 2_000),
    platform:
      input.platform === 'web' ||
      input.platform === 'android' ||
      input.platform === 'ios' ||
      input.platform === 'server'
        ? input.platform
        : 'web',
    errorName: optionalText(input.errorName, 300),
    sourceFile: optionalText(input.sourceFile, 2_000),
    sourceLine: optionalNumber(input.sourceLine),
    sourceColumn: optionalNumber(input.sourceColumn),
    userAgent: optionalText(input.userAgent, 2_000),
    feature: optionalText(input.feature, 300),
    operation: optionalText(input.operation, 500),
    stack: optionalText(input.stack, 24_000),
    routeName: optionalText(input.routeName, 1_000),
    statusCode: optionalNumber(input.statusCode),
    requestMethod: optionalText(input.requestMethod, 20),
    appVersion: optionalText(input.appVersion, 100),
    nativeVersion: optionalText(input.nativeVersion, 100),
    uid: optionalText(input.uid, 200),
    correlationId: optionalText(input.correlationId, 120),
    requestFlowId: optionalText(input.requestFlowId, 120),
    sessionId: optionalText(input.sessionId, 120),
    monitorTraceId: optionalText(input.monitorTraceId, 120),
  };
}

export function validateIngestBatchSize(values: unknown[]) {
  if (values.length > MAX_INGEST_BATCH) return 'systemLogBatchTooLarge';
  if (
    values.some((value) => !value || typeof value !== 'object' || Array.isArray(value))
  ) {
    return 'invalidSystemLogPayload';
  }
  return null;
}

export class PersistentSystemLogService {
  async add(
    input: SystemLogInput,
    provenance: 'trusted-server' | 'untrusted-client' = 'trusted-server',
  ) {
    const sanitized = sanitizePersistentSystemLog(input, provenance);
    emitTerminalSystemLog(sanitized, true);
    const id = await systemLogsPersistence().add(sanitized);
    await this.applyRetention();
    const page = await systemLogsPersistence().list({ limit: 1 });
    const entry = page.items.find((item) => item.id === id) ?? page.items[0];
    if (entry) {
      publishSystemLogEvent(entry);
      await evaluateAlerts(entry);
    }
    return id;
  }

  async addBatch(
    inputs: SystemLogInput[],
    provenance: 'trusted-server' | 'untrusted-client' = 'trusted-server',
  ) {
    for (const input of inputs) await this.add(input, provenance);
  }

  async list(options = {}) {
    return systemLogsPersistence().list(options);
  }

  async summary() {
    return systemLogsPersistence().summary();
  }

  async clear(level?: string) {
    return systemLogsPersistence().clear(level);
  }

  async applyRetention() {
    const days = systemLogsEnvironment().retentionDays();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1_000).toISOString();
    await systemLogsPersistence().pruneOlderThan(cutoff);
  }
}

export const persistentSystemLogService = new PersistentSystemLogService();

export async function logServerSystemIssue(input: {
  error: unknown;
  feature: string;
  operation: string;
  routeName?: string;
  statusCode?: number;
  requestMethod?: string;
  correlationId?: string;
  requestFlowId?: string;
  sessionId?: string;
  monitorTraceId?: string;
  skipIfAlreadyLogged?: boolean;
}) {
  if (input.skipIfAlreadyLogged) {
    const { isErrorAlreadyLogged } = await import('../domain/correlation');
    if (isErrorAlreadyLogged(input.error)) return;
  }
  const error = input.error;
  await persistentSystemLogService.add({
    level: 'error',
    source: 'server',
    consoleMethod: 'server.error',
    message: error instanceof Error ? error.message : String(error),
    page: input.routeName ?? 'server',
    platform: 'server',
    errorName: error instanceof Error ? error.name : 'ServerError',
    feature: input.feature,
    operation: input.operation,
    stack: error instanceof Error ? error.stack : undefined,
    routeName: input.routeName,
    statusCode: input.statusCode,
    requestMethod: input.requestMethod,
    correlationId: input.correlationId,
    requestFlowId: input.requestFlowId,
    sessionId: input.sessionId,
    monitorTraceId: input.monitorTraceId,
  });
}
