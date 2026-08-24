/**
 * Public application door for `@/features/system-logs`.
 * Cross-feature consumers MUST import through this file only.
 */
/* BEGIN GENERATED FEATURE DOOR EXPORTS */
/** Auto-maintained sealed-door re-exports. Do not edit by hand. */
export * from './domain/persistent-system-log.entity';
export * from './application/pre-auth-failure-reporter';
export {
  PersistentSystemLogApiService,
  persistentSystemLogApiService,
} from './application/services/persistent-system-log-api-service';
export * from './application/system-log-store';
export * from './application/system-logs-core-bootstrap';
/* END GENERATED FEATURE DOOR EXPORTS */
