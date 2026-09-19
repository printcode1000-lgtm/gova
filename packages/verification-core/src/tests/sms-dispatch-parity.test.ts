import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  VERIFICATION_SMS_DISPATCH_CONTRACT_VERSION,
  VERIFICATION_SMS_DISPATCH_EVENT,
  buildVerificationSmsDispatchMetadata,
  readVerificationSmsDispatchRequest,
  verificationSmsDispatchDataKey,
} from "../sms-dispatch-contract";

/**
 * Java cannot import the TypeScript contract, so the Android bridge repeats its
 * literals. This is the test that makes that duplication safe: rename a key on
 * one side and the build fails here instead of the gateway going quiet in
 * production.
 */
function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const bridge = source(
  "packages/native-core/android/src/main/java/hgh/asol/app/AsolVerificationSmsDispatch.java",
);

assert.match(
  bridge,
  new RegExp(`EVENT = "${VERIFICATION_SMS_DISPATCH_EVENT}"`),
  "the Android bridge must recognize the same dispatch event name",
);
assert.match(
  bridge,
  new RegExp(`CONTRACT_VERSION = ${VERIFICATION_SMS_DISPATCH_CONTRACT_VERSION}\\b`),
  "the Android bridge must accept the same contract version",
);
for (const [javaConstant, key] of [
  ["DATA_EVENT", "event"],
  ["DATA_VERSION", "version"],
  ["DATA_CHALLENGE_ID", "challengeId"],
  ["DATA_DISPATCH_ID", "dispatchId"],
  ["DATA_DISPATCH_TICKET", "dispatchTicket"],
] as const) {
  assert.match(
    bridge,
    new RegExp(`${javaConstant} = "${verificationSmsDispatchDataKey(key)}"`),
    `the Android bridge must read the ${key} payload under the same data key`,
  );
}

// The SMS Sender IPC target is that project's published contract; Gova addresses
// it explicitly so a closed or backgrounded SMS Sender is still cold-started.
const worker = source(
  "packages/native-core/android/src/main/java/hgh/asol/app/AsolVerificationSmsWorker.java",
);
assert.match(worker, /SMS_SENDER_PACKAGE = "com\.hesham\.smssender"/);
assert.match(worker, /SMS_SENDER_RECEIVER = "com\.hesham\.smssender\.ipc\.SendSmsReceiver"/);
assert.match(worker, /SMS_SENDER_ACTION = "com\.hesham\.smssender\.action\.SEND_SMS"/);
assert.match(worker, /putExtra\("number", number\)/);
assert.match(worker, /putExtra\("message", message\)/);
// Nothing sensitive may be logged by the gateway.
for (const forbidden of [/Log\.[a-z]+\([^)]*\bmessage\b/, /Log\.[a-z]+\([^)]*\bnumber\b/, /Log\.[a-z]+\([^)]*dispatchTicket/, /Log\.[a-z]+\([^)]*authorization/]) {
  assert.doesNotMatch(worker, forbidden, `the gateway worker must never log ${forbidden}`);
}

// The worker redeems against the owner account directly. `HttpURLConnection`
// is not the account bridge, so it must not depend on the main app's redirect
// layer while carrying a one-time POST body.
const gatewayApi = source("packages/native-core/src/api/verification-sms-gateway.api.ts");
assert.match(gatewayApi, /SUBMAIN_BASE_URL/);
assert.doesNotMatch(gatewayApi, /API_BASE_URL/);

// The manifest must declare SMS Sender, or Android 11+ silently drops the
// explicit broadcast and the gateway fails with no diagnostic at all.
const manifest = source("android/app/src/main/AndroidManifest.xml");
assert.match(manifest, /<package android:name="com\.hesham\.smssender" \/>/);
assert.match(manifest, /AsolVerificationSmsResultReceiver/);

// Round trip: what the server writes is what the reader accepts.
const metadata = buildVerificationSmsDispatchMetadata({
  challengeId: "vch_1",
  dispatchId: "vdp_1",
  dispatchTicket: "ticket",
});
assert.equal(metadata.dataOnly, true, "the gateway signal must never render a tray entry");
const data: Record<string, string> = {};
for (const [key, value] of Object.entries(metadata)) data[`meta_${key}`] = String(value);
assert.deepEqual(readVerificationSmsDispatchRequest(data), {
  challengeId: "vch_1",
  dispatchId: "vdp_1",
  dispatchTicket: "ticket",
});
assert.equal(readVerificationSmsDispatchRequest({}), null);
assert.equal(
  readVerificationSmsDispatchRequest({ ...data, [verificationSmsDispatchDataKey("version")]: "999" }),
  null,
  "an unknown contract version must be refused, never guessed at",
);

console.log("verification SMS dispatch parity tests passed.");
