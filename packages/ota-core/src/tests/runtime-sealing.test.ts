import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const BANNED_NODE_IMPORTS = [
  "from 'node:fs'",
  'from "node:fs"',
  "from 'fs'",
  'from "fs"',
  "from 'node:path'",
  'from "node:path"',
  "from 'path'",
  'from "path"',
  "from 'node:child_process'",
  'from "node:child_process"',
  "from 'child_process'",
  'from "child_process"',
  "from '@asol/ota-core/publishing'",
  'from "@asol/ota-core/publishing"',
];

function scanDir(dir: string, result: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanDir(full, result);
    else if (/\.[jt]sx?$/.test(entry.name)) result.push(full);
  }
  return result;
}

import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runRuntimeSealingTests(): Promise<void> {
  const base = path.resolve(__dirname, "..");
  const files = [
    ...scanDir(path.join(base, "domain")),
    ...scanDir(path.join(base, "errors")),
    ...scanDir(path.join(base, "validation")),
    ...scanDir(path.join(base, "runtime")).filter((f) => !f.endsWith("release-service.server.ts")),
    path.join(base, "index.ts"),
  ];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const banned of BANNED_NODE_IMPORTS) {
      assert.ok(
        !content.includes(banned),
        `Runtime file ${path.relative(base, file)} illegally imports: ${banned}`,
      );
    }
  }

  console.log(`  ✔ runtime-sealing contract tests passed across ${files.length} files`);
}

if (process.argv[1]?.endsWith("runtime-sealing.test.ts")) {
  runRuntimeSealingTests().catch((e) => { console.error(e); process.exit(1); });
}
