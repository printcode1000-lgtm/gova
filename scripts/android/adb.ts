/**
 * Single responsibility: talk to connected Android devices through adb.
 *
 * The release scripts already resolve the SDK to find `apksigner`; this does
 * the same for `adb` rather than trusting it to be on PATH, because on Windows
 * the SDK is installed per-user and PATH usually does not carry it.
 *
 * Every failure here is reported by name. "No device" and "device present but
 * unauthorized" are different problems with different fixes, and a script that
 * collapses them into one message sends people to the wrong one.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export const ASOL_APPLICATION_ID = "hgh.asol.app";

export interface AdbDevice {
  serial: string;
  state: string;
  model?: string;
}

export function resolveAdb(): string {
  const sdkRoot = process.env.ANDROID_SDK_ROOT
    ?? process.env.ANDROID_HOME
    ?? (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk") : undefined);
  const executable = process.platform === "win32" ? "adb.exe" : "adb";
  if (sdkRoot) {
    const candidate = path.join(sdkRoot, "platform-tools", executable);
    if (existsSync(candidate)) return candidate;
  }
  // A PATH-resolved adb is a legitimate setup; only fail once neither works.
  try {
    execFileSync(executable, ["version"], { stdio: "ignore" });
    return executable;
  } catch {
    throw new Error(
      "adb was not found. Install Android platform-tools, or set ANDROID_SDK_ROOT to the SDK directory.",
    );
  }
}

/**
 * `stderr` is captured rather than inherited: several of these commands are
 * expected to fail on some devices — clearing data, granting permissions — and
 * the Android shell answers with a forty-line Java trace. Letting that reach
 * the job log makes a successful wipe look like a catastrophe. The caller
 * decides what, if anything, is worth printing.
 */
export function adbText(adb: string, args: string[], serial?: string): string {
  return execFileSync(adb, [...(serial ? ["-s", serial] : []), ...args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function adbInherit(adb: string, args: string[], serial?: string): void {
  execFileSync(adb, [...(serial ? ["-s", serial] : []), ...args], { stdio: "inherit" });
}

export function listDevices(adb: string): AdbDevice[] {
  const output = adbText(adb, ["devices", "-l"]);
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state, ...rest] = line.split(/\s+/);
      const model = rest.find((part) => part.startsWith("model:"))?.slice("model:".length);
      return { serial: serial!, state: state ?? "unknown", model };
    })
    .filter((device) => device.serial && !device.serial.startsWith("*"));
}

/**
 * The one device to act on.
 *
 * A device listed as `unauthorized` or `offline` is named rather than skipped:
 * it is almost always the device the person meant, and the fix is a tap on its
 * screen, not a different command.
 */
export function selectDevice(devices: readonly AdbDevice[], requested?: string): AdbDevice {
  if (requested) {
    const match = devices.find((device) => device.serial === requested);
    if (!match) {
      throw new Error(
        `Requested device ${requested} is not connected. Connected: ${describe(devices) || "none"}`,
      );
    }
    if (match.state !== "device") throw new Error(unusableMessage(match));
    return match;
  }
  const usable = devices.filter((device) => device.state === "device");
  if (usable.length === 1) return usable[0]!;
  if (usable.length === 0) {
    const blocked = devices.find((device) => device.state !== "device");
    if (blocked) throw new Error(unusableMessage(blocked));
    throw new Error(
      "No Android device is connected. Attach a device with USB debugging enabled, or start an emulator.",
    );
  }
  throw new Error(
    `More than one device is connected; choose one with --device=<serial>. Connected: ${describe(usable)}`,
  );
}

function unusableMessage(device: AdbDevice): string {
  if (device.state === "unauthorized") {
    return `Device ${device.serial} has not authorized this computer. Accept the USB debugging prompt on the device, then retry.`;
  }
  return `Device ${device.serial} is ${device.state} and cannot be used.`;
}

export function describe(devices: readonly AdbDevice[]): string {
  return devices.map((device) => `${device.serial}${device.model ? ` (${device.model})` : ""} [${device.state}]`).join(", ");
}

/**
 * Every package this project installs, as the device currently sees it.
 *
 * The instrumentation package (`<id>.test`) is included deliberately: leaving
 * it behind is how a device ends up running yesterday's instrumented tests
 * against today's build.
 */
export function projectPackages(adb: string, serial: string): string[] {
  const output = adbText(adb, ["shell", "pm", "list", "packages", ASOL_APPLICATION_ID], serial);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^package:/, ""))
    .filter((name) => name === ASOL_APPLICATION_ID || name.startsWith(`${ASOL_APPLICATION_ID}.`));
}

export function readDeviceArgument(args: readonly string[]): string | undefined {
  const flag = args.find((argument) => argument.startsWith("--device="));
  const serial = flag?.slice("--device=".length).trim();
  if (flag && !serial) throw new Error("Use --device=<serial> with a device serial.");
  return serial || undefined;
}
