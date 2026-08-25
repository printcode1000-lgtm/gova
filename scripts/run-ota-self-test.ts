#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import path from "node:path";

import { ensureReleaseSecretsRestored } from "./ensure-release-secrets-restored";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  await ensureReleaseSecretsRestored(
    "ota:self-test",
    args.includes("--r2")
      ? ["ota-signing", "ota-storage"]
      : ["ota-signing"],
  );
  const result = spawnSync(
    process.execPath,
    [
      path.resolve("node_modules", "tsx", "dist", "cli.mjs"),
      path.resolve("packages", "ota-core", "scripts", "ota-self-test.ts"),
      ...args,
    ],
    { stdio: "inherit", env: process.env, shell: false, windowsHide: true },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
