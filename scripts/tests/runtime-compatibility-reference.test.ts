import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  collectRuntimeCompatibilityReference,
  compareRuntimeCompatibilityReferences,
  discoverPackageManifests,
  validateRuntimeCompatibilityReference,
} from "../runtime-compatibility-reference";

const root = process.cwd();
const expected = collectRuntimeCompatibilityReference(root);
assert.deepEqual(validateRuntimeCompatibilityReference(root), []);

const changedLock = structuredClone(expected);
changedLock.packageLockDigest = "adversarial-lock-drift";
assert.match(compareRuntimeCompatibilityReferences(expected, changedLock).join("\n"), /packageLockDigest changed/);

const newPackage = structuredClone(expected);
newPackage.workspacePackages["unreviewed-core"] = "@asol/unreviewed-core@0.1.0";
assert.match(compareRuntimeCompatibilityReferences(expected, newPackage).join("\n"), /unreviewed-core is new/);

const newService = structuredClone(expected);
newService.services.unreviewed = structuredClone(Object.values(expected.services)[0]!);
assert.match(compareRuntimeCompatibilityReferences(expected, newService).join("\n"), /services\.unreviewed is new/);

const changedTool = structuredClone(expected);
changedTool.tools.gradleWrapper = "99.0.0";
assert.match(compareRuntimeCompatibilityReferences(expected, changedTool).join("\n"), /tools\.gradleWrapper changed/);

const fixture = mkdtempSync(path.join(tmpdir(), "asol-runtime-reference-"));
try {
  for (const folder of ["existing-core", "future-core"]) {
    const packageRoot = path.join(fixture, "packages", folder);
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(
      path.join(packageRoot, "package.json"),
      JSON.stringify({ name: `@asol/${folder}`, version: "0.1.0" }),
      "utf8",
    );
  }
  assert.deepEqual(Object.keys(discoverPackageManifests(fixture, "packages")), ["existing-core", "future-core"]);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

console.log("Runtime compatibility reference and adversarial default-deny tests passed.");
