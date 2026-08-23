/**
 * Public application door for `@/features/system-logs`.
 * Cross-feature consumers MUST import through this file only.
 */
/* BEGIN GENERATED FEATURE DOOR EXPORTS */
/** Auto-maintained sealed-door re-exports. Do not edit by hand. */
export * from './domain/persistent-system-log.entity';
export * from './pre-auth-failure-reporter';
export {
  PersistentSystemLogApiService,
  persistentSystemLogApiService,
} from './services/persistent-system-log-api-service';
export * from './system-logs-core-bootstrap';
/* END GENERATED FEATURE DOOR EXPORTS */
