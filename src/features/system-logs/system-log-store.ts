import type { SystemLogLevel, SystemLogEntry } from '@asol/system-logs-core';
import {
  addMemorySystemLog,
  clearMemorySystemLogs,
  setMemoryCaptureEnabled,
  setMemoryCollectorAuthorized,
  getMemoryCaptureEnabledSnapshot,
  getMemoryLogsSnapshot,
  subscribeToMemoryLogs,
} from '@asol/system-logs-core';

export type { SystemLogLevel, SystemLogEntry };

export function addSystemLog(
  entry: Parameters<typeof addMemorySystemLog>[0],
) {
  addMemorySystemLog(entry);
}

export function clearSystemLogs(level: SystemLogLevel) {
  clearMemorySystemLogs(level);
}

export function clearAllSystemLogs() {
  clearMemorySystemLogs();
}

export const setSystemLogCaptureEnabled = setMemoryCaptureEnabled;
export const setSystemLogCollectorAuthorized = setMemoryCollectorAuthorized;
export const getSystemLogCaptureEnabledSnapshot = getMemoryCaptureEnabledSnapshot;
export const getSystemLogsSnapshot = getMemoryLogsSnapshot;
export const subscribeToSystemLogs = subscribeToMemoryLogs;
