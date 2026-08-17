import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import {
  buildLocalDevelopmentEnvironment,
  readLocalDevelopmentRuntimeFromProcess,
} from "@asol/dev-core/server";

import type {
  GooglePlayConsoleConfigStatus,
  GooglePlayConsoleEnvironment,
} from "./types";

const DEFAULT_PACKAGE_NAME = "hgh.asol.app";
const DEFAULT_KEY_FILE = "assets/google-play/asole-73f1f-dc494a4b5159.json";

function readRuntimeInput() {
  return readLocalDevelopmentRuntimeFromProcess(getServerRuntimeContext());
}

export function googlePlayConsoleEnvironment(): GooglePlayConsoleEnvironment {
  return buildLocalDevelopmentEnvironment(readRuntimeInput());
}

export function assertGooglePlayConsoleAllowed(): void {
  if (!googlePlayConsoleEnvironment().allowed) {
    throw new Error("googlePlayConsoleDevelopmentOnly");
  }
}

export function resolveGooglePlayConsoleConfig(): Pick<
  GooglePlayConsoleConfigStatus,
  "packageName" | "keyFilePath"
> {
  return {
    packageName:
      process.env.ASOL_ANDROID_PACKAGE_NAME?.trim() ||
      process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() ||
      DEFAULT_PACKAGE_NAME,
    keyFilePath: path.resolve(
      /* turbopackIgnore: true */
      process.cwd(),
      process.env.GOOGLE_PLAY_JSON_KEY_FILE?.trim() || DEFAULT_KEY_FILE,
    ),
  };
}

export function resolveGooglePlayServiceAccountEnvironment() {
  return {
    jsonBase64: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64?.trim() ?? "",
    type: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_TYPE || "service_account",
    projectId: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PROJECT_ID,
    privateKeyId: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    privateKeyBase64:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64?.trim() ?? "",
    clientEmail:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim() ||
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL?.trim() ||
      "",
    clientId:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_ID ||
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_UNIQUE_ID,
    authUri:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_AUTH_URI ||
      "https://accounts.google.com/o/oauth2/auth",
    tokenUri:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_TOKEN_URI ||
      "https://oauth2.googleapis.com/token",
    authProviderX509CertUrl:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL ||
      "https://www.googleapis.com/oauth2/v1/certs",
    clientX509CertUrl:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
    universeDomain:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || "googleapis.com",
  };
}

/**
 * Node flags that attach an inspector to every child process. The dev server is
 * often started under a debugger, and `next build` inherits those flags: its
 * build worker then dies while prerendering (`useContext of null`) even though
 * the very same command succeeds from a plain terminal. Release jobs therefore
 * run with a debugger-free environment.
 */
const INSPECTOR_FLAG = /(^|\s)--inspect(-brk|-port|-publish-uid)?(=\S*)?(?=\s|$)/g;
const INSPECTOR_BOOTLOADER = /(^|\s)--require\s+\S*js-debug\S*(?=\s|$)/g;

export function withoutDebuggerEnvironment(
  source: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const env = { ...source };
  delete env.VSCODE_INSPECTOR_OPTIONS;
  delete env.NODE_INSPECT_RESUME_ON_START;
  const options = env.NODE_OPTIONS
    ?.replace(INSPECTOR_BOOTLOADER, " ")
    .replace(INSPECTOR_FLAG, " ")
    .trim();
  if (options) env.NODE_OPTIONS = options;
  else delete env.NODE_OPTIONS;
  return env;
}

/**
 * Environment for a spawned release command.
 *
 * The parent here is the running dev server, so its own runtime variables leak
 * into every job. Two of them break `next build` even though the same command
 * succeeds from a plain terminal:
 *
 * - `NODE_ENV=development` makes Next emit "non-standard NODE_ENV" and mix
 *   development React into a production build; prerendering `/_global-error`
 *   then dies with `Cannot read properties of null (reading 'useContext')`.
 * - `__NEXT_PRIVATE_*` point the child at the dev server's own build state.
 *
 * Both are dropped so each script starts from the same state a fresh terminal
 * would give it. Scripts that need a specific NODE_ENV set it themselves.
 */
export function googlePlayFastlaneEnvironment(): NodeJS.ProcessEnv {
  const source = withoutDebuggerEnvironment(process.env);
  const env: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(source)) {
    if (name === "NODE_ENV" || name.startsWith("__NEXT_PRIVATE_")) continue;
    env[name] = value;
  }
  return env as NodeJS.ProcessEnv;
}

export function resolveNpmCliPath(): string {
  return (
    process.env.npm_execpath?.trim() ||
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")
  );
}

export function releaseCommandEnvironment(names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, process.env[name]?.trim() ?? ""]));
}

/**
 * Non-environment sources a requirement may also be satisfied by, mirroring the
 * fallbacks the scripts themselves use (see packages/ota-core/src/publishing/config/ota-config.ts).
 * Lives here because this module owns environment access for release commands.
 */
const REQUIREMENT_FILE_FALLBACKS: Record<string, string> = {
  ASOL_OTA_SIGNING_PRIVATE_KEY: path.join(".ota", "private-key.pem"),
};

/** A requirement may list interchangeable variables separated by a pipe. */
export function releaseRequirementSatisfied(requirement: string): boolean {
  const names = requirement.split("|");
  if (names.some((name) => process.env[name]?.trim())) return true;
  return names.some((name) => {
    const fallback = REQUIREMENT_FILE_FALLBACKS[name];
    return (
      Boolean(fallback) &&
      existsSync(/* turbopackIgnore: true */ path.resolve(/* turbopackIgnore: true */ fallback))
    );
  });
}
