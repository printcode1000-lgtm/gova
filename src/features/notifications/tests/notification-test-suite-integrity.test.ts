/**
 * Contract test: the notification test suite cannot silently stop testing.
 *
 * `mobile-push-contract.test.ts` defined four check functions and never called
 * them, so it printed "ok" while asserting nothing — and stayed green after the
 * routes it names moved to another account. This file refuses both shapes that
 * let a notification test pass without running:
 *
 * 1. a `test*`/`check*` function that is declared but never invoked;
 * 2. a notification test file that no root `test:*` script — the `npm test`
 *    gate — runs.
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const TEST_DIRECTORIES = [
  "src/features/notifications/tests",
  "src/features/settings/tests",
  "packages/account-bridge/src/tests",
  "packages/notifications-core/src/tests",
  "packages/notifications-composition/src/tests",
];

function testFilesBelow(directory: string): string[] {
  const absolute = path.join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((name) => {
    const target = path.join(absolute, name);
    if (statSync(target).isDirectory()) {
      return testFilesBelow(path.relative(root, target));
    }
    return name.endsWith(".test.ts") ? [path.relative(root, target)] : [];
  });
}

const settingsIsNotificationScoped = (file: string) =>
  !file.startsWith("src/features/settings/") || /notification/i.test(file);

const files = TEST_DIRECTORIES.flatMap(testFilesBelow).filter(
  settingsIsNotificationScoped,
);
assert.ok(files.length > 20, `expected the notification suite, found ${files.length} files`);

// ── 1. every declared check runs ─────────────────────────────────────────────

const declaration = /^(?:export\s+)?(?:async\s+)?function\s+((?:test|check)[A-Z]\w*)\s*\(/gm;
for (const file of files) {
  const source = readFileSync(path.join(root, file), "utf8");
  for (const match of source.matchAll(declaration)) {
    const name = match[1]!;
    const uses = source.match(new RegExp(`\\b${name}\\b`, "g"))?.length ?? 0;
    assert.ok(
      uses > 1,
      `${file} declares ${name}() but never calls it, so its assertions never run.`,
    );
  }
}

// ── 2. every notification test file is wired into a script ─────────────────

// `npm test` runs every root `test:*` script (scripts/generated-gates.ts), so a
// file is executed in CI only if one of those names it. A package's own `test`
// script is not part of the gate and does not count.
const rootScripts = (JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
}).scripts;
const scriptSources = Object.entries(rootScripts)
  .filter(([name]) => name.startsWith("test:"))
  .map(([, command]) => command)
  .join("\n");

/** A suite entry file may import sibling test modules instead of a script naming them. */
function importedByAnotherTest(file: string): boolean {
  const base = path.basename(file, ".ts").replace(/[.]/g, "\\.");
  // A real import, not a mention: a comment naming the file runs nothing.
  const importer = new RegExp(
    `(?:^|\\n)\\s*import\\s[^;]*["'][^"']*/${base}(?:\\.ts)?["']|import\\(\\s*["'][^"']*/${base}(?:\\.ts)?["']`,
  );
  return files.some(
    (other) => other !== file && importer.test(readFileSync(path.join(root, other), "utf8")),
  );
}

for (const file of files) {
  const wired = scriptSources.includes(file) || importedByAnotherTest(file);
  assert.ok(wired, `${file} is not run by any root test:* script, so \`npm test\` never executes it.`);
}

console.log("Notification test suite integrity passed.");
