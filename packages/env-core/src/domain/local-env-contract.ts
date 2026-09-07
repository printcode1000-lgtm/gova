import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export const CANONICAL_LOCAL_ENV_FILE = ".env.local";
export const CANONICAL_ENV_TEMPLATE_FILE = ".env.example";

/** Finds application/release env files that would compete with the canonical local source. */
export function findLegacyLocalEnvFiles(cwd = process.cwd()): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(cwd, { withFileTypes: true })) {
    if (!entry.name.startsWith(".env")) continue;
    if (entry.name === CANONICAL_LOCAL_ENV_FILE || entry.name === CANONICAL_ENV_TEMPLATE_FILE) continue;
    found.push(entry.name);
  }
  const fastlaneDir = path.join(cwd, "fastlane");
  if (existsSync(fastlaneDir)) {
    for (const entry of readdirSync(fastlaneDir, { withFileTypes: true })) {
      if (entry.name.startsWith(".env")) found.push(`fastlane/${entry.name}`);
    }
  }
  return found.sort();
}

/** Refuses hidden local fallbacks so `.env.local` remains the only runtime file source. */
export function assertSingleLocalEnvSource(cwd = process.cwd()): void {
  const found = findLegacyLocalEnvFiles(cwd);
  if (found.length > 0) {
    throw new Error(
      `legacyEnvironmentFileDetected:${found.join(",")}; move all local application/release values to ${CANONICAL_LOCAL_ENV_FILE}`,
    );
  }
}
