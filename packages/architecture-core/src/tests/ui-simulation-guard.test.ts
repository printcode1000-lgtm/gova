import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { checkUiSimulationContract } from "../checks/ui-simulation-contract";
import { violations } from "../checks/architecture-types";

/**
 * Adversarial proof for the simulation half of the contract.
 *
 * Each probe is a shape the old model allowed and the new one must refuse:
 * targeting by attribute, a simulated element with no interaction, an id that
 * names two elements, a value contract that does not exist. They are written
 * into the real tree because the guards read the repository — a fixture would
 * prove nothing about the rules that actually run.
 */
const root = process.cwd();
const probeDirectory = join(root, "src", "features", "__ui_simulation_guard_probe");
const adapterPath = join(
  root,
  "src/features/simulation/infrastructure/iframe-simulation-execution.port.ts",
);
const originalAdapter = readFileSync(adapterPath, "utf8");

mkdirSync(probeDirectory, { recursive: true });
try {
  // 1. A manual data-simulation-* attribute outside the package builder.
  writeFileSync(
    join(probeDirectory, "manual-marker.tsx"),
    'export const A = () => <button data-simulation-target="probe-manual" />;\n',
    "utf8",
  );
  // 2. A simulated descriptor with no interaction, and 3. a duplicated id.
  writeFileSync(
    join(probeDirectory, "no-interaction.tsx"),
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
      'export const B = () => <i {...uiAttributes({ uid: "probe.sim-A1b2c3", id: "probe.sim", kind: "action", simulation: { kind: "event", id: "probe-sim" } })} />;\n',
    "utf8",
  );
  writeFileSync(
    join(probeDirectory, "duplicate-id.tsx"),
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
      'export const C = () => <i {...uiAttributes({ uid: "probe.twin-Z9y8x7", id: "probe.twin", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "probe-sim" } })} />;\n',
    "utf8",
  );
  // 4. An unknown value contract.
  writeFileSync(
    join(probeDirectory, "bad-contract.tsx"),
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
      'export const D = () => <i {...uiAttributes({ uid: "probe.contract-Q7w8e9", id: "probe.contract", kind: "field", interaction: { type: "type", valueContract: "no-such-contract" }, simulation: { kind: "field", id: "probe-contract" } })} />;\n',
    "utf8",
  );
  // 5. An adapter that targets by something other than a uid.
  writeFileSync(
    adapterPath,
    originalAdapter.replace(
      "function targetSelector(target: SimulationTarget): string {",
      'function legacySelector(id: string): string {\n  return `[data-simulation-target="${id}"]`;\n}\n\nfunction targetSelector(target: SimulationTarget): string {',
    ),
    "utf8",
  );

  checkUiSimulationContract();
} finally {
  rmSync(probeDirectory, { recursive: true, force: true });
  writeFileSync(adapterPath, originalAdapter, "utf8");
}

const reported = violations.map((violation) => JSON.stringify(violation)).join("\n");
for (const [label, pattern] of [
  ["a manual data-simulation-* attribute", /manual-marker\.tsx[^\n]*Manual data-simulation-target=/],
  ["a data-simulation-* locator in the adapter", /iframe-simulation-execution[^\n]*data-simulation-\*/],
  [
    "a descriptor missing from the generated registry",
    /no-interaction\.tsx[^\n]*missing from the generated UiSimulationRegistry/,
  ],
] as const) {
  assert.match(reported, pattern, `The guard must fail for ${label}.`);
}

// The registry-derived rules are proven separately, because the generator has
// to run before they can see the probes. Their wiring is asserted here.
const guardSource = readFileSync(
  join(root, "packages/architecture-core/src/checks/ui-simulation-contract.ts"),
  "utf8",
);
for (const [label, pattern] of [
  ["descriptor without interaction", /declares no interaction/],
  ["duplicate simulation id", /is declared by \$\{owners\.length\} descriptors/],
  ["unknown value contract", /declares unknown value contract/],
  ["unknown uid in a scenario", /names unknown uid/],
  ["duplicate uid", /is already registered by/],
  ["a generated entry no descriptor declares", /which no descriptor declares/],
  ["a drifted interaction or simulation id", /Generated UiSimulationRegistry drifts from uid/],
  ["css selector locator", /a CSS selector other than/],
  ["data-ui-id locator", /semantic metadata and not a locator/],
  ["component marker locator", /a generic component marker/],
  ["text locator", /element text or a label/],
  ["dom index locator", /a DOM index/],
] as const) {
  assert.match(guardSource, pattern, `The guard must define a rule for ${label}.`);
}

console.log("UI simulation guard adversarial tests passed.");
