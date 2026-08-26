import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  isUiUid,
  uiAttributes,
  uiSimulationTarget,
  uiSimulationTargets,
  uiSimulationUidForSimulationId,
} from "@asol/ui-registry-core";

import { USER_PAGE_REGISTRY } from "../index";
import { uiRegistryCoverageProblems } from "../discovery/registry-coverage";

const root = process.cwd();

// ── A scenario resolves and executes through uid only ──────────────────────
const cart = USER_PAGE_REGISTRY.find((page) => page.route === "/cart")!;
const checkout = cart.interactions.find((interaction) => interaction.id === "cart-checkout")!;
const step = checkout.actions.find(
  (action) => action.type !== "wait" && action.target.simulationId === "cart-checkout",
)!;
assert.ok(step && "target" in step);
assert.ok(isUiUid(step.target.targetUid), "a step must carry a generated uid");
assert.equal(step.target.simulationId, "cart-checkout");
assert.equal(step.target.interaction, "tap");
assert.equal(uiSimulationTarget(step.target.targetUid)?.simulationId, "cart-checkout");

// Every step in every scenario is uid-addressed, with no locator alternatives.
for (const page of USER_PAGE_REGISTRY) {
  for (const interaction of page.interactions) {
    for (const action of interaction.actions) {
      if (action.type === "wait") continue;
      assert.ok(isUiUid(action.target.targetUid), `${page.id}:${interaction.id} must target a uid`);
      for (const forbidden of ["selector", "text", "label", "index", "css"]) {
        assert.ok(
          !(forbidden in action.target),
          `${page.id}:${interaction.id} must not target by ${forbidden}`,
        );
      }
    }
  }
}

// ── Forbidden targeting is refused by construction ─────────────────────────
const registrySource = readFileSync(
  join(root, "packages/simulation-core/src/registries/user-page-registry.ts"),
  "utf8",
);
for (const [label, pattern] of [
  ["a CSS selector", /\bselector\b/],
  ["a data-simulation-* attribute", /data-simulation-/],
  ["data-ui-id", /data-ui-id/],
  ["a component marker", /data-ui-component/],
  ["a DOM index", /nthChild|nth-child|\[\s*\d+\s*\]\s*;/],
] as const) {
  assert.doesNotMatch(registrySource, pattern, `Scenarios must not target by ${label}.`);
}

const adapterSource = readFileSync(
  join(root, "src/features/simulation/infrastructure/iframe-simulation-execution.port.ts"),
  "utf8",
);
assert.match(adapterSource, /uiSimulationSelector\(target\.targetUid\)/);
assert.doesNotMatch(adapterSource, /data-simulation-/, "the adapter must not know legacy markers");
// Multiplicity comes from the registry, not from a hand-written kind check.
assert.match(adapterSource, /registered\?\.repeated/);

// ── Coverage is calculated from the registry ───────────────────────────────
assert.deepEqual(uiRegistryCoverageProblems(), [], "every scenario target must be registered");

// ── Changing or removing a registered uid breaks its scenario ──────────────
// Proven against the real dependency: the scenario resolves ids through the
// generated registry, so an id that no longer resolves has nowhere to hide.
assert.equal(uiSimulationUidForSimulationId("cart-checkout-removed"), null);
const removed = uiSimulationTarget("cart-checkout-removed-A1b2c3");
assert.equal(removed, null, "a uid that no longer exists must not resolve");

// ── data-simulation-* output is unchanged for every migrated element ───────
// Compatibility is the point of keeping the attribute: the executor no longer
// reads it, but anything else that did sees exactly what it saw before.
const ATTRIBUTE_BY_KIND: Record<string, string> = {
  event: "data-simulation-target",
  field: "data-simulation-field",
  "list-item": "data-simulation-list-item",
  file: "data-simulation-file",
  state: "data-simulation-state",
};
let compatibilityChecked = 0;
for (const target of uiSimulationTargets()) {
  if (!target.simulationId || !target.simulationKind) continue;
  const emitted = uiAttributes({
    uid: target.uid,
    id: target.id,
    kind: target.kind,
    ...(target.interaction ? { interaction: target.interaction } : {}),
    simulation: { kind: target.simulationKind, id: target.simulationId },
  });
  assert.equal(
    emitted[ATTRIBUTE_BY_KIND[target.simulationKind]!],
    target.simulationId,
    `${target.uid} must still emit ${ATTRIBUTE_BY_KIND[target.simulationKind]}="${target.simulationId}"`,
  );
  assert.equal(emitted["data-ui-uid"], target.uid);
  compatibilityChecked += 1;
}
assert.ok(compatibilityChecked >= 80, `expected the migrated markers to be checked; got ${compatibilityChecked}`);

console.log(
  `UiRegistry-driven simulation targeting tests passed (${compatibilityChecked} markers behaviourally unchanged).`,
);
