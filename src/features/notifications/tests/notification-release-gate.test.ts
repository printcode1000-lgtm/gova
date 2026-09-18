/**
 * Contract test: no release ships without the notification suites.
 *
 * `deploy:all` and `deploy:push` run the `test` gate in preflight, and that gate
 * is every root `test:*` script (`scripts/generated-gates.ts`). A notification
 * suite that fell out of either — a renamed script, a gate exclusion, a removed
 * preflight branch — would let a release publish the very breakage these tests
 * exist to stop. This pins the chain end to end.
 */

import assert from "node:assert/strict";

import { DEPLOY_ALL_PREFLIGHT_SECTIONS } from "@asol/release-core/console";

import { resolveGeneratedGate } from "../../../../scripts/generated-gates";

const preflightCommands = DEPLOY_ALL_PREFLIGHT_SECTIONS.flatMap((section) =>
  section.branches.map((branch) => branch.command),
);
for (const gate of ["test", "architecture:check", "docs:generate"]) {
  assert.ok(preflightCommands.includes(gate), `deploy:all preflight no longer runs npm run ${gate}.`);
}

const testGate = resolveGeneratedGate("test").map((step) => step.value);
const NOTIFICATION_SUITES = [
  "test:notifications",
  "test:settings-notifications",
  "test:account-bridge",
  "test:notifications-core",
  "test:compositions",
  "test:account-declarations",
  "test:route-ownership",
  "test:service-cors",
  "test:deployment-tools",
];
for (const suite of NOTIFICATION_SUITES) {
  assert.ok(testGate.includes(suite), `the test gate no longer runs ${suite}.`);
}

console.log("Notification release gate contract passed.");
