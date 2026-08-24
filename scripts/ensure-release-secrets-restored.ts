import { existsSync } from "node:fs";
import path from "node:path";

import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import {
  PORTABLE_ARCHIVE_PATH,
  SECRET_ARCHIVE_PASSWORD_ENV_VAR,
} from "@asol/secrets-core";
import { runDeploymentNpmScript } from "@asol/release-core";

import { loadReleaseEnvironment } from "./load-release-env";

const ROOT_VERCEL_LINK = path.join(process.cwd(), ".vercel", "project.json");

function missingReleaseCredentialKeys(): string[] {
  const missingTokens = Object.values(ACCOUNT_DECLARATIONS)
    .map((declaration) => declaration.tokenEnvVar)
    .filter((key) => !process.env[key]?.trim());
  const missingLink = existsSync(ROOT_VERCEL_LINK) ? [] : [".vercel/project.json"];
  return [...missingTokens, ...missingLink];
}

/**
 * When release credentials are absent but `ASOL_SECRET_ARCHIVE_PASSWORD` is set,
 * restore the portable archive into `.env.local` / `.vercel/` and reload env.
 * No-op when credentials are already present. Never invents a password.
 */
export async function ensureReleaseSecretsRestored(logPrefix: string): Promise<void> {
  if (missingReleaseCredentialKeys().length === 0) {
    return;
  }

  const password = process.env[SECRET_ARCHIVE_PASSWORD_ENV_VAR]?.trim();
  if (!password) {
    return;
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
  loadReleaseEnvironment();
}
