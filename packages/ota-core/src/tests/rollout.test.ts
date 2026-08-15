import assert from "node:assert/strict";
import { otaRolloutBucket, isOtaRolloutEligible } from "../domain/release/rollout";

export async function runRolloutTests(): Promise<void> {
  const bucket1 = await otaRolloutBucket("user-1", "rel-123");
  const bucket2 = await otaRolloutBucket("user-1", "rel-123");
  assert.equal(bucket1, bucket2);
  assert.ok(bucket1 >= 0 && bucket1 < 100);

  const eligible100 = await isOtaRolloutEligible("user-1", "rel-123", 100);
  assert.equal(eligible100, true);

  const eligible0 = await isOtaRolloutEligible("user-1", "rel-123", 0);
  assert.equal(eligible0, false);

  console.log("  ✔ rollout unit tests passed");
}

if (process.argv[1]?.endsWith("rollout.test.ts")) {
  runRolloutTests().catch((e) => { console.error(e); process.exit(1); });
}
