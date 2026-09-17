import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { gradleWrapperPath } from "./android/gradle";
import { runAndroidBuildPreflight } from "@asol/native-core/scripts/android-build-preflight";
import { ensureReleaseSecretsRestored } from "./ensure-release-secrets-restored";
import { loadReleaseEnvironment } from "./load-release-env";
import { reportStage } from "./release-stage";

loadReleaseEnvironment();

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

function resolveApkSigner(env: NodeJS.ProcessEnv = process.env): string {
  const sdkRoot = env.ANDROID_SDK_ROOT
    ?? env.ANDROID_HOME
    ?? (env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, "Android", "Sdk") : undefined);
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

async function main(): Promise<void> {
  await ensureReleaseSecretsRestored("android:build:signed", [
    "android-signing",
  ]);
  requireSigningEnvironment();
  requireSyncedWebBundle();
  const { javaHome, env } = runAndroidBuildPreflight({ env: process.env });

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

  const aab = path.join(
    androidDirectory,
    "app",
    "build",
    "outputs",
    "bundle",
    "release",
    "app-release.aab",
  );
  const apk = path.join(
    androidDirectory,
    "app",
    "build",
    "outputs",
    "apk",
    "release",
    "app-release.apk",
  );
  assertArtifact(aab);
  assertArtifact(apk);

  const jarSigner = javaHome
    ? path.join(
        javaHome,
        "bin",
        process.platform === "win32" ? "jarsigner.exe" : "jarsigner",
      )
    : "jarsigner";
  // Google Play upload keys are normally self-signed. `-strict` treats that
  // expected trust-chain shape as exit code 4 even when the archive signature
  // is cryptographically valid, so verify the JAR signature without requiring
  // a public-CA chain.
  reportStage("signing");
  run(jarSigner, ["-verify", aab], root, env);
  run(
    resolveApkSigner(env),
    ["verify", "--verbose", "--print-certs", apk],
    root,
    env,
  );

  // If a release-test target is explicitly selected, cold-start the exact
  // optimized APK on it before the artifact leaves this build step. This
  // catches reflection failures that Gradle/signing checks do not execute.
  // The APK uses the local release/upload identity, so the selected device
  // must accept that signer.
  const configuredSerial = env.ANDROID_RELEASE_TEST_SERIAL?.trim();
  if (!configuredSerial) {
    throw new Error(
      "ANDROID_RELEASE_TEST_SERIAL is required for a signed Android release. Refusing to produce a shippable artifact without cold-starting the exact R8-optimized APK on a device.",
    );
  }
  {
    const deviceSdkRoot = env.ANDROID_SDK_ROOT ?? env.ANDROID_HOME;
    const adb = deviceSdkRoot
      ? path.join(
          deviceSdkRoot,
          "platform-tools",
          process.platform === "win32" ? "adb.exe" : "adb",
        )
      : "adb";
    try {
      // Clear the crash buffer so only this launch is judged.
      const deviceEnv = { ...env, ANDROID_SERIAL: configuredSerial };
      run(adb, ["get-state"], root, deviceEnv);
      reportStage("testing-on-device");
      run(adb, ["logcat", "-b", "crash", "-c"], root, deviceEnv);
      run(adb, ["install", "-r", "-d", apk], root, deviceEnv);
      run(
        adb,
        ["shell", "am", "force-stop", "hgh.asol.app"],
        root,
        deviceEnv,
      );
      run(
        adb,
        [
          "shell",
          "monkey",
          "-p",
          "hgh.asol.app",
          "-c",
          "android.intent.category.LAUNCHER",
          "1",
        ],
        root,
        deviceEnv,
      );
      execFileSync(process.execPath, ["-e", "setTimeout(()=>{},5000)"], {
        stdio: "ignore",
      });
      const pid = execFileSync(adb, ["shell", "pidof", "hgh.asol.app"], {
        env: deviceEnv,
        encoding: "utf8",
      }).trim();
      if (!pid) {
        throw new Error("release APK process exited during cold-start smoke test");
      }
      const crashes = execFileSync(adb, ["logcat", "-d", "-b", "crash"], {
        env: deviceEnv,
        encoding: "utf8",
      });
      if (/Process:\s+hgh\.asol\.app\b/.test(crashes)) {
        throw new Error(
          `release APK crashed during cold-start smoke test:\n${crashes}`,
        );
      }
      console.log(
        `Release cold-start smoke test passed on attached Android device (pid ${pid}).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Signed release device smoke test failed: ${message}`,
      );
    }
  }

  const aabSize = statSync(aab).size;
  const apkSize = statSync(apk).size;
  console.log(`Signed AAB ready: ${aab} (${aabSize} bytes)`);
  console.log(`Signed APK ready: ${apk} (${apkSize} bytes)`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Signed Android build failed: ${message}`);
  process.exitCode = 1;
});
