import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { gradleWrapperPath } from "./android/gradle";
import { reportStage } from "./release-stage";

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const root = path.resolve(".");
const androidDirectory = path.join(root, "android");
const signingKeys = [
  "ASOL_ANDROID_KEYSTORE_FILE",
  "ASOL_ANDROID_KEYSTORE_PASSWORD",
  "ASOL_ANDROID_KEY_ALIAS",
  "ASOL_ANDROID_KEY_PASSWORD",
] as const;

function requireSigningEnvironment(): void {
  const missing = signingKeys.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Android signing is missing: ${missing.join(", ")}`);
  }
  const configured = process.env.ASOL_ANDROID_KEYSTORE_FILE!;
  const keystore = path.isAbsolute(configured) ? configured : path.resolve(root, configured);
  if (!existsSync(keystore)) throw new Error(`Android release keystore was not found: ${keystore}`);
}

function requireSyncedWebBundle(): void {
  if (process.env.ASOL_WEB_BUNDLE_READY !== "1") {
    throw new Error("ASOL_WEB_BUNDLE_READY=1 is required; run cap:build or cap:prepare:android first.");
  }
  for (const required of [
    path.join(root, "out", "asol-web-manifest.json"),
    path.join(androidDirectory, "app", "src", "main", "assets", "public", "asol-web-manifest.json"),
  ]) {
    if (!existsSync(required)) throw new Error(`Synced release web bundle is missing: ${required}`);
  }
}

function resolveJavaHome(): string | undefined {
  const candidates = [
    process.env.ASOL_ANDROID_JAVA_HOME,
    process.platform === "win32" ? "C:\\Program Files\\Android\\Android Studio\\jbr" : undefined,
    process.env.JAVA_HOME,
  ];
  return candidates.find((candidate) =>
    candidate && existsSync(path.join(candidate, "bin", process.platform === "win32" ? "java.exe" : "java")),
  );
}

function resolveApkSigner(): string {
  const sdkRoot = process.env.ANDROID_SDK_ROOT
    ?? process.env.ANDROID_HOME
    ?? (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk") : undefined);
  if (!sdkRoot) throw new Error("Android SDK was not found; set ANDROID_SDK_ROOT or ANDROID_HOME.");
  const buildToolsRoot = path.join(sdkRoot, "build-tools");
  const versions = existsSync(buildToolsRoot)
    ? readdirSync(buildToolsRoot).sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
    : [];
  for (const version of versions) {
    const candidate = path.join(
      buildToolsRoot,
      version,
      process.platform === "win32" ? "apksigner.bat" : "apksigner",
    );
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`apksigner was not found below ${buildToolsRoot}`);
}

function run(command: string, args: string[], cwd = root, env = process.env): void {
  if (process.platform === "win32" && /\.(?:bat|cmd)$/i.test(command)) {
    execFileSync(process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe", ["/d", "/c", command, ...args], {
      cwd,
      env,
      stdio: "inherit",
    });
    return;
  }
  execFileSync(command, args, { cwd, env, stdio: "inherit" });
}

function assertArtifact(file: string): void {
  if (!existsSync(file) || statSync(file).size === 0) {
    throw new Error(`Expected Android artifact was not created: ${file}`);
  }
}

function main(): void {
  requireSigningEnvironment();
  requireSyncedWebBundle();
  const javaHome = resolveJavaHome();
  const env = {
    ...process.env,
    ...(javaHome ? {
      JAVA_HOME: javaHome,
      PATH: `${path.join(javaHome, "bin")}${path.delimiter}${process.env.PATH ?? ""}`,
    } : {}),
  };

  reportStage("building-android");
  console.log(`Building signed Android AAB and APK${javaHome ? ` with Java at ${javaHome}` : ""}...`);
  // Absolute: `cmd` resolves a bare batch-file name against PATH only, so a
  // shell started with `NoDefaultCurrentDirectoryInExePath` set (Visual Studio,
  // the VS Code terminal) never finds a wrapper named by `cwd` alone.
  run(
    gradleWrapperPath(androidDirectory),
    [":app:bundleRelease", ":app:assembleRelease"],
    androidDirectory,
    env,
  );

  const aab = path.join(androidDirectory, "app", "build", "outputs", "bundle", "release", "app-release.aab");
  const apk = path.join(androidDirectory, "app", "build", "outputs", "apk", "release", "app-release.apk");
  assertArtifact(aab);
  assertArtifact(apk);

  const jarSigner = javaHome
    ? path.join(javaHome, "bin", process.platform === "win32" ? "jarsigner.exe" : "jarsigner")
    : "jarsigner";
  // Google Play upload keys are normally self-signed. `-strict` treats that
  // expected trust-chain shape as exit code 4 even when the archive signature
  // is cryptographically valid, so verify the JAR signature without requiring
  // a public-CA chain.
  reportStage("signing");
  run(jarSigner, ["-verify", aab], root, env);
  run(resolveApkSigner(), ["verify", "--verbose", "--print-certs", apk], root, env);
  console.log(`Signed AAB ready: ${aab} (${statSync(aab).size} bytes)`);
  console.log(`Signed APK ready: ${apk} (${statSync(apk).size} bytes)`);
}

try {
  main();
} catch (error) {
  console.error(`Signed Android build failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
