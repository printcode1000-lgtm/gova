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

let ports: SystemLogsCorePorts = defaultPorts;

export function configureSystemLogsCore(next: Partial<SystemLogsCorePorts>): void {
  ports = {
    database: next.database ?? ports.database,
    identity: next.identity ?? ports.identity,
    environment: next.environment ?? ports.environment,
    monitor: next.monitor ?? ports.monitor,
    nativeCrash: next.nativeCrash ?? ports.nativeCrash,
    clientSubmit: next.clientSubmit ?? ports.clientSubmit,
  };
}

export function systemLogsDatabase(): SystemLogsDatabasePort {
  return ports.database;
}

export function systemLogsIdentity(): SystemLogsIdentityPort {
  return ports.identity;
}

export function systemLogsEnvironment(): SystemLogsEnvironmentPort {
  return ports.environment;
}

export function systemLogsMonitor(): SystemLogsMonitorPort {
  return ports.monitor;
}

export function systemLogsNativeCrash(): SystemLogsNativeCrashPort {
  return ports.nativeCrash;
}

export function systemLogsClientSubmit(): SystemLogsClientSubmitPort {
  return ports.clientSubmit;
}

export function resetSystemLogsCorePorts(): void {
  ports = defaultPorts;
}
