import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "..", "..", "..");
const indexFile = path.join(root, "src", "index.ts");
const tsconfigFile = path.join(root, "..", "..", "tsconfig.json");

assert.ok(existsSync(indexFile), "packages/native-core/src/index.ts must exist");
const indexContent = readFileSync(indexFile, "utf8");

// 1. Zero Capacitor imports/exports in index.ts
assert.doesNotMatch(
  indexContent,
  /@capacitor\//,
  "packages/native-core/src/index.ts must contain zero direct Capacitor imports or exports",
);

// 2. Zero wildcard exports in index.ts
assert.doesNotMatch(
  indexContent,
  /export\s+\*\s+from/,
  "packages/native-core/src/index.ts must contain zero wildcard exports",
);

// 3. Zero raw adapter exports in index.ts
assert.doesNotMatch(
  indexContent,
  /export\s+\{\s*[^}]*\b[a-zA-Z]+Adapter\b[^}]*\}\s+from/,
  "packages/native-core/src/index.ts must not export raw adapter objects",
);

// 4. tsconfig.json must NOT contain deep import pattern for @asol/native-core
if (existsSync(tsconfigFile)) {
  const tsconfigContent = readFileSync(tsconfigFile, "utf8");
  assert.doesNotMatch(
    tsconfigContent,
    /"@asol\/native-core\/\*"/,
    "tsconfig.json must not allow deep imports via '@asol/native-core/*'",
  );
}

console.log("✓ All NativeCore AST boundary contract tests passed.");
