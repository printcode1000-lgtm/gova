/**
 * Secret-bearing paths and values the control plane must never read out, patch,
 * or echo back to a cloud agent.
 *
 * Local jobs run as the machine user and can technically open these files. The
 * control plane refuses on their behalf: inspection returns metadata only, and
 * mutation refuses the patch outright.
 */

const SECRET_PATH_PREFIXES = [
  ".env",
  ".secret-archive/",
  ".ota/private-key",
  "config/secret-archive",
  ".vercel/",
  "fastlane/.env",
] as const;

const SECRET_PATH_SUFFIXES = [".pem", ".p8", ".key", ".jks", ".keystore", ".p12"] as const;

const SECRET_PATH_EXACT = [
  ".env",
  "android/local.properties",
  "android/app/google-services.json",
  "ios/App/App/GoogleService-Info.plist",
] as const;

/** Patch headers touching these prefixes are rejected before `git apply`. */
export const PATCH_FORBIDDEN_PREFIXES = [
  ".env",
  ".secret-archive",
  ".ota/private-key",
  "config/secret-archive",
  ".vercel/",
  "fastlane/.env",
] as const;

export function isSecretPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  if ((SECRET_PATH_EXACT as readonly string[]).includes(normalized)) return true;
  if (SECRET_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix))) return true;
  return SECRET_PATH_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

/** Files changed by a patch, taken from its `diff --git` headers. */
export function patchTargetPaths(patchText: string): string[] {
  const paths = new Set<string>();
  for (const match of patchText.matchAll(/^diff --git a\/(\S+) b\/(\S+)\s*$/gm)) {
    paths.add(match[1]!);
    paths.add(match[2]!);
  }
  return [...paths];
}

export function patchSecretViolations(patchText: string): string[] {
  return patchTargetPaths(patchText).filter((candidate) =>
    PATCH_FORBIDDEN_PREFIXES.some((prefix) => candidate === prefix || candidate.startsWith(prefix)),
  );
}

/**
 * Values that look like credentials. Used to keep dispatch requests, branch
 * names, and coordination messages free of secret material.
 */
const SECRET_VALUE_PATTERNS: RegExp[] = [
  /gh[pousr]_[A-Za-z0-9]{16,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /\b(?:secret|token|password|passwd|api[_-]?key)\s*[:=]\s*\S{8,}/i,
];

export function looksLikeSecretValue(value: string): boolean {
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}
