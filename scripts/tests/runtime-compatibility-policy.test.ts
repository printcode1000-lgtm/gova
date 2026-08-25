import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  classifyHost,
  evidenceGapMessage,
  IOS_COMPILE_SIGN_EVIDENCE_GAP,
} from "../runtime-compatibility-policy";

assert.deepEqual(classifyHost("v24.18.0", "darwin", true), {
  hostClass: "canonical-baseline-host",
  platform: "darwin",
  nodeVersion: "v24.18.0",
  nodeCompatible: true,
  unavailableVerifications: [],
});

assert.deepEqual(classifyHost("v22.19.0", "win32", true), {
  hostClass: "canonical-baseline-host",
  platform: "win32",
  nodeVersion: "v22.19.0",
  nodeCompatible: true,
  unavailableVerifications: [IOS_COMPILE_SIGN_EVIDENCE_GAP],
});

assert.deepEqual(classifyHost("v24.4.0", "linux", false), {
  hostClass: "compatible-host",
  platform: "linux",
  nodeVersion: "v24.4.0",
  nodeCompatible: true,
  unavailableVerifications: [IOS_COMPILE_SIGN_EVIDENCE_GAP],
});

assert.equal(classifyHost("v20.19.0", "darwin", true).hostClass, "unsupported-host");
assert.equal(classifyHost("v25.0.0", "win32", true).nodeCompatible, false);
assert.deepEqual(classifyHost("v20.19.0", "linux", false).unavailableVerifications, [
  IOS_COMPILE_SIGN_EVIDENCE_GAP,
]);

assert.match(
  evidenceGapMessage(IOS_COMPILE_SIGN_EVIDENCE_GAP),
  /Xcode compile\/archive\/sign/,
);
assert.match(evidenceGapMessage("android-ndk"), /platform-specific verification is unavailable/);

const doctor = readFileSync(
  path.join(process.cwd(), "scripts", "check-environment-requirements.ts"),
  "utf8",
);
assert.match(doctor, /classifyHost/);
assert.match(doctor, /evidenceGapMessage/);
assert.match(doctor, /EVIDENCE_GAP/);
assert.doesNotMatch(
  doctor,
  /scenario: "ios", item: "iOS toolchain", level: "OK"/,
);
assert.match(doctor, /level: "EVIDENCE_GAP"/);

console.log("Runtime host-class policy and adversarial doctor wiring tests passed.");
