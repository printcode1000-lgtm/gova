import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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
const capacitorConfig = read("capacitor.config.ts");
const envExample = read(".env.example");
const firebaseConfig = read("ios/App/App/GoogleService-Info.plist");
const errors: string[] = [];

function requireText(source: string, value: string, message: string): void {
  if (!source.includes(value)) errors.push(message);
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
  "src/features/notifications/services/providers/fcm-http-v1.server.ts",
);
const fcmProvider = read(
  "src/features/notifications/services/providers/fcm-notification-provider.server.ts",
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
  `iOS push policy passed: ${expected.bundleId} delivers through Firebase Cloud Messaging ` +
    `(app ${expected.firebaseAppId}); the APNs key stays in Firebase Console and out of git.`,
);
