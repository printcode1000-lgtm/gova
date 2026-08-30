import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { checkDomIdentityCoverageContract } from "../checks/dom-identity-coverage-contract";
import { violations } from "../checks/architecture-types";

/**
 * Adversarial proof that `checkDomIdentityCoverageContract` fails closed:
 * unregistered DOM, fixed generic-primitive identity, repeated descriptors
 * without runtime instance scope, and iterator descriptors without runtime
 * instance scope all fail. Registered sites and repeated sites with explicit
 * branded runtime scope stay silent.
 */
const root = process.cwd();
const probeDirectory = join(root, "src", "features", "__dom_identity_coverage_probe");
const sharedUiProbe = join(root, "src", "shared", "ui", "__dom_identity_coverage_probe_primitive.tsx");

const probes: Record<string, string> = {
  // A raw host with no registration at all.
  "unregistered-host.tsx": 'export const A = () => <div className="probe">hi</div>;\n',
  // An uncommon HTML tag — no whitelist entry needed to be caught.
  "unregistered-uncommon-tag.tsx": 'export const B = () => <mark>hi</mark>;\n',
  // A registered raw host — must stay silent.
  "already-registered.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    'export const C = () => <div {...uiAttributes({ uid: "probe.coverage-A1bcd9", id: "probe.coverage" })} />;\n',
  // A component template rendered twice needs runtime instance scope inside it.
  "repeated-missing-instance.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    'export const RepeatedMissing = () => <div {...uiAttributes({ uid: "probe.repeated-E5fGh8", id: "probe.repeated" })} />;\n' +
    'export const RepeatedMissingHost = () => <><RepeatedMissing /><RepeatedMissing /></>;\n',
  // An iterator emits multiple copies directly, so a fixed descriptor alone is insufficient.
  "iterator-missing-instance.tsx":
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
    'export const IteratorMissing = (rows: string[]) => rows.map((row) => <span key={row} {...uiAttributes({ uid: "probe.iterator-F6gHi9", id: "probe.iterator" })}>{row}</span>);\n',
  // Equivalent repeated sites are valid once every runtime copy has explicit branded scope.
  "multiplicity-resolved.tsx":
    'import { createOpaqueUiInstanceId, uiAttributes, type UiInstanceId } from "@asol/ui-registry-core";\n' +
    'export const RepeatedResolved = ({ instance }: { instance: UiInstanceId }) => <div {...uiAttributes({ uid: "probe.repeated-ok-G7hIj0", id: "probe.repeated-ok", instance })} />;\n' +
    'export const RepeatedResolvedHost = () => <><RepeatedResolved instance={createOpaqueUiInstanceId("probe-repeat", "one")} /><RepeatedResolved instance={createOpaqueUiInstanceId("probe-repeat", "two")} /></>;\n' +
    'export const IteratorResolved = (rows: string[]) => rows.map((row) => <span key={row} {...uiAttributes({ uid: "probe.iterator-ok-H8iJk1", id: "probe.iterator-ok", instance: createOpaqueUiInstanceId("probe-row", row) })}>{row}</span>);\n',
};

mkdirSync(probeDirectory, { recursive: true });
try {
  for (const [name, body] of Object.entries(probes)) {
    writeFileSync(join(probeDirectory, name), body, "utf8");
  }
  // A shared primitive whose own root bakes in a fixed literal uid instead
  // of forwarding the caller's `ui` — forbidden, it would repeat everywhere.
  writeFileSync(
    sharedUiProbe,
    'import { uiAttributes } from "@asol/ui-registry-core";\n' +
      'export const ProbeFixedPrimitive = ({ ...rest }: Record<string, unknown>) => (\n' +
      '  <div {...rest} {...uiAttributes({ uid: "probe.fixed-primitive-B2cde5", id: "probe.fixed-primitive" })} />\n' +
      ');\n',
    "utf8",
  );
  writeFileSync(
    join(probeDirectory, "fixed-primitive-usage.tsx"),
    'import { ProbeFixedPrimitive } from "@/shared/ui/__dom_identity_coverage_probe_primitive";\n' +
      'export const D = () => <ProbeFixedPrimitive />;\n' +
      'export const E = () => <ProbeFixedPrimitive />;\n',
    "utf8",
  );

  checkDomIdentityCoverageContract();
} finally {
  rmSync(probeDirectory, { recursive: true, force: true });
  rmSync(sharedUiProbe, { force: true });
}

const reported = violations.map((violation) => JSON.stringify(violation)).join("\n");

for (const [label, pattern] of [
  ["unregistered raw host", /unregistered-host\.tsx[^\n]*has no ui\.uid/],
  ["unregistered uncommon tag", /unregistered-uncommon-tag\.tsx[^\n]*<mark>[^\n]*has no ui\.uid/],
  ["primitive root with a fixed uid", /__dom_identity_coverage_probe_primitive\.tsx[^\n]*declares a fixed uid/],
  ["repeated reusable descriptor without instance", /repeated-missing-instance\.tsx[^\n]*can render more than once \(reusable-template\)[^\n]*no runtime instance/],
  ["iterator descriptor without instance", /iterator-missing-instance\.tsx[^\n]*can render more than once \(iterator\)[^\n]*no runtime instance/],
] as const) {
  assert.match(reported, pattern, `The guard must fail for ${label}.`);
}
assert.doesNotMatch(reported, /already-registered\.tsx/, "An already-registered host must not be reported.");
assert.doesNotMatch(
  reported,
  /multiplicity-resolved\.tsx[^\n]*UI Runtime Multiplicity/,
  "Repeated descriptors with explicit runtime instances must stay legal.",
);

console.log("DOM identity coverage contract adversarial tests passed.");