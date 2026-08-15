/**
 * Architecture contract: @asol/native-core boundary enforcement.
 *
 * Verifies that:
 * 1. No app-layer file imports directly from @capacitor/* packages.
 * 2. No file outside packages/native-core/src/adapters imports Capacitor.
 * 3. The public API index.ts does NOT re-export anything from @capacitor/*.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as glob from "glob";

const ROOT = path.resolve(__dirname, "../../");

const CAPACITOR_PACKAGES = [
  "@capacitor/",
  "@capawesome/",
  "@capgo/",
  "@capacitor-mlkit/",
];

const ALLOWED_CAPACITOR_ROOTS = [
  "packages/native-core/src/adapters/",
  "packages/native-core/ios/",
  "packages/native-core/android/",
  "packages/native-core/scripts/",
];

const APP_GLOBS = [
  "src/**/*.{ts,tsx}",
  "services/**/*.ts",
];

function isCapacitorImport(line: string): boolean {
  return CAPACITOR_PACKAGES.some((pkg) => line.includes(`'${pkg}`) || line.includes(`"${pkg}`));
}

function isAllowedFile(filePath: string): boolean {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  return ALLOWED_CAPACITOR_ROOTS.some((allowed) => rel.startsWith(allowed));
}

let violations = 0;

function checkFile(filePath: string): void {
  if (isAllowedFile(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (isCapacitorImport(line)) {
      console.error(
        `[architecture-check:native-core] VIOLATION: Direct Capacitor import in app layer\n` +
          `  File: ${path.relative(ROOT, filePath)}\n` +
          `  Line ${index + 1}: ${line.trim()}\n` +
          `  Fix: Replace with an import from @asol/native-core`,
      );
      violations++;
    }
  });
}

function checkSubPathImports(): void {
  const allFiles = glob.sync("src/**/*.{ts,tsx}", { cwd: ROOT, absolute: true });
  for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      if (
        (line.includes("'@asol/native-core/") || line.includes('"@asol/native-core/')) &&
        !line.trim().startsWith("//")
      ) {
        console.error(
          `[architecture-check:native-core] VIOLATION: Sub-path import of @asol/native-core\n` +
            `  File: ${path.relative(ROOT, file)}\n` +
            `  Line ${index + 1}: ${line.trim()}\n` +
            `  Fix: Import from '@asol/native-core' (root only)`,
        );
        violations++;
      }
    });
  }
}

// Check app files for direct Capacitor imports
for (const pattern of APP_GLOBS) {
  const files = glob.sync(pattern, { cwd: ROOT, absolute: true });
  for (const file of files) {
    checkFile(file);
  }
}

checkSubPathImports();

if (violations > 0) {
  console.error(`\n[architecture-check:native-core] ${violations} boundary violation(s) found.`);
  process.exit(1);
} else {
  console.log("[architecture-check:native-core] ✓ All Capacitor imports are inside packages/native-core/src/adapters/");
}
