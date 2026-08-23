import type { SystemLogInput } from '../domain/entities';

export interface SystemLogsDatabasePort {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface SystemLogsIdentityPort {
  isSuperAdmin(uid: string, phone: string): boolean;
}

export interface SystemLogsEnvironmentPort {
  retentionDays(): number;
  alertThreshold(): number;
  alertWindowMs(): number;
  alertWebhookUrl(): string | null;
}

export interface SystemLogsMonitorPort {
  getCurrentFlowId(): string | null;
  getSessionId(): string | null;
}

export interface SystemLogsNativeCrashPort {
  onCrash(handler: (payload: Record<string, unknown>) => void): () => void;
}

export interface SystemLogsPersistencePort {
  add(input: import('../domain/entities').StoredSystemLogInput): Promise<string>;
  addBatch(
    inputs: import('../domain/entities').StoredSystemLogInput[],
  ): Promise<void>;
  list(
    options: import('../domain/entities').SystemLogListOptions,
  ): Promise<import('../domain/entities').SystemLogListPage>;
  summary(): Promise<import('../domain/entities').SystemLogSummary>;
  clear(level?: string): Promise<void>;
  pruneOlderThan(cutoffIso: string): Promise<number>;
}

export interface SystemLogsClientSubmitPort {
  submit(input: SystemLogInput): Promise<void>;
}

export interface SystemLogsCorePorts {
  database: SystemLogsDatabasePort;
  identity: SystemLogsIdentityPort;
  environment: SystemLogsEnvironmentPort;
  monitor: SystemLogsMonitorPort;
  nativeCrash: SystemLogsNativeCrashPort;
  clientSubmit: SystemLogsClientSubmitPort;
}

const noop = () => undefined;
const noopUnsub = () => undefined;

const defaultPorts: SystemLogsCorePorts = {
  database: { execute: async () => [] },
  identity: { isSuperAdmin: () => false },
  environment: {
    retentionDays: () => 90,
    alertThreshold: () => 10,
    alertWindowMs: () => 60 * 60 * 1_000,
    alertWebhookUrl: () => null,
  },
  monitor: {
    getCurrentFlowId: () => null,
    getSessionId: () => null,
  },
  nativeCrash: { onCrash: () => noopUnsub },
  clientSubmit: { submit: async () => undefined },
};

/**
 * The registration lives on `globalThis`, not in this module's scope.
 *
 * A bundler may give one source file more than one instance: Next builds
 * `instrumentation` and each route into separate chunks, and Turbopack emitted
 * two copies of `data-core`'s runtime-config port — the composition root
 * configured one while every route read the other, and production answered 500
 * on every server route. Static checks and `tsx` tests cannot see it, because
 * Node resolves one path to one instance.
 *
 * A `Symbol.for` key on the global object is the same value from whichever
 * instance asks, which is what "configure once at startup" has to mean here.
 */
const PORTS_KEY = Symbol.for('@asol/system-logs-core/ports');

interface PortsCarrier {
  [PORTS_KEY]?: SystemLogsCorePorts;
}

const portsDefaults = (): SystemLogsCorePorts => (defaultPorts);

function portsState(): SystemLogsCorePorts {
  const carrier = globalThis as PortsCarrier;
  carrier[PORTS_KEY] ??= portsDefaults();
  return carrier[PORTS_KEY]!;
}

function setPortsState(next: SystemLogsCorePorts): void {
  (globalThis as PortsCarrier)[PORTS_KEY] = next;
}

export function configureSystemLogsCore(next: Partial<SystemLogsCorePorts>): void {
  setPortsState({
    database: next.database ?? portsState().database,
    identity: next.identity ?? portsState().identity,
    environment: next.environment ?? portsState().environment,
    monitor: next.monitor ?? portsState().monitor,
    nativeCrash: next.nativeCrash ?? portsState().nativeCrash,
    clientSubmit: next.clientSubmit ?? portsState().clientSubmit,
  });
}

export function systemLogsDatabase(): SystemLogsDatabasePort {
  return portsState().database;
}

export function systemLogsIdentity(): SystemLogsIdentityPort {
  return portsState().identity;
}

export function systemLogsEnvironment(): SystemLogsEnvironmentPort {
  return portsState().environment;
}

export function systemLogsMonitor(): SystemLogsMonitorPort {
  return portsState().monitor;
}

export function systemLogsNativeCrash(): SystemLogsNativeCrashPort {
  return portsState().nativeCrash;
}

export function systemLogsClientSubmit(): SystemLogsClientSubmitPort {
  return portsState().clientSubmit;
}

export function resetSystemLogsCorePorts(): void {
  setPortsState(defaultPorts);
}
