import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ok, err, type Result } from "../../errors/result";
import { OtaCoreError } from "../../errors/ota-core-error";
import { readCurrentVersions } from "../versioning/version-reader";
import {
  nativeVersionFromBaseline,
  nextNativePatchVersion,
} from "../../domain/versioning/native-version";
import { compareOtaVersions } from "../../domain/versioning/version-ordering";

export const NATIVE_SURFACE_PATTERNS: RegExp[] = [
  /^android\//,
  /^ios\//,
  /^packages\/native-core\/android\//,
  /^packages\/native-core\/ios\//,
  /^packages\/native-core\/src\/adapters\//,
  /^capacitor\.config\.ts$/,
];

const NOT_COMPILED_PATTERN = /^(?:fastlane|assets)\//;
const BUILD_TIME_CONFIG_PATTERN = /^platform\//;
const NON_COMPILED_CAPACITOR_DEPENDENCIES = new Set([
  "@capacitor/cli",
  "@capacitor/core",
]);
const NATIVE_IMPORT_PATTERN =
  /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]@(?:capacitor|capacitor-mlkit|capawesome|capgo)\//;
const NON_SHIPPED_PATTERN = /(?:^|\/)(?:tests|__tests__)\//;

export const NATIVE_CONTRACT_FILES: ReadonlyMap<string, string> = new Map([
  [
    "packages/native-core/src/capabilities/shell-capabilities.ts",
    "Declares what the compiled shell contains; the OTA compatibility decision reads it.",
  ],
  [
    "packages/native-core/src/capabilities/capability-keys.ts",
    "The capability vocabulary shared by manifests, shells, and published bundles.",
  ],
  [
    "packages/native-core/src/capabilities/capability-registry.ts",
    "Maps capability keys onto the plugin names registered by the shell.",
  ],
  [
    "packages/native-core/src/domain/notifications/channel-constants.ts",
    "Android channel ids and DEFAULT_CHANNEL_SOUND must match res/raw and strings.xml.",
  ],
  [
    "packages/native-core/src/domain/permissions/permission-kinds.ts",
    "PermissionKinds must match the OS strings declared in AndroidManifest.xml and Info.plist.",
  ],
]);

export function isUndeclarableNativeChange(relativePath: string): boolean {
  return (
    /^(?:android|ios|packages\/native-core\/android|packages\/native-core\/ios)\//.test(
      relativePath,
    ) || relativePath === "capacitor.config.ts"
  );
}

function isCompiledNativeDependency(name: string): boolean {
  if (NON_COMPILED_CAPACITOR_DEPENDENCIES.has(name)) return false;
  return (
    /^@capacitor\//.test(name) ||
    /^@(?:capacitor-community|capacitor-mlkit|capawesome|capgo)\//.test(name) ||
    /^cordova-plugin-/.test(name)
  );
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

export function resolveNativeBaseline(): string {
  const override = process.env.ASOL_OTA_NATIVE_BASELINE?.trim();
  if (override) return override;

  const tag = git("git describe --tags --abbrev=0 --match native-v*");
  return tag || "";
}

export function isNativeSurface(
  relativePath: string,
  readWorkingTree: (file: string) => string | null,
  readBaseline: (file: string) => string | null = () => null,
): boolean {
  if (NATIVE_SURFACE_PATTERNS.some((pattern) => pattern.test(relativePath))) {
    return true;
  }
  if (NOT_COMPILED_PATTERN.test(relativePath)) return false;
  const byContent =
    relativePath.startsWith("src/") ||
    relativePath.startsWith("packages/") ||
    BUILD_TIME_CONFIG_PATTERN.test(relativePath);
  if (!byContent) return false;
  if (NON_SHIPPED_PATTERN.test(relativePath)) return false;
  if (NATIVE_CONTRACT_FILES.has(relativePath)) return true;
  if (!/\.[cm]?[jt]sx?$/.test(relativePath)) return false;

  const content = readWorkingTree(relativePath) ?? readBaseline(relativePath);
  if (content === null) return false;
  return NATIVE_IMPORT_PATTERN.test(content);
}

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

  for (const [key, entry] of Object.entries(parsed.packages ?? {})) {
    const name = key.startsWith("node_modules/")
      ? key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length)
      : "";
    if (name && isCompiledNativeDependency(name) && entry?.version) {
      versions[name] = entry.version;
    }
  }
  for (const [name, entry] of Object.entries(parsed.dependencies ?? {})) {
    if (isCompiledNativeDependency(name) && entry?.version) {
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
    if (isCompiledNativeDependency(name)) ranges[name] = range;
  }
  return ranges;
}

function changedNativeDependencies(baseline: string, root: string): string[] {
  const readWorkingFile = (file: string): string => {
    const absolute = path.join(root, file);
    return existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
  };

  const before = {
    ...declaredNativeRanges(git(`git show ${baseline}:package.json`)),
    ...declaredNativeRanges(git(`git show ${baseline}:packages/native-core/package.json`)),
  };
  const after = {
    ...declaredNativeRanges(readWorkingFile("package.json")),
    ...declaredNativeRanges(readWorkingFile("packages/native-core/package.json")),
  };

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

export interface NativeCompatibilityReport {
  changedPaths: string[];
  changedNativeDependencies: string[];
  baselineMissing: boolean;
  requiresStoreRelease: boolean;
}

export function inspectNativeCompatibility(
  baseline: string,
  root: string = process.cwd(),
): NativeCompatibilityReport {
  if (!baseline) {
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
    ...lines(git(`git diff --name-only ${baseline}`)),
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

export function undeclarableNativeChanges(
  report: Pick<NativeCompatibilityReport, "changedPaths" | "changedNativeDependencies">,
): string[] {
  return [
    ...report.changedPaths.filter(isUndeclarableNativeChange),
    ...report.changedNativeDependencies.map((dep) => `native dependency: ${dep}`),
  ];
}

export type GateDecision =
  | { state: "open"; nativeVersion: string; baseline: string }
  | {
      state: "blocked";
      nativeVersion: string;
      baseline: string;
      changedPaths: string[];
      changedNativeDependencies: string[];
      reason: string;
    }
  | { state: "unprovable"; reason: string };

export async function evaluateReleaseGate(
  declaredMinimumNativeVersion?: string,
  root = process.cwd(),
): Promise<Result<GateDecision, OtaCoreError>> {
  try {
    const versionsRes = await readCurrentVersions(root);
    if (!versionsRes.ok) return versionsRes;
    const { nativeVersion } = versionsRes.value;

    const baseline = resolveNativeBaseline();
    if (!baseline) {
      return ok({
        state: "unprovable",
        reason: "No native baseline tag (native-v*) found; cannot prove compatibility.",
      });
    }

    const report = inspectNativeCompatibility(baseline, root);
    if (report.baselineMissing) {
      return ok({
        state: "unprovable",
        reason: `Baseline '${baseline}' could not be resolved in git history.`,
      });
    }

    const baselineVersion = nativeVersionFromBaseline(baseline);
    const undeclarable = undeclarableNativeChanges(report);
    const hasCompiledChanges = undeclarable.length > 0;

    if (hasCompiledChanges) {
      if (
        !declaredMinimumNativeVersion ||
        !baselineVersion ||
        compareOtaVersions(declaredMinimumNativeVersion, baselineVersion) <= 0
      ) {
        const nextPatch = baselineVersion ? nextNativePatchVersion(baselineVersion) : "x.y.z";
        const reason =
          `compiled native changes require a newer shell (e.g. --minimum-native-version=${nextPatch}):\n` +
          undeclarable.map((p) => `  - ${p}`).join("\n");

        return ok({
          state: "blocked",
          nativeVersion,
          baseline,
          changedPaths: report.changedPaths,
          changedNativeDependencies: report.changedNativeDependencies,
          reason,
        });
      }
    }

    return ok({
      state: "open",
      nativeVersion,
      baseline,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return err(
      OtaCoreError.internal(`Failed to evaluate release gate: ${msg}`, error),
    );
  }
}
