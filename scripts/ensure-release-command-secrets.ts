#!/usr/bin/env tsx
import {
  ensureReleaseSecretsRestored,
  type ReleaseSecretScope,
} from "./ensure-release-secrets-restored";

const ALLOWED_SCOPES = new Set<ReleaseSecretScope>([
  "vercel",
  "google-play",
  "ota",
  "ota-storage",
  "ota-cloudflare",
  "ota-signing",
  "android-signing",
  "ios-signing",
  "app-store",
]);

async function main(): Promise<void> {
  const requested = process.argv.slice(2);
  if (requested.length === 0 || requested.some((scope) => !ALLOWED_SCOPES.has(scope as ReleaseSecretScope))) {
    throw new Error(
      `Usage: ensure-release-command-secrets.ts <${[...ALLOWED_SCOPES].join("|")}> [...]`,
    );
  }
  await ensureReleaseSecretsRestored(
    "release-secrets",
    requested as ReleaseSecretScope[],
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
