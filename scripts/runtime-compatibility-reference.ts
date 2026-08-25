import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCHEMA_VERSION = 1;
const REFERENCE_PATH = path.join("config", "runtime-compatibility-reference.json");
const CONFIRM_WRITE_FLAG = "--confirm-reviewed-compatible-tree";

type JsonObject = Record<string, unknown>;

export interface RuntimeCompatibilityReference {
  schemaVersion: number;
  policy: "review-required";
  rootManifest: {
    packageManager: string;
    engines: Record<string, string>;
    workspaces: string[];
    declaredDependencies: Record<string, string>;
    declaredDevDependencies: Record<string, string>;
    overrides: JsonObject;
    allowScripts: Record<string, boolean>;
  };
  resolvedDirectDependencies: Record<string, string>;
  resolvedDirectDevDependencies: Record<string, string>;
  packageLockDigest: string;
  workspacePackages: Record<string, string>;
  services: Record<string, {
    packageManager: string;
    engines: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    lockDigest: string;
  }>;
  tools: {
    jdkMajor: number;
    gradleWrapper: string;
    androidGradlePlugin: string;
    googleServicesGradlePlugin: string;
    androidMinSdk: number;
    androidCompileSdk: number;
    androidTargetSdk: number;
    firebaseMessaging: string;
    vercelCli: string;
    drizzleKit: string;
    fastlane: string;
    gemLockDigest: string;
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonObject)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }
  return value;
}

function digestJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(sortValue(value))).digest("hex");
}

function digestText(value: string): string {
  return createHash("sha256").update(value.replace(/\r\n/g, "\n")).digest("hex");
}

function requireMatch(source: string, pattern: RegExp, label: string): string {
  const match = pattern.exec(source)?.[1];
  if (!match) throw new Error(`Runtime compatibility reference could not resolve ${label}.`);
  return match;
}

function requireNumber(source: string, pattern: RegExp, label: string): number {
  return Number(requireMatch(source, pattern, label));
}

function uniqueVersion(source: string, pattern: RegExp, label: string): string {
  const versions = new Set<string>();
  for (const match of source.matchAll(pattern)) {
    if (match[1]) versions.add(match[1]);
  }
  if (versions.size !== 1) {
    throw new Error(
      `Runtime compatibility reference expected exactly one ${label} version, found: ${[...versions].join(", ") || "none"}.`,
    );
  }
  return [...versions][0]!;
}

export function discoverPackageManifests(
  root: string,
  directory: "packages" | "services",
): Record<string, { name: string; version: string }> {
  const base = path.join(root, directory);
  if (!existsSync(base)) throw new Error(`Runtime compatibility directory is missing: ${directory}/`);
  const result: Record<string, { name: string; version: string }> = {};
  for (const entry of readdirSync(base, { withFileTypes: true }).filter((item) => item.isDirectory())) {
    const manifestPath = path.join(base, entry.name, "package.json");
    if (!existsSync(manifestPath)) {
      throw new Error(`${directory}/${entry.name}/ is missing package.json; unregistered directories are not allowed.`);
    }
    const manifest = readJson<{ name?: string; version?: string }>(manifestPath);
    if (!manifest.name || !manifest.version) {
      throw new Error(`${directory}/${entry.name}/package.json must declare name and version.`);
    }
    result[entry.name] = { name: manifest.name, version: manifest.version };
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function resolveDirectVersions(
  declared: Record<string, string>,
  lock: { packages?: Record<string, { version?: string }> },
  label: string,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const name of Object.keys(declared).sort()) {
    const version = lock.packages?.[`node_modules/${name}`]?.version;
    if (!version) throw new Error(`${label} ${name} is missing an exact version in package-lock.json.`);
    resolved[name] = version;
  }
  return resolved;
}

export function collectRuntimeCompatibilityReference(
  root = process.cwd(),
): RuntimeCompatibilityReference {
  const manifest = readJson<{
    packageManager?: string;
    engines?: Record<string, string>;
    workspaces?: string[];
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    overrides?: JsonObject;
    allowScripts?: Record<string, boolean>;
  }>(path.join(root, "package.json"));
  const lock = readJson<{ packages?: Record<string, { version?: string }> }>(
    path.join(root, "package-lock.json"),
  );
  const dependencies = manifest.dependencies ?? {};
  const devDependencies = manifest.devDependencies ?? {};
  const workspaceManifests = discoverPackageManifests(root, "packages");
  const serviceManifests = discoverPackageManifests(root, "services");

  const services: RuntimeCompatibilityReference["services"] = {};
  for (const serviceName of Object.keys(serviceManifests).sort()) {
    const serviceRoot = path.join(root, "services", serviceName);
    const serviceManifest = readJson<{
      packageManager?: string;
      engines?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }>(path.join(serviceRoot, "package.json"));
    const serviceLockPath = path.join(serviceRoot, "package-lock.json");
    if (!existsSync(serviceLockPath)) {
      throw new Error(`services/${serviceName}/package-lock.json is required by the compatibility reference.`);
    }
    services[serviceName] = {
      packageManager: serviceManifest.packageManager ?? "",
      engines: serviceManifest.engines ?? {},
      dependencies: serviceManifest.dependencies ?? {},
      devDependencies: serviceManifest.devDependencies ?? {},
      lockDigest: digestJson(readJson(serviceLockPath)),
    };
  }

  const workspacePackages = Object.fromEntries(
    Object.entries(workspaceManifests).map(([folder, value]) => [folder, `${value.name}@${value.version}`]),
  );
  const nativePreflight = readFileSync(
    path.join(root, "packages", "native-core", "scripts", "android-build-preflight.ts"),
    "utf8",
  );
  const gradleWrapper = readFileSync(
    path.join(root, "android", "gradle", "wrapper", "gradle-wrapper.properties"),
    "utf8",
  );
  const androidBuild = readFileSync(path.join(root, "android", "build.gradle"), "utf8");
  const androidVariables = readFileSync(path.join(root, "android", "variables.gradle"), "utf8");
  const vercelSource = readFileSync(
    path.join(root, "packages", "vercel-deploy-core", "src", "index.ts"),
    "utf8",
  );
  const drizzleSource = readFileSync(path.join(root, "scripts", "run-drizzle-kit.ts"), "utf8");
  const gemLock = readFileSync(path.join(root, "Gemfile.lock"), "utf8");

  return {
    schemaVersion: SCHEMA_VERSION,
    policy: "review-required",
    rootManifest: {
      packageManager: manifest.packageManager ?? "",
      engines: manifest.engines ?? {},
      workspaces: manifest.workspaces ?? [],
      declaredDependencies: dependencies,
      declaredDevDependencies: devDependencies,
      overrides: manifest.overrides ?? {},
      allowScripts: manifest.allowScripts ?? {},
    },
    resolvedDirectDependencies: resolveDirectVersions(dependencies, lock, "Dependency"),
    resolvedDirectDevDependencies: resolveDirectVersions(devDependencies, lock, "Dev dependency"),
    packageLockDigest: digestJson(lock),
    workspacePackages,
    services,
    tools: {
      jdkMajor: requireNumber(nativePreflight, /REQUIRED_JDK_MAJOR\s*=\s*(\d+)/, "JDK major"),
      gradleWrapper: requireMatch(gradleWrapper, /gradle-([\d.]+)-(?:all|bin)\.zip/, "Gradle wrapper"),
      androidGradlePlugin: requireMatch(androidBuild, /com\.android\.tools\.build:gradle:([\d.]+)/, "Android Gradle Plugin"),
      googleServicesGradlePlugin: requireMatch(androidBuild, /com\.google\.gms:google-services:([\d.]+)/, "Google Services Gradle plugin"),
      androidMinSdk: requireNumber(androidVariables, /minSdkVersion\s*=\s*(\d+)/, "Android minimum SDK"),
      androidCompileSdk: requireNumber(androidVariables, /compileSdkVersion\s*=\s*(\d+)/, "Android compile SDK"),
      androidTargetSdk: requireNumber(androidVariables, /targetSdkVersion\s*=\s*(\d+)/, "Android target SDK"),
      firebaseMessaging: requireMatch(androidVariables, /firebaseMessagingVersion\s*=\s*'([\d.]+)'/, "Firebase Messaging"),
      vercelCli: uniqueVersion(vercelSource, /PINNED_VERCEL_CLI = '([\d.]+)'/g, "Vercel CLI"),
      drizzleKit: uniqueVersion(drizzleSource, /drizzle-kit@([\d.]+)/g, "Drizzle Kit"),
      fastlane: requireMatch(gemLock, /^\s{4}fastlane \(([^)]+)\)$/m, "Fastlane"),
      gemLockDigest: digestText(gemLock),
    },
  };
}

function compareValues(expected: unknown, actual: unknown, location: string, errors: string[]): void {
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      errors.push(`${location} changed: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
    }
    return;
  }
  if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    const expectedObject = expected as JsonObject;
    const actualObject = actual as JsonObject;
    const keys = new Set([...Object.keys(expectedObject), ...Object.keys(actualObject)]);
    for (const key of [...keys].sort()) {
      if (!(key in expectedObject)) {
        errors.push(`${location}.${key} is new and has not been compatibility-reviewed.`);
      } else if (!(key in actualObject)) {
        errors.push(`${location}.${key} is missing from the current repository.`);
      } else {
        compareValues(expectedObject[key], actualObject[key], `${location}.${key}`, errors);
      }
    }
    return;
  }
  if (expected !== actual) {
    errors.push(`${location} changed: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
  }
}

export function compareRuntimeCompatibilityReferences(
  expected: RuntimeCompatibilityReference,
  actual: RuntimeCompatibilityReference,
): string[] {
  const errors: string[] = [];
  compareValues(expected, actual, "runtimeCompatibility", errors);
  return errors;
}

export function validateRuntimeCompatibilityReference(root = process.cwd()): string[] {
  const referencePath = path.join(root, REFERENCE_PATH);
  if (!existsSync(referencePath)) {
    return [`Missing ${REFERENCE_PATH}; runtime compatibility is default-deny until a reviewed reference exists.`];
  }
  try {
    const expected = readJson<RuntimeCompatibilityReference>(referencePath);
    return compareRuntimeCompatibilityReferences(expected, collectRuntimeCompatibilityReference(root));
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
}

function main(): void {
  const root = process.cwd();
  if (process.argv.includes("--write")) {
    if (!process.argv.includes(CONFIRM_WRITE_FLAG)) {
      throw new Error(
        `Refusing to rewrite ${REFERENCE_PATH}. Re-run with ${CONFIRM_WRITE_FLAG} only after the full dependency/toolchain validation.`,
      );
    }
    const reference = collectRuntimeCompatibilityReference(root);
    writeFileSync(path.join(root, REFERENCE_PATH), `${JSON.stringify(reference, null, 2)}\n`, "utf8");
    console.log(`Runtime compatibility reference written: ${REFERENCE_PATH}`);
    return;
  }

  const errors = validateRuntimeCompatibilityReference(root);
  if (errors.length > 0) {
    console.error("Runtime compatibility reference failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Runtime compatibility reference passed: dependency, workspace, service, and toolchain baselines match.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
