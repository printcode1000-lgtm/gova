/** Single responsibility: assign stable anonymous installations to rollout buckets. */
import { createHash } from "node:crypto";

export function otaRolloutBucket(releaseId: string, installationId: string): number {
  const digest = createHash("sha256")
    .update(releaseId)
    .update("\0")
    .update(installationId)
    .digest();
  return digest.readUInt32BE(0) % 100;
}

export function isOtaRolloutEligible(
  releaseId: string,
  installationId: string,
  percentage: number,
): boolean {
  return percentage >= 100 || (
    percentage > 0 &&
    Boolean(installationId) &&
    otaRolloutBucket(releaseId, installationId) < percentage
  );
}
