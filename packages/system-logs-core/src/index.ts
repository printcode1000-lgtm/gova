export type {
  SystemLogLevel,
  SystemLogPlatform,
  SystemLogSource,
  SystemLogOrigin,
  SystemLogTrustLevel,
  SystemLogInput,
  SystemLogEntry,
  MemorySystemLogEntry,
  StoredSystemLogInput,
  PersistentSystemLogEntry,
  SystemLogListOptions,
  SystemLogListPage,
  SystemLogSummary,
  SystemLogExportRow,
} from './domain/entities';

export {
  MEMORY_LOG_MAX_ENTRIES,
  CLIENT_DEDUPE_WINDOW_MS,
  DEFAULT_RETENTION_DAYS,
  DEFAULT_ALERT_THRESHOLD,
  DEFAULT_ALERT_WINDOW_MS,
  LIST_DEFAULT_LIMIT,
  LIST_MAX_LIMIT,
} from './domain/constants';

export {
  buildSystemLogFingerprint,
  buildClientSubmitFingerprint,
} from './domain/fingerprint';

export {
  createCorrelationId,
  markErrorAsLogged,
  isErrorAlreadyLogged,
  SYSTEM_LOG_ALREADY_RECORDED,
} from './domain/correlation';

export {
  redactSystemLogText,
  sanitizePersistentSystemLog,
  containsSensitiveSystemLogKey,
} from './sanitization/sanitizer';

export {
  prettifyStack,
  formatExportCsv,
  groupEntriesByFingerprint,
  matchesLogQuery,
} from './formatting/presentation';

export {
  configureSystemLogsCore,
  resetSystemLogsCorePorts,
  systemLogsDatabase,
  systemLogsIdentity,
  systemLogsEnvironment,
  systemLogsMonitor,
  systemLogsNativeCrash,
  systemLogsClientSubmit,
  type SystemLogsCorePorts,
  type SystemLogsDatabasePort,
  type SystemLogsIdentityPort,
  type SystemLogsEnvironmentPort,
  type SystemLogsMonitorPort,
  type SystemLogsNativeCrashPort,
  type SystemLogsClientSubmitPort,
} from './ports';

export {
  addMemorySystemLog,
  clearMemorySystemLogs,
  setMemoryCaptureEnabled,
  setMemoryCollectorAuthorized,
  getMemoryCaptureEnabledSnapshot,
  getMemoryLogsSnapshot,
  subscribeToMemoryLogs,
  hasLiveFingerprint,
  countUniqueMemoryErrors,
  mergeLiveAndPersistentCounts,
} from './browser/memory-store';

export {
  captureSystemLog,
  shouldSkipClientSubmit,
  reportPreAuthFailure,
  reportSystemIssue,
  type CaptureOptions,
  type SystemIssueContext,
  type PreAuthFailureLevel,
  type PreAuthFailureContext,
} from './browser/capture-coordinator';

export {
  installGlobalCapture,
  type InstallGlobalCaptureOptions,
} from './browser/global-capture';
