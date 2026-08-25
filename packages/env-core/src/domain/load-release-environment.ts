import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Authoritative release-tool environment loading.
 *
 * Precedence (later files never overwrite a non-empty earlier value):
 * 1. Existing process environment
 * 2. `.env.local` fills missing keys
 * 3. `.env` fills keys still missing
 * 4. `fastlane/.env` fills keys still missing
 *
 * Empty declarations are unconfigured and do not mask a later non-empty value.
 * This function never logs values.
 */
export const RELEASE_TOOL_ENV_FILES = [
  ".env.local",
  ".env",
  "fastlane/.env",
] as const;

export type ReleaseToolEnvFile = (typeof RELEASE_TOOL_ENV_FILES)[number];
export type ReleaseToolEnvSource = "process" | ReleaseToolEnvFile;

export interface LoadReleaseToolEnvironmentOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ReleaseToolEnvKeySource {
  key: string;
  source: ReleaseToolEnvSource;
}

function isUsable(value: string | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function stripMatchingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/** Parses KEY=VALUE lines. Comments and blank lines are ignored. Values are not logged. */
export function parseReleaseEnvFileText(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ")
      ? line.slice("export ".length).trim()
      : line;
    const separator = withoutExport.indexOf("=");
    if (separator <= 0) continue;
    const key = withoutExport.slice(0, separator).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) continue;
    values[key] = stripMatchingQuotes(withoutExport.slice(separator + 1));
  }
  return values;
}

function readParsedEnvFile(filePath: string): Record<string, string> {
  return parseReleaseEnvFileText(readFileSync(filePath, "utf8"));
}

export function loadReleaseToolEnvironment(
  options: LoadReleaseToolEnvironmentOptions = {},
): void {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  for (const relative of RELEASE_TOOL_ENV_FILES) {
    const filePath = path.join(cwd, relative);
    if (!existsSync(filePath)) continue;
    const parsed = readParsedEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (!isUsable(value)) continue;
      if (isUsable(env[key])) continue;
      env[key] = value;
    }
  }
}

/**
 * Reports which source supplied each usable key. Values are intentionally omitted.
 */
export function resolveReleaseToolEnvironmentSources(
  options: LoadReleaseToolEnvironmentOptions = {},
): ReleaseToolEnvKeySource[] {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const sources = new Map<string, ReleaseToolEnvSource>();
  for (const [key, value] of Object.entries(env)) {
    if (isUsable(value)) sources.set(key, "process");
  }
  for (const relative of RELEASE_TOOL_ENV_FILES) {
    const filePath = path.join(cwd, relative);
    if (!existsSync(filePath)) continue;
    const parsed = readParsedEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (!isUsable(value) || sources.has(key)) continue;
      sources.set(key, relative);
    }
  }
  return [...sources.entries()]
    .map(([key, source]) => ({ key, source }))
    .sort((left, right) => left.key.localeCompare(right.key));
}
