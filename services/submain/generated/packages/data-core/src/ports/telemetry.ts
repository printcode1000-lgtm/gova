/**
 * Telemetry port — rule 7 running the other way.
 *
 * The developer monitor belongs to the application: it owns the event shape, the store, the
 * session and flow identifiers, and the trace panel that renders them. This package must not
 * import any of it, so it declares the narrow surface it needs and the application registers
 * an implementation through `src/core/monitor/data-core-telemetry.ts`.
 *
 * Every method is a **wrapper**, never a "build this event and hand it over". The package
 * knows what it is about to run; the application knows what an observation looks like. Passing
 * a descriptor plus the action keeps the event shape entirely on the application's side, which
 * is what makes the monitor free to change without touching a single query.
 *
 * **Every default here is safe.** A forgotten registration costs trace lines in `/dev/monitor`
 * and nothing else — never a failed query, never a lost write. The contract test asserts that
 * property rather than trusting it, because a port that can break the thing it observes is
 * worse than the import it replaced.
 */

export interface DatabaseQueryDescriptor {
  /** Driver label, e.g. `Turso-Production` or `SQLite-Dev`. */
  readonly driver: string;
  readonly sql: string;
  readonly params: readonly unknown[];
  readonly table: string;
}

export interface QueryLogger {
  logQuery(query: string, params: unknown[]): void;
}

export interface DataCoreTelemetryPort {
  /**
   * Whether instrumentation is worth paying for. The instrumented execute path allocates and
   * times on every statement, so this gate is what keeps production on the raw path — it is
   * not a cosmetic flag.
   */
  isEnabled(): boolean;
  /** Wraps one SQL statement. The default runs the action untouched. */
  traceDatabaseQuery<T>(descriptor: DatabaseQueryDescriptor, action: () => Promise<T>): Promise<T>;
  /** Wraps one server-layer call (query, command, repository hop). */
  traceServerLayer<T>(layer: string, name: string, action: () => Promise<T>): Promise<T>;
  /** Wraps one browser IndexedDB operation. */
  traceBrowserDatabaseOperation<T>(
    store: string,
    key: string,
    operation: string,
    action: () => Promise<T>,
  ): Promise<T>;
  /** Drizzle's optional logger. `undefined` means "attach none". */
  createQueryLogger(): QueryLogger | undefined;
}

const NO_TELEMETRY: DataCoreTelemetryPort = {
  isEnabled: () => false,
  traceDatabaseQuery: (_descriptor, action) => action(),
  traceServerLayer: (_layer, _name, action) => action(),
  traceBrowserDatabaseOperation: (_store, _key, _operation, action) => action(),
  createQueryLogger: () => undefined,
};

let telemetry: DataCoreTelemetryPort = NO_TELEMETRY;

export function registerDataCoreTelemetry(port: Partial<DataCoreTelemetryPort>): void {
  telemetry = { ...NO_TELEMETRY, ...port };
}

export function resetDataCoreTelemetry(): void {
  telemetry = NO_TELEMETRY;
}

export function dataCoreTelemetry(): DataCoreTelemetryPort {
  return telemetry;
}

/** Convenience wrappers so call sites read the same as the imports they replaced. */
export function traceServerLayer<T>(
  layer: string,
  name: string,
  action: () => Promise<T>,
): Promise<T> {
  return telemetry.traceServerLayer(layer, name, action);
}

export function traceDatabaseQuery<T>(
  descriptor: DatabaseQueryDescriptor,
  action: () => Promise<T>,
): Promise<T> {
  return telemetry.traceDatabaseQuery(descriptor, action);
}

export function traceBrowserDatabaseOperation<T>(
  store: string,
  key: string,
  operation: string,
  action: () => Promise<T>,
): Promise<T> {
  return telemetry.traceBrowserDatabaseOperation(store, key, operation, action);
}

export function createDrizzleDevLogger(): QueryLogger | undefined {
  return telemetry.createQueryLogger();
}
