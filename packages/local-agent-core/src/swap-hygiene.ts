import { readMemory, type MemoryReading } from "./admission";

/**
 * Whether the machine's swap is worth flushing, and whether flushing is safe.
 *
 * Swap that has filled does not empty on its own. Pages written under an earlier
 * memory spike stay there long after the pressure passed, so free swap keeps
 * falling across a working day until it reaches zero — which is exactly the state
 * that satisfies half of earlyoom's kill condition permanently and forces the
 * admission floor up. Flushing restores the headroom.
 *
 * The flush itself is `swapoff -a && swapon -a`, which pulls every swapped page
 * back into RAM. That is only safe when RAM can actually hold them: run it while
 * used swap exceeds free memory and the kernel starts killing processes to make
 * room. So this module answers two questions, not one — is a flush worthwhile,
 * and is it currently safe — and refuses to recommend one it cannot vouch for.
 *
 * It never runs the command. Swap is system configuration, and the operator
 * decides when their machine reorganises its memory.
 */

/** Below this fraction of free swap, the machine is in the danger regime. */
export const SWAP_PRESSURE_RATIO = 0.5;
/** Headroom demanded beyond the swapped bytes, so the flush is not a coin flip. */
export const FLUSH_SAFETY_MARGIN_MB = 1_024;

export type SwapVerdict = "no-swap" | "healthy" | "flush-recommended" | "flush-unsafe";

export interface SwapHygiene {
  verdict: SwapVerdict;
  usedMb: number;
  totalMb: number;
  freeRatio: number;
  availableMb: number;
  /** What the operator should run, or null when nothing should be run. */
  command: string | null;
  reason: string;
}

export const SWAP_FLUSH_COMMAND = "sudo swapoff -a && sudo swapon -a";

export function assessSwap(memory: MemoryReading | null = readMemory()): SwapHygiene {
  if (!memory || memory.swapTotalMb <= 0) {
    return {
      verdict: "no-swap",
      usedMb: 0,
      totalMb: memory?.swapTotalMb ?? 0,
      freeRatio: 0,
      availableMb: memory?.availableMb ?? 0,
      command: null,
      reason: "no swap is configured; there is nothing to flush",
    };
  }

  const usedMb = memory.swapTotalMb - memory.swapFreeMb;
  const freeRatio = memory.swapFreeMb / memory.swapTotalMb;
  const base = { usedMb, totalMb: memory.swapTotalMb, freeRatio, availableMb: memory.availableMb };

  if (freeRatio > SWAP_PRESSURE_RATIO) {
    return {
      ...base,
      verdict: "healthy",
      command: null,
      reason: `${memory.swapFreeMb}MB of ${memory.swapTotalMb}MB swap is free; no flush needed`,
    };
  }

  // A flush pulls every swapped page back into RAM, so RAM has to hold them with
  // room to spare. Recommending one that cannot fit would trade a slow machine
  // for a killed one.
  if (memory.availableMb < usedMb + FLUSH_SAFETY_MARGIN_MB) {
    return {
      ...base,
      verdict: "flush-unsafe",
      command: null,
      reason:
        `${usedMb}MB is swapped but only ${memory.availableMb}MB of RAM is available; ` +
        `a flush needs ${usedMb + FLUSH_SAFETY_MARGIN_MB}MB. Wait for jobs to finish, then re-check`,
    };
  }

  return {
    ...base,
    verdict: "flush-recommended",
    command: SWAP_FLUSH_COMMAND,
    reason:
      `${usedMb}MB is swapped with ${memory.availableMb}MB of RAM available; ` +
      "flushing restores the headroom that keeps the admission floor down",
  };
}

/** One line for a CLI that has just started or just finished a batch of work. */
export function swapHygieneLine(hygiene: SwapHygiene = assessSwap()): string {
  if (hygiene.verdict === "flush-recommended") {
    return `swap: ${hygiene.reason}. Run: ${hygiene.command}`;
  }
  return `swap: ${hygiene.reason}`;
}
