import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { relatedCoreTests } from "../local-agent/related-core-tests";

const root = process.cwd();
const scripts = (JSON.parse(readFileSync(path.join(root, "package.json"), "utf8") ) as { scripts?: Record<string, string> }).scripts ?? {};
const available = new Set(Object.keys(scripts).filter((name) => name.startsWith("test:") && name.endsWith("-core")));

assert.ok(available.has("test:architecture-core"), "the architecture floor suite must exist");

assert.deepEqual(
  relatedCoreTests(["packages/backup-core/src/server.ts", "src/features/orders/page.tsx"], available),
  ["test:backup-core", "test:orders-core"],
);
assert.deepEqual(relatedCoreTests(["src/app/api/health/route.ts"], available), ["test:api-core"]);
assert.deepEqual(relatedCoreTests(["android/app/build.gradle", "ios/App/App/Info.plist"], available), ["test:native-core"]);

/** A path with no suite of its own must not silently verify nothing. */
assert.deepEqual(relatedCoreTests(["README.md"], available), ["test:architecture-core"]);
assert.deepEqual(relatedCoreTests([], available), ["test:architecture-core"]);
assert.deepEqual(relatedCoreTests(["src/features/no-such-feature/x.ts"], available), ["test:architecture-core"]);

/** Control-plane paths are verified by the architecture suite, never by nothing. */
for (const control of ["scripts/deploy-all.ts", "tools/local-agent/gateway.py", ".github/workflows/docs.yml", "docs/README.md"]) {
  assert.deepEqual(relatedCoreTests([control], available), ["test:architecture-core"], control);
}

console.log("Local-agent related core-test resolution passed.");
