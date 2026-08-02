/**
 * Push token classification tests.
 *
 * These guard the rule that decides whether a device is reachable through
 * Firebase Cloud Messaging or only through a direct APNs connection.
 * Misclassifying an Apple token would send it to FCM, which rejects it as
 * INVALID_ARGUMENT and would de-register a perfectly healthy device.
 */

import assert from "node:assert/strict";

import {
  classifyPushToken,
  PushTokenKinds,
  resolvePushProvider,
} from "../domain/push-token-kind";

// A raw Apple device token: exactly 64 hexadecimal characters.
const APNS_TOKEN = "a".repeat(64);
const APNS_TOKEN_MIXED_CASE = "AbCdEf0123456789".repeat(4);

// Firebase registration tokens are long and use characters outside hex.
const FCM_TOKEN =
  "fMEP0vJqS0-abcDEF_123:APA91bH1xYz-QwErTyUiOpAsDfGhJkLzXcVbNm0987654321";

{
  assert.equal(classifyPushToken(APNS_TOKEN), PushTokenKinds.Apns);
  assert.equal(classifyPushToken(APNS_TOKEN_MIXED_CASE), PushTokenKinds.Apns);
  assert.equal(classifyPushToken(FCM_TOKEN), PushTokenKinds.Fcm);

  // Surrounding whitespace must not change the verdict.
  assert.equal(classifyPushToken(`  ${APNS_TOKEN}  `), PushTokenKinds.Apns);

  // 63 or 65 hex characters is not an Apple device token.
  assert.equal(classifyPushToken("a".repeat(63)), PushTokenKinds.Fcm);
  assert.equal(classifyPushToken("a".repeat(65)), PushTokenKinds.Fcm);

  // Non-hex characters rule out an Apple token even at the right length.
  assert.equal(
    classifyPushToken(`${"a".repeat(63)}z`),
    PushTokenKinds.Fcm,
  );
}

{
  // Android always issues a Firebase token, whatever it looks like.
  assert.equal(resolvePushProvider("android", FCM_TOKEN), PushTokenKinds.Fcm);
  assert.equal(resolvePushProvider("android", APNS_TOKEN), PushTokenKinds.Fcm);

  // Apple before the Firebase iOS SDK is installed: raw APNs token.
  assert.equal(resolvePushProvider("ios", APNS_TOKEN), PushTokenKinds.Apns);

  // Apple after the Firebase iOS SDK is installed: Firebase token, routed to
  // Firebase Admin with no code change and no migration.
  assert.equal(resolvePushProvider("ios", FCM_TOKEN), PushTokenKinds.Fcm);
}

console.log("Push token classification tests passed.");
