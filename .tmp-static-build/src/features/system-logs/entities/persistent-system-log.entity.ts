export type PersistentSystemLogLevel = "normal" | "warning" | "error";
export type PersistentSystemLogPlatform = "web" | "android" | "ios" | "server";
export type PersistentSystemLogSource =
  | "client"
  | "server"
  | "api"
  | "react"
  | "resource"
  | "native";

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
  occurrences: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
}
