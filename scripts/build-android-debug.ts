import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

import { withoutVsCodeDebuggerEnv } from "./child-process-env";
import { runGradle } from "./android/gradle";
import { describeTestApk, TEST_APK_PATH } from "./android/test-apk";
import { reportStage, reportStep } from "./release-stage";

/**
 * Build the testing package from the current working tree.
 *
 * This is the testing counterpart to the release paths: it publishes nothing
 * and touches no R2 object. It builds the `debugR8` variant rather than plain
 * `debug`, so the package under test is shrunk and optimized by R8 exactly
 * like a release — a crash that only R8 causes should surface here, on a
 * device, rather than after a store upload. It stays `debuggable` and signed
 * with the debug key, which is what lets WebView debugging and instrumented
 * tests work at all.
 *
 * The web assets are rebuilt and synced first. Assembling against a stale
 * `out/` would produce an APK that disagrees with the source being tested,
 * which is worse than no APK at all.
 *
 * It touches no device. Installing onto a connected device is a separate manual
 * step outside the release console.
 */
function main(): void {
  const env = withoutVsCodeDebuggerEnv(process.env);

  reportStage("building-web");
  reportStep("building and syncing the web bundle");
  console.log("Building the web bundle and syncing it into the Android project...");
  execSync("npm run cap:prepare:android", { stdio: "inherit", env });

  reportStage("building-android");
  reportStep("assembling the R8-optimized debug APK");
  console.log("\nAssembling the R8-optimized, debug-signed APK...");
  runGradle([":app:assembleDebugR8"], env);

  if (!existsSync(TEST_APK_PATH)) {
    throw new Error(`Gradle reported success but no APK was produced at ${TEST_APK_PATH}`);
  }

  // The instrumentation package is built here too: it is part of the same
  // compilation, and building it now means the device-test button does not
  // have to wait for a Gradle run before it can start.
  reportStep("assembling the instrumented test package");
  runGradle([":app:assembleDebugR8AndroidTest"], env);

  reportStage("finalizing-results");
  console.log(`\nTest package ready: ${describeTestApk()} — R8 optimized, debug signed`);
  console.log("Install the APK on a connected device before running the connected-device tests.");
}

try {
  main();
} catch (error) {
  console.error(`\nTest build failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
