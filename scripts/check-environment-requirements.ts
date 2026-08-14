import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir, platform, release } from "node:os";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

type Scenario = "all" | "development" | "web" | "production" | "android" | "ios";
type Level = "OK" | "INSTALL" | "UPDATE" | "CONFIGURE" | "INFO" | "NOT_APPLICABLE";

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
const VALID_SCENARIOS = new Set<Scenario>(["all", "development", "web", "production", "android", "ios"]);
if (!VALID_SCENARIOS.has(requested)) {
  throw new Error(`Unknown scenario "${requested}". Use all, development, web, production, android, or ios.`);
}

const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
  engines?: Record<string, string>;
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  allowScripts?: Record<string, boolean>;
};
const lock = JSON.parse(readFileSync(path.join(ROOT, "package-lock.json"), "utf8")) as {
  packages?: Record<string, { version?: string }>;
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
    level: compatible.length ? "UPDATE" : "OK",
    installed: `${compatible.length} package(s)`,
    required: "Latest version allowed by the tested dependency ranges",
    action: compatible.length ? `Run npm update, then verify all checks. ${compatible.slice(0, 10).map(([name, value]) => `${name} ${value.current} -> ${value.wanted}`).join(", ")}` : "No action.",
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
}

function checkProduction(): void {
  const link = existsSync(path.join(ROOT, ".vercel", "project.json"));
  add({ scenario: "production", item: "Main Vercel project link", level: link ? "OK" : "CONFIGURE", installed: link ? ".vercel/project.json" : undefined, required: "One GitHub-linked main Vercel project", action: link ? "No action." : "Run vercel link only for the main gova project." });
  const keys = ["VERCEL_TOKEN", "VERCEL_NOTIFICATIONS_TOKEN", "VERCEL_PRODUCTS_TOKEN", "VERCEL_ORDERS_TOKEN", "VERCEL_PROFILES_TOKEN"];
  const missing = keys.filter((key) => !envConfigured(key));
  add({ scenario: "production", item: "Vercel account tokens", level: missing.length ? "CONFIGURE" : "OK", installed: `${keys.length - missing.length}/${keys.length} configured`, required: keys.join(", "), action: missing.length ? `Configure without committing: ${missing.join(", ")}.` : "No action." });
  add({ scenario: "production", item: "Vercel CLI", level: "INFO", installed: "ephemeral", required: "vercel@59.0.0", action: "No global install. Deployment scripts download the pinned CLI through npx." });
  const databaseKeys = [
    "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN",
    "TURSO_PRODUCT_DATABASE_URL", "TURSO_PRODUCT_AUTH_TOKEN",
    "TURSO_NOTIFICATIONS_DATABASE_URL", "TURSO_NOTIFICATIONS_AUTH_TOKEN",
    "ORDERS_CORE_DATABASE_URL", "ORDERS_CORE_DATABASE_AUTH_TOKEN",
    "PROFILE_CORE_DATABASE_URL", "PROFILE_CORE_DATABASE_AUTH_TOKEN",
  ];
  const notificationKeys = [
    "ASOL_SESSION_SIGNING_SECRET",
    "ASOL_NOTIFICATION_GRANT_SECRET",
    "WEB_PUSH_VAPID_PRIVATE_KEY",
    "NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL",
    "NEXT_PUBLIC_ASOL_PRODUCTS_URL",
    "NEXT_PUBLIC_ASOL_ORDERS_URL",
    "NEXT_PUBLIC_ASOL_PROFILES_URL",
  ];
  const runtimeMissing = [...databaseKeys, ...notificationKeys].filter((key) => !envConfigured(key));
  add({
    scenario: "production",
    item: "Production runtime configuration",
    level: runtimeMissing.length ? "CONFIGURE" : "OK",
    installed: `${databaseKeys.length + notificationKeys.length - runtimeMissing.length}/${databaseKeys.length + notificationKeys.length} required values configured`,
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
  add({ scenario: "android", item: "JDK", level: java?.includes("21") ? "OK" : java ? "UPDATE" : "INSTALL", installed: java ?? undefined, required: "JDK 21 LTS", action: java?.includes("21") ? "No action." : "Install JDK 21 and set JAVA_HOME." });
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
    add({ scenario: "ios", item: "iOS toolchain", level: "NOT_APPLICABLE", installed: `${platform()} ${release()}`, required: "macOS with Xcode", action: "Build and sign iOS only on a Mac. The source and Swift Package Manager configuration remain portable." });
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
  console.log(`Summary: ${results.filter((result) => result.level === "OK").length} ready, ${blocking.length} action(s), ${results.filter((result) => result.level === "INFO").length} informational.`);
  if (blocking.length) process.exitCode = 1;
}

checkCommon();
if (scenarios.has("web") || scenarios.has("development")) checkWeb();
if (scenarios.has("production")) checkProduction();
if (scenarios.has("android")) checkAndroid();
if (scenarios.has("ios")) checkIos();
checkOutdatedPackages();
printReport();
