import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { isUiUid } from "../index";

/**
 * Every rendered use of a shared primitive is registered at its **usage site**,
 * not inside the primitive. These tests prove the two properties that makes
 * possible: a generic helper never carries a uid, and two instances of the same
 * component never share one.
 */
const root = process.cwd();
const sharedUi = join(root, "src", "shared", "ui");

function tsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      return entry === "node_modules" || entry === "tests" ? [] : tsxFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

function label(file: string): string {
  return relative(root, file).replace(/\\/g, "/");
}

// ── Generic helpers stay uid-free ──────────────────────────────────────────
for (const file of tsxFiles(sharedUi)) {
  assert.doesNotMatch(
    readFileSync(file, "utf8"),
    /\buid:\s*["']/,
    `${label(file)} is a generic shared primitive and must never declare a uid; register each usage site instead.`,
  );
}
const primitiveHelper = readFileSync(join(sharedUi, "ui-primitive-attributes.ts"), "utf8");
assert.match(primitiveHelper, /uiComponentAttributes\(component, state\)/);
assert.match(primitiveHelper, /uiAttributes\(\{ \.\.\.ui, state: state \?\? ui\.state \}\)/);

// ── Two instances of one component get two UIDs ────────────────────────────
const declared = new Map<string, string>();
const duplicates: string[] = [];
for (const file of tsxFiles(join(root, "src"))) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/\buid:\s*["']([^"']+)["']/g)) {
    const uid = match[1]!;
    const line = source.slice(0, match.index).split("\n").length;
    const location = `${label(file)}:${line}`;
    assert.ok(isUiUid(uid), `${location} declares "${uid}", which is not a generated uid.`);
    const owner = declared.get(uid);
    if (owner) duplicates.push(`${uid}: ${owner} and ${location}`);
    else declared.set(uid, location);
  }
}
assert.deepEqual(duplicates, [], "UIDs must be globally unique across every usage site.");
assert.ok(declared.size > 150, `Expected the migrated usage sites to be registered; found ${declared.size}.`);

// The page-save dialog renders two Buttons from the same shared component; each
// has its own uid and its own semantic id.
const pageSaveDialog = readFileSync(
  join(root, "src", "features", "page-save", "presentation", "PageSaveDialog.tsx"),
  "utf8",
);
const dialogUids = [...pageSaveDialog.matchAll(/\buid:\s*["']([^"']+)["']/g)].map((match) => match[1]!);
assert.ok(dialogUids.length >= 3, "The page-save dialog registers each of its instances.");
assert.equal(new Set(dialogUids).size, dialogUids.length, "Sibling instances must not share a uid.");

// ── Repeated lists keep a stable identity per domain id ────────────────────
// The bottom navigation and the return-policy options are rendered by `.map`,
// so each entry is registered from its own domain id — never from its index.
for (const [file, expected] of [
  [join(root, "src", "shared", "layouts", "BottomNavBar.tsx"), ["home", "notifications", "favorites", "orders"]],
  [
    join(root, "src", "features", "onboarding", "presentation", "sections", "returns-section.tsx"),
    ["full_returns", "exchange_only", "store_credit", "no_returns"],
  ],
] as const) {
  const source = readFileSync(file, "utf8");
  const uids = [...source.matchAll(/\buid:\s*["']([^"']+)["']/g)].map((match) => match[1]!);
  assert.equal(new Set(uids).size, uids.length, `${label(file)} must not repeat a uid across list entries.`);
  for (const key of expected) {
    assert.match(source, new RegExp(`\\b${key}\\b`), `${label(file)} must key its descriptors by ${key}.`);
  }
  assert.doesNotMatch(
    source,
    /\buid:\s*`/,
    `${label(file)} must not build a uid from a template; list identities come from domain ids.`,
  );
  assert.doesNotMatch(
    source,
    /\buid:\s*[^"'\s]/,
    `${label(file)} must declare every uid as a source literal.`,
  );
}

console.log("UI registry per-instance registration tests passed.");
