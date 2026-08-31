#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

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

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runNpmScript(script: string): void {
  const npmCli = process.env.npm_execpath?.trim();
  if (npmCli) {
    run(process.execPath, [npmCli, "run", script]);
    return;
  }
  throw new Error("npm_execpath is required so the Vercel build can invoke npm without a shell.");
}

function nextBin(): string {
  const candidate = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(candidate)) {
    throw new Error("Pinned Next.js binary is missing after npm ci.");
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

  console.log("[vercel-build] next build");
  run(process.execPath, [nextBin(), "build"]);

  assertVercelBuildArtifact(ROOT);
  console.log("[vercel-build] required Next.js server manifests and root route trace are present.");

  console.log("[vercel-build] vercel:function-size:check");
  runNpmScript("vercel:function-size:check");
  console.log("[vercel-build] hosted artifact is within Vercel upload limits.");
}

main();
