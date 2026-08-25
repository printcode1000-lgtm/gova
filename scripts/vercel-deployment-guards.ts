import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ACCOUNT_DECLARATIONS,
  GOVA_RUNTIME_REQUIRED_ENV_KEYS,
} from "@asol/account-declarations";

/**
 * Vercel Deployment/Smoke Guards.
 *
 * Local `npm run build` proves the code is correct. Vercel must not repeat that
 * proof. It only checks that the hosted environment can install the lockfile,
 * compile the already-reviewed tree, and produce a function payload Vercel can
 * actually upload and run.
 */
export const VERCEL_BUILD_SCRIPT = "build:vercel";
export const VERCEL_BUILD_COMMAND = `npm run ${VERCEL_BUILD_SCRIPT}`;
export const VERCEL_INSTALL_COMMAND = "npm ci";
export const ALLOWED_VERCEL_NPM_SCRIPTS = ["vercel:function-size:check"] as const;

export const FORBIDDEN_VERCEL_PROOF_COMMANDS = [
  "architecture:check",
  "typecheck",
  "lint",
  "runtime:compatibility:check",
  "test:runtime-compatibility",
  "db:ensure",
  "db:schema:sync",
  "services:sync",
  "catalog:validate",
  "test:compositions",
] as const;

const APP_RUNTIME_KEYS = [
  "ASOL_SESSION_SIGNING_SECRET",
  "ASOL_NOTIFICATION_GRANT_SECRET",
  "WEB_PUSH_VAPID_PRIVATE_KEY",
  "NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL",
  "NEXT_PUBLIC_ASOL_PRODUCTS_URL",
  "NEXT_PUBLIC_ASOL_ORDERS_URL",
  "NEXT_PUBLIC_ASOL_PROFILES_URL",
] as const;

export const HOSTED_RUNTIME_ENV_KEYS: readonly string[] = [
  ...new Set([
    ...GOVA_RUNTIME_REQUIRED_ENV_KEYS,
    ...APP_RUNTIME_KEYS,
    ...Object.values(ACCOUNT_DECLARATIONS).flatMap((declaration) => [...declaration.requiredEnv]),
  ]),
];

export interface HostEnvironmentReport {
  nodeVersion: string;
  nodeCompatible: boolean;
}

export function nodeMajor(version: string): number {
  return Number(version.replace(/^v/, "").split(".")[0]);
}

export function isCompatibleNodeVersion(version: string, enginesNode = readEnginesNode()): boolean {
  const major = nodeMajor(version);
  if (!Number.isFinite(major)) return false;
  if (enginesNode.includes(">=22") && enginesNode.includes("<25")) {
    return major >= 22 && major < 25;
  }
  return major >= 22 && major < 25;
}

export function readEnginesNode(root = process.cwd()): string {
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    engines?: { node?: string };
  };
  return manifest.engines?.node ?? ">=22 <25";
}

export function missingHostedRuntimeEnvKeys(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return HOSTED_RUNTIME_ENV_KEYS.filter((key) => !env[key]?.trim());
}

export function assertVercelHostEnvironment(
  nodeVersion = process.version,
  enginesNode = readEnginesNode(),
): HostEnvironmentReport {
  const nodeCompatible = isCompatibleNodeVersion(nodeVersion, enginesNode);
  if (!nodeCompatible) {
    throw new Error(
      `Vercel host Node ${nodeVersion} is outside the project engines range ${enginesNode}.`,
    );
  }
  return { nodeVersion, nodeCompatible };
}

/**
 * Reports missing key *names* only. Never logs values, tokens, or connection strings.
 */
export function assertVercelRuntimeEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const missing = missingHostedRuntimeEnvKeys(env);
  if (missing.length === 0) return;
  throw new Error(
    `Vercel hosted runtime is missing required environment keys: ${missing.join(", ")}. Configure them on the Vercel project. Do not invent values.`,
  );
}

export function vercelBuildSourceMentionsForbiddenProof(source: string): string[] {
  return FORBIDDEN_VERCEL_PROOF_COMMANDS.filter((command) => source.includes(command));
}

export function vercelBuildNpmScriptViolations(source: string): string[] {
  const allowed = new Set<string>(ALLOWED_VERCEL_NPM_SCRIPTS);
  return [...source.matchAll(/runNpmScript\(\s*["']([^"']+)["']\s*\)/g)]
    .map((match) => match[1]!)
    .filter((script) => !allowed.has(script));
}
