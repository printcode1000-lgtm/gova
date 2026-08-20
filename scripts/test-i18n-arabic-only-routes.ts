import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { ARABIC_ONLY_SOURCE_ROOTS } from "../src/lib/i18n/arabic-only-routes";

const root = process.cwd();
const forbiddenImport = /from\s+["']@\/lib\/i18n["']/;
const forbiddenHook = /\buseTranslation\s*\(/;

function listSourceFiles(target: string): string[] {
  const absolute = path.join(root, target);
  if (!existsSync(absolute)) return [];
  if (statSync(absolute).isFile()) {
    return absolute.endsWith(".ts") || absolute.endsWith(".tsx") ? [absolute] : [];
  }
  const files: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const next = path.join(absolute, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(path.relative(root, next)));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(next);
  }
  return files;
}

for (const relativeRoot of ARABIC_ONLY_SOURCE_ROOTS) {
  for (const file of listSourceFiles(relativeRoot)) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      forbiddenImport,
      `${path.relative(root, file)} must not import the public i18n barrel`,
    );
    assert.doesNotMatch(
      source,
      forbiddenHook,
      `${path.relative(root, file)} must use useAdminArabic or hardcoded Arabic instead of useTranslation`,
    );
  }
}

for (const localeFile of ["src/locales/ar.json", "src/locales/en.json"]) {
  const locale = JSON.parse(readFileSync(path.join(root, localeFile), "utf8")) as Record<
    string,
    string
  >;
  const leaked = Object.keys(locale).filter((key) => key.startsWith("releaseConsole."));
  assert.equal(
    leaked.length,
    0,
    `${localeFile} must not contain releaseConsole.* keys (use src/locales/admin-ar.json)`,
  );
}

const adminAr = JSON.parse(
  readFileSync(path.join(root, "src/locales/admin-ar.json"), "utf8"),
) as Record<string, string>;
assert.ok(
  Object.keys(adminAr).some((key) => key.startsWith("releaseConsole.")),
  "admin-ar.json must contain release console copy",
);

const arabicTextPattern = /[\u0600-\u06FF]/;
const devNavSource = readFileSync(
  path.join(root, "src/features/dev-tools/presentation/DeveloperBadge.tsx"),
  "utf8",
);
for (const [, label] of devNavSource.matchAll(/name:\s*['"]([^'"]+)['"]/g)) {
  assert.ok(
    arabicTextPattern.test(label),
    `DeveloperBadge link "${label}" must use Arabic text`,
  );
}

const sidebarSource = readFileSync(
  path.join(root, "src/components/layouts/AppSidebar.tsx"),
  "utf8",
);
for (const match of sidebarSource.matchAll(
  /href="(\/(?:super-admin|dev)[^"]*)"[^>]*>\s*[\s\S]*?<\/Link>/g,
)) {
  const block = match[0];
  const text = block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  assert.ok(
    arabicTextPattern.test(text),
    `AppSidebar link ${match[1]} must use Arabic label (found: "${text}")`,
  );
}

console.log("Arabic-only route i18n policy passed.");
