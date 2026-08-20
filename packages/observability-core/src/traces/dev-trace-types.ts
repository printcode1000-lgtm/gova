/**
 * The dev-trace header vocabulary: how a server states what it did, and how a browser reads it
 * back. Its own door.
 *
 * `src/core/api/api-response.ts` needs the header name and nothing else. Reaching it through the
 * package's main door would pull the monitor store, the query observer and
 * `@asol/data-core/browser` behind it — into every service deployment that answers a request.
 * A door is a load-time contract, and this file's contract is "constants and a parser".
 */
import type { OperationType } from '../monitor/types';

export type DevTraceLayer =
  | 'business-api'
  | 'server-service'
  | 'query-command'
  | 'repository'
  | 'database';

export interface DevTraceEvent {
  layer: DevTraceLayer;
  name: string;
  operationType?: OperationType;
  sql?: string;
  table?: string;
  executionTimeMs?: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

export const DEV_TRACE_HEADER = 'x-asol-dev-trace';

export function parseDevTraceHeader(header: string | null): DevTraceEvent[] {
  if (!header) return [];
  try {
    const json =
      typeof Buffer !== 'undefined'
        ? Buffer.from(header, 'base64url').toString('utf8')
        : decodeBase64Url(header);
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as DevTraceEvent[]) : [];
  } catch {
    return [];
  }
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
