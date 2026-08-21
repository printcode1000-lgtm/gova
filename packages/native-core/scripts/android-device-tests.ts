import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { withoutVsCodeDebuggerEnv } from "../../../scripts/child-process-env";
import { runGradle } from "../../../scripts/android/gradle";
import { runAndroidBuildPreflight } from "./android-build-preflight";
import { readDeviceArgument } from "../../../scripts/android/adb";
import { detectDevice, grantRuntimePermissions } from "./android/device-install";
import { reportStage, reportStep } from "../../../scripts/release-stage";

/**
 * Run the instrumented test suite on a connected Android device.
 *
 * These are the checks that only a real device can answer: notification
 * channels as the system actually registered them, the runtime notification
 * permission, the packaged sound, and the web bundle as it was synced into the
 * APK. They are a different kind of check from `verify:all`, which type-checks
 * and exercises contracts on this computer — neither replaces the other, and
 * each has its own button.
 *
 * The suite runs against the `debugR8` variant, so it exercises the same
 * R8-shrunk code the test APK carries. A test passing on unminified code and
 * failing on the shipped one is precisely the failure this is here to catch.
 *
 * `--device=<serial>` picks one when several are attached.
 */
const ANDROID_DIRECTORY = path.resolve("android");
const RESULTS_DIRECTORY = path.join(
  ANDROID_DIRECTORY, "app", "build", "outputs", "androidTest-results", "connected",
);

/**
 * Name every test the device actually ran.
 *
 * Gradle prints a pass/fail summary but not the roster, and "0 tests ran" looks
 * like success from the exit code alone — the one outcome that must never be
 * read as a green run.
 */
function reportResults(): { total: number; skipped: number } {
  const files = collectXmlResults(RESULTS_DIRECTORY);
  if (files.length === 0) {
    console.log("No instrumented test result files were produced.");
    return { total: 0, skipped: 0 };
  }
  let total = 0;
  let skipped = 0;
  for (const file of files) {
    const xml = readFileSync(file, "utf8");
    skipped += [...xml.matchAll(/<skipped\b/g)].length;
    for (const match of xml.matchAll(/<testcase\s+[^>]*name="([^"]+)"[^>]*classname="([^"]+)"/g)) {
      const [, name, className] = match;
      console.log(`  ${className!.split(".").pop()}.${name}`);
      total += 1;
    }
  }
  return { total, skipped };
}

function collectXmlResults(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...collectXmlResults(full));
    else if (entry.name.endsWith(".xml")) found.push(full);
  }
  return found;
}

function main(): void {
  const env = withoutVsCodeDebuggerEnv(process.env);
  const { env: preflightEnv } = runAndroidBuildPreflight({ env });
  const requestedSerial = readDeviceArgument(process.argv.slice(2));

  const { adb, device } = detectDevice(requestedSerial);
  // Gradle picks the device from the ambient serial when several are attached.
  const gradleEnv: NodeJS.ProcessEnv = {
    ...preflightEnv,
    ANDROID_SERIAL: device.serial,
  };

  // Re-granted before every run: the notification checks skip themselves
  // without the permission, and a suite that skips its way to green is worse
  // than one that fails.
  grantRuntimePermissions(adb, device.serial);

  reportStage("testing-on-device");
  reportStep(`running instrumented tests on ${device.serial}`);
  console.log(`\nRunning the instrumented suite on ${device.serial}...`);
  runGradle([":app:connectedDebugR8AndroidTest"], gradleEnv);

  reportStage("finalizing-results");
  reportStep("collecting device test results");
  console.log("\nTests executed on the device:");
  const { total, skipped } = reportResults();
  if (total === 0) {
    throw new Error(
      "The instrumented run reported success without running a single test. " +
        "Treating that as a pass would hide an empty or unbuilt androidTest source set.",
    );
  }
  console.log(
    `\n${total - skipped} instrumented test(s) passed and ${skipped} skipped on ${device.serial}.`,
  );
}

try {
  main();
} catch (error) {
  // "No device connected" is an instruction, not a crash. A stack trace above
  // it only buries the sentence that says what to do.
  console.error(`\nConnected-device tests failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
