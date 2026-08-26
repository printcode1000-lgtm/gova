import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  UI_REGISTRY_COVERAGE_EXCEPTIONS,
  collectUiRegistryUsages,
} from "../checks/ui-registry-coverage";

/**
 * The coverage rule, proven on fixtures and then on the real tree.
 *
 * A count threshold would pass while a newly added control stayed anonymous, so
 * what is asserted here is the classification itself: a control rendered once
 * must be registered, a control rendered from a fixed source list must be
 * registered, and only a runtime-data list may be left alone.
 */
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "asol-ui-coverage-"));
  for (const [name, body] of Object.entries(files)) {
    const full = join(root, name);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body, "utf8");
  }
  return root;
}

const root = fixture({
  "src/features/probe/Static.tsx":
    'export const A = () => <Button onClick={go}>go</Button>;\n',
  "src/features/probe/Registered.tsx":
    'export const B = () => <Button ui={{ uid: "probe.b-A1b2c3", id: "probe.b" }}>go</Button>;\n',
  "src/features/probe/FixedList.tsx":
    'const STEPS = ["one", "two"];\nexport const C = () => STEPS.map((step) => <Button key={step}>{step}</Button>);\n',
  "src/features/probe/InlineList.tsx":
    "export const D = () => [5, 15].map((value) => <Button key={value}>{value}</Button>);\n",
  "src/features/probe/RuntimeList.tsx":
    "export const E = ({ rows }) => rows.map((row) => <Button key={row.id}>{row.name}</Button>);\n",
  "src/features/probe/FilteredRuntimeList.tsx":
    "export const F = ({ rows }) => rows.filter(Boolean).map((row) => <Button key={row.id}>x</Button>);\n",
  "src/features/probe/CopiedRuntimeList.tsx":
    "const copy = [...rows];\nexport const G = () => copy.map((row) => <Button key={row.id}>x</Button>);\n",
  "src/features/probe/FallbackList.tsx":
    "export const H = ({ rows }) => (rows ?? []).map((row) => <Button key={row.id}>x</Button>);\n",
});

try {
  const usages = collectUiRegistryUsages(root);
  const at = (file: string) => usages.find((usage) => usage.file.endsWith(file))!;

  assert.equal(at("Static.tsx").registered, false);
  assert.equal(at("Static.tsx").repeated, false, "a lone control is not repeated");

  assert.equal(at("Registered.tsx").registered, true);

  assert.equal(at("FixedList.tsx").fixedList, true, "a source constant list is registerable");
  assert.equal(at("FixedList.tsx").listSource, "STEPS");
  assert.equal(at("InlineList.tsx").fixedList, true, "an inline literal list is registerable");

  for (const file of [
    "RuntimeList.tsx",
    "FilteredRuntimeList.tsx",
    "CopiedRuntimeList.tsx",
    "FallbackList.tsx",
  ]) {
    assert.equal(at(file).repeated, true, `${file} renders once per runtime row`);
    assert.equal(at(file).fixedList, false, `${file} has no source-defined identity`);
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}

// ── The real tree ──────────────────────────────────────────────────────────
const real = collectUiRegistryUsages();
const unregistered = real.filter((usage) => !usage.registered);
const registered = real.length - unregistered.length;
assert.ok(registered > 250, `expected the migrated usage sites to be registered; found ${registered}`);

// No fixed source list may be left unregistered anywhere.
assert.deepEqual(
  unregistered.filter((usage) => usage.fixedList).map((usage) => `${usage.file}:${usage.line}`),
  [],
  "every fixed source list must be registered through a typed descriptor map",
);

// Every statically rendered instance is either registered or a declared
// generic-wrapper exception — and every declared exception is still needed.
const declared = new Set(
  UI_REGISTRY_COVERAGE_EXCEPTIONS.map((entry) => `${entry.file}|${entry.component}`),
);
const undeclaredStatic = unregistered
  .filter((usage) => !usage.repeated && !declared.has(`${usage.file}|${usage.component}`))
  .map((usage) => `${usage.file}:${usage.line} <${usage.component}>`);
assert.deepEqual(undeclaredStatic, [], "a statically rendered control must be registered");

const usedExceptions = new Set(
  unregistered
    .filter((usage) => declared.has(`${usage.file}|${usage.component}`))
    .map((usage) => `${usage.file}|${usage.component}`),
);
assert.deepEqual(
  UI_REGISTRY_COVERAGE_EXCEPTIONS.filter(
    (entry) => !usedExceptions.has(`${entry.file}|${entry.component}`),
  ).map((entry) => `${entry.file} <${entry.component}>`),
  [],
  "a coverage exception that matches nothing must be removed",
);

// Every exception states a reason a human can check.
for (const entry of UI_REGISTRY_COVERAGE_EXCEPTIONS) {
  assert.ok(entry.reason.length > 30, `exception for ${entry.file} needs a real reason`);
}

console.log(
  `UI registry coverage tests passed (${registered} registered, ${unregistered.length} declared exceptions).`,
);
