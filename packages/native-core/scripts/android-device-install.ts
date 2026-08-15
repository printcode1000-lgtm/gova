import { readDeviceArgument } from "../../../scripts/android/adb";
import { detectDevice, installApk, wipeProjectPackages } from "./android/device-install";
import { assertTestApkExists, describeTestApk, TEST_APK_PATH } from "../../../scripts/android/test-apk";
import { reportStage } from "../../../scripts/release-stage";

/**
 * Put the already-built testing package onto a connected device, from a device
 * that carries no trace of this project.
 *
 * Separate from the build on purpose. Building is slow and safe; this is fast
 * and irreversible on the device — it removes every project package along with
 * its data, settings, files and notification channels, for every user profile,
 * and verifies the result before installing. Someone rebuilding to check a
 * compile error should never lose the state on their phone as a side effect.
 *
 * It builds nothing. If no package has been built the run stops and says so,
 * rather than quietly starting a twenty-minute build nobody asked for.
 *
 * `--device=<serial>` picks one when several are attached.
 * `--without-permissions` leaves runtime permissions ungranted so the
 * notification-channel startup test can observe the real pre-opt-in state.
 */
function main(): void {
  const args = process.argv.slice(2);
  const requestedSerial = readDeviceArgument(args);
  const withoutPermissions = args.includes("--without-permissions");

  assertTestApkExists();
  console.log(`Installing ${describeTestApk()}`);

  const { adb, device } = detectDevice(requestedSerial);
  wipeProjectPackages(adb, device.serial);
  installApk(adb, device.serial, TEST_APK_PATH, {
    grantPermissions: !withoutPermissions,
  });

  reportStage("finalizing-results");
  console.log(
    withoutPermissions
      ? "\nThe device now carries only this build with runtime permissions ungranted. Run the startup channel test before granting notifications."
      : "\nThe device now carries only this build. Run the connected-device tests to exercise it.",
  );
}

try {
  main();
} catch (error) {
  // A missing package, a missing device or a refused uninstall is an
  // instruction to the reader; a stack trace above it buries the sentence.
  console.error(`\nDevice install failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
