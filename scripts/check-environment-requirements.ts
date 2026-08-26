import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir, platform, release } from "node:os";
import path from "node:path";
import dotenv from "dotenv";
import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import { isValidJavaHome, resolveJavaHome } from "./android/java-home";
import { validateRuntimeCompatibilityReference } from "./runtime-compatibility-reference";
import {
  classifyHost,
  evidenceGapMessage,
} from "./runtime-compatibility-policy";
import { HOSTED_RUNTIME_ENV_KEYS } from "./vercel-deployment-guards";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

type Scenario = "all" | "development" | "web" | "production" | "android" | "ios";
type Level = "OK" | "INSTALL" | "UPDATE" | "CONFIGURE" | "INFO" | "NOT_APPLICABLE" | "EVIDENCE_GAP";

interface CheckResult {
  scenario: Exclude<Scenario, "all"> | "common";
  item: string;
  level: Level;
  installed?: string;
  required: string;
  action: string;
}

const ROOT = process.cwd();
const requested = (process.argv.find((arg) => arg.startsWith("--scenario="))?.split("=")[1] ?? "all") as Scenario;
const checkOutdated = process.argv.includes("--check-outdated") && !process.argv.includes("--skip-outdated");
const VALID_SCENARIOS = new Set<Scenario>(["all", "development", "web", "production", "android", "ios"]);
if (!VALID_SCENARIOS.has(requested)) {
  throw new Error(`Unknown scenario "${requested}". Use all, development, web, production, android, or ios.`);
}

const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
  engines?: Record<string, string>;
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  overrides?: Record<string, string>;
  allowScripts?: Record<string, boolean>;
};
const lock = JSON.parse(readFileSync(path.join(ROOT, "package-lock.json"), "utf8")) as {
  packages?: Record<string, { version?: string; optional?: boolean }>;
};

const results: CheckResult[] = [];
const scenarios = requested === "all"
  ? new Set<Scenario>(["development", "web", "production", "android", "ios"])
  : new Set<Scenario>([requested]);

function add(result: CheckResult): void {
  results.push(result);
}

function commandVersion(command: string, args: string[]): string | null {
  if (command === "npm" && process.env.npm_execpath) {
    const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
      shell: false,
    });
    if (!result.error && result.status === 0) {
      return `${result.stdout || result.stderr}`.trim().split(/\r?\n/)[0] ?? null;
    }
  }
  const executable = process.platform === "win32" && ["npm", "npx"].includes(command)
    ? `${command}.cmd`
    : command;
  const result = spawnSync(executable, args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  if (result.error || result.status !== 0) return null;
  return `${result.stdout || result.stderr}`.trim().split(/\r?\n/)[0] ?? null;
}

function majorOf(version: string): number {
  return Number(version.replace(/^v/, "").split(".")[0]);
}

function envConfigured(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

/**
 * Vercel Sandboxes preload unsupported optional artifacts into their shared
 * workspace. The remote release runner deliberately installs without lifecycle
 * scripts so it can use better-sqlite3's bundled binary; npm then reports those
 * already-present optional artifacts as extraneous. They are not part of the
 * project graph, so retain every real npm problem and ignore only this narrow,
 * lockfile-proven sandbox condition.
 */
function isSandboxPreloadedOptionalProblem(problem: string): boolean {
  if (process.env.ASOL_REMOTE_DEPLOY_SANDBOX !== "1" || !problem.startsWith("extraneous: ")) {
    return false;
  }
  const packagePath = problem.slice(problem.lastIndexOf(" ") + 1);
  const relativePath = path.relative(ROOT, packagePath).split(path.sep).join("/");
  return relativePath.startsWith("node_modules/") && lock.packages?.[relativePath]?.optional === true;
}

/**
 * npm 11.11 in the Sandbox flags a root override as invalid even when its
 * version exactly matches both package-lock.json and the declared override.
 * That is an npm reporting defect, not an incompatible dependency. The rule is
 * deliberately limited to the remote Sandbox and leaves all other invalid
 * dependencies release-blocking.
 */
function isSandboxLockedOverrideProblem(problem: string): boolean {
  if (process.env.ASOL_REMOTE_DEPLOY_SANDBOX !== "1" || !problem.startsWith("invalid: ")) {
    return false;
  }
  const packagePath = problem.slice(problem.lastIndexOf(" ") + 1);
  const relativePath = path.relative(ROOT, packagePath).split(path.sep).join("/");
  if (!relativePath.startsWith("node_modules/")) return false;
  const packageName = relativePath.slice("node_modules/".length);
  const expectedVersion = lock.packages?.[relativePath]?.version;
  return Boolean(
    expectedVersion &&
      packageJson.overrides?.[packageName] === expectedVersion &&
      problem.startsWith(`invalid: ${packageName}@${expectedVersion} `),
  );
}

function isAcceptedSandboxGraphProblem(problem: string): boolean {
  return isSandboxPreloadedOptionalProblem(problem) || isSandboxLockedOverrideProblem(problem);
}

function checkCommon(): void {
  const nodeVersion = process.version.replace(/^v/, "");
  const nodeMajor = majorOf(nodeVersion);
  const nodeOk = nodeMajor >= 22 && nodeMajor < 25;
  add({
    scenario: "common",
    item: "Node.js",
    level: nodeOk ? "OK" : nodeMajor < 22 ? "UPDATE" : "CONFIGURE",
    installed: nodeVersion,
    required: packageJson.engines?.node ?? ">=22 <25",
    action: nodeOk ? "No action." : "Install the current Node.js 24 LTS line used by this project.",
  });

  const referenceErrors = validateRuntimeCompatibilityReference(ROOT);
  const host = classifyHost(process.version, platform(), referenceErrors.length === 0);
  add({
    scenario: "common",
    item: "Host class",
    level:
      host.hostClass === "unsupported-host"
        ? "CONFIGURE"
        : host.hostClass === "canonical-baseline-host"
          ? "OK"
          : "INFO",
    installed: host.hostClass,
    required: "canonical-baseline-host, compatible-host, or unsupported-host",
    action:
      host.hostClass === "unsupported-host"
        ? "Install Node.js 22–24. Do not rewrite lockfiles or the compatibility reference for this host."
        : host.hostClass === "compatible-host"
          ? "Compatible for agent work. Final source, lockfiles, and generated artifacts must still match the canonical baseline."
          : "No action.",
  });
  for (const gap of host.unavailableVerifications) {
    add({
      scenario: "common",
      item: gap,
      level: "EVIDENCE_GAP",
      installed: `${platform()} ${release()}`,
      required: "macOS with Xcode compile/archive/sign",
      action: evidenceGapMessage(gap),
    });
  }
  add({
    scenario: "common",
    item: "Immutable compatibility reference",
    level: referenceErrors.length ? "CONFIGURE" : "OK",
    installed: referenceErrors.length ? `${referenceErrors.length} drift item(s)` : "reviewed baseline matches",
    required: "config/runtime-compatibility-reference.json",
    action: referenceErrors.length ? referenceErrors.slice(0, 5).join(" ") : "No action.",
  });

  const npmExecutable = process.env.npm_execpath
    ? process.execPath
    : process.platform === "win32"
      ? "npm.cmd"
      : "npm";
  const npmArguments = process.env.npm_execpath
    ? [process.env.npm_execpath, "ls", "--all", "--json"]
    : ["ls", "--all", "--json"];
  const graphResult = spawnSync(npmExecutable, npmArguments, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  let graphProblems: string[] = [];
  try {
    const graph = JSON.parse(graphResult.stdout || "{}") as { problems?: string[]; error?: { summary?: string } };
    graphProblems = graph.problems ?? (graph.error?.summary ? [graph.error.summary] : []);
  } catch {
    graphProblems = ["npm ls --all returned unreadable dependency graph output"];
  }
  if (graphResult.status !== 0 && graphProblems.length === 0) {
    graphProblems.push((graphResult.stderr || "npm ls --all failed").trim());
  }
  const ignoredSandboxProblems = graphProblems.filter(isAcceptedSandboxGraphProblem);
  graphProblems = graphProblems.filter((problem) => !isAcceptedSandboxGraphProblem(problem));
  add({
    scenario: "common",
    item: "npm peer and transitive graph",
    level: graphProblems.length ? "UPDATE" : "OK",
    installed: graphProblems.length ? `${graphProblems.length} problem(s)` : "npm ls --all is valid",
    required: "No invalid, missing, extraneous, or peer-incompatible package anywhere in the installed tree",
    action: graphProblems.length
      ? graphProblems.slice(0, 5).join("; ")
      : ignoredSandboxProblems.length
        ? `Ignored ${ignoredSandboxProblems.length} lockfile-proven Sandbox npm reporting artifact(s).`
        : "No action.",
  });

  const npmVersion = commandVersion("npm", ["--version"]);
  const expectedNpm = packageJson.packageManager?.replace(/^npm@/, "") ?? "11.19.0";
  add({
    scenario: "common",
    item: "npm",
    level: npmVersion && majorOf(npmVersion) === majorOf(expectedNpm) ? "OK" : npmVersion ? "UPDATE" : "INSTALL",
    installed: npmVersion ?? undefined,
    required: expectedNpm,
    action:
      npmVersion && majorOf(npmVersion) === majorOf(expectedNpm)
        ? "No action."
        : npmVersion
          ? `Run npm install --global npm@${expectedNpm}.`
          : "Install npm with Node.js.",
  });

  const gitVersion = commandVersion("git", ["--version"]);
  add({
    scenario: "common",
    item: "Git",
    level: gitVersion ? "OK" : "INSTALL",
    installed: gitVersion ?? undefined,
    required: "Git 2.40 or newer",
    action: gitVersion ? "No action." : "Install Git and make it available on PATH.",
  });

  const missing: string[] = [];
  const mismatched: string[] = [];
  const directPackages = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  });
  for (const name of directPackages) {
    const metadata = lock.packages?.[`node_modules/${name}`];
    if (!metadata) {
      missing.push(`${name} (missing from lockfile)`);
      continue;
    }
    const installedPath = path.join(ROOT, "node_modules", ...name.split("/"), "package.json");
    if (!existsSync(installedPath)) {
      missing.push(name);
      continue;
    }
    const installed = JSON.parse(readFileSync(installedPath, "utf8")) as { version?: string };
    if (metadata.version && installed.version !== metadata.version) {
      mismatched.push(`${name} (${installed.version ?? "unknown"} -> ${metadata.version})`);
    }
  }
  add({
    scenario: "common",
    item: "npm dependency tree",
    level: missing.length ? "INSTALL" : mismatched.length ? "UPDATE" : "OK",
    installed: missing.length || mismatched.length ? `${missing.length} missing, ${mismatched.length} mismatched` : "matches package-lock.json",
    required: "Exact package-lock.json tree",
    action:
      missing.length || mismatched.length
        ? `Run npm ci. ${[...missing, ...mismatched].slice(0, 8).join(", ")}`
        : "No action.",
  });
  const approvedBuilds = Object.keys(packageJson.allowScripts ?? {});
  add({
    scenario: "common",
    item: "Dependency install scripts",
    level: ["better-sqlite3", "esbuild", "unrs-resolver"].every((name) =>
      approvedBuilds.some((entry) => entry.startsWith(`${name}@`)),
    ) ? "OK" : "CONFIGURE",
    installed: approvedBuilds.join(", ") || "none",
    required: "Pinned approvals for better-sqlite3, esbuild, and unrs-resolver",
    action: "Review with npm install-scripts ls; approve only the pinned packages documented in package.json.",
  });
}

function checkOutdatedPackages(): void {
  let raw = "{}";
  try {
    const npmCommand = process.env.npm_execpath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
    const npmArgs = process.env.npm_execpath
      ? [process.env.npm_execpath, "outdated", "--json"]
      : ["outdated", "--json"];
    raw = execFileSync(npmCommand, npmArgs, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
  } catch (error) {
    raw = (error as { stdout?: string }).stdout || "{}";
  }
  let outdated: Record<string, { current?: string; wanted?: string; latest?: string }> = {};
  try {
    outdated = JSON.parse(raw || "{}") as typeof outdated;
  } catch {
    add({ scenario: "common", item: "Package registry check", level: "INFO", required: "npm registry access", action: "Could not parse npm outdated output; retry with network access." });
    return;
  }
  const compatible = Object.entries(outdated).filter(([, value]) => value.current !== value.wanted);
  const majors = Object.entries(outdated).filter(([, value]) => value.current === value.wanted && value.current !== value.latest);
  add({
    scenario: "common",
    item: "Compatible package updates",
    level: compatible.length ? "INFO" : "OK",
    installed: `${compatible.length} package(s)`,
    required: "Advisory only; the reviewed lockfile remains authoritative",
    action: compatible.length ? `Review separately; do not change the compatibility reference without full validation. ${compatible.slice(0, 10).map(([name, value]) => `${name} ${value.current} -> ${value.wanted}`).join(", ")}` : "No action.",
  });
  add({
    scenario: "common",
    item: "Major-version review",
    level: "INFO",
    installed: `${majors.length} intentionally constrained package(s)`,
    required: "Upgrade only after compatibility verification",
    action: majors.length ? majors.slice(0, 10).map(([name, value]) => `${name} ${value.current} -> ${value.latest}`).join(", ") : "No pending major lines.",
  });
}

function checkWeb(): void {
  const envFile = existsSync(path.join(ROOT, ".env")) || existsSync(path.join(ROOT, ".env.local"));
  add({ scenario: "development", item: "Environment file", level: envFile ? "OK" : "CONFIGURE", installed: envFile ? ".env and/or .env.local" : undefined, required: "Copy .env.example and fill only the selected scenario", action: envFile ? "No action." : "Copy .env.example to an ignored local environment file; never commit secrets." });
  add({ scenario: "web", item: "Web toolchain", level: "OK", installed: "Next.js/React/TypeScript from package-lock.json", required: "npm ci", action: "Run npm run dev for development or npm run build for production." });

  const expected = {
    next: lock.packages?.["node_modules/next"]?.version,
    react: lock.packages?.["node_modules/react"]?.version,
    "react-dom": lock.packages?.["node_modules/react-dom"]?.version,
    typescript: lock.packages?.["node_modules/typescript"]?.version,
  };
  const serviceNames = readdirSync(path.join(ROOT, "services"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const drift: string[] = [];
  for (const serviceName of serviceNames) {
    const serviceLockPath = path.join(ROOT, "services", serviceName, "package-lock.json");
    if (!existsSync(serviceLockPath)) {
      drift.push(`${serviceName}: missing package-lock.json`);
      continue;
    }
    const serviceLock = JSON.parse(readFileSync(serviceLockPath, "utf8")) as {
      packages?: Record<string, { version?: string }>;
    };
    for (const [dependency, version] of Object.entries(expected)) {
      const serviceVersion = serviceLock.packages?.[`node_modules/${dependency}`]?.version;
      if (!version || serviceVersion !== version) {
        drift.push(`${serviceName}/${dependency}: ${serviceVersion ?? "missing"} -> ${version ?? "root missing"}`);
      }
    }
  }
  add({
    scenario: "web",
    item: "Isolated service runtimes",
    level: drift.length ? "UPDATE" : "OK",
    installed: drift.length ? `${drift.length} mismatch(es)` : `${serviceNames.length}/${serviceNames.length} services match Next ${expected.next}, React ${expected.react}, TypeScript ${expected.typescript}`,
    required: "Every discovered Vercel service must use the same tested Next/React/TypeScript runtime as the main application",
    action: drift.length ? `Update each service package and lockfile: ${drift.slice(0, 8).join(", ")}.` : "No action.",
  });
}

function checkProduction(): void {
  const link = existsSync(path.join(ROOT, ".vercel", "project.json"));
  add({ scenario: "production", item: "Main Vercel project link", level: link ? "OK" : "CONFIGURE", installed: link ? ".vercel/project.json" : undefined, required: "One GitHub-linked main Vercel project", action: link ? "No action." : "Run vercel link only for the main gova project." });
  const keys = [...new Set(Object.values(ACCOUNT_DECLARATIONS).map((declaration) => declaration.tokenEnvVar))];
  const missing = keys.filter((key) => !envConfigured(key));
  add({ scenario: "production", item: "Vercel account tokens", level: missing.length ? "CONFIGURE" : "OK", installed: `${keys.length - missing.length}/${keys.length} configured`, required: keys.join(", "), action: missing.length ? `Configure without committing: ${missing.join(", ")}.` : "No action." });
  add({ scenario: "production", item: "Vercel CLI", level: "INFO", installed: "project-pinned vercel@59.0.0", required: "vercel@59.0.0 from package.json / node_modules", action: "No global or npx CLI drift. Deployment scripts run the pinned local binary." });
  const runtimeKeys = [...HOSTED_RUNTIME_ENV_KEYS];
  const runtimeMissing = runtimeKeys.filter((key) => !envConfigured(key));
  add({
    scenario: "production",
    item: "Production runtime configuration",
    level: runtimeMissing.length ? "CONFIGURE" : "OK",
    installed: `${runtimeKeys.length - runtimeMissing.length}/${runtimeKeys.length} required values configured`,
    required: "Main/product/notification/order/profile databases, signing secrets, push key, and four public service origins",
    action: runtimeMissing.length ? `Configure without committing: ${runtimeMissing.join(", ")}.` : "No action.",
  });
}

function androidSdkRoot(): string | null {
  const envRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (envRoot) return envRoot;
  const localProperties = path.join(ROOT, "android", "local.properties");
  if (!existsSync(localProperties)) return null;
  const match = readFileSync(localProperties, "utf8").match(/^sdk\.dir=(.+)$/m);
  return match?.[1]?.replace(/\\\\/g, "\\") ?? null;
}

function checkAndroid(): void {
  const java = commandVersion("java", ["-version"]);
  const resolvedJavaHome = resolveJavaHome();
  const configuredJavaHome = process.env.JAVA_HOME?.trim();
  const javaOk = Boolean(java?.includes("21"));
  const javaHomeOk = Boolean(resolvedJavaHome);
  const javaHomeMismatch = Boolean(configuredJavaHome && !isValidJavaHome(configuredJavaHome) && javaHomeOk);
  add({
    scenario: "android",
    item: "JDK",
    level: javaOk && javaHomeOk ? "OK" : java ? "UPDATE" : "INSTALL",
    installed: [
      java ?? "java not found",
      configuredJavaHome ? `JAVA_HOME=${configuredJavaHome}` : "JAVA_HOME unset",
      resolvedJavaHome ? `resolved=${resolvedJavaHome}` : "no valid JDK home",
    ].join("; "),
    required: "JDK 21 LTS with a valid JAVA_HOME or ASOL_ANDROID_JAVA_HOME",
    action: !javaOk
      ? "Install JDK 21 and point JAVA_HOME at its root directory."
      : javaHomeMismatch
        ? `The configured JAVA_HOME is stale; release tooling safely resolves ${resolvedJavaHome}. Update JAVA_HOME when convenient.`
        : javaHomeOk
          ? "No action."
          : "Install JDK 21 and set JAVA_HOME or ASOL_ANDROID_JAVA_HOME.",
  });
  const sdkRoot = androidSdkRoot();
  const platform36 = sdkRoot ? existsSync(path.join(sdkRoot, "platforms", "android-36")) : false;
  add({ scenario: "android", item: "Android SDK", level: platform36 ? "OK" : sdkRoot ? "UPDATE" : "INSTALL", installed: sdkRoot ?? undefined, required: "Android SDK Platform 36 and current Build Tools", action: platform36 ? "No action." : "Install Android Studio, SDK Platform 36, Build Tools, and Platform Tools; set ANDROID_HOME." });
  const adbPath = sdkRoot
    ? path.join(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")
    : "adb";
  const adb = commandVersion(existsSync(adbPath) ? adbPath : "adb", ["version"]);
  add({ scenario: "android", item: "Android Platform Tools", level: adb ? "OK" : "INSTALL", installed: adb ?? undefined, required: "adb on PATH", action: adb ? "No action." : "Add the Android SDK platform-tools directory to PATH." });
  add({ scenario: "android", item: "Gradle", level: existsSync(path.join(ROOT, "android", process.platform === "win32" ? "gradlew.bat" : "gradlew")) ? "OK" : "INSTALL", installed: "project wrapper 9.4.1", required: "Use the checked-in wrapper", action: "Do not install Gradle globally; use android/gradlew." });
  const releaseKeys = ["ASOL_ANDROID_KEYSTORE_FILE", "ASOL_ANDROID_KEYSTORE_PASSWORD", "ASOL_ANDROID_KEY_ALIAS", "ASOL_ANDROID_KEY_PASSWORD", "FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64"];
  const missingRelease = releaseKeys.filter((key) => !envConfigured(key));
  add({ scenario: "android", item: "Android signed-release configuration", level: missingRelease.length ? "CONFIGURE" : "OK", installed: `${releaseKeys.length - missingRelease.length}/${releaseKeys.length} configured`, required: "Keystore path/passwords and Firebase Android configuration", action: missingRelease.length ? `Required only for signed/store builds: ${missingRelease.join(", ")}.` : "No action." });
}

function checkIos(): void {
  if (platform() !== "darwin") {
    add({
      scenario: "ios",
      item: "iOS toolchain",
      level: "EVIDENCE_GAP",
      installed: `${platform()} ${release()}`,
      required: "macOS with Xcode",
      action: evidenceGapMessage("ios-compile-sign"),
    });
    return;
  }
  const xcode = commandVersion("xcodebuild", ["-version"]);
  add({ scenario: "ios", item: "Xcode", level: xcode ? "OK" : "INSTALL", installed: xcode ?? undefined, required: "Current stable Xcode with iOS SDK", action: xcode ? "Run xcode-select --install if command-line tools are missing." : "Install Xcode and its command-line tools." });
}

function printReport(): void {
  console.log(`ASOL environment requirements — scenario: ${requested}`);
  console.log(`Host: ${platform()} ${release()} (${homedir()})`);
  console.table(results.map((result) => ({
    scenario: result.scenario,
    status: result.level,
    item: result.item,
    installed: result.installed ?? "-",
    required: result.required,
    action: result.action,
  })));
  const blocking = results.filter((result) => ["INSTALL", "UPDATE", "CONFIGURE"].includes(result.level));
  const evidenceGaps = results.filter((result) => result.level === "EVIDENCE_GAP");
  console.log(
    `Summary: ${results.filter((result) => result.level === "OK").length} ready, ${blocking.length} action(s), ${results.filter((result) => result.level === "INFO").length} informational, ${evidenceGaps.length} evidence gap(s).`,
  );
  if (evidenceGaps.length) {
    for (const gap of evidenceGaps) {
      console.log(`Evidence gap (not passing): ${gap.item} — ${gap.action}`);
    }
  }
  if (blocking.length) process.exitCode = 1;
}

checkCommon();
if (scenarios.has("web") || scenarios.has("development")) checkWeb();
if (scenarios.has("production")) checkProduction();
if (scenarios.has("android")) checkAndroid();
if (scenarios.has("ios")) checkIos();
if (checkOutdated) checkOutdatedPackages();
printReport();
