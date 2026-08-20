/**
 * The server half: request-scoped tracing.
 *
 * Separate from the main door because `node:async_hooks` cannot reach a browser bundle. It also
 * carries **only** what a server needs: `emit-server-trace` reads a trace header on the browser
 * side and pulls the monitor store with it, so re-exporting it here would drag the store — and
 * `@asol/data-core/browser` behind it — into every deployment that only wanted `traceServerLayer`.
 * A door is a load-time contract, not a convenience barrel.
 */
export * from './traces/server-trace';
export * from './traces/trace-server-layer';
export * from './traces/drizzle-dev-logger';
export { registerServerMonitorTelemetry } from './traces/data-core-telemetry.server';
