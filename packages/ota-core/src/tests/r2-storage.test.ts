import assert from "node:assert/strict";
import { isRetryableR2Error } from "../publishing";

export async function runR2StorageTests(): Promise<void> {
  assert.equal(isRetryableR2Error({ $metadata: { httpStatusCode: 500 } }), true);
  assert.equal(isRetryableR2Error({ $metadata: { httpStatusCode: 429 } }), true);
  assert.equal(isRetryableR2Error({ $metadata: { httpStatusCode: 404 } }), false);
  assert.equal(isRetryableR2Error({ name: "TimeoutError" }), true);
  assert.equal(isRetryableR2Error({ message: "socket hang up" }), true);
  assert.equal(isRetryableR2Error({ message: "unauthorized" }), false);

  console.log("  ✔ r2-storage tests passed");
}

if (process.argv[1]?.endsWith("r2-storage.test.ts")) {
  runR2StorageTests().catch((e) => { console.error(e); process.exit(1); });
}
