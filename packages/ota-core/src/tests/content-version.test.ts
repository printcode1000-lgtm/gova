import assert from "node:assert/strict";
import {
  isNativeVersion,
  assertNativeVersion,
  parseContentVersion,
  releaseContentVersion,
  nextContentVersion,
  assertContentVersionAdvances,
} from "../domain/versioning/content-version";

export async function runContentVersionTests(): Promise<void> {
  assert.equal(isNativeVersion("0.2.4"), true);
  assert.equal(isNativeVersion("1.0.0"), true);
  assert.equal(isNativeVersion("0.2.4.0"), false);
  assert.doesNotThrow(() => assertNativeVersion("0.2.4"));
  assert.throws(() => assertNativeVersion("0.2.4.0"));

  const parsed = parseContentVersion("0.2.4.5");
  assert.deepEqual(parsed, {
    nativeVersion: "0.2.4",
    counter: 5,
  });

  assert.equal(parseContentVersion("0.2.4"), null);
  assert.equal(releaseContentVersion("0.2.4"), "0.2.4.0");

  assert.equal(nextContentVersion(null, "0.2.4"), "0.2.4.1");
  assert.equal(nextContentVersion("0.2.3.5", "0.2.4"), "0.2.4.1");
  assert.equal(nextContentVersion("0.2.4.0", "0.2.4"), "0.2.4.1");
  assert.equal(nextContentVersion("0.2.4.1", "0.2.4"), "0.2.4.2");

  assert.doesNotThrow(() => assertContentVersionAdvances("0.2.4.1", "0.2.4.0"));
  assert.throws(() => assertContentVersionAdvances("0.2.4.0", "0.2.4.1"));
  assert.throws(() => assertContentVersionAdvances("0.2.4.0", "0.2.4.0"));

  console.log("  ✔ content-version unit tests passed");
}

if (process.argv[1]?.endsWith("content-version.test.ts")) {
  runContentVersionTests().catch((e) => { console.error(e); process.exit(1); });
}
