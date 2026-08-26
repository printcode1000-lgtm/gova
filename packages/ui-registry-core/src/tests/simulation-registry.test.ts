import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  UI_INTERACTION_TYPES,
  UI_VALUE_CONTRACTS,
  ambiguousUiSimulationIds,
  checkUiSimulationStep,
  checkUiValue,
  isUiUid,
  isUiValueContractName,
  uiSimulationSelector,
  uiSimulationTarget,
  uiSimulationTargets,
  uiSimulationTargetsForRoute,
  uiSimulationUidForSimulationId,
} from "../index";

const root = process.cwd();
const targets = uiSimulationTargets();

// ── The generated registry is the catalog ──────────────────────────────────
assert.ok(targets.length > 80, `expected the migrated targets to be generated; found ${targets.length}`);
for (const target of targets) {
  assert.ok(isUiUid(target.uid), `${target.uid} must be a generated uid`);
  assert.ok(target.id.length > 0);
  assert.ok(target.sourceFile.length > 0 && target.sourceLine > 0, "every target names its source");
  if (target.simulationId && target.simulationKind !== "state") {
    assert.ok(
      target.interaction,
      `${target.uid} carries a simulation id but declares no interaction`,
    );
  }
  if (target.interaction) {
    assert.ok(
      UI_INTERACTION_TYPES.includes(target.interaction.type),
      `${target.uid} declares unknown interaction "${target.interaction.type}"`,
    );
    if (target.interaction.valueContract) {
      assert.ok(
        isUiValueContractName(target.interaction.valueContract),
        `${target.uid} declares unknown value contract`,
      );
    }
  }
}

// A registered simulated descriptor is present, addressable, and route-aware.
const cartCheckout = uiSimulationUidForSimulationId("cart-checkout");
assert.ok(cartCheckout, "cart-checkout must resolve to a uid");
const checkout = uiSimulationTarget(cartCheckout)!;
assert.equal(checkout.simulationId, "cart-checkout");
assert.equal(checkout.interaction?.type, "tap");
assert.ok(checkout.routes.includes("/cart"));
assert.ok(
  uiSimulationTargetsForRoute("/cart").some((target) => target.uid === cartCheckout),
  "listing by route must include the target",
);

// ── One simulation id names one element ────────────────────────────────────
assert.deepEqual(ambiguousUiSimulationIds(), [], "a simulation id must resolve to exactly one uid");
assert.equal(uiSimulationUidForSimulationId("no-such-event"), null);

// ── Steps resolve by uid only, and are validated before the DOM ────────────
const search = uiSimulationUidForSimulationId("search-query")!;
assert.equal(uiSimulationTarget(search)!.interaction?.type, "type");
assert.equal(
  checkUiSimulationStep({ targetUid: search, interaction: "type", value: "قميص" }).ok,
  true,
);

// Unknown uid.
const unknown = checkUiSimulationStep({ targetUid: "not-registered-A1b2c3", interaction: "tap" });
assert.equal(unknown.ok, false);
assert.match(unknown.ok ? "" : unknown.reason, /unknown simulation target uid/);

// Interaction mismatch.
const mismatch = checkUiSimulationStep({ targetUid: search, interaction: "tap" });
assert.equal(mismatch.ok, false);
assert.match(mismatch.ok ? "" : mismatch.reason, /registered as "type", not "tap"/);

// Wrong page. Route attribution is derived from the import graph, so it is a
// superset — a shell barrel makes many features reachable from many routes —
// but a page that provably cannot render the element is still refused.
const contactSubmit = uiSimulationUidForSimulationId("contact-submit")!;
assert.deepEqual(uiSimulationTarget(contactSubmit)!.routes, ["/contact-us"]);
const wrongRoute = checkUiSimulationStep({
  targetUid: contactSubmit,
  interaction: "tap",
  route: "/privacy-policy",
});
assert.equal(wrongRoute.ok, false);
assert.match(wrongRoute.ok ? "" : wrongRoute.reason, /is not rendered by route/);
assert.equal(
  checkUiSimulationStep({ targetUid: contactSubmit, interaction: "tap", route: "/contact-us" }).ok,
  true,
);

// Value contract violations.
const phone = uiSimulationUidForSimulationId("login-phone")!;
assert.equal(checkUiSimulationStep({ targetUid: phone, interaction: "type", value: "01000000000" }).ok, true);
const badValue = checkUiSimulationStep({ targetUid: phone, interaction: "type", value: "ليس رقمًا" });
assert.equal(badValue.ok, false);
assert.match(badValue.ok ? "" : badValue.reason, /does not satisfy contract "phone-number"/);
// A value where none is contracted is refused too: it would be silently dropped.
assert.equal(checkUiSimulationStep({ targetUid: cartCheckout, interaction: "tap", value: "x" }).ok, false);
assert.equal(checkUiValue(undefined, undefined).ok, true);
assert.equal(checkUiValue("no-such-contract", "x").ok, false);
assert.equal(checkUiValue("quantity", "0").ok, false);
assert.equal(checkUiValue("quantity", "3").ok, true);

// Contracts describe shapes, never data.
for (const contract of UI_VALUE_CONTRACTS) {
  assert.ok(contract.description.length > 10, `${contract.name} needs a description`);
  assert.equal(typeof contract.accepts, "function");
}

// ── The only locator ───────────────────────────────────────────────────────
assert.equal(uiSimulationSelector("cart-checkout-A1b2c3"), '[data-ui-uid="cart-checkout-A1b2c3"]');
assert.equal(uiSimulationSelector('a"b'), '[data-ui-uid="a\\"b"]');

// ── The package stays browser-safe and dependency-free ─────────────────────
function packageFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) return entry === "tests" ? [] : packageFiles(full);
    return entry.endsWith(".ts") ? [full] : [];
  });
}
for (const file of packageFiles(join(root, "packages", "ui-registry-core", "src"))) {
  const source = readFileSync(file, "utf8");
  const label = relative(root, file).replace(/\\/g, "/");
  for (const specifier of source.matchAll(/from\s+"([^"]+)"/g)) {
    assert.ok(
      specifier[1]!.startsWith("."),
      `${label} may only import inside the package; found "${specifier[1]}" — the simulation registry must not depend on @asol/simulation-core.`,
    );
  }
  assert.doesNotMatch(
    source,
    /\b(?:window|document|navigator|localStorage|process)\b/,
    `${label} must stay browser-safe for Static out, Android and iOS`,
  );
}

// The generated file is generated, and says so.
const generated = readFileSync(
  join(root, "packages/ui-registry-core/src/simulation/generated/ui-simulation-registry.ts"),
  "utf8",
);
assert.match(generated, /GENERATED FILE\. DO NOT EDIT BY HAND\./);
assert.match(generated, /npm run ui-registry:simulation:generate/);

console.log(`UI simulation registry tests passed (${targets.length} generated targets).`);
