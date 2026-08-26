import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ambiguousUiSimulationIds,
  isUiUid,
  uiSimulationTarget,
} from "@asol/ui-registry-core";

import {
  pickRandomSimulationImage,
  resolveSimulationRuntime,
  SIMULATION_SCENARIOS,
  SIMULATION_USERS,
  USER_PAGE_REGISTRY,
} from "../index";

const manifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { exports: Record<string, unknown> };
assert.deepEqual(Object.keys(manifest.exports), [".", "./discovery"]);

assert.equal(SIMULATION_USERS.length, 9);
assert.equal(new Set(SIMULATION_USERS.map((user) => user.phone)).size, 9);
assert.deepEqual(
  SIMULATION_USERS.map((user) => user.password),
  ["1111", "2222", "3333", "1111", "2222", "3333", "1111", "2222", "3333"],
);
assert.deepEqual(
  SIMULATION_USERS.map((user) => user.storeName),
  ["مشتري 1", "مشتري 2", "مشتري 3", "بائع 1", "بائع 2", "بائع 3", "خدمة توصيل 1", "خدمة توصيل 2", "خدمة توصيل 3"],
);

assert.equal(SIMULATION_SCENARIOS.length, 0, "Version one scenarios must remain empty.");
assert.equal(new Set(USER_PAGE_REGISTRY.map((page) => page.route)).size, USER_PAGE_REGISTRY.length);
assert.ok(USER_PAGE_REGISTRY.length > 20);
for (const page of USER_PAGE_REGISTRY) {
  assert.ok(page.interactions.length > 0, `${page.route} must expose at least page loading.`);
  assert.equal(new Set(page.interactions.map((event) => event.id)).size, page.interactions.length);
  for (const interaction of page.interactions) {
    for (const action of interaction.actions) {
      assert.ok(!("selector" in action), `${page.id}:${interaction.id} must use typed simulation targets.`);
    }
  }
}

const registrySource = readFileSync(new URL("../registries/user-page-registry.ts", import.meta.url), "utf8");
assert.doesNotMatch(registrySource, /\bselector\b/, "Simulation registry must not use CSS selectors.");
assert.doesNotMatch(registrySource, /data-simulation-event/, "Simulation registry must use typed targets.");

/**
 * Targeting is a registry question now.
 *
 * The old assertions read source for `data-simulation-*` strings, which proved
 * only that some element somewhere carried a matching attribute. These prove
 * the property that matters: every step names a uid the generated
 * UiSimulationRegistry knows, on a page that can render it, with the
 * interaction that element is registered for.
 */
for (const page of USER_PAGE_REGISTRY) {
  for (const interaction of page.interactions) {
    const targets = [
      ...interaction.actions.flatMap((action) => (action.type === "wait" ? [] : [action.target])),
      ...(interaction.unavailableWhen ? [interaction.unavailableWhen.target] : []),
    ];
    for (const target of targets) {
      assert.ok(
        isUiUid(target.targetUid),
        `${page.id}:${interaction.id} must target a generated uid, got "${target.targetUid}".`,
      );
      const record = uiSimulationTarget(target.targetUid);
      assert.ok(
        record,
        `${page.id}:${interaction.id} targets uid ${target.targetUid}, which is not in the generated registry.`,
      );
      assert.ok(
        record.routes.includes(page.route),
        `${page.id}:${interaction.id} targets uid ${target.targetUid}, which ${page.route} cannot render.`,
      );
      if (target.kind === "state") continue;
      assert.ok(
        record.interaction,
        `${page.id}:${interaction.id} targets uid ${target.targetUid}, which declares no interaction.`,
      );
      assert.equal(
        record.interaction.type,
        target.interaction,
        `${page.id}:${interaction.id} performs "${target.interaction}" on a "${record.interaction.type}" target.`,
      );
    }
  }
}

// One event id names one element. Two would make a scenario ambiguous.
assert.deepEqual(ambiguousUiSimulationIds(), [], "a simulation id must resolve to exactly one uid");

for (const page of USER_PAGE_REGISTRY) {
  for (const interaction of page.interactions) {
    const precondition = interaction.unavailableWhen;
    if (!precondition) continue;
    assert.equal(
      precondition.target.kind,
      "state",
      `${page.id}:${interaction.id} must declare its precondition as a state target.`,
    );
    assert.ok(
      precondition.reason.trim().length > 0,
      `${page.id}:${interaction.id} must explain why it can be unavailable.`,
    );
  }
}

assert.equal(resolveSimulationRuntime({ deployment: "static-export", platform: "web" }), "static-out");
assert.equal(resolveSimulationRuntime({ deployment: "static-export", platform: "android" }), "android");
assert.equal(resolveSimulationRuntime({ deployment: "static-export", platform: "ios" }), "ios");
assert.equal(resolveSimulationRuntime({ deployment: "local-development", platform: "web" }), "development");
assert.equal(resolveSimulationRuntime({ deployment: "web-production", platform: "web" }), "production");

const selected = pickRandomSimulationImage(["/catalog/a.webp"]);
assert.equal(selected, "/catalog/a.webp");
assert.throws(() => pickRandomSimulationImage([]), /simulationImagePoolEmpty/);

console.log(
  `@asol/simulation-core contract: ${USER_PAGE_REGISTRY.length} user pages, ` +
    `${USER_PAGE_REGISTRY.reduce((total, page) => total + page.interactions.length, 0)} events, 9 users, 0 scenarios.`,
);
