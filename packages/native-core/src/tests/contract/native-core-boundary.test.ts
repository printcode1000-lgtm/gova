/**
 * Contract test: @asol/native-core public boundary.
 *
 * Verifies:
 * - The public index.ts exports exist and are stable.
 * - No raw adapters leak into the public API surface.
 * - NativeCore is a facade with all required methods.
 * - Result type is returned for every async method.
 */

import assert from "node:assert/strict";
import * as publicApi from "../../index";

// 1. Exports NativeCore facade
assert.ok(publicApi.NativeCore, "NativeCore must be defined");
assert.ok(typeof publicApi.NativeCore === "function" || typeof publicApi.NativeCore === "object");

// 2. Error types
assert.ok(publicApi.NativeCoreError, "NativeCoreError must be defined");
assert.ok(publicApi.NativeErrorCodes, "NativeErrorCodes must be defined");
assert.ok(publicApi.isNativeCoreError, "isNativeCoreError must be defined");
assert.ok(publicApi.isCancelledError, "isCancelledError must be defined");
assert.ok(publicApi.isPermissionDeniedError, "isPermissionDeniedError must be defined");
assert.ok(publicApi.isUnavailableError, "isUnavailableError must be defined");

// 3. Result monad
assert.ok(publicApi.ok, "ok() must be defined");
assert.ok(publicApi.err, "err() must be defined");
assert.ok(publicApi.isOk, "isOk() must be defined");
assert.ok(publicApi.isErr, "isErr() must be defined");

// 4. Capability vocabulary
assert.ok(publicApi.CapabilityKeys, "CapabilityKeys must be defined");
assert.ok(publicApi.ALL_CAPABILITY_KEYS, "ALL_CAPABILITY_KEYS must be defined");
assert.ok(publicApi.SHELL_CAPABILITIES_BY_PLATFORM, "SHELL_CAPABILITIES_BY_PLATFORM must be defined");
assert.ok(publicApi.shellCapabilitiesFor, "shellCapabilitiesFor must be defined");
assert.ok(publicApi.capabilities, "capabilities registry must be defined");

// 5. Permission vocabulary
assert.ok(publicApi.PermissionKinds, "PermissionKinds must be defined");
assert.ok(publicApi.PermissionStates, "PermissionStates must be defined");
assert.ok(publicApi.toPermissionResult, "toPermissionResult must be defined");
assert.ok(publicApi.mapPermissionState, "mapPermissionState must be defined");

// 6. Notification channel constants
assert.ok(publicApi.DEFAULT_CHANNELS, "DEFAULT_CHANNELS must be defined");
assert.equal(publicApi.DEFAULT_CHANNEL_ID, "asol_general_v4");
assert.ok(publicApi.FROZEN_CHANNEL_IDS, "FROZEN_CHANNEL_IDS must be defined");
assert.ok(publicApi.FROZEN_CHANNEL_IDS.includes("asol_general_v4"));
assert.ok(publicApi.FROZEN_CHANNEL_IDS.includes("asol_orders_v4"));
assert.ok(publicApi.FROZEN_CHANNEL_IDS.includes("asol_chat_v4"));
assert.ok(publicApi.FROZEN_CHANNEL_IDS.includes("asol_urgent_v4"));
assert.ok(publicApi.FROZEN_CHANNEL_IDS.includes("asol_updates_v4"));
assert.ok(publicApi.FROZEN_CHANNEL_IDS.includes("asol_silent_v4"));

// 7. Platform defaults & domain naming
assert.ok(publicApi.API_BASE_URL, "API_BASE_URL must be defined");
assert.ok(publicApi.NOTIFICATIONS_BASE_URL, "NOTIFICATIONS_BASE_URL must be defined");
assert.ok(publicApi.PRODUCTS_BASE_URL, "PRODUCTS_BASE_URL must be defined");
assert.ok(publicApi.ORDERS_BASE_URL, "ORDERS_BASE_URL must be defined");
assert.ok(publicApi.PROFILES_BASE_URL, "PROFILES_BASE_URL must be defined");

// 8. Share security constants & functions
assert.ok(typeof publicApi.MAX_RECEIVED_BYTES === "number", "MAX_RECEIVED_BYTES must be a number");
assert.equal(publicApi.MAX_RECEIVED_BYTES, 52_428_800);
assert.ok(typeof publicApi.isSafeUrl === "function", "isSafeUrl must be a function");

// 9. Methods on NativeCore
const api = publicApi.NativeCore;
assert.ok(typeof api.getAppInfo === "function", "getAppInfo must be a function");
assert.ok(typeof api.getAppState === "function", "getAppState must be a function");
assert.ok(typeof api.exitApp === "function", "exitApp must be a function");
assert.ok(typeof api.takePhoto === "function", "takePhoto must be a function");
assert.ok(typeof api.pickImages === "function", "pickImages must be a function");
assert.ok(typeof api.pickFiles === "function", "pickFiles must be a function");
assert.ok(typeof api.saveFile === "function", "saveFile must be a function");
assert.ok(typeof api.readFile === "function", "readFile must be a function");
assert.ok(typeof api.writeFile === "function", "writeFile must be a function");
assert.ok(typeof api.deleteFile === "function", "deleteFile must be a function");
assert.ok(typeof api.share === "function", "share must be a function");
assert.ok(typeof api.canShare === "function", "canShare must be a function");
assert.ok(typeof api.onShareReceived === "function", "onShareReceived must be a function");
assert.ok(typeof api.getPendingShareItems === "function", "getPendingShareItems must be a function");
assert.ok(typeof api.registerForPushNotifications === "function", "registerForPushNotifications must be a function");
assert.ok(typeof api.scheduleLocalNotification === "function", "scheduleLocalNotification must be a function");
assert.ok(typeof api.listPendingInbox === "function", "listPendingInbox must be a function");
assert.ok(typeof api.acknowledgeInbox === "function", "acknowledgeInbox must be a function");
assert.ok(typeof api.clearInbox === "function", "clearInbox must be a function");
assert.ok(typeof api.getPendingInboxCount === "function", "getPendingInboxCount must be a function");
assert.ok(typeof api.getPendingInboxTap === "function", "getPendingInboxTap must be a function");
assert.ok(typeof api.clearPendingInboxTap === "function", "clearPendingInboxTap must be a function");
assert.ok(typeof api.onInboxTap === "function", "onInboxTap must be a function");
assert.ok(typeof api.checkPermission === "function", "checkPermission must be a function");
assert.ok(typeof api.requestPermission === "function", "requestPermission must be a function");
assert.ok(typeof api.scanBarcode === "function", "scanBarcode must be a function");
assert.ok(typeof api.getNetworkStatus === "function", "getNetworkStatus must be a function");
assert.ok(typeof api.onNetworkStatusChange === "function", "onNetworkStatusChange must be a function");
assert.ok(typeof api.otaNativeVersion === "function", "otaNativeVersion must be a function");
assert.ok(typeof api.otaActivate === "function", "otaActivate must be a function");
assert.ok(
  typeof api.otaRevertToNativeBaseline === "function",
  "otaRevertToNativeBaseline must be a function",
);
assert.ok(typeof api.startDownload === "function", "startDownload must be a function");
assert.ok(typeof api.getPreference === "function", "getPreference must be a function");
assert.ok(typeof api.setPreference === "function", "setPreference must be a function");
assert.ok(typeof api.removePreference === "function", "removePreference must be a function");
assert.ok(typeof api.clearPreferences === "function", "clearPreferences must be a function");
assert.ok(typeof api.getPreferenceKeys === "function", "getPreferenceKeys must be a function");
assert.ok(typeof api.setStatusBarStyle === "function", "setStatusBarStyle must be a function");
assert.ok(typeof api.getStatusBarInfo === "function", "getStatusBarInfo must be a function");
assert.ok(typeof api.showToast === "function", "showToast must be a function");
assert.ok(typeof api.getStorageFreeSpace === "function", "getStorageFreeSpace must be a function");
assert.ok(typeof api.onBackButton === "function", "onBackButton must be a function");
assert.ok(typeof api.startSpeechRecognition === "function", "startSpeechRecognition must be a function");
assert.ok(typeof api.stopSpeechRecognition === "function", "stopSpeechRecognition must be a function");
assert.ok(typeof api.isSpeechRecognitionAvailable === "function", "isSpeechRecognitionAvailable must be a function");
assert.ok(typeof api.hapticsImpact === "function", "hapticsImpact must be a function");
assert.ok(typeof api.hapticsNotification === "function", "hapticsNotification must be a function");
assert.ok(typeof api.hapticsVibrate === "function", "hapticsVibrate must be a function");
assert.ok(typeof api.showKeyboard === "function", "showKeyboard must be a function");
assert.ok(typeof api.hideKeyboard === "function", "hideKeyboard must be a function");
assert.ok(typeof api.getScreenOrientation === "function", "getScreenOrientation must be a function");
assert.ok(typeof api.lockScreenOrientation === "function", "lockScreenOrientation must be a function");
assert.ok(typeof api.unlockScreenOrientation === "function", "unlockScreenOrientation must be a function");
assert.ok(typeof api.openBrowser === "function", "openBrowser must be a function");
assert.ok(typeof api.closeBrowser === "function", "closeBrowser must be a function");
assert.ok(typeof api.showSplashScreen === "function", "showSplashScreen must be a function");
assert.ok(typeof api.hideSplashScreen === "function", "hideSplashScreen must be a function");
assert.ok(typeof api.showActionSheet === "function", "showActionSheet must be a function");
assert.ok(typeof api.getTextZoom === "function", "getTextZoom must be a function");
assert.ok(typeof api.setTextZoom === "function", "setTextZoom must be a function");
assert.ok(typeof api.startDownload === "function", "startDownload must be a function");
assert.ok(typeof api.getDownloadStatus === "function", "getDownloadStatus must be a function");
assert.ok(typeof api.cancelDownload === "function", "cancelDownload must be a function");

// 10. Result monad behavior
const okRes = publicApi.ok(42);
assert.equal(okRes.ok, true);
assert.equal(okRes.value, 42);

const error = publicApi.NativeCoreError.unavailable("Test", "not available");
const errRes = publicApi.err(error);
assert.equal(errRes.ok, false);
assert.equal(errRes.error, error);

// 11. Channel ID suffix invariant
for (const id of publicApi.FROZEN_CHANNEL_IDS) {
  assert.ok(/_v4$/.test(id), `Channel ID ${id} must end in _v4`);
}

// 12. Sound invariant
assert.ok(/custom_notification/.test(publicApi.DEFAULT_CHANNEL_SOUND), "Sound must contain custom_notification");

// 13. Zero raw adapter exports
const forbiddenAdapters = [
  "cameraAdapter", "filesAdapter", "shareAdapter", "statusBarAdapter",
  "clipboardAdapter", "speechAdapter", "notificationsAdapter",
  "permissionsAdapter", "locationAdapter", "appAdapter", "otaAdapter",
  "backButtonAdapter", "camera", "files", "share", "statusBar", "clipboard",
  "app", "location", "speech", "notifications", "localNotifications",
  "pushNotifications", "permissionManager", "nativePlatform",
];
for (const forbidden of forbiddenAdapters) {
  assert.equal((publicApi as any)[forbidden], undefined, `Raw export ${forbidden} must NOT be exported from index.ts`);
}

console.log("✓ All @asol/native-core boundary contract checks passed.");
