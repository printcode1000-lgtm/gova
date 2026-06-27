import 'server-only';

import { AsyncLocalStorage } from 'async_hooks';
import { isDevelopment } from '@/core/config';
import type { DevTraceEvent } from './dev-trace-types';

const traceStorage = new AsyncLocalStorage<DevTraceEvent[]>();

export function runWithDevTrace<T>(fn: () => Promise<T>): Promise<T> {
  if (!isDevelopment) return fn();
  return traceStorage.run([], fn);
}

export function pushDevTrace(event: DevTraceEvent): void {
  if (!isDevelopment) return;
  const store = traceStorage.getStore();
  if (store) store.push(event);
}

export function getDevTrace(): DevTraceEvent[] {
  return traceStorage.getStore() ?? [];
}

export function serializeDevTrace(events: DevTraceEvent[]): string {
  return Buffer.from(JSON.stringify(events), 'utf8').toString('base64url');
}
