import assert from "node:assert/strict";

import {
  createInstallationState,
  decideInstallationInitialization,
  type InstallationState,
} from "../installation-policy";

assert.equal(
  decideInstallationInitialization({
    storedState: null,
    hasExistingClientData: false,
  }),
  "fresh",
);

assert.equal(
  decideInstallationInitialization({
    storedState: null,
    hasExistingClientData: true,
  }),
  "adopt-legacy",
);

const previous: InstallationState = {
  schemaVersion: 1,
  origin: "fresh",
  firstSeenBundleVersion: "1.0.0",
  lastSeenBundleVersion: "1.0.0",
  initializedAt: "2026-01-01T00:00:00.000Z",
  lastUpdatedAt: "2026-01-01T00:00:00.000Z",
};

assert.equal(
  decideInstallationInitialization({
    storedState: previous,
    hasExistingClientData: true,
  }),
  "update",
);

const updated = createInstallationState({
  decision: "update",
  bundleVersion: "1.0.1",
  now: "2026-01-02T00:00:00.000Z",
  previous,
});
assert.equal(updated.firstSeenBundleVersion, "1.0.0");
assert.equal(updated.lastSeenBundleVersion, "1.0.1");
assert.equal(updated.initializedAt, previous.initializedAt);
assert.equal(updated.origin, "fresh");

const adopted = createInstallationState({
  decision: "adopt-legacy",
  bundleVersion: "1.0.1",
  now: "2026-01-02T00:00:00.000Z",
});
assert.equal(adopted.origin, "legacy");

console.log(
  "installation policy: fresh defaults, legacy adoption, and update preservation verified",
);
