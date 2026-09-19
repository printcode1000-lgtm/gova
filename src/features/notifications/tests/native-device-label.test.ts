/**
 * Contract test: the persisted native device label carries the public product
 * name and can never regress to a historical brand.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { nativeDeviceLabel } from "../infrastructure/native/native-device-label";

assert.equal(nativeDeviceLabel("android"), "Pbook Android");
assert.equal(nativeDeviceLabel("ios"), "Pbook iOS");

const historical = /\b(asol|gova)\b|أصول|جوفا/i;
for (const platform of ["android", "ios"] as const) {
  assert.doesNotMatch(nativeDeviceLabel(platform), historical);
}

const pushService = readFileSync(
  new URL("../infrastructure/native/native-push.service.ts", import.meta.url),
  "utf8",
);
assert.match(pushService, /deviceLabel: nativeDeviceLabel\(platform\)/);
assert.doesNotMatch(pushService, /"(ASOL|Asol|GOVA|Gova) (Android|iOS)"/);

console.log("Native device label contract passed.");
