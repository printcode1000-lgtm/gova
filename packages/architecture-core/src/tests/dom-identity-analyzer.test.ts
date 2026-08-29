import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildDomIdentityInventory } from "../dom-identity/analyzer";

/**
 * Proves the canonical analyzer classifies JSX usage sites correctly: every
 * intrinsic HTML/SVG tag is recognized without a whitelist, a component that
 * structurally forwards props to one DOM root and forwards a caller's `ui`
 * is a wired generic primitive, one that forwards props but not yet `ui` is
 * flagged as needing conversion, third-party imports are excluded, and an
 * opaque application component's own internal DOM is still covered directly.
 */
const root = process.cwd();
const probeDirectory = join(root, "src", "features", "__dom_identity_analyzer_probe");

mkdirSync(probeDirectory, { recursive: true });
try {
  writeFileSync(
    join(probeDirectory, "intrinsic-tags.tsx"),
    [
      'export const A = () => (',
      '  <svg>',
      '    <path d="M0 0" />',
      '    <circle cx="1" cy="1" r="1" />',
      '    <rect width="1" height="1" />',
      '    <g><line x1="0" y1="0" x2="1" y2="1" /></g>',
      '  </svg>',
      ');',
      'export const B = () => <mark>highlighted</mark>;',
    ].join("\n"),
    "utf8",
  );

  writeFileSync(
    join(probeDirectory, "wired-primitive.tsx"),
    [
      'import type { UiDescriptor } from "@asol/ui-registry-core";',
      'import { uiAttributes } from "@asol/ui-registry-core";',
      'export function ProbeWiredPrimitive({ ui, ...rest }: { ui?: UiDescriptor }) {',
      '  return <div {...rest} {...(ui ? uiAttributes(ui) : {})} />;',
      '}',
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(probeDirectory, "wired-primitive-usage.tsx"),
    [
      'import { ProbeWiredPrimitive } from "./wired-primitive";',
      'export const C = () => <ProbeWiredPrimitive />;',
      'export const D = () => <ProbeWiredPrimitive />;',
    ].join("\n"),
    "utf8",
  );

  writeFileSync(
    join(probeDirectory, "unconverted-primitive.tsx"),
    [
      'export function ProbeUnconvertedPrimitive({ ...rest }: Record<string, unknown>) {',
      '  return <div {...rest} />;',
      '}',
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(probeDirectory, "unconverted-primitive-usage.tsx"),
    [
      'import { ProbeUnconvertedPrimitive } from "./unconverted-primitive";',
      'export const E = () => <ProbeUnconvertedPrimitive />;',
      'export const F = () => <ProbeUnconvertedPrimitive />;',
    ].join("\n"),
    "utf8",
  );

  writeFileSync(
    join(probeDirectory, "third-party-usage.tsx"),
    [
      'import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";',
      'export const G = () => <FontAwesomeIcon icon="check" />;',
    ].join("\n"),
    "utf8",
  );

  writeFileSync(
    join(probeDirectory, "opaque-component.tsx"),
    [
      'import { uiAttributes } from "@asol/ui-registry-core";',
      'export function ProbeOpaque() {',
      '  return (',
      '    <section>',
      '      <div {...uiAttributes({ uid: "probe.opaque-inner-Zk3Nq8", id: "probe.opaque-inner" })} />',
      '    </section>',
      '  );',
      '}',
      'export const H = () => <ProbeOpaque />;',
    ].join("\n"),
    "utf8",
  );

  const inventory = buildDomIdentityInventory(root);
  const probeSites = inventory.sites.filter((site) => site.file.includes("__dom_identity_analyzer_probe"));

  const intrinsicTags = new Set(
    probeSites.filter((s) => s.ownership.kind === "intrinsic" && s.file.endsWith("intrinsic-tags.tsx")).map((s) => s.tagOrComponent),
  );
  for (const tag of ["svg", "path", "circle", "rect", "g", "line", "mark"]) {
    assert.ok(intrinsicTags.has(tag), `Expected intrinsic tag <${tag}> to be recognized without a whitelist.`);
  }

  const wiredUsages = probeSites.filter(
    (s) => s.file.endsWith("wired-primitive-usage.tsx") && s.ownership.kind === "generic-primitive-wired",
  );
  assert.equal(wiredUsages.length, 2, "Both usages of the wired primitive must be classified generic-primitive-wired.");
  assert.equal(
    probeSites.some((s) => s.file.endsWith("wired-primitive.tsx") && s.ownership.kind === "intrinsic"),
    false,
    "A wired primitive's own root must be excluded from bare-intrinsic scanning — its identity belongs to the caller.",
  );

  const unconvertedUsages = probeSites.filter(
    (s) => s.file.endsWith("unconverted-primitive-usage.tsx") && s.ownership.kind === "generic-primitive-unconverted",
  );
  assert.equal(unconvertedUsages.length, 2, "A repeating component that forwards props but not `ui` must be flagged unconverted.");

  assert.equal(
    probeSites.some((s) => s.file.endsWith("third-party-usage.tsx") && s.ownership.kind === "third-party"),
    true,
    "A component imported from an external package must be classified third-party.",
  );
  assert.equal(
    probeSites.some((s) => s.file.endsWith("third-party-usage.tsx") && s.ownership.kind !== "third-party"),
    false,
    "Third-party internal DOM must never be treated as a project-owned usage site.",
  );

  // The opaque component itself is discovered (for observability/reporting)
  // but is not an *actionable* usage site — its internal div is registered
  // directly, at its own definition, and is still discovered and required.
  const opaqueComponentSite = probeSites.find(
    (s) => s.file.endsWith("opaque-component.tsx") && s.tagOrComponent === "ProbeOpaque",
  );
  assert.ok(opaqueComponentSite, "The opaque component usage must still be discovered.");
  assert.equal(opaqueComponentSite!.ownership.kind, "opaque");
  const opaqueInner = probeSites.find(
    (s) => s.file.endsWith("opaque-component.tsx") && s.ownership.kind === "intrinsic" && s.tagOrComponent === "div",
  );
  assert.ok(opaqueInner, "An opaque component's own internal DOM must still be discovered.");
  assert.equal(opaqueInner!.hasUiRegistration, true, "The opaque component's inner div is already registered.");
} finally {
  rmSync(probeDirectory, { recursive: true, force: true });
}

console.log("DOM identity analyzer classification tests passed.");
