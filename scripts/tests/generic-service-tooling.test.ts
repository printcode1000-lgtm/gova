import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import { RELEASE_WORKLOADS } from "@asol/vercel-deploy-core";
import { resolveReleaseWorkloadDeclaration } from "../sync-service-sources";

for (const workload of RELEASE_WORKLOADS) {
  const declaration = resolveReleaseWorkloadDeclaration(workload);
  assert.equal(declaration, ACCOUNT_DECLARATIONS[workload], `${workload} must resolve from canonical declarations.`);
  assert.ok(declaration.serviceDir, `${workload} must retain a declared service directory.`);
  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { scripts: Record<string, string> };
  assert.equal(packageJson.scripts[`${workload}:deploy`], `npx tsx scripts/deploy-service.ts ${workload}`);
  assert.ok(!existsSync(path.join(process.cwd(), `scripts/sync-${workload}-service-sources.ts`)), "Per-workload sync wrappers must not survive.");
}

assert.throws(() => resolveReleaseWorkloadDeclaration("control"), /separate privileged runtime/);
assert.throws(() => resolveReleaseWorkloadDeclaration("gova"), /separate privileged runtime/);
assert.throws(() => resolveReleaseWorkloadDeclaration("unknown"), /separate privileged runtime/);
assert.equal(new Set(RELEASE_WORKLOADS).size, RELEASE_WORKLOADS.length, "Canonical workload registry must not drift.");
console.log("Generic service tooling: canonical declaration resolution and privileged-control exclusion passed.");
