/**
 * Single responsibility: read and validate the capability requirements emitted
 * by the static build.
 */

import type { Buffer } from "node:buffer";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  ALL_CAPABILITY_KEYS,
  CapabilityKeys,
} from "../../src/native-platform/capabilities/capability-keys";

export interface ScannableBuiltFile {
  bytes: Buffer;
}

export function scanBuiltCapabilities(
  files: Record<string, ScannableBuiltFile>,
): string[] {
  const metadataFile = "asol-required-capabilities.json";
  const generated = files[metadataFile];
  if (!generated) {
    throw new Error(
      `Missing ${metadataFile}; run npm run build:static before checking or publishing an OTA release.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(generated.bytes.toString("utf8"));
  } catch {
    throw new Error(
      `Invalid ${metadataFile}; run npm run build:static before checking or publishing an OTA release.`,
    );
  }
  if (
    !Array.isArray(parsed) ||
    parsed.some(
      (key) => typeof key !== "string" || !ALL_CAPABILITY_KEYS.includes(key),
    )
  ) {
    throw new Error(
      `Invalid ${metadataFile}; run npm run build:static before checking or publishing an OTA release.`,
    );
  }
  return [...new Set<string>(parsed)].sort();
}

const apiPatterns = new Map<string, string>([
  ["camera.takePhoto", CapabilityKeys.CameraTakePhoto],
  ["camera.pickImage", CapabilityKeys.CameraPickImages],
  ["camera.pickImages", CapabilityKeys.CameraPickImages],
  ["location.getCurrentPosition", CapabilityKeys.LocationCurrent],
  ["location.watchPosition", CapabilityKeys.LocationWatch],
  ["speech.startListening", CapabilityKeys.SpeechRecognize],
  ["speechRecognition.transcribeOnce", CapabilityKeys.SpeechRecognize],
  ["speechRecognition.startListening", CapabilityKeys.SpeechRecognize],
  ["files.user.pickFile", CapabilityKeys.FilesPick],
  ["files.user.pickFiles", CapabilityKeys.FilesPick],
  ["files.user.saveFile", CapabilityKeys.FilesSave],
  ["files.user.openFile", CapabilityKeys.FilesOpen],
  ["files.app.", CapabilityKeys.FilesAppStorage],
  ["share.send", CapabilityKeys.ShareSend],
  ["share.receive", CapabilityKeys.ShareReceive],
  ["notifications.push", CapabilityKeys.NotificationsPush],
  ["notifications.local", CapabilityKeys.NotificationsLocal],
  ["pushNotifications.", CapabilityKeys.NotificationsPush],
  ["localNotifications.", CapabilityKeys.NotificationsLocal],
  ["barcode.scan", CapabilityKeys.BarcodeScan],
  ["barcode.startScan", CapabilityKeys.BarcodeScan],
  ["browser.open", CapabilityKeys.BrowserOpen],
  ["haptics.impact", CapabilityKeys.HapticsImpact],
  ["haptics.notification", CapabilityKeys.HapticsNotification],
  ["network.getStatus", CapabilityKeys.NetworkStatus],
  ["network.addListener", CapabilityKeys.NetworkListen],
  ["device.getInfo", CapabilityKeys.DeviceInfo],
  ["device.getId", CapabilityKeys.DeviceId],
  ["clipboard.read", CapabilityKeys.ClipboardRead],
  ["clipboard.write", CapabilityKeys.ClipboardWrite],
  ["statusBar.setStyle", CapabilityKeys.StatusBarStyle],
  ["statusBar.setVisible", CapabilityKeys.StatusBarVisibility],
  ["statusBar.setBackgroundColor", CapabilityKeys.StatusBarBackgroundColor],
  ["keyboard.show", CapabilityKeys.KeyboardControl],
  ["keyboard.hide", CapabilityKeys.KeyboardControl],
  ["keyboard.onWillShow", CapabilityKeys.KeyboardListen],
  ["keyboard.onWillHide", CapabilityKeys.KeyboardListen],
  ["splashScreen.show", CapabilityKeys.SplashScreenControl],
  ["splashScreen.hide", CapabilityKeys.SplashScreenControl],
  ["preferences.get", CapabilityKeys.PreferencesRead],
  ["preferences.set", CapabilityKeys.PreferencesWrite],
  ["preferences.remove", CapabilityKeys.PreferencesWrite],
  ["screenOrientation.current", CapabilityKeys.ScreenOrientationCurrent],
  ["screenOrientation.lock", CapabilityKeys.ScreenOrientationLock],
  ["screenOrientation.unlock", CapabilityKeys.ScreenOrientationLock],
  ["dialog.alert", CapabilityKeys.DialogAlert],
  ["dialog.confirm", CapabilityKeys.DialogConfirm],
  ["dialog.prompt", CapabilityKeys.DialogPrompt],
  ["toast.show", CapabilityKeys.ToastShow],
  ["actionSheet.show", CapabilityKeys.ActionSheetShow],
  ["textZoom.get", CapabilityKeys.TextZoomGet],
  ["textZoom.set", CapabilityKeys.TextZoomSet],
]);

export function scanSourceCapabilityReferences(root: string): string[] {
  const required = new Set<string>();
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (
          fullPath.replace(/\\/g, "/").endsWith("/native-platform") ||
          entry.name === "tests"
        )
          continue;
        visit(fullPath);
      } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
        const source = readFileSync(fullPath, "utf8");
        for (const [token, key] of apiPatterns) {
          const expression = token.endsWith(".")
            ? token.slice(0, -1).replaceAll(".", "\\s*\\.\\s*") + "\\s*\\."
            : token.replaceAll(".", "\\s*\\.\\s*") + "\\s*\\(";
          if (new RegExp(expression).test(source)) required.add(key);
        }
        for (const [name, key] of Object.entries(CapabilityKeys)) {
          if (new RegExp(`CapabilityKeys\\.${name}\\b`).test(source))
            required.add(key);
        }
      }
    }
  };
  visit(root);
  return [...required].sort();
}
