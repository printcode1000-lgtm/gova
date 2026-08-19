export type SystemLogLevel = 'normal' | 'warning' | 'error';
export type SystemLogPlatform = 'web' | 'android' | 'ios' | 'server';
export type SystemLogSource =
  | 'client'
  | 'server'
  | 'api'
  | 'react'
  | 'resource'
  | 'native';
export type SystemLogOrigin = 'client' | 'cloud';
export type SystemLogTrustLevel =
  | 'untrusted-client'
  | 'trusted-server'
  | 'legacy';

export interface SystemLogInput {
  level: SystemLogLevel;
  source: SystemLogSource;
  consoleMethod: string;
  message: string;
  page: string;
  platform: SystemLogPlatform;
  errorName?: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
  userAgent?: string;
  feature?: string;
  operation?: string;
  stack?: string;
  routeName?: string;
  statusCode?: number;
  requestMethod?: string;
  appVersion?: string;
  nativeVersion?: string;
  uid?: string;
  correlationId?: string;
  requestFlowId?: string;
  sessionId?: string;
  monitorTraceId?: string;
}

export interface SystemLogEntry extends SystemLogInput {
  id: string | number;
  fingerprint: string;
  firstOccurredAt: string;
  lastOccurredAt: string;
  occurrences: number;
  userAgent: string;
}

export interface MemorySystemLogEntry extends SystemLogEntry {
  id: number;
}

export interface StoredSystemLogInput extends SystemLogInput {
  origin: SystemLogOrigin;
  trustLevel: SystemLogTrustLevel;
}

export interface PersistentSystemLogEntry extends SystemLogInput {
  id: string;
  fingerprint: string;
  origin: SystemLogOrigin;
  trustLevel: SystemLogTrustLevel;
  occurrences: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  messageTruncated?: boolean;
  stackTruncated?: boolean;
}

export interface SystemLogListOptions {
  limit?: number;
  cursor?: string;
  origin?: SystemLogOrigin;
  level?: SystemLogLevel;
  platform?: SystemLogPlatform;
  feature?: string;
  query?: string;
  appVersion?: string;
  nativeVersion?: string;
  since?: string;
  until?: string;
}

export interface SystemLogListPage {
  items: PersistentSystemLogEntry[];
  nextCursor: string | null;
  totalInPage: number;
}

export interface SystemLogSummary {
  totalErrors: number;
  totalWarnings: number;
  lastHourErrors: number;
  topFeatures: Array<{ feature: string; count: number }>;
  topFingerprints: Array<{
    fingerprint: string;
    message: string;
    occurrences: number;
    lastOccurredAt: string;
  }>;
  byPlatform: Record<string, number>;
}

export interface SystemLogExportRow {
  id: string;
  level: SystemLogLevel;
  origin: SystemLogOrigin;
  platform: SystemLogPlatform;
  feature: string;
  operation: string;
  message: string;
  occurrences: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  correlationId: string;
  fingerprint: string;
}
