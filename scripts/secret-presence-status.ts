import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import { loadReleaseToolEnvironment } from "@asol/env-core/process";
import {
  PORTABLE_ARCHIVE_PATH,
  PORTABLE_RECOVERY_KEY_PATH,
  SECRET_ARCHIVE_PASSWORD_ENV_VAR,
} from "@asol/secrets-core";

export type EnvPresence = "present" | "empty" | "missing";
export type FilePresence = "file-present" | "file-missing";

export interface EnvPresenceRow {
  kind: "env";
  name: string;
  status: EnvPresence;
}

export interface FilePresenceRow {
  kind: "file";
  path: string;
  status: FilePresence;
}

export type SecretPresenceRow = EnvPresenceRow | FilePresenceRow;

const RELEASE_ENV_KEYS = [
  SECRET_ARCHIVE_PASSWORD_ENV_VAR,
  ...Object.values(ACCOUNT_DECLARATIONS).map((declaration) => declaration.tokenEnvVar),
  "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64",
  "GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64",
  "GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_EMAIL",
  "GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PLAY_JSON_KEY_FILE",
  "ASOL_OTA_R2_BUCKET_NAME",
  "ASOL_OTA_R2_PUBLIC_URL",
  "ASOL_OTA_R2_ACCOUNT_ID",
  "ASOL_OTA_R2_ACCESS_KEY_ID",
  "ASOL_OTA_R2_SECRET_ACCESS_KEY",
  "ASOL_OTA_SIGNING_PRIVATE_KEY",
  "ASOL_ANDROID_KEYSTORE_FILE",
  "ASOL_ANDROID_KEYSTORE_PASSWORD",
  "ASOL_ANDROID_KEY_ALIAS",
  "ASOL_ANDROID_KEY_PASSWORD",
  "APP_STORE_CONNECT_API_KEY_KEY_ID",
  "APP_STORE_CONNECT_API_KEY_ISSUER_ID",
  "APP_STORE_CONNECT_API_KEY_KEY_FILEPATH",
] as const;

const STATIC_SECRET_FILES = [
  ".vercel/project.json",
  ".ota/private-key.pem",
  path.relative(process.cwd(), PORTABLE_ARCHIVE_PATH).replace(/\\/g, "/"),
  path.relative(process.cwd(), PORTABLE_RECOVERY_KEY_PATH).replace(/\\/g, "/"),
] as const;

interface SecretBackupPathConfig {
  exactPaths?: string[];
}

export function classifyEnvValue(value: string | undefined): EnvPresence {
  if (value === undefined) return "missing";
  if (value.trim() === "") return "empty";
  return "present";
}

export function classifyFileExists(exists: boolean): FilePresence {
  return exists ? "file-present" : "file-missing";
}

function toPosix(relativePath: string): string {
  return relativePath.replace(/\\/g, "/");
}

function resolveWorkspaceFile(relativeOrAbsolute: string, cwd: string): string {
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.resolve(cwd, relativeOrAbsolute);
}

function backupExactPaths(cwd: string): string[] {
  const configPath = path.join(cwd, "config", "secret-backup-paths.json");
  if (!existsSync(configPath)) return [];
  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as SecretBackupPathConfig;
  return [...(parsed.exactPaths ?? [])];
}

function configuredFilePaths(env: NodeJS.ProcessEnv, cwd: string): string[] {
  const paths = new Set<string>([
    ...STATIC_SECRET_FILES,
    ...backupExactPaths(cwd),
  ]);
  const keystore = env.ASOL_ANDROID_KEYSTORE_FILE?.trim();
  if (keystore) paths.add(toPosix(keystore));
  const appStoreKey = env.APP_STORE_CONNECT_API_KEY_KEY_FILEPATH?.trim();
  if (appStoreKey) paths.add(toPosix(appStoreKey));
  const playJson = env.GOOGLE_PLAY_JSON_KEY_FILE?.trim();
  if (playJson) paths.add(toPosix(playJson));
  return [...paths].sort((left, right) => left.localeCompare(right));
}

/**
 * Read-only presence report. Rows contain names/paths and status words only.
 * Values are never copied onto a row.
 */
export function buildSecretPresenceReport(options: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
} = {}): SecretPresenceRow[] {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  loadReleaseToolEnvironment({ cwd, env });

  const rows: SecretPresenceRow[] = [];
  for (const name of RELEASE_ENV_KEYS) {
    rows.push({
      kind: "env",
      name,
      status: classifyEnvValue(env[name]),
    });
  }
  for (const relativePath of configuredFilePaths(env, cwd)) {
    rows.push({
      kind: "file",
      path: relativePath,
      status: classifyFileExists(existsSync(resolveWorkspaceFile(relativePath, cwd))),
    });
  }
  return rows;
}

export function assertReportContainsNoValues(
  rows: readonly SecretPresenceRow[],
  env: NodeJS.ProcessEnv,
): void {
  const serialized = JSON.stringify(rows);
  for (const [key, value] of Object.entries(env)) {
    if (!value?.trim() || value.trim().length < 4) continue;
    if (serialized.includes(value)) {
      throw new Error(`Secret presence report leaked a value for ${key}.`);
    }
  }
}
