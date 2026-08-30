import { hostname } from "node:os";
import path from "node:path";

import { listJsonFiles, readJsonDir, readJsonFile, safeIdentifier, writeJsonFile } from "./json-store";
import { operationLogsDir } from "./paths";

/**
 * Structured record of one mutation run.
 *
 * The record answers "who changed what, from which SHA to which SHA, and did it
 * verify" without ever carrying the material that produced the change: patch
 * bodies, shell command text, and secret values stay out by construction — the
 * log stores only whether they were present.
 */

export type OperationStatus = "running" | "success" | "failed";

export interface OperationRecord {
  requestId: string | null;
  agentId: string;
  workflow: string;
  targetMode: string;
  targetRef: string;
  runId: string;
  runnerName: string | null;
  host: string;
  pid: number;
  startingSha: string | null;
  resultingSha: string | null;
  changedFiles: string[];
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  verification: string;
  patchProvided: boolean;
  shellCommandProvided: boolean;
  lockScopes: string[];
  staleLockRecovered: boolean;
  recoveredStaleLockIds: string[];
  retryCount: number;
  status: OperationStatus;
  exitCode: number | null;
  failedCommand: string | null;
  /** Set when the job was killed by a signal rather than failing on its own. */
  terminatedBy: string | null;
  /** Set when the record was closed out by reconciliation, not by the job. */
  abandoned?: boolean;
  /** How long the job waited for memory and a concurrency slot before starting. */
  admissionWaitMs?: number;
}

export interface OperationLogInit {
  requestId?: string | null;
  agentId: string;
  workflow: string;
  targetMode: string;
  targetRef: string;
  runId: string;
  verification: string;
  patchProvided: boolean;
  shellCommandProvided: boolean;
}

/** A live operation record that rewrites its file on every state change. */
export class OperationLog {
  private readonly filePath: string;
  private readonly startedAtMs: number;
  readonly record: OperationRecord;

  constructor(init: OperationLogInit, now = Date.now()) {
    this.startedAtMs = now;
    this.record = {
      requestId: init.requestId ?? null,
      agentId: init.agentId,
      workflow: init.workflow,
      targetMode: init.targetMode,
      targetRef: init.targetRef,
      runId: init.runId,
      runnerName: process.env.RUNNER_NAME?.trim() || null,
      host: hostname(),
      pid: process.pid,
      startingSha: null,
      resultingSha: null,
      changedFiles: [],
      startedAt: new Date(now).toISOString(),
      completedAt: null,
      durationMs: 0,
      verification: init.verification,
      patchProvided: init.patchProvided,
      shellCommandProvided: init.shellCommandProvided,
      lockScopes: [],
      staleLockRecovered: false,
      recoveredStaleLockIds: [],
      retryCount: 0,
      status: "running",
      exitCode: null,
      failedCommand: null,
      terminatedBy: null,
    };
    const name = `${safeIdentifier(init.targetRef, 80)}-${safeIdentifier(init.runId, 32)}.json`;
    this.filePath = path.join(operationLogsDir(), name);
    this.write("running");
  }

  get path(): string {
    return this.filePath;
  }

  write(status: OperationStatus, exitCode: number | null = null): void {
    const completedAtMs = Date.now();
    this.record.status = status;
    this.record.completedAt = status === "running" ? null : new Date(completedAtMs).toISOString();
    this.record.durationMs = completedAtMs - this.startedAtMs;
    if (exitCode !== null) this.record.exitCode = exitCode;
    writeJsonFile(this.filePath, this.record);
  }
}

export function listOperations(limit = 50): OperationRecord[] {
  return readJsonDir<OperationRecord>(operationLogsDir())
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .slice(0, limit);
}

function processIsAlive(record: OperationRecord): boolean | null {
  if (record.host !== hostname() || typeof record.pid !== "number") return null;
  try {
    process.kill(record.pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Close out records left `running` by a job that died without an epilogue.
 *
 * A process killed outright — an out-of-memory SIGTERM, a cancelled run — never
 * gets to write its own ending, so its record claims to be in flight forever and
 * the monitor and the snapshot both report work that is not happening. Anything
 * whose process is provably gone is marked `abandoned` here, which is what keeps
 * "in flight" meaning in flight.
 */
export function reconcileOrphanedOperations(): OperationRecord[] {
  const reconciled: OperationRecord[] = [];
  // Rewrite each record in the file it was read from. Recomputing the name from
  // its fields would leave the original behind still claiming to be running.
  for (const filePath of listJsonFiles(operationLogsDir())) {
    const record = readJsonFile<OperationRecord>(filePath);
    if (!record || record.status !== "running") continue;
    if (processIsAlive(record) !== false) continue;
    const updated: OperationRecord = {
      ...record,
      status: "failed",
      abandoned: true,
      completedAt: record.completedAt ?? new Date().toISOString(),
      failedCommand: record.failedCommand ?? "process-terminated-without-epilogue",
    };
    writeJsonFile(filePath, updated);
    reconciled.push(updated);
  }
  return reconciled;
}
