export const RELEASE_STATE_SCHEMA_VERSION = 1;

export const RELEASE_WORKLOADS = [
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
] as const;

export type ReleaseWorkload = (typeof RELEASE_WORKLOADS)[number];
export type ReleaseComponent = "control" | ReleaseWorkload;
export type ReleaseResultStatus = "pending" | "passed" | "failed";
export type DurableReleaseStatus = "pending" | "running" | "ready" | "failed" | "rolled_back";

export interface ReleaseComponentResult {
  readonly status: ReleaseResultStatus;
  readonly deploymentId?: string;
  readonly url?: string;
  readonly smokeStatus?: ReleaseResultStatus;
  readonly evidence?: string;
  readonly failure?: string;
  readonly updatedAt?: string;
}

export interface ReleaseRollbackState {
  readonly status: ReleaseResultStatus;
  readonly evidence?: string;
  readonly failure?: string;
  readonly updatedAt: string;
}

export interface DurableReleaseState {
  readonly schemaVersion: 1;
  readonly revision: string;
  readonly status: DurableReleaseStatus;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly runId: string;
  readonly source: "bootstrap" | "sandbox" | "cli" | "callback";
  readonly control: ReleaseComponentResult;
  readonly workloads: Record<ReleaseWorkload, ReleaseComponentResult>;
  readonly readinessEvidence: readonly string[];
  readonly failureDetails: readonly string[];
  readonly rollback?: ReleaseRollbackState;
  readonly appliedOperations: readonly string[];
}

export interface ReleaseStateStore {
  read(revision: string): Promise<DurableReleaseState | null>;
  write(state: DurableReleaseState, expectedVersion: number | null): Promise<DurableReleaseState>;
}

export interface SqlReleaseStateDataSource {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface ReleaseStateMutation {
  readonly revision: string;
  readonly runId: string;
  readonly operationId: string;
  readonly source: DurableReleaseState["source"];
  readonly control?: ReleaseComponentResult;
  readonly workloads?: Partial<Record<ReleaseWorkload, ReleaseComponentResult>>;
  readonly readinessEvidence?: readonly string[];
  readonly failureDetails?: readonly string[];
  readonly rollback?: ReleaseRollbackState;
  readonly status?: Exclude<DurableReleaseStatus, "ready">;
}

const SHA = /^[0-9a-f]{40}$/;

function assertSha(revision: string): void {
  if (!SHA.test(revision)) throw new Error("releaseStateInvalidRevision");
}

function emptyResult(): ReleaseComponentResult {
  return { status: "pending" };
}

function emptyWorkloads(): Record<ReleaseWorkload, ReleaseComponentResult> {
  return Object.fromEntries(RELEASE_WORKLOADS.map((name) => [name, emptyResult()])) as Record<
    ReleaseWorkload,
    ReleaseComponentResult
  >;
}

function unique(items: readonly string[]): string[] {
  return [...new Set(items.filter((item) => item.trim().length > 0))];
}

export function newDurableReleaseState(input: {
  readonly revision: string;
  readonly runId: string;
  readonly source: DurableReleaseState["source"];
  readonly now?: string;
}): DurableReleaseState {
  assertSha(input.revision);
  const now = input.now ?? new Date().toISOString();
  return {
    schemaVersion: RELEASE_STATE_SCHEMA_VERSION,
    revision: input.revision,
    status: "pending",
    version: 0,
    createdAt: now,
    updatedAt: now,
    runId: input.runId,
    source: input.source,
    control: emptyResult(),
    workloads: emptyWorkloads(),
    readinessEvidence: [],
    failureDetails: [],
    appliedOperations: [],
  };
}

export function releaseStateIsReady(state: DurableReleaseState): boolean {
  if (state.revision.length !== 40) return false;
  if (state.control.status !== "passed" || state.control.smokeStatus !== "passed") return false;
  return RELEASE_WORKLOADS.every((workload) => {
    const result = state.workloads[workload];
    return result.status === "passed" && result.smokeStatus === "passed";
  });
}

function deriveStatus(state: DurableReleaseState): DurableReleaseStatus {
  if (state.rollback?.status === "passed") return "rolled_back";
  if (state.control.status === "failed") return "failed";
  if (RELEASE_WORKLOADS.some((workload) => state.workloads[workload].status === "failed")) return "failed";
  if (state.rollback?.status === "failed") return "failed";
  if (releaseStateIsReady(state)) return "ready";
  return state.status === "failed" ? "failed" : "running";
}

export async function applyReleaseStateMutation(
  store: ReleaseStateStore,
  mutation: ReleaseStateMutation,
): Promise<DurableReleaseState> {
  assertSha(mutation.revision);
  if (!mutation.operationId.trim()) throw new Error("releaseStateOperationRequired");

  const existing = await store.read(mutation.revision);
  const current =
    existing ??
    newDurableReleaseState({
      revision: mutation.revision,
      runId: mutation.runId,
      source: mutation.source,
    });

  if (current.appliedOperations.includes(mutation.operationId)) return current;

  const now = new Date().toISOString();
  const next: DurableReleaseState = {
    ...current,
    runId: mutation.runId || current.runId,
    source: mutation.source,
    control: mutation.control ? { ...current.control, ...mutation.control, updatedAt: now } : current.control,
    workloads: {
      ...current.workloads,
      ...Object.fromEntries(
        Object.entries(mutation.workloads ?? {}).map(([name, result]) => [
          name,
          { ...current.workloads[name as ReleaseWorkload], ...result, updatedAt: now },
        ]),
      ),
    },
    readinessEvidence: unique([...(current.readinessEvidence ?? []), ...(mutation.readinessEvidence ?? [])]),
    failureDetails: unique([...(current.failureDetails ?? []), ...(mutation.failureDetails ?? [])]),
    rollback: mutation.rollback ?? current.rollback,
    appliedOperations: unique([...current.appliedOperations, mutation.operationId]),
    updatedAt: now,
    version: current.version + 1,
    status: mutation.status ?? current.status,
  };
  return store.write({ ...next, status: deriveStatus(next) }, existing ? current.version : null);
}

export async function releaseReadinessStatusFromStore(
  store: ReleaseStateStore,
  revision: string,
): Promise<"pending" | "ready" | "failed"> {
  assertSha(revision);
  const state = await store.read(revision);
  if (!state) return "pending";
  if (state.status === "ready" && releaseStateIsReady(state)) return "ready";
  if (state.status === "failed" || state.status === "rolled_back") return "failed";
  return "pending";
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

export class SqlReleaseStateStore implements ReleaseStateStore {
  constructor(private readonly dataSource: SqlReleaseStateDataSource) {}

  private async ensureSchema(): Promise<void> {
    await this.dataSource.execute(
      `CREATE TABLE IF NOT EXISTS control_release_state (
        revision TEXT PRIMARY KEY NOT NULL,
        version INTEGER NOT NULL,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    );
  }

  async read(revision: string): Promise<DurableReleaseState | null> {
    assertSha(revision);
    await this.ensureSchema();
    const rows = rowsOf(
      await this.dataSource.execute(
        "SELECT state_json FROM control_release_state WHERE revision = ? LIMIT 1",
        [revision],
      ),
    );
    const raw = rows[0]?.state_json;
    if (typeof raw !== "string") return null;
    return JSON.parse(raw) as DurableReleaseState;
  }

  async write(state: DurableReleaseState, expectedVersion: number | null): Promise<DurableReleaseState> {
    assertSha(state.revision);
    await this.ensureSchema();
    const current = await this.read(state.revision);
    if ((current?.version ?? null) !== expectedVersion) throw new Error("releaseStateVersionConflict");
    await this.dataSource.execute(
      `INSERT INTO control_release_state (revision, version, state_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(revision) DO UPDATE SET
         version = excluded.version,
         state_json = excluded.state_json,
         updated_at = excluded.updated_at`,
      [state.revision, state.version, JSON.stringify(state), state.updatedAt],
    );
    return state;
  }
}
