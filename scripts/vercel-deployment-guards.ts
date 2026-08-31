import { readFileSync } from "node:fs";
import path from "node:path";

import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";

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

/**
 * Environment ownership is per runtime, never a union.
 *
 * This used to be one `HOSTED_RUNTIME_ENV_KEYS` list: every account's
 * requirements merged together, so gova's build failed unless the gova project
 * held the notification provider keys, the OTA R2 credentials, and every
 * shard's database token — secrets a frontend has no code to use, demanded of it
 * because some other deployment needs them. A guard that cannot say which
 * runtime it is checking cannot enforce isolation; it can only enforce that
 * every project holds everything.
 */
export type RuntimeAccountName = keyof typeof ACCOUNT_DECLARATIONS;

export const DEFAULT_RUNTIME_ACCOUNT: RuntimeAccountName = 'gova';

export function runtimeAccountFromEnv(env: NodeJS.ProcessEnv = process.env): RuntimeAccountName {
  const declared = env.ASOL_RUNTIME_ACCOUNT?.trim();
  if (!declared) return DEFAULT_RUNTIME_ACCOUNT;
  if (!(declared in ACCOUNT_DECLARATIONS)) {
    throw new Error(
      `ASOL_RUNTIME_ACCOUNT="${declared}" is not a declared account. ` +
        `Expected one of: ${Object.keys(ACCOUNT_DECLARATIONS).join(', ')}.`,
    );
  }
  return declared as RuntimeAccountName;
}

/** Exactly what this runtime declares, and nothing another runtime declares. */
export function hostedRuntimeEnvKeys(
  runtime: RuntimeAccountName = DEFAULT_RUNTIME_ACCOUNT,
): readonly string[] {
  return [...ACCOUNT_DECLARATIONS[runtime]!.requiredEnv];
}

/**
 * Secret families no runtime may hold unless it declares them.
 *
 * Grouped by family rather than listed key by key: the point is to catch a
 * project that was handed someone else's category of credential, and a new key
 * inside a family it already should not have would otherwise slip past.
 */
const SECRET_FAMILIES: readonly { family: string; test: (name: string) => boolean }[] = [
  { family: 'database', test: (name) => /_DATABASE_URL$|_AUTH_TOKEN$|^TURSO_/.test(name) },
  { family: 'object storage', test: (name) => /^R2_|_R2_|^AWS_/.test(name) },
  { family: 'session/grant signing', test: (name) => /SIGNING_SECRET$|GRANT_SECRET$/.test(name) },
  { family: 'push provider', test: (name) => /^WEB_PUSH_|^FIREBASE_|MOBILE_PUSH_/.test(name) },
  { family: 'mail', test: (name) => /GMAIL_|^SMTP_/.test(name) },
  { family: 'deployment credential', test: (name) => /^VERCEL_|^GITHUB_TOKEN$/.test(name) },
  { family: 'store publishing', test: (name) => /^GOOGLE_PLAY_|^APP_STORE_CONNECT_/.test(name) },
];

export interface ForeignEnvFinding {
  name: string;
  family: string;
  declaredBy: readonly string[];
}

/**
 * Names-only report of secrets present in a runtime that it does not declare.
 *
 * Never reads a value, so the report can be pasted into an issue. `declaredBy`
 * names the accounts that do declare the key, which is usually enough to say
 * where it was copied from.
 */
export function foreignRuntimeEnvNames(
  runtime: RuntimeAccountName = DEFAULT_RUNTIME_ACCOUNT,
  env: NodeJS.ProcessEnv = process.env,
): ForeignEnvFinding[] {
  const declaration = ACCOUNT_DECLARATIONS[runtime]!;
  const own = new Set<string>([...declaration.requiredEnv, ...declaration.optionalEnv]);
  const findings: ForeignEnvFinding[] = [];

  for (const name of Object.keys(env).sort()) {
    if (own.has(name)) continue;
    const family = SECRET_FAMILIES.find((entry) => entry.test(name))?.family;
    if (!family) continue;
    const declaredBy = Object.entries(ACCOUNT_DECLARATIONS)
      .filter(([, other]) =>
        (other.requiredEnv as readonly string[]).includes(name) ||
        (other.optionalEnv as readonly string[]).includes(name))
      .map(([accountName]) => accountName);
    findings.push({ name, family, declaredBy });
  }
  return findings;
}

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
  runtime: RuntimeAccountName = DEFAULT_RUNTIME_ACCOUNT,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return hostedRuntimeEnvKeys(runtime).filter((key) => !env[key]?.trim());
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
  runtime: RuntimeAccountName = DEFAULT_RUNTIME_ACCOUNT,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const missing = missingHostedRuntimeEnvKeys(runtime, env);
  if (missing.length === 0) return;
  throw new Error(
    `Vercel hosted runtime "${runtime}" is missing required environment keys: ${missing.join(", ")}. Configure them on the Vercel project. Do not invent values.`,
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
