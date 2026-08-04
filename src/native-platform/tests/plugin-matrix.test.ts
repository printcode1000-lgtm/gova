/**
 * Single responsibility: pin the relationship between installed plugins,
 * declared capabilities, and the modules that expose them.
 *
 * Every entry below was verified against the native projects. The test keeps
 * that verification true instead of leaving it to a one-off review: a plugin
 * added to `package.json` but not to a shell, a capability declared for a
 * platform whose project does not build it, or a module with no way to reach
 * the bridge all fail here.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  ALL_CAPABILITY_KEYS,
  CapabilityKeys,
  type CapabilityKey,
} from "../capabilities/capability-keys";
import {
  familyByKey,
  pluginNameByFamily,
} from "../capabilities/capability-registry";
import { compareOtaVersions } from "@/features/ota/utils/ota-state";
import {
  CAPABILITY_AVAILABILITY,
  PLATFORM_OPTIONAL_SHELL_CAPABILITIES,
  SHELL_CAPABILITIES_BY_PLATFORM,
  UNIVERSAL_SHELL_CAPABILITIES,
  shellCapabilitiesFor,
} from "../capabilities/shell-capabilities";
import { nativePlatform } from "../index";

const root = path.resolve(__dirname, "..", "..", "..");

/** npm packages that ship native code, and the capability each one backs. */
const NATIVE_PACKAGES: ReadonlyArray<{
  npmPackage: string;
  androidModule: string;
  /** Absent when the package has no Swift Package Manager support. */
  iosPackage: string | null;
  capabilities: readonly CapabilityKey[];
}> = [
  { npmPackage: "@capacitor/app", androidModule: "capacitor-app", iosPackage: "CapacitorApp", capabilities: [CapabilityKeys.AppState, CapabilityKeys.AppInfo, CapabilityKeys.AppDeepLink, CapabilityKeys.AppExit] },
  { npmPackage: "@capacitor/action-sheet", androidModule: "capacitor-action-sheet", iosPackage: "CapacitorActionSheet", capabilities: [CapabilityKeys.ActionSheetShow] },
  { npmPackage: "@capacitor/browser", androidModule: "capacitor-browser", iosPackage: "CapacitorBrowser", capabilities: [CapabilityKeys.BrowserOpen] },
  { npmPackage: "@capacitor/camera", androidModule: "capacitor-camera", iosPackage: "CapacitorCamera", capabilities: [CapabilityKeys.CameraTakePhoto, CapabilityKeys.CameraPickImages] },
  { npmPackage: "@capacitor/clipboard", androidModule: "capacitor-clipboard", iosPackage: "CapacitorClipboard", capabilities: [CapabilityKeys.ClipboardRead, CapabilityKeys.ClipboardWrite] },
  { npmPackage: "@capacitor/device", androidModule: "capacitor-device", iosPackage: "CapacitorDevice", capabilities: [CapabilityKeys.DeviceInfo, CapabilityKeys.DeviceId] },
  { npmPackage: "@capacitor/dialog", androidModule: "capacitor-dialog", iosPackage: "CapacitorDialog", capabilities: [CapabilityKeys.DialogAlert, CapabilityKeys.DialogConfirm, CapabilityKeys.DialogPrompt] },
  { npmPackage: "@capacitor/filesystem", androidModule: "capacitor-filesystem", iosPackage: "CapacitorFilesystem", capabilities: [CapabilityKeys.FilesAppStorage] },
  { npmPackage: "@capacitor/geolocation", androidModule: "capacitor-geolocation", iosPackage: "CapacitorGeolocation", capabilities: [CapabilityKeys.LocationCurrent, CapabilityKeys.LocationWatch] },
  { npmPackage: "@capacitor/haptics", androidModule: "capacitor-haptics", iosPackage: "CapacitorHaptics", capabilities: [CapabilityKeys.HapticsImpact, CapabilityKeys.HapticsNotification] },
  { npmPackage: "@capacitor/keyboard", androidModule: "capacitor-keyboard", iosPackage: "CapacitorKeyboard", capabilities: [CapabilityKeys.KeyboardControl, CapabilityKeys.KeyboardListen] },
  { npmPackage: "@capacitor/local-notifications", androidModule: "capacitor-local-notifications", iosPackage: "CapacitorLocalNotifications", capabilities: [CapabilityKeys.NotificationsLocal] },
  { npmPackage: "@capacitor/network", androidModule: "capacitor-network", iosPackage: "CapacitorNetwork", capabilities: [CapabilityKeys.NetworkStatus, CapabilityKeys.NetworkListen] },
  { npmPackage: "@capacitor/preferences", androidModule: "capacitor-preferences", iosPackage: "CapacitorPreferences", capabilities: [CapabilityKeys.PreferencesRead, CapabilityKeys.PreferencesWrite] },
  { npmPackage: "@capacitor/push-notifications", androidModule: "capacitor-push-notifications", iosPackage: "CapacitorPushNotifications", capabilities: [CapabilityKeys.NotificationsPush] },
  { npmPackage: "@capacitor/screen-orientation", androidModule: "capacitor-screen-orientation", iosPackage: "CapacitorScreenOrientation", capabilities: [CapabilityKeys.ScreenOrientationLock, CapabilityKeys.ScreenOrientationCurrent] },
  { npmPackage: "@capacitor/share", androidModule: "capacitor-share", iosPackage: "CapacitorShare", capabilities: [CapabilityKeys.ShareSend, CapabilityKeys.FilesSave, CapabilityKeys.FilesOpen] },
  { npmPackage: "@capacitor/splash-screen", androidModule: "capacitor-splash-screen", iosPackage: "CapacitorSplashScreen", capabilities: [CapabilityKeys.SplashScreenControl] },
  { npmPackage: "@capacitor/status-bar", androidModule: "capacitor-status-bar", iosPackage: "CapacitorStatusBar", capabilities: [CapabilityKeys.StatusBarStyle, CapabilityKeys.StatusBarVisibility, CapabilityKeys.StatusBarBackgroundColor] },
  { npmPackage: "@capacitor/text-zoom", androidModule: "capacitor-text-zoom", iosPackage: "CapacitorTextZoom", capabilities: [CapabilityKeys.TextZoomGet, CapabilityKeys.TextZoomSet] },
  { npmPackage: "@capacitor/toast", androidModule: "capacitor-toast", iosPackage: "CapacitorToast", capabilities: [CapabilityKeys.ToastShow] },
  { npmPackage: "@capawesome/capacitor-file-picker", androidModule: "capawesome-capacitor-file-picker", iosPackage: "CapawesomeCapacitorFilePicker", capabilities: [CapabilityKeys.FilesPick] },
  { npmPackage: "@capgo/capacitor-speech-recognition", androidModule: "capgo-capacitor-speech-recognition", iosPackage: "CapgoCapacitorSpeechRecognition", capabilities: [CapabilityKeys.SpeechRecognize] },
  // CocoaPods-only upstream: no Package.swift, and ios/App is an SPM project.
  { npmPackage: "@capacitor-mlkit/barcode-scanning", androidModule: "capacitor-mlkit-barcode-scanning", iosPackage: null, capabilities: [CapabilityKeys.BarcodeScan] },
];

/** Plugins whose Java/Swift lives in this repository. */
const CUSTOM_PLUGINS: ReadonlyArray<{
  jsName: string;
  androidSource: string;
  iosSource: string;
  capabilities: readonly CapabilityKey[];
}> = [
  { jsName: "ShareReceive", androidSource: "ShareReceivePlugin.java", iosSource: "ShareReceivePlugin.swift", capabilities: [CapabilityKeys.ShareReceive] },
  { jsName: "BackgroundDownload", androidSource: "BackgroundDownloadPlugin.java", iosSource: "BackgroundDownloadPlugin.swift", capabilities: [CapabilityKeys.BackgroundDownloadBundle] },
  { jsName: "StorageCapacity", androidSource: "StorageCapacityPlugin.java", iosSource: "StorageCapacityPlugin.swift", capabilities: [CapabilityKeys.StorageCapacityFreeSpace] },
];

function read(relativePath: string): string {
  const absolute = path.join(root, relativePath);
  assert.ok(existsSync(absolute), `Missing project file: ${relativePath}`);
  return readFileSync(absolute, "utf8");
}

function main(): void {
  const packageJson = JSON.parse(read("package.json")) as {
    dependencies?: Record<string, string>;
  };
  const androidSettings = read("android/capacitor.settings.gradle");
  const androidBuild = read("android/app/capacitor.build.gradle");
  const iosPackageSwift = read("ios/App/CapApp-SPM/Package.swift");
  const mainActivity = read(
    "android/app/src/main/java/hgh/asol/app/MainActivity.java",
  );

  // -------------------------------------------------------------------------
  // Every npm plugin is installed, registered, and backs a declared capability
  // -------------------------------------------------------------------------
  for (const entry of NATIVE_PACKAGES) {
    assert.ok(
      packageJson.dependencies?.[entry.npmPackage],
      `${entry.npmPackage} is not a dependency`,
    );
    assert.ok(
      androidSettings.includes(`':${entry.androidModule}'`),
      `${entry.npmPackage} is not included in the Android project`,
    );
    assert.ok(
      androidBuild.includes(`project(':${entry.androidModule}')`),
      `${entry.npmPackage} is not a dependency of the Android app module`,
    );

    for (const key of entry.capabilities) {
      assert.ok(
        shellCapabilitiesFor("android").includes(key),
        `${key} is backed by ${entry.npmPackage} but not declared for Android`,
      );
      const declaredForIos = shellCapabilitiesFor("ios").includes(key);
      if (entry.iosPackage) {
        assert.ok(
          iosPackageSwift.includes(`"${entry.iosPackage}"`),
          `${entry.npmPackage} is not in the iOS Package.swift`,
        );
      } else {
        // No SPM support upstream, so the iOS shell cannot contain it. It must
        // not be declared there — a false declaration is how a platform ends up
        // refusing releases for a feature it can never run.
        assert.equal(
          declaredForIos,
          false,
          `${key} is declared for iOS but ${entry.npmPackage} has no SPM support`,
        );
        assert.ok(
          PLATFORM_OPTIONAL_SHELL_CAPABILITIES.includes(key),
          `${key} exists on one platform only and must be platform-optional`,
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // Custom plugins are registered on both platforms under the same jsName
  // -------------------------------------------------------------------------
  for (const plugin of CUSTOM_PLUGINS) {
    assert.ok(
      existsSync(
        path.join(root, "android/app/src/main/java/hgh/asol/app", plugin.androidSource),
      ),
      `Missing Android source: ${plugin.androidSource}`,
    );
    assert.ok(
      mainActivity.includes(
        `registerPlugin(${plugin.androidSource.replace(".java", "")}.class)`,
      ),
      `${plugin.jsName} is not registered in MainActivity`,
    );
    const swift = read(`ios/App/App/${plugin.iosSource}`);
    assert.ok(
      swift.includes(`jsName = "${plugin.jsName}"`),
      `${plugin.iosSource} does not expose jsName "${plugin.jsName}"`,
    );
    assert.ok(
      read("ios/App/App.xcodeproj/project.pbxproj").includes(
        `${plugin.iosSource} in Sources`,
      ),
      `${plugin.iosSource} is not in the iOS Sources build phase`,
    );
    for (const key of plugin.capabilities) {
      const family = familyByKey.get(key);
      assert.ok(family, `${key} has no plugin family`);
      assert.equal(
        pluginNameByFamily[family],
        plugin.jsName,
        `${key} must resolve through the ${plugin.jsName} bridge`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // The declarations are internally consistent
  // -------------------------------------------------------------------------
  const covered = new Set<CapabilityKey>([
    ...NATIVE_PACKAGES.flatMap((entry) => [...entry.capabilities]),
    ...CUSTOM_PLUGINS.flatMap((plugin) => [...plugin.capabilities]),
  ]);
  for (const key of ALL_CAPABILITY_KEYS) {
    assert.ok(covered.has(key), `${key} is backed by no plugin in the matrix`);
  }

  for (const platform of ["android", "ios"] as const) {
    for (const key of SHELL_CAPABILITIES_BY_PLATFORM[platform]) {
      assert.ok(
        ALL_CAPABILITY_KEYS.includes(key),
        `${platform} declares an unknown capability: ${key}`,
      );
    }
  }
  // Every key states when it became backed and when it became nameable, and a
  // key can never be nameable before it is backed — that ordering is what makes
  // withholding an unnamed key safe instead of a silent hole.
  for (const key of ALL_CAPABILITY_KEYS) {
    const availability = CAPABILITY_AVAILABILITY[key];
    assert.ok(availability, `${key} has no availability record`);
    assert.ok(
      compareOtaVersions(
        availability.vocabularySince,
        availability.backedSince,
      ) >= 0,
      `${key} claims to be nameable (${availability.vocabularySince}) before it is backed (${availability.backedSince})`,
    );
  }

  for (const key of UNIVERSAL_SHELL_CAPABILITIES) {
    assert.equal(
      PLATFORM_OPTIONAL_SHELL_CAPABILITIES.includes(key),
      false,
      `${key} cannot be both universal and platform-optional`,
    );
  }
  assert.deepEqual(
    [...PLATFORM_OPTIONAL_SHELL_CAPABILITIES],
    [CapabilityKeys.BarcodeScan],
    "Barcode scanning is the only platform-asymmetric capability today; " +
      "adding another means reviewing the optional-capability contract",
  );

  // -------------------------------------------------------------------------
  // Every capability is reachable from the public namespace
  // -------------------------------------------------------------------------
  for (const moduleName of [
    "app",
    "camera",
    "location",
    "speech",
    "files",
    "share",
    "notifications",
    "barcode",
    "browser",
    "haptics",
    "network",
    "device",
    "clipboard",
    "statusBar",
    "keyboard",
    "splashScreen",
    "preferences",
    "screenOrientation",
    "dialog",
    "toast",
    "actionSheet",
    "textZoom",
    "backgroundDownload",
    "storageCapacity",
    "capabilities",
    "permissions",
  ] as const) {
    assert.ok(
      nativePlatform[moduleName],
      `nativePlatform.${moduleName} is not exported`,
    );
  }

  console.log("Plugin matrix tests passed.");
}

main();
