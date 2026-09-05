export {
  persistentSystemLogService,
  logServerSystemIssue,
  normalizeIngestPayload,
  validateIngestBatchSize,
  isIngestRateLimited,
  readBoundedJsonBody,
  requestClientKey,
} from './server/persistent-log-service';

export { emitTerminalSystemLog } from './server/terminal-logger';
export { evaluateAlerts } from './server/alert-evaluator';
export {
  publishSystemLogEvent,
  subscribeSystemLogEvents,
  createSseStream,
} from './server/stream-hub';

export type {
  SystemLogInput,
  PersistentSystemLogEntry,
  SystemLogListOptions,
  SystemLogListPage,
  SystemLogSummary,
  StoredSystemLogInput,
} from './domain/entities';

export {
  sanitizePersistentSystemLog,
  redactSystemLogText,
} from './sanitization/sanitizer';

export {
  markErrorAsLogged,
  isErrorAlreadyLogged,
  createCorrelationId,
} from './domain/correlation';

export {
  configureSystemLogsCore,
  resetSystemLogsCorePorts,
  systemLogsPersistence,
  systemLogsEnvironment,
  systemLogsIdentity,
  systemLogsMonitor,
} from './ports';

export {
  DEFAULT_RETENTION_DAYS,
  DEFAULT_ALERT_THRESHOLD,
  DEFAULT_ALERT_WINDOW_MS,
  MAX_INGEST_BODY_BYTES,
} from './domain/constants';
