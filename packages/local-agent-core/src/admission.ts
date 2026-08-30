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

// Heavy nested coding-agent processes can exhaust the host even with three
// concurrent mutations. Default to one mutating workload at a time; callers may
// explicitly raise the budget with GOVA_AGENT_MAX_CONCURRENT_MUTATIONS after
// measuring sufficient headroom for their workload.
export const DEFAULT_MAX_CONCURRENT_MUTATIONS = 1;
export const DEFAULT_MEMORY_FLOOR_MB = 2_048;
export const DEFAULT_ADMISSION_TIMEOUT_MS = 15 * 60 * 1000;
export const EARLYOOM_MEMORY_RATIO = 0.1;
export const EARLYOOM_SWAP_RATIO = 0.1;
export const DEFAULT_JOB_RESERVE_MB = 1_536;
export const DEFAULT_RESERVATION_MS = 90_000;
const POLL_MS = 5_000;

function numberFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function maxConcurrentMutations(): number {
  return Math.max(1, numberFromEnv("GOVA_AGENT_MAX_CONCURRENT_MUTATIONS", DEFAULT_MAX_CONCURRENT_MUTATIONS));
}

export function memoryFloorMb(memory: MemoryReading | null = readMemory()): number {
  return memoryFloorFor(memory);
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

export function jobReserveMb(): number {
  return Math.max(0, numberFromEnv("GOVA_AGENT_JOB_RESERVE_MB", DEFAULT_JOB_RESERVE_MB));
}

export function reservationMs(): number {
  return Math.max(0, numberFromEnv("GOVA_AGENT_RESERVATION_MS", DEFAULT_RESERVATION_MS));
}

export function swapIsHealthy(memory: MemoryReading): boolean {
  if (memory.swapTotalMb <= 0) return false;
  return memory.swapFreeMb / memory.swapTotalMb > EARLYOOM_SWAP_RATIO;
}

export function memoryFloorFor(memory: MemoryReading | null): number {
  const explicit = process.env.GOVA_AGENT_MEMORY_FLOOR_MB;
  if (explicit !== undefined && explicit.trim() !== "") {
    return numberFromEnv("GOVA_AGENT_MEMORY_FLOOR_MB", DEFAULT_MEMORY_FLOOR_MB);
  }
  if (!memory) return DEFAULT_MEMORY_FLOOR_MB;
  if (swapIsHealthy(memory)) return DEFAULT_MEMORY_FLOOR_MB;
  return Math.max(DEFAULT_MEMORY_FLOOR_MB, Math.round(memory.totalMb * EARLYOOM_MEMORY_RATIO) + jobReserveMb());
}

export function memoryFloorReason(memory: MemoryReading | null): string | null {
  if (process.env.GOVA_AGENT_MEMORY_FLOOR_MB?.trim()) return "explicit";
  if (!memory || swapIsHealthy(memory)) return null;
  return "raised: swap exhausted";
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

export function pendingReservationMb(now = Date.now(), excludePid = process.pid): number {
  reconcileOrphanedOperations();
  const reserve = jobReserveMb();
  const windowMs = reservationMs();
  return listOperations(200)
    .filter((operation) => {
      if (operation.status !== "running") return false;
      if (operation.host !== hostname() || operation.pid === excludePid) return false;
      if (!operation.admittedAt) return false;
      const admittedAt = Date.parse(operation.admittedAt);
      return Number.isFinite(admittedAt) && now - admittedAt <= windowMs;
    })
    .reduce((total, operation) => total + (operation.reservedMb ?? reserve), 0);
}

export interface AdmissionDecision {
  admitted: boolean;
  waitedMs: number;
  reason: string | null;
  memory: MemoryReading | null;
  concurrent: number;
  reservedMb: number;
  effectiveAvailableMb: number | null;
}

function blockingReason(): {
  reason: string | null;
  memory: MemoryReading | null;
  concurrent: number;
  reservedMb: number;
  effectiveAvailableMb: number | null;
} {
  const memory = readMemory();
  const concurrent = liveMutationCount();
  const reservedMb = pendingReservationMb();
  const floor = memoryFloorFor(memory);
  const effectiveAvailableMb = memory ? memory.availableMb - reservedMb : null;
  if (concurrent >= maxConcurrentMutations()) {
    return { reason: `${concurrent} mutation(s) already running; the budget is ${maxConcurrentMutations()}`, memory, concurrent, reservedMb, effectiveAvailableMb };
  }
  if (memory && effectiveAvailableMb !== null && effectiveAvailableMb < floor) {
    return {
      reason: `only ${effectiveAvailableMb}MB effectively available (${memory.availableMb}MB free, ${reservedMb}MB reserved); the floor is ${floor}MB`,
      memory,
      concurrent,
      reservedMb,
      effectiveAvailableMb,
    };
  }
  return { reason: null, memory, concurrent, reservedMb, effectiveAvailableMb };
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
    const { reason, memory, concurrent, reservedMb, effectiveAvailableMb } = blockingReason();
    const waitedMs = Date.now() - startedAt;
    if (!reason) return { admitted: true, waitedMs, reason: null, memory, concurrent, reservedMb, effectiveAvailableMb };
    if (waitedMs >= timeout) return { admitted: false, waitedMs, reason, memory, concurrent, reservedMb, effectiveAvailableMb };
    if (reason !== announced) {
      announced = reason;
      onWait(reason, waitedMs);
    }
    sleepSync(POLL_MS);
  }
}
