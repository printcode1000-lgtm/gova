import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { checkUiAttributeContract } from "../checks/ui-attribute-contract";
import { violations } from "../checks/architecture-types";

/**
 * Adversarial proof that the UiRegistry guard fails for every unsafe shape.
 *
 * The probes are written into the real tree, checked, and removed again: the
 * guard reads the repository, so a fixture directory would prove nothing.
 */
const root = process.cwd();
const probeDirectory = join(root, "src", "features", "__ui_registry_guard_probe");
const registryPath = join(root, "packages", "ui-registry-core", "src", "registry", "ui-page-registry.ts");
const genericHelper = join(root, "src", "shared", "ui", "__guard_probe_primitive.tsx");
const originalRegistry = readFileSync(registryPath, "utf8");

const probes: Record<string, string> = {
  // Metadata without a uid.
  "no-uid.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    'export const A = () => <i {...uiAttributes({ id: "probe.no-uid", kind: "action" })} />;\n',
  // A uid that merely repeats the id.
  "deterministic.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    'export const B = () => <i {...uiAttributes({ uid: "probe.deterministic", id: "probe.deterministic", kind: "action" })} />;\n',
  // A lowercase suffix is not a generated suffix.
  "unsafe-syntax.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    'export const C = () => <i {...uiAttributes({ uid: "probe.unsafe-abcdef", id: "probe.unsafe", kind: "action" })} />;\n',
  // A uid already owned by a real registration.
  "duplicate.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    'export const D = () => <i {...uiAttributes({ uid: "DUPLICATE_UID", id: "probe.duplicate", kind: "action" })} />;\n',
  // Hand-written registry metadata in JSX.
  "manual.tsx": 'export const E = () => <i data-ui-uid="probe" />;\n',
  // A descriptor map that forgets a uid.
  "map-no-uid.tsx":
    'import type { UiDescriptor } from "@asol/ui-registry-core";\n' +
    "const MAP = {\n  one: { id: \"probe.map\", kind: \"action\" },\n} as const satisfies Record<string, UiDescriptor>;\nexport const F = MAP;\n",
  // An index-derived identity is not stable.
  "computed-uid.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    "export const G = (index: number) => <i {...uiAttributes({ uid: `probe.item-${index}`, id: \"probe.item\", kind: \"item\" })} />;\n",
  // The same identity described two different ways.
  "drift-a.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    'export const H = () => <i {...uiAttributes({ uid: "probe.drift-A1bcd2", id: "probe.drift", kind: "action", action: "one" })} />;\n',
  "drift-b.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    'export const I = () => <i {...uiAttributes({ uid: "probe.drift-Z9yxw8", id: "probe.drift", kind: "region", action: "two" })} />;\n',
  // A key after the spread drops the element to createElement, which makes
  // React blame an innocent child for a missing key.
  "key-after-spread.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    'export const K = (items: string[]) => items.map((item) => <i {...uiAttributes({ uid: "probe.keyspread-A1bcd3", id: "probe.keyspread", kind: "item" })} key={item}><b /><b /></i>);\n',
  // An unregistered generic fallback is legitimate and must not be reported.
  "fallback.tsx":
    'import { uiComponentAttributes } from "@asol/ui-registry-core";\n' +
    'export const J = () => <i {...uiComponentAttributes("button")} />;\n',
  // Hand-written instance metadata bypasses the registry API.
  "manual-instance.tsx": 'export const L = () => <i data-ui-instance="probe" />;\n',
  // An instance id built from a loop index is not stable across reordering.
  "index-instance.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    "export const M = (rows: string[]) => rows.map((row, index) => <i {...uiAttributes({ uid: \"probe.row-A1bcd4\", id: \"probe.row\", kind: \"item\", instance: index })} />);\n",
  // A stable domain identifier is the legitimate shape and must not be reported.
  "domain-instance.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    "export const N = (rows: { id: string }[]) => rows.map((row) => <i {...uiAttributes({ uid: \"probe.row2-B2cde5\", id: \"probe.row2\", kind: \"item\", instance: row.id })} />);\n",
};

// A uid from a page other than the one this test strips, so the duplicate
// probe collides with a registration that is still present.
const registryUids = [...originalRegistry.matchAll(/uid: "([^"]+)"/g)].map((match) => match[1]!);
const realUid = registryUids.at(-1);
assert.ok(realUid && registryUids.length > 1, "The page registry must declare UIDs.");

mkdirSync(probeDirectory, { recursive: true });
try {
  for (const [name, body] of Object.entries(probes)) {
    writeFileSync(join(probeDirectory, name), body.replace("DUPLICATE_UID", realUid), "utf8");
  }
  writeFileSync(
    genericHelper,
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
      'export const Probe = () => uiAttributes({ uid: "probe.helper-K3mQ7x", id: "probe.helper", kind: "component" });\n',
    "utf8",
  );
  writeFileSync(registryPath, originalRegistry.replace(/, uid: "[^"]+"/, ""), "utf8");
  checkUiAttributeContract();
} finally {
  rmSync(probeDirectory, { recursive: true, force: true });
  rmSync(genericHelper, { force: true });
  writeFileSync(registryPath, originalRegistry, "utf8");
}

const reported = violations.map((violation) => JSON.stringify(violation)).join("\n");
for (const [label, pattern] of [
  ["page registry entry without a uid", /UI_PAGE_REGISTRY entry .* has no uid/],
  ["descriptor without a uid", /no-uid\.tsx[^\n]*has no uid/],
  ["descriptor map without a uid", /map-no-uid\.tsx[^\n]*has no uid/],
  ["deterministic uid", /deterministic\.tsx[^\n]*deterministic copy of its id/],
  ["unsafe uid syntax", /unsafe-syntax\.tsx[^\n]*generated Base62 suffix/],
  ["duplicate uid", /duplicate\.tsx[^\n]*globally unique/],
  ["manual data-ui-uid", /manual\.tsx[^\n]*Manual data-ui-uid/],
  ["computed uid", /computed-uid\.tsx[^\n]*computes its uid/],
  ["descriptor drift", /drift-b\.tsx[^\n]*drifts from its registration/],
  ["helper-level uid", /__guard_probe_primitive\.tsx[^\n]*helper-level uid/],
  ["a key written after the spread", /key-after-spread\.tsx[^\n]*key follows the uiAttributes spread/],
  ["manual data-ui-instance", /manual-instance\.tsx[^\n]*Manual data-ui-instance/],
  ["index-derived instance", /index-instance\.tsx[^\n]*derives instance from an array index/],
] as const) {
  assert.match(reported, pattern, `The guard must fail for ${label}.`);
}

// The intentional unregistered fallback is never reported.
assert.doesNotMatch(reported, /fallback\.tsx/, "Generic component fallbacks stay legal.");
// A stable domain-id instance is the legitimate shape and must not be reported.
assert.doesNotMatch(
  reported,
  /domain-instance\.tsx/,
  "An instance id derived from a stable domain identifier stays legal.",
);

console.log("UI attribute guard adversarial tests passed.");
