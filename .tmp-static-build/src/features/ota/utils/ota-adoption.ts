/** Single responsibility: aggregate deduplicated OTA outcome logs by target version. */
import type { PersistentSystemLogEntry } from "@/features/system-logs/entities/persistent-system-log.entity";
import type { OtaAdoptionSummary } from "../types/ota.types";

export const OTA_TERMINAL_OUTCOMES = [
  "download_failed",
  "verification_failed",
  "activation_succeeded",
  "activation_failed",
  "rollback_performed",
  "revocation_applied",
] as const;

export function summarizeOtaAdoption(
  entries: readonly PersistentSystemLogEntry[],
): OtaAdoptionSummary[] {
  const versions = new Map<string, Record<string, number>>();
  for (const entry of entries) {
    if (entry.feature !== "ota" || !OTA_TERMINAL_OUTCOMES.includes(
      entry.operation as (typeof OTA_TERMINAL_OUTCOMES)[number],
    )) continue;
    const target = /(?:^|;)target=([^;]+)/.exec(entry.message)?.[1];
    if (!target) continue;
    const outcomes = versions.get(target) ?? {};
    outcomes[entry.operation!] = (outcomes[entry.operation!] ?? 0) + entry.occurrences;
    versions.set(target, outcomes);
  }
  return [...versions.entries()].map(([version, outcomes]) => ({ version, outcomes }));
}
