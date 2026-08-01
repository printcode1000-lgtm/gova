import { execSync } from "node:child_process";

/**
 * OTA native-compatibility gate.
 *
 * The golden rule: **OTA ships UI and logic that run inside the native
 * capabilities already installed on the device. Any new device capability is a
 * store release, never an OTA.**
 *
 * A web bundle that calls a Capacitor plugin, permission, or intent filter the
 * installed shell does not contain will not crash — the Native Platform layer
 * degrades it to an `Unavailable` error. That silent degradation is worse than
 * a crash because nobody notices it. This gate refuses to publish such a
 * bundle unless the publisher raises `minimumNativeVersion` deliberately.
 */

/** Paths whose change means the native shell itself changed. */
export const NATIVE_SURFACE_PATTERNS: RegExp[] = [
  /^android\//,
  /^ios\//,
  /^capacitor\.config\.ts$/,
  /^platform\//,
  /^assets\//,
  /^fastlane\//,
  // The layer that binds the web bundle to native plugins.
  /^src\/native-platform\//,
];

/** Dependency names that ship native code with a store build. */
const NATIVE_DEPENDENCY_PATTERN =
  /^@(?:capacitor|capacitor-mlkit|capawesome|capgo)\//;

export interface NativeCompatibilityReport {
  /** Native surfaces touched since the reference point. */
  changedPaths: string[];
  /** Capacitor dependencies added or version-changed. */
  changedNativeDependencies: string[];
  /** True when a store release is required before this bundle is safe. */
  requiresStoreRelease: boolean;
}

function git(command: string): string {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/**
 * Resolve the commit the last native release was built from.
 *
 * Preference order: an explicit override, then the newest `native-v*` tag.
 * Returns an empty string when no reference exists, which the caller treats
 * as "cannot prove compatibility".
 */
export function resolveNativeBaseline(): string {
  const override = process.env.ASOL_OTA_NATIVE_BASELINE?.trim();
  if (override) return override;

  const tag = git("git describe --tags --abbrev=0 --match native-v*");
  return tag || "";
}

/** Capacitor dependencies whose presence or version changed since `baseline`. */
function changedNativeDependencies(baseline: string): string[] {
  const previous = git(`git show ${baseline}:package.json`);
  if (!previous) return [];

  let before: Record<string, string> = {};
  try {
    const parsed = JSON.parse(previous) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    before = { ...parsed.dependencies, ...parsed.devDependencies };
  } catch {
    return [];
  }

  const current = JSON.parse(
    git("git show HEAD:package.json") || "{}",
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const after = { ...current.dependencies, ...current.devDependencies };

  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...names]
    .filter((name) => NATIVE_DEPENDENCY_PATTERN.test(name))
    .filter((name) => before[name] !== after[name])
    .sort();
}

/**
 * Compare the working tree against the last native release.
 *
 * @param baseline Commit or tag the installed native shell was built from.
 */
export function inspectNativeCompatibility(
  baseline: string,
): NativeCompatibilityReport {
  if (!baseline) {
    return {
      changedPaths: [],
      changedNativeDependencies: [],
      requiresStoreRelease: false,
    };
  }

  const diff = git(`git diff --name-only ${baseline} HEAD`);
  const changedPaths = diff
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter(Boolean)
    .filter((file) => NATIVE_SURFACE_PATTERNS.some((pattern) => pattern.test(file)))
    .sort();

  const dependencies = changedNativeDependencies(baseline);

  return {
    changedPaths,
    changedNativeDependencies: dependencies,
    requiresStoreRelease: changedPaths.length > 0 || dependencies.length > 0,
  };
}

export function formatReport(
  report: NativeCompatibilityReport,
  baseline: string,
): string {
  const lines = [
    `Native baseline: ${baseline || "(none)"}`,
    `Native surfaces changed: ${report.changedPaths.length}`,
    ...report.changedPaths.slice(0, 20).map((file) => `  - ${file}`),
  ];
  if (report.changedPaths.length > 20) {
    lines.push(`  … and ${report.changedPaths.length - 20} more`);
  }
  if (report.changedNativeDependencies.length > 0) {
    lines.push(
      `Native dependencies changed: ${report.changedNativeDependencies.join(", ")}`,
    );
  }
  return lines.join("\n");
}
