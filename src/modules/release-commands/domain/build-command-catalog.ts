export type BuildCommandCategory =
  | "web-static"
  | "ota"
  | "native-android"
  | "verification"
  | "fastlane";

export type BuildCommandDanger = "safe" | "destructive" | "publishes-live";

export interface BuildCommandCatalogEntry {
  id: string;
  script: string;
  argv: string[];
  category: BuildCommandCategory;
  danger: BuildCommandDanger;
  confirmationPhrase?: string;
  requiredEnv: string[];
  expectedArtifacts: string[];
  estimatedDuration: string;
}

const signingEnv = [
  "ASOL_ANDROID_KEYSTORE_FILE",
  "ASOL_ANDROID_KEYSTORE_PASSWORD",
  "ASOL_ANDROID_KEY_ALIAS",
  "ASOL_ANDROID_KEY_PASSWORD",
];
const playEnv = ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64"];
const otaEnv = ["ASOL_OTA_R2_BUCKET_NAME", "ASOL_OTA_SIGNING_PRIVATE_KEY"];

export const BUILD_COMMAND_CATALOG = [
  entry("build-static", "build:static", [], "web-static", "safe", [], ["out/asol-web-manifest.json"], "8-15 min"),
  entry("build-static-diagnostic", "build:static", ["--diagnostic"], "web-static", "safe", [], ["out/asol-web-manifest.json"], "4-10 min"),
  entry("ota-check", "ota:check", [], "ota", "safe", otaEnv, [], "1-3 min"),
  entry("ota-publish", "ota:publish", [], "ota", "publishes-live", otaEnv, ["out/asol-web-manifest.json"], "10-20 min", "PUBLISH_OTA"),
  entry("ota-publish-mandatory", "ota:publish", ["--mandatory"], "ota", "publishes-live", otaEnv, ["out/asol-web-manifest.json"], "10-20 min", "PUBLISH_OTA_MANDATORY"),
  entry("ota-publish-notes", "ota:publish", ["--notes"], "ota", "publishes-live", otaEnv, ["out/asol-web-manifest.json"], "10-20 min", "PUBLISH_OTA"),
  entry("ota-status", "ota:status", [], "ota", "safe", otaEnv, [], "30 sec"),
  entry("ota-self-test", "ota:self-test", [], "verification", "safe", otaEnv, [], "1-3 min"),
  entry("cap-build", "cap:build", [], "native-android", "destructive", [...otaEnv, ...signingEnv], ["android/app/build.gradle"], "20-45 min"),
  entry("cap-build-resume", "cap:build", ["--resume"], "native-android", "destructive", [...otaEnv, ...signingEnv], ["android/app/build.gradle"], "10-25 min"),
  entry("cap-build-no-r8", "cap:build", ["--no-r8", "--skip-ota"], "native-android", "destructive", signingEnv, ["android/app/build/outputs/bundle/releaseNoR8"], "10-25 min"),
  entry("cap-build-skip-ota", "cap:build", ["--skip-ota"], "native-android", "destructive", signingEnv, ["android/app/build.gradle"], "10-25 min"),
  entry("cap-build-dry-run", "cap:build", ["--dry-run"], "native-android", "safe", [], [], "30 sec"),
  entry("cap-sync", "cap:sync", [], "native-android", "safe", [], ["android/app/src/main/assets/public"], "3-8 min"),
  entry("cap-copy", "cap:copy", [], "native-android", "safe", [], ["android/app/src/main/assets/public"], "2-5 min"),
  entry("cap-verify-defaults", "cap:verify-defaults", [], "verification", "safe", [], [], "1-3 min"),
  entry("android-backup-validate", "android:backup:validate", [], "verification", "safe", [], [], "30 sec"),
  entry("android-r8-validate", "android:r8:validate", [], "verification", "safe", [], [], "30 sec"),
  entry("android-r8-verify-release", "android:r8:verify-release", [], "verification", "safe", [], ["android/app/build/outputs/mapping/release"], "10-25 min"),
  entry("test-ota-compatibility", "test:ota-compatibility", [], "verification", "safe", [], [], "1-3 min"),
  entry("fastlane-android-doctor", "fastlane:android:doctor", [], "fastlane", "safe", [...playEnv, ...signingEnv], [], "1 min"),
  entry("fastlane-android-build", "fastlane:android:build", [], "fastlane", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/release"], "20-45 min"),
  entry("fastlane-android-aab-signed", "fastlane:android:aab:signed", [], "fastlane", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/release/*.aab"], "20-45 min"),
  entry("fastlane-android-aab-unsigned", "fastlane:android:aab:unsigned", [], "fastlane", "destructive", playEnv, ["android/app/build/outputs/bundle/release/*.aab"], "20-45 min"),
  entry("fastlane-android-apk-signed", "fastlane:android:apk:signed", [], "fastlane", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/apk/release/*.apk"], "20-45 min"),
  entry("fastlane-android-apk-unsigned", "fastlane:android:apk:unsigned", [], "fastlane", "destructive", playEnv, ["android/app/build/outputs/apk/release/*.apk"], "20-45 min"),
  entry("fastlane-android-aab-signed-no-r8", "fastlane:android:aab:signed:no-r8", [], "fastlane", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/releaseNoR8/*.aab"], "20-45 min"),
  entry("fastlane-android-aab-unsigned-no-r8", "fastlane:android:aab:unsigned:no-r8", [], "fastlane", "destructive", playEnv, ["android/app/build/outputs/bundle/releaseNoR8/*.aab"], "20-45 min"),
  entry("fastlane-android-apk-signed-no-r8", "fastlane:android:apk:signed:no-r8", [], "fastlane", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/apk/releaseNoR8/*.apk"], "20-45 min"),
  entry("fastlane-android-apk-unsigned-no-r8", "fastlane:android:apk:unsigned:no-r8", [], "fastlane", "destructive", playEnv, ["android/app/build/outputs/apk/releaseNoR8/*.apk"], "20-45 min"),
  entry("fastlane-android-internal", "fastlane:android:internal", [], "fastlane", "publishes-live", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/release/app-release.aab"], "25-50 min", "PUBLISH_INTERNAL"),
  entry("fastlane-android-production", "fastlane:android:production", [], "fastlane", "publishes-live", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/release/app-release.aab"], "25-50 min", "PUBLISH_PRODUCTION"),
] as const satisfies readonly BuildCommandCatalogEntry[];

function entry(
  id: string,
  script: string,
  argv: string[],
  category: BuildCommandCategory,
  danger: BuildCommandDanger,
  requiredEnv: string[],
  expectedArtifacts: string[],
  estimatedDuration: string,
  confirmationPhrase?: string,
): BuildCommandCatalogEntry {
  return {
    id,
    script,
    argv,
    category,
    danger,
    confirmationPhrase,
    requiredEnv,
    expectedArtifacts,
    estimatedDuration,
  };
}

export function findBuildCommand(id: string): BuildCommandCatalogEntry | undefined {
  return BUILD_COMMAND_CATALOG.find((command) => command.id === id);
}
