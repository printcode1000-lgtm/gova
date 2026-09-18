/**
 * Behaviour test: how the settings page proves "this device is registered".
 *
 * The web regression this pins: a subscribed browser kept no local record, so
 * the proof failed on every visit, the device list showed "could not load the
 * device list", and the switch reported a failed update. Each platform's local
 * record shape is exercised against the server listing.
 */

import assert from "node:assert/strict";

import { confirmedLocalDeviceIds } from "../presentation/notification-registration-confirmation";

const server = [
  { deviceId: "android:94f62f8f" },
  { deviceId: "web:d29d6d79" },
];

// A native handset whose local token the server lists.
assert.deepEqual(
  confirmedLocalDeviceIds(server, [{ deviceId: "android:94f62f8f", enabled: true }]),
  ["android:94f62f8f"],
);

// A subscribed browser that recorded its server-accepted row.
assert.deepEqual(
  confirmedLocalDeviceIds(server, [{ deviceId: "web:d29d6d79", enabled: true }]),
  ["web:d29d6d79"],
);

// The regression: no local record means nothing is confirmed, which is why a
// browser must write one — and why reconciliation must repair its absence.
assert.deepEqual(confirmedLocalDeviceIds(server, []), []);

// A local record the server no longer lists (revoked elsewhere, rolled back).
assert.deepEqual(
  confirmedLocalDeviceIds(server, [{ deviceId: "android:stale", enabled: true }]),
  [],
);

// A disabled local record never counts, even if the server still lists it.
assert.deepEqual(
  confirmedLocalDeviceIds(server, [{ deviceId: "web:d29d6d79", enabled: false }]),
  [],
);

// An empty server listing confirms nothing, whatever the device believes.
assert.deepEqual(
  confirmedLocalDeviceIds([], [{ deviceId: "android:94f62f8f", enabled: true }]),
  [],
);

console.log("Notification registration confirmation tests passed.");
