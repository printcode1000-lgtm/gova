import { readFileSync } from "node:fs";
import { hostname } from "node:os";

import { listOperations, reconcileOrphanedOperations } from "./operation-log";

/**
 * Admission control for mutation jobs.
 *
 * Six runners can each start a job whose shell command pulls in a heavy nested
 * toolchain. Nothing about the pool stops that, and the machine's out-of-memory
 * killer settles it instead — by sending SIGTERM to whichever process it likes,
 * which takes down several unrelated jobs at once and leaves their locks,
 * worktrees, and operation records behind. That is a worse outcome than waiting.
 *
 * So a mutation waits for two conditions before it does any real work: enough
 * free memory, and a free slot in the concurrency budget. Waiting costs an idle
 * runner; not waiting costs four killed jobs.
 */

export const DEFAULT_MAX_CONCURRENT_MUTATIONS = 3;
export const DEFAULT_MEMORY_FLOOR_MB = 2_048;
export const DEFAULT_ADMISSION_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_MS = 5_000;

function numberFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function maxConcurrentMutations(): number {
  return Math.max(1, numberFromEnv("GOVA_AGENT_MAX_CONCURRENT_MUTATIONS", DEFAULT_MAX_CONCURRENT_MUTATIONS));
}

export function memoryFloorMb(): number {
  return numberFromEnv("GOVA_AGENT_MEMORY_FLOOR_MB", DEFAULT_MEMORY_FLOOR_MB);
}

export function admissionTimeoutMs(): number {
  return numberFromEnv("GOVA_AGENT_ADMISSION_TIMEOUT_MS", DEFAULT_ADMISSION_TIMEOUT_MS);
}

export interface MemoryReading {
  availableMb: number;
  totalMb: number;
  swapFreeMb: number;
  swapTotalMb: number;
}

/**
 * Read memory from `/proc/meminfo`.
 *
 * `MemAvailable` rather than `MemFree` on purpose: the kernel's own estimate of
 * what a new allocation can actually get, which is the number the out-of-memory
 * killer's behaviour tracks.
 */
export function readMemory(): MemoryReading | null {
  let contents: string;
  try {
    contents = readFileSync("/proc/meminfo", "utf8");
  } catch {
    return null;
  }
  const field = (name: string): number => {
    const match = new RegExp(`^${name}:\\s+(\\d+) kB$`, "m").exec(contents);
    return match ? Number(match[1]) / 1024 : 0;
  };
  return {
    availableMb: Math.round(field("MemAvailable")),
    totalMb: Math.round(field("MemTotal")),
    swapFreeMb: Math.round(field("SwapFree")),
    swapTotalMb: Math.round(field("SwapTotal")),
  };
}

/** Mutations genuinely in flight on this machine, after clearing dead records. */
export function liveMutationCount(excludePid = process.pid): number {
  reconcileOrphanedOperations();
  return listOperations(200).filter(
    (operation) => operation.status === "running" && operation.host === hostname() && operation.pid !== excludePid,
  ).length;
}

export interface AdmissionDecision {
  admitted: boolean;
  waitedMs: number;
  reason: string | null;
  memory: MemoryReading | null;
  concurrent: number;
}

function blockingReason(): { reason: string | null; memory: MemoryReading | null; concurrent: number } {
  const memory = readMemory();
  const concurrent = liveMutationCount();
  if (concurrent >= maxConcurrentMutations()) {
    return { reason: `${concurrent} mutation(s) already running; the budget is ${maxConcurrentMutations()}`, memory, concurrent };
  }
  if (memory && memory.availableMb < memoryFloorMb()) {
    return {
      reason: `only ${memory.availableMb}MB available; the floor is ${memoryFloorMb()}MB`,
      memory,
      concurrent,
    };
  }
  return { reason: null, memory, concurrent };
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Block until the machine can take this job, or give up cleanly.
 *
 * Synchronous on purpose: the apply script is a straight line from lock to push,
 * and a blocking wait keeps it that way. The job is doing nothing while it waits
 * anyway.
 *
 * Giving up is a real outcome, not a failure to handle: the caller reports it
 * and exits before touching the worktree, so a refused job leaves nothing behind
 * to clean up.
 */
export function waitForAdmission(
  onWait: (reason: string, waitedMs: number) => void = () => {},
): AdmissionDecision {
  const startedAt = Date.now();
  const timeout = admissionTimeoutMs();
  let announced = "";

  for (;;) {
    const { reason, memory, concurrent } = blockingReason();
    const waitedMs = Date.now() - startedAt;
    if (!reason) return { admitted: true, waitedMs, reason: null, memory, concurrent };
    if (waitedMs >= timeout) return { admitted: false, waitedMs, reason, memory, concurrent };
    if (reason !== announced) {
      announced = reason;
      onWait(reason, waitedMs);
    }
    sleepSync(POLL_MS);
  }
}
