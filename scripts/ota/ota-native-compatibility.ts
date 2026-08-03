import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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
 *
 * Two properties make the gate trustworthy:
 *
 * 1. It inspects the **working tree**, because that is what the static build
 *    compiles. Comparing commits would let an uncommitted native edit ship.
 * 2. Inside `src/`, a file is a native surface because of **what it contains**,
 *    not where it lives. Any file that binds to a native plugin is a native
 *    surface wherever it sits; a pure-TypeScript facade under
 *    `src/native-platform/` is not.
 */

/**
 * Paths outside `src/` whose change always means the native shell changed.
 * These are compiled into the store binary and cannot travel over OTA.
 */
export const NATIVE_SURFACE_PATTERNS: RegExp[] = [
  /^android\//,
  /^ios\//,
  /^capacitor\.config\.ts$/,
  /^platform\//,
  /^assets\//,
  /^fastlane\//,
];

/** Dependency names that ship native code with a store build. */
const NATIVE_DEPENDENCY_PATTERN =
  /^@(?:capacitor|capacitor-mlkit|capawesome|capgo)\//;

/**
 * Importing one of these packages is what binds a web file to native code.
 * Both static `from "@capacitor/x"` and dynamic `import("@capacitor/x")`
 * forms count; the lazy-plugin loader uses the dynamic one.
 */
const NATIVE_IMPORT_PATTERN =
  /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]@(?:capacitor|capacitor-mlkit|capawesome|capgo)\//;

/**
 * Files under `src/` that are a native contract without importing a plugin.
 *
 * Each entry must name the native artifact it is coupled to. Do not add a file
 * here to be safe — an over-broad gate pushes publishers to bypass it, which
 * costs more than the risk it removes.
 */
export const NATIVE_CONTRACT_FILES: ReadonlyMap<string, string> = new Map([
  [
    "src/native-platform/capabilities/shell-capabilities.ts",
    "Declares what the compiled shell contains; the OTA compatibility decision reads it.",
  ],
  [
    "src/native-platform/capabilities/capability-keys.ts",
    "The capability vocabulary shared by manifests, shells, and published bundles.",
  ],
  [
    "src/native-platform/capabilities/capability-registry.ts",
    "Maps capability keys onto the plugin names registered by the shell.",
  ],
  [
    "src/native-platform/notifications/types.ts",
    "Android channel ids and DEFAULT_CHANNEL_SOUND must match res/raw and strings.xml.",
  ],
  [
    "src/native-platform/permissions/types.ts",
    "PermissionKinds must match the OS strings declared in AndroidManifest.xml and Info.plist.",
  ],
]);

/** Subtrees under `src/` that never reach a device. */
const NON_SHIPPED_PATTERN = /(?:^|\/)(?:tests|__tests__)\//;

export interface NativeCompatibilityReport {
  /** Native surfaces touched since the reference point. */
  changedPaths: string[];
  /** Capacitor dependencies added, removed, or version-changed. */
  changedNativeDependencies: string[];
  /** True when no baseline could be resolved, so nothing can be proven. */
  baselineMissing: boolean;
  /** True when a store release is required before this bundle is safe. */
  requiresStoreRelease: boolean;
}

function git(command: string): string {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

function lines(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter(Boolean);
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

/**
 * Decide whether one changed path is a native surface.
 *
 * @param relativePath Repository-relative, forward-slashed path.
 * @param readWorkingTree Reads the current content of a path, or `null` when it
 *        no longer exists. Injected so the classifier stays testable.
 * @param readBaseline Reads the baseline content of a path, used to classify a
 *        file that the change deleted.
 */
export function isNativeSurface(
  relativePath: string,
  readWorkingTree: (file: string) => string | null,
  readBaseline: (file: string) => string | null = () => null,
): boolean {
  if (NATIVE_SURFACE_PATTERNS.some((pattern) => pattern.test(relativePath))) {
    return true;
  }
  if (!relativePath.startsWith("src/")) return false;
  if (NON_SHIPPED_PATTERN.test(relativePath)) return false;
  if (NATIVE_CONTRACT_FILES.has(relativePath)) return true;
  if (!/\.[cm]?[jt]sx?$/.test(relativePath)) return false;

  // A deleted binding is still a binding change: classify it from the version
  // the installed shell was built against.
  const content = readWorkingTree(relativePath) ?? readBaseline(relativePath);
  if (content === null) return false;
  return NATIVE_IMPORT_PATTERN.test(content);
}

/** Native plugin versions recorded in a lockfile, keyed by package name. */
function lockedNativeVersions(lockfile: string): Record<string, string> {
  const versions: Record<string, string> = {};
  if (!lockfile) return versions;

  let parsed: {
    packages?: Record<string, { version?: string }>;
    dependencies?: Record<string, { version?: string }>;
  };
  try {
    parsed = JSON.parse(lockfile) as typeof parsed;
  } catch {
    return versions;
  }

  // npm lockfile v2/v3 keys entries by install path.
  for (const [key, entry] of Object.entries(parsed.packages ?? {})) {
    const name = key.startsWith("node_modules/")
      ? key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length)
      : "";
    if (name && NATIVE_DEPENDENCY_PATTERN.test(name) && entry?.version) {
      versions[name] = entry.version;
    }
  }
  // npm lockfile v1 keys entries by package name.
  for (const [name, entry] of Object.entries(parsed.dependencies ?? {})) {
    if (NATIVE_DEPENDENCY_PATTERN.test(name) && entry?.version) {
      versions[name] ??= entry.version;
    }
  }
  return versions;
}

function declaredNativeRanges(manifest: string): Record<string, string> {
  const ranges: Record<string, string> = {};
  if (!manifest) return ranges;

  let parsed: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    parsed = JSON.parse(manifest) as typeof parsed;
  } catch {
    return ranges;
  }

  for (const [name, range] of Object.entries({
    ...parsed.dependencies,
    ...parsed.devDependencies,
  })) {
    if (NATIVE_DEPENDENCY_PATTERN.test(name)) ranges[name] = range;
  }
  return ranges;
}

/**
 * Capacitor dependencies whose declared range or installed version changed.
 *
 * Both halves matter: `package.json` catches an added or removed plugin, and
 * `package-lock.json` catches a resolved-version drift inside an unchanged
 * semver range, which ships different native code from the same manifest.
 */
function changedNativeDependencies(baseline: string, root: string): string[] {
  const readWorkingFile = (file: string): string => {
    const absolute = path.join(root, file);
    return existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
  };

  const before = {
    ...declaredNativeRanges(git(`git show ${baseline}:package.json`)),
  };
  const after = { ...declaredNativeRanges(readWorkingFile("package.json")) };

  const beforeLocked = lockedNativeVersions(
    git(`git show ${baseline}:package-lock.json`),
  );
  const afterLocked = lockedNativeVersions(readWorkingFile("package-lock.json"));

  const names = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
    ...Object.keys(beforeLocked),
    ...Object.keys(afterLocked),
  ]);

  return [...names]
    .filter(
      (name) =>
        before[name] !== after[name] ||
        beforeLocked[name] !== afterLocked[name],
    )
    .sort();
}

/**
 * Compare the **working tree** against the last native release.
 *
 * The build compiles the working tree, so the gate must inspect the working
 * tree. `git diff <baseline>` already spans committed and uncommitted tracked
 * changes; untracked files are collected separately.
 *
 * @param baseline Commit or tag the installed native shell was built from.
 * @param root Repository root used to read working-tree content.
 */
export function inspectNativeCompatibility(
  baseline: string,
  root: string = process.cwd(),
): NativeCompatibilityReport {
  if (!baseline) {
    // Fail closed: without a reference point nothing can be proven compatible.
    return {
      changedPaths: [],
      changedNativeDependencies: [],
      baselineMissing: true,
      requiresStoreRelease: true,
    };
  }

  const readWorkingTree = (file: string): string | null => {
    const absolute = path.join(root, file);
    if (!existsSync(absolute)) return null;
    try {
      return readFileSync(absolute, "utf8");
    } catch {
      return null;
    }
  };
  const readBaseline = (file: string): string | null =>
    git(`git show ${baseline}:${file}`) || null;

  const candidates = new Set([
    // Baseline against the working tree: committed *and* uncommitted edits.
    ...lines(git(`git diff --name-only ${baseline}`)),
    // Files that exist only in the working tree.
    ...lines(git("git ls-files --others --exclude-standard")),
  ]);

  const changedPaths = [...candidates]
    .filter((file) => isNativeSurface(file, readWorkingTree, readBaseline))
    .sort();

  const dependencies = changedNativeDependencies(baseline, root);

  return {
    changedPaths,
    changedNativeDependencies: dependencies,
    baselineMissing: false,
    requiresStoreRelease:
      changedPaths.length > 0 || dependencies.length > 0,
  };
}

export function formatReport(
  report: NativeCompatibilityReport,
  baseline: string,
): string {
  const lines = [
    `Native baseline: ${baseline || "(none)"}`,
    "Compared: working tree (committed, uncommitted, and untracked)",
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
