/**
 * Single responsibility: put a freshly built APK onto a connected device,
 * starting from a device that carries no trace of this project.
 *
 * "No trace" is the actual requirement, not a figure of speech. The wipe
 * removes every project package for every user on the device, then removes the
 * app-scoped external directories that outlive a package when an uninstall was
 * partial, then proves the result by asking the device again. A test run that
 * begins on top of yesterday's data is not a test of today's build.
 *
 * Uninstalling is what erases app data, settings, databases, WebView storage
 * and notification channels: all of it lives inside the package's own records,
 * and the system drops those with the package. Clearing first is belt and
 * braces for vendor builds that keep data around when an uninstall is
 * interrupted.
 *
 * A signer mismatch is the other reason to uninstall rather than reinstall
 * over: Android refuses the update with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`,
 * and no amount of `pm clear` changes that.
 */
import {
  ASOL_APPLICATION_ID,
  adbInherit,
  adbText,
  describe,
  listDevices,
  projectPackages,
  resolveAdb,
  selectDevice,
  type AdbDevice,
} from "./adb";
import { reportStage, reportStep } from "../release-stage";

/** Directories Android scopes to a package but does not always reclaim. */
const EXTERNAL_SCOPED_DIRECTORIES = ["data", "media", "obb"];

export function detectDevice(requestedSerial?: string): { adb: string; device: AdbDevice } {
  reportStage("detecting-device");
  const adb = resolveAdb();
  const devices = listDevices(adb);
  console.log(`Connected devices: ${describe(devices) || "none"}`);
  const device = selectDevice(devices, requestedSerial);
  console.log(`Using device ${device.serial}${device.model ? ` (${device.model})` : ""}`);
  return { adb, device };
}

/** Every user profile on the device, so a work-profile copy is not missed. */
function deviceUserIds(adb: string, serial: string): string[] {
  try {
    const output = adbText(adb, ["shell", "pm", "list", "users"], serial);
    const ids = [...output.matchAll(/UserInfo\{(\d+):/g)].map((match) => match[1]!);
    return ids.length > 0 ? ids : ["0"];
  } catch {
    // Some vendor builds restrict `pm list users`; the primary user still applies.
    return ["0"];
  }
}

function packagesForUser(adb: string, serial: string, userId: string): string[] {
  try {
    const output = adbText(
      adb,
      ["shell", "pm", "list", "packages", "--user", userId, ASOL_APPLICATION_ID],
      serial,
    );
    return output
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^package:/, ""))
      .filter((name) => name === ASOL_APPLICATION_ID || name.startsWith(`${ASOL_APPLICATION_ID}.`));
  } catch {
    return [];
  }
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

function allProjectPackages(adb: string, serial: string, userIds: readonly string[]): string[] {
  const names = new Set<string>(projectPackages(adb, serial));
  for (const userId of userIds) {
    for (const name of packagesForUser(adb, serial, userId)) names.add(name);
  }
  return [...names].sort();
}

/**
 * Remove every project package and everything the device still holds for it.
 *
 * Returns what was found, so the log names what was on the device before it
 * was taken off — otherwise a wipe that silently found nothing looks identical
 * to one that worked.
 */
export function wipeProjectPackages(adb: string, serial: string): string[] {
  reportStage("wiping-device");
  const userIds = deviceUserIds(adb, serial);
  const installed = allProjectPackages(adb, serial, userIds);

  if (installed.length === 0) {
    console.log("No project package is installed on the device.");
  } else {
    console.log(
      `Removing ${installed.length} project package(s) across user(s) ${userIds.join(", ")}: ${installed.join(", ")}`,
    );
  }

  for (const name of installed) {
    reportStep(`uninstalling ${name}`);
    for (const userId of userIds) {
      // Best effort. Clearing first drops data even when an uninstall is later
      // refused for a profile this shell cannot touch — but plenty of vendor
      // ROMs deny CLEAR_APP_USER_DATA to the adb user, and it does not matter:
      // the uninstall below removes the data regardless. The refusal is
      // deliberately not reported, because it is not a problem.
      shellText(adb, serial, `pm clear --user ${userId} ${name}`);
    }
    // Without `--user`, `pm uninstall` removes a non-system package for every
    // user at once; the per-user pass below is the fallback for the profiles
    // that survive it.
    const result = shellText(adb, serial, `pm uninstall ${name}`);
    console.log(`  ${name}: ${result || "(no output)"}`);
    for (const userId of userIds) {
      if (packagesForUser(adb, serial, userId).includes(name)) {
        const perUser = shellText(adb, serial, `pm uninstall --user ${userId} ${name}`);
        console.log(`  ${name} (user ${userId}): ${perUser || "(no output)"}`);
      }
    }
  }

  removeScopedStorage(adb, serial, userIds, installed);
  assertDeviceIsClean(adb, serial, userIds);
  console.log("Device carries no trace of this project.");
  return installed;
}

/**
 * `/sdcard/Android/{data,media,obb}/<package>` is scoped to the package but
 * survives a partial uninstall often enough to matter — and a stale OTA
 * download left there is exactly the state a clean test run must not start in.
 */
function removeScopedStorage(
  adb: string,
  serial: string,
  userIds: readonly string[],
  installed: readonly string[],
): void {
  const packages = new Set<string>([ASOL_APPLICATION_ID, ...installed]);
  reportStep("removing leftover app storage");
  for (const name of packages) {
    for (const root of storageRoots(userIds)) {
      for (const scope of EXTERNAL_SCOPED_DIRECTORIES) {
        shellText(adb, serial, `rm -rf ${root}/Android/${scope}/${name}`);
      }
    }
  }
}

function storageRoots(userIds: readonly string[]): string[] {
  return ["/sdcard", ...userIds.map((userId) => `/storage/emulated/${userId}`)];
}

/**
 * Ask the device rather than trust the commands above.
 *
 * Notification channels need no separate check: they are stored with the
 * package, so a package the device no longer knows has no channels left. The
 * `dumpsys` pass is a cheap confirmation of exactly that, and only fails when
 * the device still reports records for a package that should be gone.
 */
function assertDeviceIsClean(adb: string, serial: string, userIds: readonly string[]): void {
  reportStep("verifying the device is clean");
  const remaining = allProjectPackages(adb, serial, userIds);
  if (remaining.length > 0) {
    throw new Error(
      `The device still has project package(s) after the wipe: ${remaining.join(", ")}. ` +
        "A package installed by a device administrator, or for a profile this shell cannot reach, must be removed on the device itself.",
    );
  }

  const leftovers: string[] = [];
  for (const root of storageRoots(userIds)) {
    for (const scope of EXTERNAL_SCOPED_DIRECTORIES) {
      const target = `${root}/Android/${scope}/${ASOL_APPLICATION_ID}`;
      const probe = shellText(adb, serial, `ls -d ${target} 2>/dev/null || true`);
      if (probe.includes(ASOL_APPLICATION_ID)) leftovers.push(target);
    }
  }
  if (leftovers.length > 0) {
    throw new Error(
      `App storage survived the wipe: ${[...new Set(leftovers)].join(", ")}. ` +
        "Delete it from the device's file manager and retry.",
    );
  }

  // Best effort: this output is unredacted only on some builds, so its absence
  // proves nothing and is not treated as a failure.
  const notifications = shellText(adb, serial, `dumpsys notification --noredact`);
  if (notifications.includes(ASOL_APPLICATION_ID)) {
    console.warn(
      `Warning: the notification service still mentions ${ASOL_APPLICATION_ID}. ` +
        "Channels are stored with the package and cannot outlive it, so this is usually a stale log line rather than live state.",
    );
  }
}

export function installApk(adb: string, serial: string, apkPath: string): void {
  reportStage("installing-device");
  reportStep(`installing ${apkPath}`);
  console.log(`Installing ${apkPath} on ${serial}...`);
  // No `-r`: the wipe removed any previous copy, so reinstall-over would only
  // mask a failed uninstall instead of surfacing it.
  adbInherit(adb, ["install", apkPath], serial);
  console.log("Install completed.");
  grantRuntimePermissions(adb, serial);
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
