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

import { GOVA_DEPLOYMENT_DIR } from "@asol/gova-deployment-core";
import {
  ALLOWED_VERCEL_NPM_SCRIPTS,
  FORBIDDEN_VERCEL_PROOF_COMMANDS,
  foreignRuntimeEnvNames,
  hostedRuntimeEnvKeys,
  runtimeAccountFromEnv,
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
import {
  parseReleaseReadinessResponse,
  releaseReadinessUrl,
} from "../release-readiness-barrier";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

const vercelConfig = JSON.parse(read("vercel.json")) as {
  installCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
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
/**
 * `build:vercel` runs `next build` inside the generated gova build view, so the
 * artifact lands in `<view>/.next` and not at the project root where Vercel's
 * Next.js builder looks for it. Without this the deployment fails with
 * `NEXT_NO_ROUTES_MANIFEST` after a build that succeeded and passed every
 * artifact scan. See docs/07-mobile-and-release/release-commands.md.
 */
assert.equal(
  vercelConfig.outputDirectory,
  `${GOVA_DEPLOYMENT_DIR}/.next`,
  "Vercel must read the gova build view's artifact, not the repository root.",
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

// ── Exact-SHA release publication barrier ────────────────────────────────────
// The explicit release transaction deploys gova only after its prerequisites.
// The build
// must wait for control + six workload proofs before it creates the deployment
// tree, otherwise a frontend can publish while its owned APIs are still old.
const readinessCallIndex = buildSource.indexOf("await assertHostedGovaReleaseReady()");
const govaTreeIndex = buildSource.indexOf("buildGovaDeploymentTree(ROOT)");
assert.ok(readinessCallIndex >= 0, "build:vercel must call the exact-SHA readiness barrier.");
assert.ok(govaTreeIndex > readinessCallIndex, "readiness must complete before any publishable gova tree is built.");
assert.match(buildSource, /IS_GOVA_UPLOAD_VIEW/);
assert.match(buildSource, /ASOL_GOVA_UPLOAD_VIEW === "1"/);
assert.match(buildSource, /runtime !== "gova"/);

const revision = "a".repeat(40);
assert.equal(
  releaseReadinessUrl("https://asol-control.vercel.app/", revision),
  `https://asol-control.vercel.app/api/release-readiness/${revision}`,
);
assert.equal(parseReleaseReadinessResponse(revision, { revision, status: "pending" }), "pending");
assert.equal(parseReleaseReadinessResponse(revision, { revision, status: "ready" }), "ready");
assert.equal(parseReleaseReadinessResponse(revision, { revision, status: "failed" }), "failed");
assert.throws(() => releaseReadinessUrl("https://asol-control.vercel.app", "short"), /InvalidRevision/);
assert.throws(
  () => parseReleaseReadinessResponse(revision, { revision: "b".repeat(40), status: "ready" }),
  /RevisionMismatch/,
);
assert.throws(
  () => parseReleaseReadinessResponse(revision, { revision, status: "succeeded" }),
  /InvalidStatus/,
);

// ── Environment ownership is per runtime, never a union ──────────────────────
//
// The old `HOSTED_RUNTIME_ENV_KEYS` merged every account's requirements, so a
// gova build failed unless the gova project held another deployment's database
// tokens. These assertions exist so that cannot come back.
const govaKeys = hostedRuntimeEnvKeys("gova");
assert.ok(govaKeys.includes("NEXT_PUBLIC_ASOL_CONTROL_URL"));
for (const foreign of [
  "TURSO_DATABASE_URL",
  "SYSTEM_OPS_DATABASE_URL",
  "ASOL_SESSION_SIGNING_SECRET",
  "WEB_PUSH_VAPID_PRIVATE_KEY",
  "R2_SECRET_ACCESS_KEY",
]) {
  assert.equal(
    govaKeys.includes(foreign),
    false,
    `gova is a frontend and must not require ${foreign}; it has no code that can use it.`,
  );
}
assert.ok(hostedRuntimeEnvKeys("control").includes("ASOL_SESSION_SIGNING_SECRET"));
assert.equal(
  hostedRuntimeEnvKeys("control").includes("NEXT_PUBLIC_ASOL_CONTROL_URL"),
  false,
  "control does not redirect to itself.",
);

for (const runtime of ["gova", "control", "notifications", "products", "orders", "profiles", "submain", "sub2main"] as const) {
  assert.equal(
    hostedRuntimeEnvKeys(runtime).some((key) => key.startsWith("VERCEL_") && key.endsWith("_TOKEN")),
    false,
    `${runtime} runtime keys are app credentials, not Vercel deploy tokens.`,
  );
}

const filled = Object.fromEntries(govaKeys.map((key) => [key, "present"]));
assert.deepEqual(missingHostedRuntimeEnvKeys("gova", filled), []);
assert.deepEqual(
  missingHostedRuntimeEnvKeys("gova", { ...filled, NEXT_PUBLIC_ASOL_ORDERS_URL: "  " }),
  ["NEXT_PUBLIC_ASOL_ORDERS_URL"],
);
assert.throws(
  () => assertVercelRuntimeEnvironment("gova", { ...filled, NEXT_PUBLIC_ASOL_PROFILES_URL: "" }),
  /NEXT_PUBLIC_ASOL_PROFILES_URL/,
);
try {
  assertVercelRuntimeEnvironment("control", { ASOL_SESSION_SIGNING_SECRET: "" });
  assert.fail("expected missing-key failure");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  assert.match(message, /ASOL_SESSION_SIGNING_SECRET/);
  assert.equal(message.includes("present"), false);
  assert.doesNotMatch(message, /libsql:\/\//);
}

// ── Which runtime am I ───────────────────────────────────────────────────────
assert.equal(runtimeAccountFromEnv({}), "gova");
assert.equal(runtimeAccountFromEnv({ ASOL_RUNTIME_ACCOUNT: "control" }), "control");
assert.throws(
  () => runtimeAccountFromEnv({ ASOL_RUNTIME_ACCOUNT: "not-an-account" }),
  /is not a declared account/,
);

// ── The foreign-secret report names keys and never values ────────────────────
{
  const findings = foreignRuntimeEnvNames("gova", {
    ...filled,
    TURSO_AUTH_TOKEN: "a-real-looking-secret",
    R2_SECRET_ACCESS_KEY: "another-secret",
    VERCEL_CONTROL_TOKEN: "a-deploy-token",
    SOME_UNRELATED_SETTING: "fine",
  });
  const names = findings.map((finding) => finding.name).sort();
  assert.deepEqual(names, ["R2_SECRET_ACCESS_KEY", "TURSO_AUTH_TOKEN", "VERCEL_CONTROL_TOKEN"]);
  assert.equal(
    findings.some((finding) => JSON.stringify(finding).includes("a-real-looking-secret")),
    false,
    "the report must be names-only so it can be pasted into an issue",
  );
  assert.ok(findings.find((finding) => finding.name === "TURSO_AUTH_TOKEN")?.declaredBy.includes("submain"));
}
assert.deepEqual(foreignRuntimeEnvNames("gova", filled), []);

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

/**
 * The leak report must stay readable.
 *
 * A Vercel build container injects around a hundred of its own names that match
 * the deployment-credential and object-storage families. Reporting them buried
 * the one finding that matters. A name is reported when the repository owns it:
 * another account declares it, or it sits under one of our own prefixes.
 */
for (const platformName of [
  "VERCEL_OIDC_TOKEN",
  "VERCEL_ARTIFACTS_TOKEN",
  "VERCEL_ARTIFACTS_OWNER",
  "VERCEL_API_BUILD_CONTAINERS_ENDPOINT",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_REGION",
  "AWS_EXECUTION_ENV",
  "AWS_LAMBDA_FUNCTION_NAME",
]) {
  assert.deepEqual(
    foreignRuntimeEnvNames("gova", { [platformName]: "x" }).map((finding) => finding.name),
    [],
    `${platformName} is injected by the build platform and must not be reported as a leak.`,
  );
}

for (const ownedSecret of [
  "VERCEL_CONTROL_TOKEN",
  "VERCEL_NOTIFICATIONS_TOKEN",
  "TURSO_AUTH_TOKEN",
  "R2_API_TOKEN",
  "ASOL_SESSION_SIGNING_SECRET",
  "SYSTEM_OPS_DATABASE_URL",
]) {
  assert.deepEqual(
    foreignRuntimeEnvNames("gova", { [ownedSecret]: "x" }).map((finding) => finding.name),
    [ownedSecret],
    `${ownedSecret} belongs to this repository and must still be reported on gova.`,
  );
}

assert.deepEqual(
  foreignRuntimeEnvNames("gova", {
    NEXT_PUBLIC_ASOL_CONTROL_URL: "https://control.example",
  }).map((finding) => finding.name),
  [],
  "gova's own declared origins are not findings.",
);

console.log("Vercel deployment/smoke guard contract tests passed.");
