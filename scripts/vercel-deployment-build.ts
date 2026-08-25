#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  assertVercelHostEnvironment,
  assertVercelRuntimeEnvironment,
} from "./vercel-deployment-guards";

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
  assertVercelRuntimeEnvironment();
  console.log("[vercel-build] required hosted runtime keys are present (names only).");

  console.log("[vercel-build] next build");
  run(process.execPath, [nextBin(), "build"]);

  const nextOutput = path.join(ROOT, ".next", "server", "app");
  if (!existsSync(nextOutput)) {
    throw new Error("next build finished without .next/server/app; the hosted artifact is not runnable.");
  }

  console.log("[vercel-build] vercel:function-size:check");
  runNpmScript("vercel:function-size:check");
  console.log("[vercel-build] hosted artifact is within Vercel upload limits.");
}

main();
