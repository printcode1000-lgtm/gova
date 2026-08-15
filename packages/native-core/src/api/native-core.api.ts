/**
 * Public unified facade for @asol/native-core.
 *
 * Every method returns a Result union ({ ok: true, value } | { ok: false, error: NativeCoreError }).
 * Zero Capacitor types leak through. Zero raw adapters exposed.
 */

import { appApi } from "./app.api";
import { cameraApi } from "./camera.api";
import { clipboardApi } from "./clipboard.api";
import { dialogApi } from "./dialog.api";
import { downloadApi } from "./download.api";
import { filesApi } from "./files.api";
import { hapticsApi } from "./haptics.api";
import { keyboardApi } from "./keyboard.api";
import { locationApi } from "./location.api";
import { networkApi } from "./network.api";
import { notificationsApi } from "./notifications.api";
import { otaApi } from "./ota.api";
import { permissionsApi } from "./permissions.api";
import { shareApi } from "./share.api";
import { speechApi } from "./speech.api";
import { statusBarApi } from "./statusBar.api";
import { storageApi } from "./storage.api";
import { toastApi } from "./toast.api";
import { browserApi } from "./browser.api";
import { screenOrientationApi } from "./screenOrientation.api";
import { barcodeApi } from "./barcode.api";
import { deviceApi } from "./device.api";
import { splashApi } from "./splash.api";
import { backButtonApi } from "./backButton.api";
import { actionSheetApi } from "./actionSheet.api";
import { preferencesApi } from "./preferences.api";
import { textZoomApi } from "./textZoom.api";
import { httpApi } from "./http.api";
import {
  isNativePlatform,
  getPlatformName,
  isAndroid,
  isIos,
} from "../adapters/platform.adapter";

export class NativeCore {
  // Platform
  static readonly isNative = isNativePlatform;
  static readonly getPlatform = getPlatformName;
  static readonly isAndroid = isAndroid;
  static readonly isIos = isIos;

  // HTTP
  static readonly httpGetJson = httpApi.httpGetJson;
  static readonly httpGetBinary = httpApi.httpGetBinary;
  // App
  static readonly getAppInfo = appApi.getAppInfo;
  static readonly getAppState = appApi.getAppState;
  static readonly getLaunchUrl = appApi.getLaunchUrl;
  static readonly exitApp = appApi.exitApp;
  static readonly minimizeApp = appApi.minimizeApp;
  static readonly onAppStateChange = appApi.onAppStateChange;
  static readonly onAppUrlOpen = appApi.onAppUrlOpen;
  static readonly onAppRestoredResult = appApi.onAppRestoredResult;

  // Back button
  static readonly onBackButton = backButtonApi.onBackButton;

  // Camera
  static readonly takePhoto = cameraApi.takePhoto;
  static readonly pickImages = cameraApi.pickImages;

  // Clipboard
  static readonly readClipboard = clipboardApi.readClipboard;
  static readonly writeClipboard = clipboardApi.writeClipboard;

  // Dialog
  static readonly alert = dialogApi.alert;
  static readonly confirm = dialogApi.confirm;
  static readonly prompt = dialogApi.prompt;

  // Background Download
  static readonly startDownload = downloadApi.startDownload;
  static readonly getDownloadStatus = downloadApi.getDownloadStatus;
  static readonly cancelDownload = downloadApi.cancelDownload;
  static readonly startBackgroundDownload = downloadApi.startDownload;
  static readonly getBackgroundDownloadStatus = downloadApi.getDownloadStatus;
  static readonly cancelBackgroundDownload = downloadApi.cancelDownload;

  // Files
  static readonly pickFiles = filesApi.pickFiles;
  static readonly saveFile = filesApi.saveFile;
  static readonly readFile = filesApi.readFile;
  static readonly writeFile = filesApi.writeFile;
  static readonly deleteFile = filesApi.deleteFile;
  static readonly openFileExternally = filesApi.openFileExternally;

  // Haptics
  static readonly hapticsImpact = hapticsApi.hapticsImpact;
  static readonly hapticsNotification = hapticsApi.hapticsNotification;
  static readonly hapticsVibrate = hapticsApi.hapticsVibrate;
  static readonly hapticsSelectionStart = hapticsApi.hapticsSelectionStart;
  static readonly hapticsSelectionChanged = hapticsApi.hapticsSelectionChanged;
  static readonly hapticsSelectionEnd = hapticsApi.hapticsSelectionEnd;

  // Keyboard
  static readonly showKeyboard = keyboardApi.showKeyboard;
  static readonly hideKeyboard = keyboardApi.hideKeyboard;
  static readonly setKeyboardResize = keyboardApi.setKeyboardResize;
  static readonly getKeyboardResize = keyboardApi.getKeyboardResize;
  static readonly setKeyboardAccessoryBarVisible = keyboardApi.setKeyboardAccessoryBarVisible;
  static readonly onKeyboardWillShow = keyboardApi.onKeyboardWillShow;
  static readonly onKeyboardDidShow = keyboardApi.onKeyboardDidShow;
  static readonly onKeyboardWillHide = keyboardApi.onKeyboardWillHide;
  static readonly onKeyboardDidHide = keyboardApi.onKeyboardDidHide;

  // Location
  static readonly getCurrentPosition = locationApi.getCurrentPosition;
  static readonly watchPosition = locationApi.watchPosition;
  static readonly clearWatch = locationApi.clearWatch;

  // Network
  static readonly getNetworkStatus = networkApi.getNetworkStatus;
  static readonly onNetworkStatusChange = networkApi.onNetworkStatusChange;

  // Notifications
  static readonly registerForPushNotifications = notificationsApi.registerForPushNotifications;
  static readonly unregisterForPushNotifications = notificationsApi.unregisterForPushNotifications;
  static readonly ensureNotificationChannels = notificationsApi.ensureNotificationChannels;
  static readonly scheduleLocalNotification = notificationsApi.scheduleLocalNotification;
  static readonly getDeliveredNotifications = notificationsApi.getDeliveredNotifications;
  static readonly removeDeliveredNotifications = notificationsApi.removeDeliveredNotifications;
  static readonly removeAllDeliveredNotifications = notificationsApi.removeAllDeliveredNotifications;
  static readonly onPushToken = notificationsApi.onPushToken;
  static readonly onPushNotificationReceived = notificationsApi.onPushNotificationReceived;
  static readonly onPushNotificationActionPerformed = notificationsApi.onPushNotificationActionPerformed;
  static readonly listPendingInbox = notificationsApi.listPendingInbox;
  static readonly acknowledgeInbox = notificationsApi.acknowledgeInbox;
  static readonly clearInbox = notificationsApi.clearInbox;
  static readonly getPendingInboxCount = notificationsApi.getPendingInboxCount;
  static readonly getPendingInboxTap = notificationsApi.getPendingInboxTap;
  static readonly clearPendingInboxTap = notificationsApi.clearPendingInboxTap;
  static readonly onInboxTap = notificationsApi.onInboxTap;

  // OTA
  static readonly isOtaAvailable = otaApi.isOtaAvailable;
  static readonly otaNativeVersion = otaApi.otaNativeVersion;
  static readonly otaCurrentBasePath = otaApi.otaCurrentBasePath;
  static readonly otaIsWorkingPath = otaApi.otaIsWorkingPath;
  static readonly otaPrepareWorkingBaseline = otaApi.otaPrepareWorkingBaseline;
  static readonly otaWriteWorkingFile = otaApi.otaWriteWorkingFile;
  static readonly otaReadWorkingFile = otaApi.otaReadWorkingFile;
  static readonly otaPrepareRelease = otaApi.otaPrepareRelease;
  static readonly otaReleaseFileExists = otaApi.otaReleaseFileExists;
  static readonly otaBeginReleaseFile = otaApi.otaBeginReleaseFile;
  static readonly otaAppendReleaseFile = otaApi.otaAppendReleaseFile;
  static readonly otaWriteReleaseFile = otaApi.otaWriteReleaseFile;
  static readonly otaWriteReleaseTextFile = otaApi.otaWriteReleaseTextFile;
  static readonly otaReadReleaseFile = otaApi.otaReadReleaseFile;
  static readonly otaFinalizeCandidate = otaApi.otaFinalizeCandidate;
  static readonly otaActivationPath = otaApi.otaActivationPath;
  static readonly otaActivate = otaApi.otaActivate;
  static readonly otaPersistCurrentPath = otaApi.otaPersistCurrentPath;
  static readonly otaConfirmActivation = otaApi.otaConfirmActivation;
  static readonly otaRollbackDelta = otaApi.otaRollbackDelta;
  static readonly otaCleanupTransaction = otaApi.otaCleanupTransaction;
  static readonly otaRevertToNativeBaseline = otaApi.otaRevertToNativeBaseline;

  // Permissions
  static readonly checkPermission = permissionsApi.checkPermission;
  static readonly requestPermission = permissionsApi.requestPermission;
  static readonly openSettings = permissionsApi.openSettings;
  static readonly openAppSettings = permissionsApi.openSettings;

  // Share
  static readonly share = shareApi.share;
  static readonly canShare = shareApi.canShare;
  static readonly getPendingShareItems = shareApi.getPendingShareItems;
  static readonly onShareReceived = shareApi.onShareReceived;

  // Speech
  static readonly startSpeechRecognition = speechApi.startSpeechRecognition;
  static readonly stopSpeechRecognition = speechApi.stopSpeechRecognition;
  static readonly isSpeechRecognitionAvailable = speechApi.isSpeechRecognitionAvailable;
  static readonly checkSpeechPermissions = speechApi.checkSpeechPermissions;
  static readonly requestSpeechPermissions = speechApi.requestSpeechPermissions;

  // Status Bar
  static readonly setStatusBarStyle = statusBarApi.setStatusBarStyle;
  static readonly setStatusBarBackgroundColor = statusBarApi.setStatusBarBackgroundColor;
  static readonly showStatusBar = statusBarApi.showStatusBar;
  static readonly hideStatusBar = statusBarApi.hideStatusBar;
  static readonly getStatusBarInfo = statusBarApi.getStatusBarInfo;
  static readonly setStatusBarOverlaysWebView = statusBarApi.setStatusBarOverlaysWebView;

  // Storage
  static readonly getStorageFreeSpace = storageApi.getStorageFreeSpace;

  // Toast
  static readonly showToast = toastApi.showToast;

  // Browser
  static readonly openBrowser = browserApi.openBrowser;
  static readonly closeBrowser = browserApi.closeBrowser;

  // Screen Orientation
  static readonly getScreenOrientation = screenOrientationApi.getScreenOrientation;
  static readonly lockScreenOrientation = screenOrientationApi.lockScreenOrientation;
  static readonly unlockScreenOrientation = screenOrientationApi.unlockScreenOrientation;

  // Barcode
  static readonly scanBarcode = barcodeApi.scanBarcode;

  // Device
  static readonly getDeviceInfo = deviceApi.getDeviceInfo;
  static readonly getDeviceId = deviceApi.getDeviceId;
  static readonly getDeviceBatteryInfo = deviceApi.getDeviceBatteryInfo;

  // Splash Screen
  static readonly showSplashScreen = splashApi.showSplashScreen;
  static readonly hideSplashScreen = splashApi.hideSplashScreen;

  // Action Sheet
  static readonly showActionSheet = actionSheetApi.showActionSheet;

  // Preferences
  static readonly getPreference = preferencesApi.getPreference;
  static readonly setPreference = preferencesApi.setPreference;
  static readonly removePreference = preferencesApi.removePreference;
  static readonly clearPreferences = preferencesApi.clearPreferences;
  static readonly getPreferenceKeys = preferencesApi.getPreferenceKeys;

  // Text Zoom
  static readonly getTextZoom = textZoomApi.getTextZoom;
  static readonly setTextZoom = textZoomApi.setTextZoom;
}
