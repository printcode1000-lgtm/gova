#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  GOVA_DEPLOYMENT_DIR,
  buildGovaDeploymentTree,
  assertGovaArtifact,
} from "@asol/gova-deployment-core";
import {
  assertVercelHostEnvironment,
  assertVercelRuntimeEnvironment,
  foreignRuntimeEnvNames,
  runtimeAccountFromEnv,
} from "./vercel-deployment-guards";
import { assertVercelBuildArtifact } from "./vercel-build-artifact-guard";

/**
 * Hosted Vercel build: environment health + a runnable Next.js artifact.
 * Correctness gates stay on `npm run build` / `deploy:all` preflight.
 */
const ROOT = process.cwd();
const BUILD_ROOT = path.join(ROOT, GOVA_DEPLOYMENT_DIR);

function run(command: string, args: string[], cwd = ROOT): void {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function nextBin(): string {
  const candidate = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(candidate)) {
    throw new Error("Pinned Next.js binary is missing after npm ci.");
  }
  return candidate;
}

function tsxBin(): string {
  const candidate = path.join(ROOT, "node_modules", ".bin", "tsx");
  if (!existsSync(candidate)) {
    throw new Error("Pinned tsx binary is missing after npm ci.");
  }
  return candidate;
}

function main(): void {
  console.log("[vercel-build] Deployment/Smoke Guards only — not a correctness suite.");
  const host = assertVercelHostEnvironment();
  console.log(`[vercel-build] host Node ${host.nodeVersion} is within engines.`);
  const runtime = runtimeAccountFromEnv();
  assertVercelRuntimeEnvironment(runtime);
  console.log(`[vercel-build] required "${runtime}" runtime keys are present (names only).`);

  // Names only, never values. A foreign secret does not fail the build — the
  // project may legitimately carry an unrelated key — but it is the one signal
  // that says a credential was copied into a deployment that cannot use it.
  const foreign = foreignRuntimeEnvNames(runtime);
  if (foreign.length > 0) {
    console.warn(
      `[vercel-build] "${runtime}" holds ${foreign.length} undeclared secret name(s): ` +
        foreign.map((finding) => `${finding.name} (${finding.family})`).join(", "),
    );
  }

  console.log(`[vercel-build] generating ${GOVA_DEPLOYMENT_DIR}`);
  buildGovaDeploymentTree(ROOT);

  process.env.ASOL_RUNTIME_ROLE = "gova-frontend";
  console.log(`[vercel-build] next build (${GOVA_DEPLOYMENT_DIR})`);
  run(process.execPath, [nextBin(), "build"], BUILD_ROOT);

  assertVercelBuildArtifact(BUILD_ROOT);
  assertGovaArtifact(BUILD_ROOT);
  console.log("[vercel-build] gova-only .next artifact contains no Business API or dev API functions.");

  console.log("[vercel-build] vercel:function-size:check");
  run(tsxBin(), ["scripts/check-vercel-function-size.ts"], BUILD_ROOT);
  console.log("[vercel-build] hosted artifact is within Vercel upload limits.");
}

main();
