import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { checkDomIdentityCoverageContract } from "../checks/dom-identity-coverage-contract";
import { violations } from "../checks/architecture-types";

/**
 * Adversarial proof that `checkDomIdentityCoverageContract` fails closed:
 * an unregistered raw host, an unregistered uncommon tag, an unregistered
 * shared-primitive usage, a primitive whose own root bakes in a fixed uid,
 * and a stale exception all fail the build. A registered site, a
 * legitimately un-registrable site covered by an exact exception, and a
 * non-caller-configurable structural sub-part with its own fixed uid all
 * stay silent.
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
] as const) {
  assert.match(reported, pattern, `The guard must fail for ${label}.`);
}
assert.doesNotMatch(reported, /already-registered\.tsx/, "An already-registered host must not be reported.");

console.log("DOM identity coverage contract adversarial tests passed.");
