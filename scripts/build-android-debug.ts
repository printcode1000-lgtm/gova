import { execFileSync, execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { withoutVsCodeDebuggerEnv } from "./child-process-env";

/**
 * Build an installable **debug** APK from the current working tree.
 *
 * This is the testing counterpart to the release paths: it publishes nothing,
 * touches no R2 object, and needs no signing keystore. It exists so a change
 * can be put on a real device — with WebView debugging enabled — before any
 * release path is considered.
 *
 * The web assets are rebuilt and synced first. Assembling against a stale
 * `out/` would produce an APK that disagrees with the source being tested,
 * which is worse than no APK at all.
 */
const ANDROID_DIRECTORY = path.resolve("android");
const APK_PATH = path.join(
  ANDROID_DIRECTORY,
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);

function runGradle(tasks: string[], env: NodeJS.ProcessEnv): void {
  if (process.platform === "win32") {
    execFileSync(
      process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe",
      ["/d", "/c", "gradlew.bat", ...tasks],
      { cwd: ANDROID_DIRECTORY, stdio: "inherit", env },
    );
    return;
  }
  execFileSync(path.join(ANDROID_DIRECTORY, "gradlew"), tasks, {
    cwd: ANDROID_DIRECTORY,
    stdio: "inherit",
    env,
  });
}

function main(): void {
  const env = withoutVsCodeDebuggerEnv(process.env);

  console.log("Building the web bundle and syncing it into the Android project...");
  execSync("npm run cap:prepare:android", { stdio: "inherit", env });

  console.log("\nAssembling the debug APK...");
  runGradle([":app:assembleDebug"], env);

  if (!existsSync(APK_PATH)) {
    throw new Error(`Gradle reported success but no APK was produced at ${APK_PATH}`);
  }

  const megabytes = (statSync(APK_PATH).size / (1024 * 1024)).toFixed(1);
  console.log(`\nDebug APK ready: ${APK_PATH} (${megabytes} MB)`);
  console.log(
    "Install it with: adb install -r " +
      path.relative(process.cwd(), APK_PATH).replace(/\\/g, "/"),
  );
  // Learned the hard way on a real device: Android refuses an update whose
  // signer differs, and the debug keystore is not the release one.
  console.log(
    "A device already carrying a release build must be uninstalled first " +
      "(INSTALL_FAILED_UPDATE_INCOMPATIBLE); uninstalling erases that app's data.",
  );
}

main();
