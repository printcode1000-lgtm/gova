import assert from "node:assert/strict";
import {
  compareOtaVersions,
  isOtaVersion,
  shouldSupersedePending,
} from "../domain/versioning/version-ordering";

export async function runVersionOrderingTests(): Promise<void> {
  assert.equal(isOtaVersion("0.2.4"), true);
  assert.equal(isOtaVersion("0.2.4.1"), true);
  assert.equal(isOtaVersion("0.2.4.0"), true);
  assert.equal(isOtaVersion("1.0.0"), true);
  assert.equal(isOtaVersion("invalid"), false);
  assert.equal(isOtaVersion("0.2.4.1.2"), false);

  assert.ok(compareOtaVersions("0.2.4.1", "0.2.4.0") > 0);
  assert.ok(compareOtaVersions("0.2.5.0", "0.2.4.99") > 0);
  assert.ok(compareOtaVersions("0.2.4", "0.2.4.0") === 0);
  assert.ok(compareOtaVersions("0.2.4.0", "0.2.4.0") === 0);
  assert.ok(compareOtaVersions("0.2.3.9", "0.2.4.0") < 0);

  assert.equal(shouldSupersedePending("0.2.4.0", "0.2.4.1"), true);
  assert.equal(shouldSupersedePending("0.2.4.1", "0.2.4.1"), false);
  assert.equal(shouldSupersedePending("0.2.4.2", "0.2.4.1"), false);

  console.log("  ✔ version-ordering unit tests passed");
}

if (process.argv[1]?.endsWith("version-ordering.test.ts")) {
  runVersionOrderingTests().catch((e) => { console.error(e); process.exit(1); });
}
