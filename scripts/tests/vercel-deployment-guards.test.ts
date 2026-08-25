import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ALLOWED_VERCEL_NPM_SCRIPTS,
  FORBIDDEN_VERCEL_PROOF_COMMANDS,
  HOSTED_RUNTIME_ENV_KEYS,
  VERCEL_BUILD_COMMAND,
  VERCEL_BUILD_SCRIPT,
  VERCEL_INSTALL_COMMAND,
  assertVercelHostEnvironment,
  assertVercelRuntimeEnvironment,
  missingHostedRuntimeEnvKeys,
  vercelBuildSourceMentionsForbiddenProof,
  vercelBuildNpmScriptViolations,
} from "../vercel-deployment-guards";
import { assertVercelBuildArtifact } from "../vercel-build-artifact-guard";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

const vercelConfig = JSON.parse(read("vercel.json")) as {
  installCommand?: string;
  buildCommand?: string;
};
const pkg = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
  engines?: { node?: string };
};
const buildSource = read("scripts/vercel-deployment-build.ts");
const guardSource = read("scripts/vercel-deployment-guards.ts");

assert.equal(
  vercelConfig.installCommand,
  VERCEL_INSTALL_COMMAND,
  "Vercel must install the reviewed lockfile with npm ci.",
);
assert.equal(
  vercelConfig.buildCommand,
  VERCEL_BUILD_COMMAND,
  "Vercel must not run the local correctness gate (npm run build).",
);
assert.equal(
  pkg.scripts?.[VERCEL_BUILD_SCRIPT],
  "npx tsx scripts/vercel-deployment-build.ts",
  "build:vercel must invoke the hosted deployment builder.",
);
assert.notEqual(pkg.scripts?.build, VERCEL_BUILD_COMMAND);
assert.match(pkg.scripts?.build ?? "", /run-generated-gate\.ts build/);

assert.equal(
  vercelBuildSourceMentionsForbiddenProof(buildSource).length,
  0,
  `Vercel build runner must not invoke correctness proofs: ${vercelBuildSourceMentionsForbiddenProof(buildSource).join(", ")}`,
);
for (const command of FORBIDDEN_VERCEL_PROOF_COMMANDS) {
  assert.equal(
    buildSource.includes(command),
    false,
    `Vercel build runner mentions forbidden proof ${command}.`,
  );
}
assert.match(buildSource, /nextBin\(\),\s*"build"/);
assert.match(buildSource, /vercel:function-size:check/);
assert.deepEqual(vercelBuildNpmScriptViolations(buildSource), []);
assert.deepEqual(ALLOWED_VERCEL_NPM_SCRIPTS, ["vercel:function-size:check"]);
assert.deepEqual(
  vercelBuildNpmScriptViolations('runNpmScript("verify:all")'),
  ["verify:all"],
  "a correctness suite hidden behind an npm alias must be rejected",
);
assert.doesNotMatch(buildSource, /shell:\s*true/);

assert.ok(HOSTED_RUNTIME_ENV_KEYS.includes("TURSO_DATABASE_URL"));
assert.ok(HOSTED_RUNTIME_ENV_KEYS.includes("SYSTEM_OPS_DATABASE_URL"));
assert.ok(HOSTED_RUNTIME_ENV_KEYS.includes("ASOL_SESSION_SIGNING_SECRET"));
assert.equal(
  HOSTED_RUNTIME_ENV_KEYS.some((key) => key.startsWith("VERCEL_") && key.endsWith("_TOKEN")),
  false,
  "Hosted runtime keys are app/runtime credentials, not Vercel deploy tokens.",
);

const filled = Object.fromEntries(HOSTED_RUNTIME_ENV_KEYS.map((key) => [key, "present"]));
assert.deepEqual(missingHostedRuntimeEnvKeys(filled), []);
assert.deepEqual(
  missingHostedRuntimeEnvKeys({ ...filled, TURSO_DATABASE_URL: "  " }),
  ["TURSO_DATABASE_URL"],
);
assert.throws(
  () => assertVercelRuntimeEnvironment({ ...filled, TURSO_AUTH_TOKEN: "" }),
  /TURSO_AUTH_TOKEN/,
);
try {
  assertVercelRuntimeEnvironment({ ...filled, ASOL_SESSION_SIGNING_SECRET: "" });
  assert.fail("expected missing-key failure");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  assert.match(message, /ASOL_SESSION_SIGNING_SECRET/);
  assert.equal(message.includes("present"), false);
  assert.doesNotMatch(message, /libsql:\/\//);
}

assert.equal(assertVercelHostEnvironment("v22.18.0").nodeCompatible, true);
assert.equal(assertVercelHostEnvironment("v24.18.0").nodeCompatible, true);
assert.throws(() => assertVercelHostEnvironment("v20.19.0"), /outside the project engines range/);

const artifactRoot = mkdtempSync(path.join(os.tmpdir(), "vercel-artifact-guard-"));
try {
  const nextRoot = path.join(artifactRoot, ".next");
  mkdirSync(path.join(nextRoot, "server", "app"), { recursive: true });
  writeFileSync(path.join(nextRoot, "BUILD_ID"), "reviewed-build\n");
  writeFileSync(path.join(nextRoot, "routes-manifest.json"), "{}");
  writeFileSync(path.join(nextRoot, "required-server-files.json"), "{}");
  writeFileSync(path.join(nextRoot, "server", "app", "page.js.nft.json"), "{}");
  assert.doesNotThrow(() => assertVercelBuildArtifact(artifactRoot));
  writeFileSync(path.join(nextRoot, "required-server-files.json"), "");
  assert.throws(
    () => assertVercelBuildArtifact(artifactRoot),
    /required-server-files\.json/,
  );
} finally {
  rmSync(artifactRoot, { recursive: true, force: true });
}

const services = readdirSync(path.join(ROOT, "services"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
for (const service of services) {
  const servicePkg = JSON.parse(read(`services/${service}/package.json`)) as {
    scripts?: { build?: string };
  };
  assert.equal(
    servicePkg.scripts?.build,
    "next build",
    `${service} Vercel build must be next build only, not the root correctness gate.`,
  );
}

assert.match(guardSource, /Local `npm run build` proves the code is correct/);
assert.ok(pkg.engines?.node?.includes(">=22"));
assert.ok(pkg.engines?.node?.includes("<25"));

console.log("Vercel deployment/smoke guard contract tests passed.");
