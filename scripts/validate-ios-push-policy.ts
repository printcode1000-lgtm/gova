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

if (errors.length > 0) {
  throw new Error(
    `iOS push policy validation failed:\n${errors
      .map((error) => `- ${error}`)
      .join("\n")}`,
  );
}

console.log(
  `iOS push policy passed: ${expected.bundleId} uses Capacitor/APNs; Firebase Apple app ${expected.firebaseAppId} is documented.`,
);
