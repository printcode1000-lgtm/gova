"use client";

export type SystemLogLevel = "normal" | "warning" | "error";

export interface SystemLogEntry {
  id: number;
  fingerprint: string;
  level: SystemLogLevel;
  consoleMethod: string;
  message: string;
  firstOccurredAt: string;
  lastOccurredAt: string;
  occurrences: number;
  page: string;
  platform: "web" | "android" | "ios";
  errorName?: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
  userAgent: string;
  feature?: string;
  operation?: string;
  stack?: string;
}

type Listener = () => void;

let entries: SystemLogEntry[] = [];
let nextId = 1;
let captureEnabled = true;
let collectorAuthorized = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function addSystemLog(
  entry: Omit<
    SystemLogEntry,
    "id" | "fingerprint" | "firstOccurredAt" | "lastOccurredAt" | "occurrences"
  >,
) {
  if (!captureEnabled || !collectorAuthorized) return;

  const fingerprint = [
    entry.level,
    entry.consoleMethod,
    entry.message,
    entry.page,
    entry.platform,
    entry.errorName ?? "",
    entry.sourceFile ?? "",
    entry.sourceLine ?? "",
    entry.sourceColumn ?? "",
    entry.feature ?? "",
    entry.operation ?? "",
    entry.stack ?? "",
  ].join("\u001f");
  const existingIndex = entries.findIndex(
    (item) => item.fingerprint === fingerprint,
  );
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    entries = entries.map((item, index) =>
      index === existingIndex
        ? { ...item, occurrences: item.occurrences + 1, lastOccurredAt: now }
        : item,
    );
    notify();
    return;
  }

  entries = [
    ...entries,
    {
      ...entry,
      id: nextId++,
      fingerprint,
      firstOccurredAt: now,
      lastOccurredAt: now,
      occurrences: 1,
    },
  ];
  notify();
}

export function clearSystemLogs(level: SystemLogLevel) {
  entries = entries.filter((entry) => entry.level !== level);
  notify();
}

export function clearAllSystemLogs() {
  entries = [];
  notify();
}

export function setSystemLogCaptureEnabled(enabled: boolean) {
  captureEnabled = enabled;
  notify();
}

export function setSystemLogCollectorAuthorized(authorized: boolean) {
  collectorAuthorized = authorized;
}

export function getSystemLogCaptureEnabledSnapshot() {
  return captureEnabled;
}

export function getSystemLogsSnapshot() {
  return entries;
}

export function subscribeToSystemLogs(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
