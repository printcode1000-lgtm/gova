/**
 * Device helpers shared by the connected-device test runner.
 */
import {
  ASOL_APPLICATION_ID,
  adbText,
  describe,
  listDevices,
  resolveAdb,
  selectDevice,
  type AdbDevice,
} from "../../../../scripts/android/adb";
import { reportStage, reportStep } from "../../../../scripts/release-stage";

export function detectDevice(requestedSerial?: string): { adb: string; device: AdbDevice } {
  reportStage("detecting-device");
  const adb = resolveAdb();
  const devices = listDevices(adb);
  console.log(`Connected devices: ${describe(devices) || "none"}`);
  const device = selectDevice(devices, requestedSerial);
  console.log(`Using device ${device.serial}${device.model ? ` (${device.model})` : ""}`);
  return { adb, device };
}

/**
 * Run a device shell command and return what it said, whether it succeeded or
 * not. `pm` reports some failures on stdout with a zero exit and others by
 * throwing, so the two are flattened into one string the caller can inspect.
 */
function shellText(adb: string, serial: string, command: string): string {
  try {
    return adbText(adb, ["shell", command], serial).trim();
  } catch (error) {
    const failure = error as { stderr?: string | Buffer; stdout?: string | Buffer; message?: string };
    const output = `${failure.stdout?.toString() ?? ""}\n${failure.stderr?.toString() ?? ""}`.trim();
    return output || failure.message || String(error);
  }
}

/**
 * Grant the runtime permissions the device tests depend on.
 *
 * A fresh install holds none of them, and the notification checks would then
 * skip themselves rather than fail — the worst outcome of the three, because a
 * suite that reports "passed" while quietly testing nothing is indistinguishable
 * from one that worked.
 *
 * A permission a given Android version does not define is not an error here:
 * `POST_NOTIFICATIONS` simply does not exist before API 33.
 */
export function grantRuntimePermissions(adb: string, serial: string): void {
  const permissions = ["android.permission.POST_NOTIFICATIONS"];
  for (const permission of permissions) {
    reportStep(`granting ${permission}`);
    const result = shellText(adb, serial, `pm grant ${ASOL_APPLICATION_ID} ${permission}`);
    if (!result.trim()) {
      console.log(`  ${permission}: granted`);
      continue;
    }
    // Several vendor ROMs (ColorOS among them) refuse GRANT_RUNTIME_PERMISSIONS
    // to the adb shell user. Nothing here can work around that, and printing a
    // forty-line Java trace hides the one thing the reader has to do — so say
    // it in a sentence instead. Not fatal: the install itself succeeded, and
    // the checks that need the permission skip themselves loudly.
    if (/GRANT_RUNTIME_PERMISSIONS|SecurityException/.test(result)) {
      console.warn(
        `  ${permission}: this device refuses permission grants over adb.\n` +
          `  Grant notifications to ${ASOL_APPLICATION_ID} by hand in Settings, or the\n` +
          "  notification checks in the connected-device suite will skip instead of run.",
      );
      continue;
    }
    console.log(`  ${permission}: ${firstLine(result)}`);
  }
}

function firstLine(value: string): string {
  return value.split(/\r?\n/).find((line) => line.trim()) ?? value;
}
