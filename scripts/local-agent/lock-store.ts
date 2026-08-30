import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import path from "node:path";

import { FILE_MODE, ensureDir, readJsonDir, readJsonFile, safeIdentifier, writeJsonFile } from "./json-store";
import { locksDir } from "./paths";

/**
 * Scope locks for concurrent agents.
 *
 * A lock reserves one scope — a file, a directory, a logical module, or a git
 * ref — for one agent. Two scopes conflict when they are equal or when one path
 * contains the other, so reserving `src/app` blocks `src/app/page.tsx` and vice
 * versa. Acquisition is serialized through a registry mutex, because deciding
 * "does anything conflict" is a read of the whole directory and must not race.
 */

export const DEFAULT_LOCK_TTL_MS = 90 * 60 * 1000;

export type LockKind = "path" | "module" | "ref";

export interface LockRecord {
  lockId: string;
  agentId: string;
  kind: LockKind;
  scope: string;
  runId: string | null;
  pid: number;
  host: string;
  acquiredAt: string;
  ttlMs: number;
  note: string | null;
}

export interface LockSnapshot extends LockRecord {
  ageMs: number;
  stale: boolean;
}

export class LockConflictError extends Error {
  constructor(
    readonly requested: string,
    readonly holder: LockRecord,
  ) {
    super(`Scope "${requested}" conflicts with lock "${holder.scope}" held by ${holder.agentId}.`);
    this.name = "LockConflictError";
  }
}

function staleLockMs(): number {
  const configured = Number(process.env.GOVA_AGENT_STALE_LOCK_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_LOCK_TTL_MS;
}

export function normalizeScope(kind: LockKind, scope: string): string {
  const trimmed = scope.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (!trimmed) throw new Error("Lock scope must not be empty.");
  return kind === "path" ? trimmed : trimmed.toLowerCase();
}

export function lockId(kind: LockKind, scope: string): string {
  const digest = createHash("sha256").update(`${kind}:${scope}`).digest("hex").slice(0, 12);
  return `${kind}-${safeIdentifier(scope, 40) || "scope"}-${digest}`;
}

function lockPath(id: string): string {
  return path.join(locksDir(), `${id}.json`);
}

/** True when two scopes cannot be held at the same time by different agents. */
export function scopesConflict(left: LockRecord, right: { kind: LockKind; scope: string }): boolean {
  if (left.kind !== right.kind) return false;
  if (left.scope === right.scope) return true;
  if (left.kind !== "path") return false;
  return left.scope.startsWith(`${right.scope}/`) || right.scope.startsWith(`${left.scope}/`);
}

export function ageOf(record: LockRecord, now = Date.now()): number {
  const acquiredMs = Date.parse(record.acquiredAt);
  return Number.isFinite(acquiredMs) ? now - acquiredMs : Number.POSITIVE_INFINITY;
}

export function isStale(record: LockRecord, now = Date.now()): boolean {
  return ageOf(record, now) > (record.ttlMs || staleLockMs());
}

export function listLocks(now = Date.now()): LockSnapshot[] {
  return readJsonDir<LockRecord>(locksDir())
    .map((record) => ({ ...record, ageMs: ageOf(record, now), stale: isStale(record, now) }))
    .sort((left, right) => left.scope.localeCompare(right.scope));
}

/** Drop every expired lock; returns the ids that were reclaimed. */
export function recoverStaleLocks(now = Date.now()): string[] {
  const recovered: string[] = [];
  for (const record of listLocks(now)) {
    if (!record.stale) continue;
    try {
      unlinkSync(lockPath(record.lockId));
      recovered.push(record.lockId);
    } catch {
      // Another process reclaimed it first; nothing to do.
    }
  }
  return recovered;
}

const REGISTRY_MUTEX = ".registry.mutex";
const MUTEX_TIMEOUT_MS = 20_000;
const MUTEX_STALE_MS = 60_000;

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withRegistryMutex<T>(action: () => T): T {
  const mutexPath = path.join(ensureDir(locksDir()), REGISTRY_MUTEX);
  const deadline = Date.now() + MUTEX_TIMEOUT_MS;
  let fd: number | null = null;
  while (fd === null) {
    try {
      fd = openSync(mutexPath, "wx", FILE_MODE);
    } catch {
      let ageMs = 0;
      try {
        ageMs = Date.now() - statSync(mutexPath).mtimeMs;
      } catch {
        continue;
      }
      if (ageMs > MUTEX_STALE_MS) {
        try {
          unlinkSync(mutexPath);
        } catch {
          // Someone else won the race to reclaim it.
        }
        continue;
      }
      if (Date.now() > deadline) throw new Error("Timed out waiting for the coordination lock registry.");
      sleepSync(50);
    }
  }
  try {
    writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
    return action();
  } finally {
    try {
      closeSync(fd);
    } catch {
      // Already closed.
    }
    try {
      unlinkSync(mutexPath);
    } catch {
      // Already removed.
    }
  }
}

export interface AcquireInput {
  agentId: string;
  kind: LockKind;
  scope: string;
  runId?: string | null;
  ttlMs?: number;
  note?: string | null;
}

export interface AcquireResult {
  lock: LockRecord;
  recoveredStaleLockIds: string[];
  reentrant: boolean;
}

/**
 * Reserve a scope. Expired locks are reclaimed first, an agent re-acquiring its
 * own scope simply refreshes it, and a live conflict throws.
 */
export function acquireLock(input: AcquireInput, now = Date.now()): AcquireResult {
  const kind = input.kind;
  const scope = normalizeScope(kind, input.scope);
  const id = lockId(kind, scope);
  return withRegistryMutex(() => {
    const recoveredStaleLockIds = recoverStaleLocks(now);
    for (const held of listLocks(now)) {
      if (!scopesConflict(held, { kind, scope })) continue;
      if (held.agentId === input.agentId) {
        const refreshed: LockRecord = { ...held, acquiredAt: new Date(now).toISOString() };
        writeJsonFile(lockPath(held.lockId), refreshed);
        return { lock: refreshed, recoveredStaleLockIds, reentrant: true };
      }
      throw new LockConflictError(scope, held);
    }
    const record: LockRecord = {
      lockId: id,
      agentId: input.agentId,
      kind,
      scope,
      runId: input.runId ?? null,
      pid: process.pid,
      host: hostname(),
      acquiredAt: new Date(now).toISOString(),
      ttlMs: input.ttlMs ?? staleLockMs(),
      note: input.note ?? null,
    };
    writeJsonFile(lockPath(id), record);
    return { lock: record, recoveredStaleLockIds, reentrant: false };
  });
}

/** Release a lock. Only its owner may release it unless the lock has expired. */
export function releaseLock(agentId: string, kind: LockKind, scope: string, now = Date.now()): boolean {
  const id = lockId(kind, normalizeScope(kind, scope));
  const existing = readJsonFile<LockRecord>(lockPath(id));
  if (!existing) return false;
  if (existing.agentId !== agentId && !isStale(existing, now)) {
    throw new Error(`Lock "${existing.scope}" is held by ${existing.agentId} and cannot be released by ${agentId}.`);
  }
  try {
    unlinkSync(lockPath(id));
    return true;
  } catch {
    return false;
  }
}

/** Release everything an agent holds — used when a job exits, cleanly or not. */
export function releaseAgentLocks(agentId: string): string[] {
  const released: string[] = [];
  for (const record of listLocks()) {
    if (record.agentId !== agentId) continue;
    if (!existsSync(lockPath(record.lockId))) continue;
    try {
      unlinkSync(lockPath(record.lockId));
      released.push(record.lockId);
    } catch {
      // Already gone.
    }
  }
  return released;
}
