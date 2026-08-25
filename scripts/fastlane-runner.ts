#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadReleaseToolEnvironment } from "@asol/env-core/process";
import { readShippingPlatformsDeclaration } from "@asol/ota-core/publishing";

import { ensureReleaseSecretsRestored } from "./ensure-release-secrets-restored";
import { fastlaneSecretScopes } from "./fastlane-secret-policy";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveBundler(rubyBin: string): string | undefined {
  const pathDirectories = String(process.env.PATH || "").split(path.delimiter);
  const candidates =
    process.platform === "win32"
      ? [
          path.join(rubyBin, "bundle.bat"),
          path.join(rubyBin, "bundle.cmd"),
          ...pathDirectories.flatMap((directory) => [
            path.join(directory, "bundle.cmd"),
            path.join(directory, "bundle.bat"),
          ]),
        ]
      : pathDirectories.map((directory) => path.join(directory, "bundle"));
  return candidates.find((candidate) => existsSync(candidate));
}

async function main(): Promise<void> {
  loadReleaseToolEnvironment({ cwd: root });
  const args = process.argv.slice(2);
  const scopes = fastlaneSecretScopes(
    args,
    readShippingPlatformsDeclaration(root),
  );
  if (scopes.length > 0) {
    await ensureReleaseSecretsRestored("fastlane", scopes);
  }

  const rubyBin = process.env.RUBY_BIN || "C:\\Ruby33-x64\\bin";
  const bundle = resolveBundler(rubyBin);
  if (!bundle) {
    throw new Error(
      "Bundler was not found. Install Ruby + Bundler before running fastlane.",
    );
  }

  if (args[0] === "android" && args[1] !== "doctor") {
    const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
    const preflightScript = path.join(
      root,
      "packages",
      "native-core",
      "scripts",
      "android-build-preflight.ts",
    );
    const preflight = spawnSync(process.execPath, [tsxCli, preflightScript], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      windowsHide: true,
    });
    if ((preflight.status ?? 1) !== 0) {
      process.exitCode = preflight.status ?? 1;
      return;
    }
  }

  const env = {
    ...process.env,
    LANG: process.env.LANG || "en_US.UTF-8",
    LC_ALL: process.env.LC_ALL || "en_US.UTF-8",
    FASTLANE_SKIP_UPDATE_CHECK: process.env.FASTLANE_SKIP_UPDATE_CHECK || "1",
    PATH: `${rubyBin}${path.delimiter}${process.env.PATH || ""}`,
  };
  const result = spawnSync(bundle, ["exec", "fastlane", ...args], {
    cwd: root,
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  process.exitCode = result.status ?? 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
