import assert from "node:assert/strict";

import { isRetryableR2Error } from "@asol/ota-core/publishing";

export async function runR2RetryTests(): Promise<void> {
  console.log("  → r2-retry.test.ts");

  for (const code of [
    "ECONNABORTED",
    "ECONNRESET",
    "ECONNREFUSED",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EAI_FAIL",
    "ETIMEDOUT",
    "RequestTimeout",
    "ServiceUnavailable",
  ]) {
    assert.equal(
      isRetryableR2Error({ name: "Error", code, message: `write ${code}` }),
      true,
      `${code} must be retried even when the generic Error name is present`,
    );
  }

  assert.equal(isRetryableR2Error({ $metadata: { httpStatusCode: 429 } }), true);
  assert.equal(isRetryableR2Error({ $metadata: { httpStatusCode: 503 } }), true);
  assert.equal(isRetryableR2Error(new Error("getaddrinfo ENOTFOUND r2.example")), true);
  assert.equal(isRetryableR2Error(new Error("invalid signing key")), false);

  console.log("    ✓ OTA R2 retry classification tests passed.");
}
