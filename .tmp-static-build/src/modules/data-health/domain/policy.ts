import { createHash } from "node:crypto";

import type {
  DataHealthCleanupAction,
  DataHealthCleanupMode,
  DataHealthIssue,
  DataHealthSeverity,
} from "./types";

export const DATA_HEALTH_POLICY = {
  cleanupPlanTtlMinutes: 10,
  cleanupLockMinutes: 5,
  imageQuarantineDays: 30,
  orphanImageGraceHours: 24,
  closedOrderRetentionDays: 90,
  historyLimit: 30,
  maxCleanupItems: 250,
} as const;

export function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function makeIssue(
  input: Omit<
    DataHealthIssue,
    "id" | "fingerprint" | "snapshotHash" | "canClean" | "state"
  > & {
    state?: DataHealthIssue["state"];
  },
): DataHealthIssue {
  const identity = {
    database: input.database,
    table: input.table,
    recordId: input.recordId,
    relatedId: input.relatedId ?? "",
    action: input.cleanupAction,
  };
  const fingerprint = stableHash(identity);
  return {
    ...input,
    id: fingerprint,
    fingerprint,
    snapshotHash: stableHash({
      ...identity,
      ownerUid: input.ownerUid,
      evidence: input.evidence,
      updatedAt: input.updatedAt ?? "",
    }),
    canClean:
      input.cleanupAction !== "none" &&
      input.cleanupMode !== "manual" &&
      input.cleanupMode !== "protected",
    state: input.state ?? "new",
  };
}

export function severityRank(severity: DataHealthSeverity): number {
  return severity === "critical" ? 0 : severity === "warning" ? 1 : 2;
}

export function cleanupModeForBrokenRelation(): DataHealthCleanupMode {
  return "automatic";
}

export function quarantineResourceType(
  action: DataHealthCleanupAction,
): "image" | "record" {
  return action === "quarantine-record" ? "record" : "image";
}

export function isOlderThan(
  value: string,
  days: number,
  now = Date.now(),
): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= now - days * 86_400_000;
}

export function cleanupConfirmationText(
  environment: "development" | "production",
  count: number,
): string {
  return environment === "production"
    ? `تنظيف ${count} عنصر في الإنتاج`
    : `تنظيف ${count} عنصر`;
}
