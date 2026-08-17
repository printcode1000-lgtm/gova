import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

if (process.env.VERCEL === "1") {
  console.log(
    "Skipping iOS push policy validation on Vercel: gitignored iOS credentials and Firebase plist files are not uploaded.",
  );
  process.exit(0);
}

const expected = {
  bundleId: "hgh.asol.app",
  firebaseProjectId: "asole-73f1f",
  firebaseProjectNumber: "543298343631",
  firebaseAppId: "1:543298343631:ios:9c65ac6e8871ec7c609dba",
  firebaseEncodedAppId:
    "app-1-543298343631-ios-9c65ac6e8871ec7c609dba",
} as const;

function read(relativePath: string): string {
  const absolutePath = path.resolve(relativePath);
  if (!existsSync(absolutePath)) throw new Error(`Missing ${relativePath}`);
  return readFileSync(absolutePath, "utf8");
}

const project = read("ios/App/App.xcodeproj/project.pbxproj");
const entitlements = read("ios/App/App/App.entitlements");
const appDelegate = read("ios/App/App/AppDelegate.swift");
const infoPlist = read("ios/App/App/Info.plist");
const capAppSpm = read("ios/App/CapApp-SPM/Package.swift");
const capacitorConfig = read("capacitor.config.ts");
const envExample = read(".env.example");
const firebaseConfig = read("ios/App/App/GoogleService-Info.plist");
const customNotificationSound = path.resolve(
  "ios",
  "App",
  "App",
  "custom_notification.caf",
);
const errors: string[] = [];

function requireText(source: string, value: string, message: string): void {
  if (!source.includes(value)) errors.push(message);
}

// Xcode project SPM dependency checks for Firebase Messaging
requireText(
  project,
  'repositoryURL = "https://github.com/firebase/firebase-ios-sdk.git";',
  "project.pbxproj must contain the firebase-ios-sdk repository URL.",
);
requireText(
  project,
  "kind = exactVersion;",
  "project.pbxproj must pin firebase-ios-sdk using exactVersion.",
);
requireText(
  project,
  "productName = FirebaseMessaging;",
  "project.pbxproj must declare the FirebaseMessaging product dependency for the App target.",
);

// AppDelegate Firebase initialization and token handling checks
requireText(
  appDelegate,
  "FirebaseApp.configure()",
  "AppDelegate must call FirebaseApp.configure() in didFinishLaunchingWithOptions.",
);
requireText(
  appDelegate,
  "import FirebaseMessaging",
  "AppDelegate must import FirebaseMessaging.",
);
requireText(
  appDelegate,
  "Messaging.messaging().apnsToken = deviceToken",
  "AppDelegate must hand the raw APNs device token to Messaging.messaging().apnsToken.",
);
requireText(
  appDelegate,
  "Messaging.messaging().token {",
  "AppDelegate must request the FCM token inside didRegisterForRemoteNotificationsWithDeviceToken: NativePushService.register() waits 20s for a token event, and Firebase's own didReceiveRegistrationToken fires before any listener exists.",
);
requireText(
  appDelegate,
  "didReceiveRegistrationToken",
  "AppDelegate must implement messaging(_:didReceiveRegistrationToken:) to forward FCM tokens to Capacitor.",
);
if (appDelegate.includes("object: deviceToken")) {
  errors.push(
    "AppDelegate must no longer post raw Data deviceToken to Capacitor; it must hand APNs token to FirebaseMessaging and post the FCM token String.",
  );
}

// Info.plist swizzling configuration check
requireText(
  infoPlist,
  "<key>FirebaseAppDelegateProxyEnabled</key>",
  "Info.plist must declare FirebaseAppDelegateProxyEnabled.",
);
// The key alone proves nothing: Info.plist contains several unrelated <false/>
// values, so the pair has to be matched together.
if (!/<key>FirebaseAppDelegateProxyEnabled<\/key>\s*<false\/>/.test(infoPlist)) {
  errors.push(
    "Info.plist must set FirebaseAppDelegateProxyEnabled to <false/>; the app forwards APNs and FCM tokens explicitly and must not also be swizzled.",
  );
}

// CapApp-SPM regression check (Capacitor sync erases additions there)
if (capAppSpm.includes("Firebase") || capAppSpm.includes("firebase-ios-sdk")) {
  errors.push(
    "ios/App/CapApp-SPM/Package.swift must not contain Firebase dependencies; Capacitor CLI sync will erase them.",
  );
}

requireText(
  project,
  `PRODUCT_BUNDLE_IDENTIFIER = ${expected.bundleId};`,
  `Xcode bundle identifier must be ${expected.bundleId}.`,
);
requireText(
  project,
  "CODE_SIGN_ENTITLEMENTS = App/App.entitlements;",
  "The App target must sign with App/App.entitlements.",
);
requireText(
  project,
  "ASOL_APNS_ENVIRONMENT = development;",
  "Debug must use the APNs development environment.",
);
requireText(
  project,
  "ASOL_APNS_ENVIRONMENT = production;",
  "Release must use the APNs production environment.",
);
requireText(
  project,
  "com.apple.Push",
  "The Xcode Push Notifications capability is not enabled.",
);
requireText(
  project,
  "GoogleService-Info.plist in Resources",
  "The Firebase Apple configuration must belong to the App resources target.",
);
requireText(
  project,
  "custom_notification.caf in Resources",
  "The custom Apple notification sound must belong to the App resources target.",
);
if (!existsSync(customNotificationSound)) {
  errors.push("The custom Apple notification sound is missing.");
} else if (
  readFileSync(customNotificationSound).subarray(0, 4).toString("ascii") !==
  "caff"
) {
  errors.push("The custom Apple notification sound is not a valid CAF file.");
}
requireText(
  entitlements,
  "<key>aps-environment</key>",
  "The APNs entitlement is missing.",
);
requireText(
  entitlements,
  "$(ASOL_APNS_ENVIRONMENT)",
  "The APNs entitlement must follow the build configuration.",
);
requireText(
  appDelegate,
  ".capacitorDidRegisterForRemoteNotifications",
  "AppDelegate does not forward successful APNs registration to Capacitor.",
);
requireText(
  appDelegate,
  ".capacitorDidFailToRegisterForRemoteNotifications",
  "AppDelegate does not forward APNs registration failures to Capacitor.",
);
requireText(
  capacitorConfig,
  `appId: "${expected.bundleId}"`,
  `Capacitor appId must be ${expected.bundleId}.`,
);

for (const [key, value] of [
  ["FIREBASE_PROJECT_ID", expected.firebaseProjectId],
  ["FIREBASE_PROJECT_NUMBER", expected.firebaseProjectNumber],
  ["FIREBASE_IOS_APP_ID", expected.firebaseAppId],
  ["FIREBASE_IOS_ENCODED_APP_ID", expected.firebaseEncodedAppId],
  ["FIREBASE_IOS_BUNDLE_ID", expected.bundleId],
] as const) {
  requireText(envExample, `${key}=${value}`, `${key} identity is incorrect.`);
}

for (const [key, value] of [
  ["BUNDLE_ID", expected.bundleId],
  ["PROJECT_ID", expected.firebaseProjectId],
  ["GCM_SENDER_ID", expected.firebaseProjectNumber],
  ["GOOGLE_APP_ID", expected.firebaseAppId],
] as const) {
  requireText(
    firebaseConfig,
    `<key>${key}</key>`,
    `GoogleService-Info.plist is missing ${key}.`,
  );
  requireText(
    firebaseConfig,
    `<string>${value}</string>`,
    `GoogleService-Info.plist ${key} identity is incorrect.`,
  );
}

// Firebase Cloud Messaging is the unified delivery path for Android and Apple,
// so the FCM message builder must carry an Apple payload block. Without it,
// iOS notifications arrive with no sound, priority, or silent-push support.
const fcmMessage = read(
  "packages/notifications-core/src/services/providers/fcm-http-v1.server.ts",
);
const fcmProvider = read(
  "packages/notifications-core/src/services/providers/fcm-notification-provider.server.ts",
);

requireText(
  fcmMessage,
  "apns?: FcmApnsConfig;",
  "FcmHttpV1Message must carry an apns block so Apple devices receive sound and priority.",
);
requireText(
  fcmProvider,
  "buildApnsConfig",
  "The FCM provider must build an Apple payload for every message.",
);
requireText(
  fcmProvider,
  "firebaseAdminNotConfigured",
  "A missing Firebase Admin credential must produce a clear, named error.",
);

// The sound is declared once and read by both Apple transports. Firebase is the
// normal path and direct APNs the opt-in fallback, so a device must not sound
// different depending on which one happened to serve it.
const soundDomain = read("packages/notifications-core/src/domain/notification-sound.ts");
const apnsProvider = read(
  "packages/notifications-core/src/services/providers/apns-notification-provider.server.ts",
);
requireText(
  soundDomain,
  'export const APPLE_SOUND_FILE = "custom_notification.caf";',
  "The Apple payload sound must match the CAF file bundled in the App target.",
);
for (const [name, source] of [
  ["FCM", fcmProvider],
  ["direct APNs", apnsProvider],
] as const) {
  requireText(
    source,
    "appleSoundFile",
    `The ${name} provider must resolve its Apple sound from the shared domain module.`,
  );
}

// The APNs authentication key is a private signing key for the whole team
// account and must never be committed. Match a live rule, not a commented one.
const gitignore = read(".gitignore");
const ignoresP8 = gitignore
  .split(/\r?\n/)
  .some((line) => line.trim() === "*.p8");
if (!ignoresP8) {
  errors.push("The APNs authentication key (.p8) must be gitignored.");
}

// Apple tokens are classified by shape, not by platform name, so a raw APNs
// token is never sent to FCM and de-registered as invalid.
const tokenKind = read("src/features/notifications/domain/push-token-kind.ts");
requireText(
  tokenKind,
  "resolvePushProvider",
  "Push provider selection must classify the token before choosing a transport.",
);

if (errors.length > 0) {
  throw new Error(
    `iOS push policy validation failed:\n${errors
      .map((error) => `- ${error}`)
      .join("\n")}`,
  );
}

console.log(
  `iOS push policy passed: ${expected.bundleId} configures Firebase Messaging iOS SDK ` +
    `(app ${expected.firebaseAppId}) via Xcode SPM; AppDelegate explicitly forwards FCM registration tokens and swizzling is disabled.`,
);
