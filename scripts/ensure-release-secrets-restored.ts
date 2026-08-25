import { existsSync } from "node:fs";
import path from "node:path";

import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import { loadReleaseToolEnvironment } from "@asol/env-core/process";
import {
  googlePlayCredentialsAreReady,
  appStoreConnectCredentialsAreReady,
} from "@asol/ota-core/publishing";
import {
  PORTABLE_ARCHIVE_PATH,
  SECRET_ARCHIVE_PASSWORD_ENV_VAR,
} from "@asol/secrets-core";
import { runDeploymentNpmScript } from "@asol/release-core";

export type ReleaseSecretScope =
  | "vercel"
  | "google-play"
  | "ota"
  | "android-signing"
  | "app-store";

const ROOT_VERCEL_LINK = path.join(process.cwd(), ".vercel", "project.json");

function envPresent(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function filePresent(relativeOrAbsolute: string | undefined): boolean {
  if (!relativeOrAbsolute?.trim()) return false;
  const resolved = path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.resolve(process.cwd(), relativeOrAbsolute);
  return existsSync(resolved);
}

export function missingReleaseCredentialKeys(
  scopes: readonly ReleaseSecretScope[] = ["vercel"],
): string[] {
  loadReleaseToolEnvironment();
  const missing: string[] = [];
  const wanted = new Set(scopes);

  if (wanted.has("vercel")) {
    for (const declaration of Object.values(ACCOUNT_DECLARATIONS)) {
      if (!envPresent(declaration.tokenEnvVar)) missing.push(declaration.tokenEnvVar);
    }
    if (!existsSync(ROOT_VERCEL_LINK)) missing.push(".vercel/project.json");
  }

  if (wanted.has("google-play") && !googlePlayCredentialsAreReady()) {
    missing.push("GOOGLE_PLAY_CREDENTIALS");
  }

  if (wanted.has("ota")) {
    for (const key of [
      "ASOL_OTA_R2_BUCKET_NAME",
      "ASOL_OTA_R2_PUBLIC_URL",
      "ASOL_OTA_R2_ACCOUNT_ID",
      "ASOL_OTA_R2_ACCESS_KEY_ID",
      "ASOL_OTA_R2_SECRET_ACCESS_KEY",
    ]) {
      if (!envPresent(key)) missing.push(key);
    }
    if (
      !envPresent("ASOL_OTA_SIGNING_PRIVATE_KEY") &&
      !filePresent(path.join(".ota", "private-key.pem"))
    ) {
      missing.push("ASOL_OTA_SIGNING_PRIVATE_KEY");
    }
  }

  if (wanted.has("android-signing")) {
    for (const key of [
      "ASOL_ANDROID_KEYSTORE_PASSWORD",
      "ASOL_ANDROID_KEY_ALIAS",
      "ASOL_ANDROID_KEY_PASSWORD",
    ]) {
      if (!envPresent(key)) missing.push(key);
    }
    const keystore = process.env.ASOL_ANDROID_KEYSTORE_FILE?.trim();
    if (!filePresent(keystore)) missing.push("ASOL_ANDROID_KEYSTORE_FILE");
  }

  if (wanted.has("app-store") && !appStoreConnectCredentialsAreReady()) {
    missing.push("APP_STORE_CONNECT_CREDENTIALS");
  }

  return missing;
}

/**
 * When required credentials are absent, restore the portable archive if the
 * password is available and the archive exists. Non-interactive runs fail with
 * an actionable message instead of waiting for input. Never invents secrets.
 */
export async function ensureReleaseSecretsRestored(
  logPrefix: string,
  scopes: readonly ReleaseSecretScope[] = ["vercel"],
): Promise<void> {
  loadReleaseToolEnvironment();
  if (missingReleaseCredentialKeys(scopes).length === 0) {
    return;
  }

  const password = process.env[SECRET_ARCHIVE_PASSWORD_ENV_VAR]?.trim();
  if (!password) {
    const missing = missingReleaseCredentialKeys(scopes);
    throw new Error(
      [
        `${logPrefix} required release credentials are missing: ${missing.join(", ")}.`,
        `Set ${SECRET_ARCHIVE_PASSWORD_ENV_VAR} and rerun, or run npm run secrets:restore in an interactive terminal.`,
        "Do not invent secret values.",
      ].join(" "),
    );
  }

  if (!existsSync(PORTABLE_ARCHIVE_PATH)) {
    throw new Error(
      `${logPrefix} ${SECRET_ARCHIVE_PASSWORD_ENV_VAR} is set but ${PORTABLE_ARCHIVE_PATH} is missing.`,
    );
  }

  console.log(
    `[${logPrefix}] Release credentials incomplete; restoring from secret archive via ${SECRET_ARCHIVE_PASSWORD_ENV_VAR}…`,
  );
  await runDeploymentNpmScript("secrets:restore", { logPrefix });
  loadReleaseToolEnvironment();

  const stillMissing = missingReleaseCredentialKeys(scopes);
  if (stillMissing.length > 0) {
    throw new Error(
      `${logPrefix} credentials still missing after restore: ${stillMissing.join(", ")}.`,
    );
  }
}
