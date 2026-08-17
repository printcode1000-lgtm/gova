import { MEMORY_LOG_MAX_ENTRIES } from '../domain/constants';
import { buildSystemLogFingerprint } from '../domain/fingerprint';
import type { MemorySystemLogEntry, SystemLogInput, SystemLogLevel } from '../domain/entities';

type Listener = () => void;

let entries: MemorySystemLogEntry[] = [];
let nextId = 1;
let captureEnabled = true;
let collectorAuthorized = false;
let notifyScheduled = false;
const listeners = new Set<Listener>();
const liveFingerprints = new Set<string>();

function notify() {
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    listeners.forEach((listener) => listener());
  });
}

function trimEntries() {
  if (entries.length <= MEMORY_LOG_MAX_ENTRIES) return;
  entries = entries.slice(-MEMORY_LOG_MAX_ENTRIES);
}

export function addMemorySystemLog(
  entry: Omit<
    MemorySystemLogEntry,
    'id' | 'fingerprint' | 'firstOccurredAt' | 'lastOccurredAt' | 'occurrences'
  >,
) {
  if (!captureEnabled || !collectorAuthorized) return;

  const fingerprint = buildSystemLogFingerprint(entry);
  const existingIndex = entries.findIndex((item) => item.fingerprint === fingerprint);
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    entries = entries.map((item, index) =>
      index === existingIndex
        ? { ...item, occurrences: item.occurrences + 1, lastOccurredAt: now }
        : item,
    );
    liveFingerprints.add(fingerprint);
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
  liveFingerprints.add(fingerprint);
  trimEntries();
  notify();
}

export function clearMemorySystemLogs(level?: SystemLogLevel) {
  if (level) {
    entries = entries.filter((entry) => entry.level !== level);
  } else {
    entries = [];
    liveFingerprints.clear();
  }
  notify();
}

export function setMemoryCaptureEnabled(enabled: boolean) {
  captureEnabled = enabled;
  notify();
}

export function setMemoryCollectorAuthorized(authorized: boolean) {
  collectorAuthorized = authorized;
}

export function getMemoryCaptureEnabledSnapshot() {
  return captureEnabled;
}

export function getMemoryLogsSnapshot() {
  return entries;
}

export function subscribeToMemoryLogs(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasLiveFingerprint(fingerprint: string) {
  return liveFingerprints.has(fingerprint);
}

export function countUniqueMemoryErrors() {
  return entries
    .filter((entry) => entry.level === 'error')
    .reduce((sum, entry) => sum + Math.max(1, entry.occurrences), 0);
}

export function mergeLiveAndPersistentCounts(
  liveErrorCount: number,
  persistentEntries: Array<{ level: string; fingerprint: string; occurrences: number }>,
  liveFingerprintsSnapshot: Set<string>,
) {
  const persistentOnly = persistentEntries
    .filter((entry) => entry.level === 'error')
    .filter((entry) => !liveFingerprintsSnapshot.has(entry.fingerprint))
    .reduce((sum, entry) => sum + Math.max(1, entry.occurrences), 0);
  return liveErrorCount + persistentOnly;
}
