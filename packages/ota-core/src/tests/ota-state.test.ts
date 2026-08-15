import assert from "node:assert/strict";
import {
  isDailyOtaCheckDue,
  clampFutureOtaCheckTimestamp,
  requiredOtaFreeBytes,
  nativeDownloadPollAction,
  migrateOtaState,
} from "../domain/release/ota-state";

export async function runOtaStateTests(): Promise<void> {
  const now = Date.now();
  assert.equal(isDailyOtaCheckDue(undefined, now), true);
  assert.equal(isDailyOtaCheckDue(now - 25 * 60 * 60 * 1000, now), true);
  assert.equal(isDailyOtaCheckDue(now - 1 * 60 * 60 * 1000, now), false);

  assert.equal(clampFutureOtaCheckTimestamp(now + 10000, now), now);
  assert.equal(clampFutureOtaCheckTimestamp(now - 10000, now), now - 10000);

  const freeReq = requiredOtaFreeBytes(1000, 500);
  assert.ok(freeReq > 1500);

  assert.equal(nativeDownloadPollAction("completed", false), "complete");
  assert.equal(nativeDownloadPollAction("failed", false), "fail");
  assert.equal(nativeDownloadPollAction("missing", false), "reschedule");
  assert.equal(nativeDownloadPollAction("missing", true), "fail");
  assert.equal(nativeDownloadPollAction("downloading", false), "wait");

  const migrated = migrateOtaState({ lastStatusKey: "old" });
  assert.equal(migrated.lastStatusKey, "old");

  console.log("  ✔ ota-state unit tests passed");
}

if (process.argv[1]?.endsWith("ota-state.test.ts")) {
  runOtaStateTests().catch((e) => { console.error(e); process.exit(1); });
}
