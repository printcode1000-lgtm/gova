/**
 * @asol/observability-core — the developer monitor: what the application observed about itself.
 *
 * It was `src/core/monitor/`: fourteen unsealed files that `@asol/data-core` had already been
 * given a port to talk to, while the recording side stayed in the application. Sealing it puts
 * both halves of one concern behind one door, and makes the one thing it needs from the
 * application — "is this a development build?" — an explicit port instead of an import.
 *
 * Two doors, on the usual line: everything here is browser-safe, and `./server` adds the
 * request-scoped tracing that needs `node:async_hooks`.
 */
export type { ObservabilityPorts } from './ports';
export {
  configureObservabilityCore,
  isObservabilityEnabled,
  observabilityPorts,
} from './ports';

export * from './monitor/types';
export * from './monitor/monitor-store';
export * from './monitor/asol-api-monitor';
export * from './monitor/asol-db-monitor';
export * from './monitor/query-observer';
export { registerMonitorTelemetry } from './monitor/data-core-telemetry';
export * from './traces/dev-trace-types';
// Browser-side: reads the dev-trace header off a response and folds it into the monitor store.
export * from './traces/emit-server-trace';
