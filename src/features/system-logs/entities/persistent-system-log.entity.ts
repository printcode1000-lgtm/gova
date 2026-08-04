export type PersistentSystemLogLevel = "normal" | "warning" | "error";
export type PersistentSystemLogPlatform = "web" | "android" | "ios" | "server";
export type PersistentSystemLogSource =
  | "client"
  | "server"
  | "api"
  | "react"
  | "resource"
  | "native";
export type PersistentSystemLogOrigin = "client" | "cloud";
export type PersistentSystemLogTrustLevel =
  | "untrusted-client"
  | "trusted-server"
  | "legacy";

export interface PersistentSystemLogInput {
  level: PersistentSystemLogLevel;
  source: PersistentSystemLogSource;
  consoleMethod: string;
  message: string;
  page: string;
  platform: PersistentSystemLogPlatform;
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
}

export interface PersistentSystemLogEntry extends PersistentSystemLogInput {
  id: string;
  fingerprint: string;
  origin: PersistentSystemLogOrigin;
  trustLevel: PersistentSystemLogTrustLevel;
  occurrences: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  messageTruncated?: boolean;
  stackTruncated?: boolean;
}

export interface StoredPersistentSystemLogInput extends PersistentSystemLogInput {
  origin: PersistentSystemLogOrigin;
  trustLevel: PersistentSystemLogTrustLevel;
}

export interface PersistentSystemLogListOptions {
  limit?: number;
  origin?: PersistentSystemLogOrigin;
  level?: PersistentSystemLogLevel;
}
