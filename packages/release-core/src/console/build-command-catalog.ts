export type BuildCommandCategory = "web-static" | "ota" | "native-android" | "verification" | "fastlane" | "deployment";
export type BuildCommandDanger = "safe" | "destructive" | "publishes-live";
export type BuildParameterName =
  | "notes"
  | "mandatory"
  | "track"
  | "rollout"
  | "optimization"
  | "releaseNotes"
  | "diagnostic"
  | "otaSource"
  | "nativeVersionAction"
  | "minimumNativeVersion"
  | "dryRun"
  | "device"
  | "deployAllScenario"
  | "deployAllBranches"
  | "deployAllContinueOnError"
  | "deployAllSkipPreflight"
  | "deployAllAllowEmpty"
  | "deployAllAllowManifestDowngrade"
  | "deployAllAllowScratchFiles"
  | "deployPushTarget"
  | "deployPushAllowEmpty"
  | "deployPushAllowManifestDowngrade"
  | "deployPushAllowScratchFiles";

export type BuildParameterSchema =
  | { name: BuildParameterName; type: "boolean"; flag: string }
  | { name: BuildParameterName; type: "string"; flag: string; required?: boolean; maxLength: number }
  | { name: BuildParameterName; type: "enum"; flag: string; values: readonly string[]; required?: boolean }
  | { name: BuildParameterName; type: "number"; flag: string; min: number; max: number; required?: boolean }
  | { name: BuildParameterName; type: "localized-text"; flag: string; maxLanguages: number; maxLength: number };

export interface BuildCommandCatalogEntry {
  id: string;
  script: string;
  argv: string[];
  category: BuildCommandCategory;
  danger: BuildCommandDanger;
  confirmationPhrase?: string;
  requiredEnv: string[];
  expectedArtifacts: string[];
  expectedArtifactMeaningKeys: string[];
  estimatedDuration: string;
  exclusive: boolean;
  hidden?: boolean;
  parameters: readonly BuildParameterSchema[];
  documentation: {
    titleKey: string;
    descriptionKey: string;
    producesKey: string;
    mutatesKey: string;
    prerequisitesKey: string;
  };
}

const signingEnv = ["ASOL_ANDROID_KEYSTORE_FILE", "ASOL_ANDROID_KEYSTORE_PASSWORD", "ASOL_ANDROID_KEY_ALIAS", "ASOL_ANDROID_KEY_PASSWORD"];
const playEnv = ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64"];
// Each entry lists interchangeable sources; the runner accepts any of them,
// matching how packages/ota-core/src/publishing/config/ota-config.ts actually resolves its configuration.
// No alternatives. The publisher reads ASOL_OTA_R2_* alone, so accepting a
// product or general bucket here would report the command ready and then fail
// inside it — and, before that, would have published to the wrong account.
const otaEnv = ["ASOL_OTA_R2_BUCKET_NAME", "ASOL_OTA_SIGNING_PRIVATE_KEY"];
const notes = { name: "notes", type: "string", flag: "--notes", maxLength: 4000 } as const;
const mandatory = { name: "mandatory", type: "boolean", flag: "--mandatory" } as const;
const diagnostic = { name: "diagnostic", type: "boolean", flag: "--diagnostic" } as const;
/**
 * The declaration the native-compatibility gate asks for when the shell has
 * changed but the bundle still runs on the installed one.
 *
 * Without it the console could only surface the gate's refusal — the message
 * named an environment variable, which a button cannot set. Optional on
 * purpose: leaving it empty keeps the gate in force.
 */
const minimumNativeVersion = { name: "minimumNativeVersion", type: "string", flag: "--minimum-native-version", maxLength: 32 } as const;
// `skip-ota` reuses the existing local bundle and still proves it against the
// live manifest; `no-ota` builds a fresh bundle on a new content line and
// never reaches R2. They are different actions, not two names for one.
const otaSource = {
  name: "otaSource",
  type: "enum",
  flag: "--ota-source",
  values: ["publish-new", "resume-published", "skip-ota", "no-ota"],
} as const;
const nativeVersionAction = {
  name: "nativeVersionAction",
  type: "enum",
  flag: "--native-version",
  values: ["keep-current", "increment-patch"],
  required: true,
} as const;
const dryRun = { name: "dryRun", type: "boolean", flag: "--dry-run" } as const;
/**
 * Which attached device to act on. Optional: one connected device is chosen
 * automatically, and the scripts refuse rather than guess when several are.
 */
const device = { name: "device", type: "string", flag: "--device", maxLength: 64 } as const;
const deployAllScenario = {
  name: "deployAllScenario",
  type: "enum",
  flag: "--deploy-all-scenario",
  values: [
    "full",
    "preflight",
    "publish",
    "services",
    "main",
    "from-notifications",
    "from-products",
    "from-orders",
    "from-profiles",
    "from-submain",
    "from-sub2main",
  ],
} as const;
const deployAllBranches = { name: "deployAllBranches", type: "string", flag: "--runbook-branches", maxLength: 2000 } as const;
const deployAllContinueOnError = { name: "deployAllContinueOnError", type: "boolean", flag: "--continue-on-error" } as const;
const deployAllSkipPreflight = { name: "deployAllSkipPreflight", type: "boolean", flag: "--skip-preflight" } as const;
const deployAllAllowEmpty = { name: "deployAllAllowEmpty", type: "boolean", flag: "--allow-empty" } as const;
const deployAllAllowManifestDowngrade = { name: "deployAllAllowManifestDowngrade", type: "boolean", flag: "--allow-manifest-downgrade" } as const;
const deployAllAllowScratchFiles = { name: "deployAllAllowScratchFiles", type: "boolean", flag: "--allow-scratch-files" } as const;
const deployPushTarget = {
  name: "deployPushTarget",
  type: "enum",
  flag: "--vercel-target",
  values: ["none", "main", "notifications", "products", "orders", "profiles", "submain", "sub2main", "all"],
} as const;
const deployPushAllowEmpty = { name: "deployPushAllowEmpty", type: "boolean", flag: "--allow-empty" } as const;
const deployPushAllowManifestDowngrade = { name: "deployPushAllowManifestDowngrade", type: "boolean", flag: "--allow-manifest-downgrade" } as const;
const deployPushAllowScratchFiles = { name: "deployPushAllowScratchFiles", type: "boolean", flag: "--allow-scratch-files" } as const;
const track = { name: "track", type: "enum", flag: "track", values: ["internal", "alpha", "beta", "production"] } as const;
const rollout = { name: "rollout", type: "number", flag: "rollout", min: 0, max: 1 } as const;
const releaseNotes = { name: "releaseNotes", type: "localized-text", flag: "release_notes_b64", maxLanguages: 20, maxLength: 500 } as const;
const optimization = { name: "optimization", type: "enum", flag: "--optimization", values: ["r8", "no-r8"] } as const;

const exclusiveCategories = new Set<BuildCommandCategory>(["ota", "native-android", "fastlane", "deployment"]);

function entry(id: string, script: string, category: BuildCommandCategory, danger: BuildCommandDanger, requiredEnv: string[], expectedArtifacts: string[], estimatedDuration: string, confirmationPhrase?: string, parameters: readonly BuildParameterSchema[] = [], hidden = false): BuildCommandCatalogEntry {
  return {
    id, script, argv: [], category, danger, confirmationPhrase, requiredEnv, expectedArtifacts,
    expectedArtifactMeaningKeys: expectedArtifacts.map(artifactMeaningKey), estimatedDuration, hidden,
    exclusive: exclusiveCategories.has(category), parameters,
    documentation: {
      titleKey: `releaseConsole.commandDocs.${id}.title`,
      descriptionKey: `releaseConsole.commandDocs.${id}.description`,
      producesKey: `releaseConsole.commandDocs.${id}.produces`,
      mutatesKey: `releaseConsole.commandDocs.${id}.mutates`,
      prerequisitesKey: `releaseConsole.commandDocs.${id}.prerequisites`,
    },
  };
}

function artifactMeaningKey(artifact: string): string {
  if (/\.aab/i.test(artifact)) return "releaseConsole.artifactMeaning.aab";
  if (/\.apk/i.test(artifact)) return "releaseConsole.artifactMeaning.apk";
  if (/mapping|\.txt/i.test(artifact)) return "releaseConsole.artifactMeaning.r8";
  if (/asol-web-manifest/i.test(artifact)) return "releaseConsole.artifactMeaning.webManifest";
  if (/assets\/public/i.test(artifact)) return "releaseConsole.artifactMeaning.nativeWeb";
  return "releaseConsole.artifactMeaning.projectFile";
}

export const BUILD_COMMAND_CATALOG = [
  entry("build-static", "build:static", "web-static", "safe", [], ["out/asol-web-manifest.json"], "8-15 min", undefined, [diagnostic]),
  entry("ota-check", "ota:check", "ota", "safe", otaEnv, [], "1-3 min"),
  entry("ota-sync-cors", "ota:sync:cors", "ota", "safe", otaEnv, [], "1-2 min"),
  entry("ota-publish", "ota:publish", "ota", "publishes-live", otaEnv, ["out/asol-web-manifest.json"], "10-20 min", "PUBLISH_OTA", [notes, mandatory, minimumNativeVersion]),
  entry("ota-status", "ota:status", "ota", "safe", otaEnv, [], "30 sec"),
  entry("ota-self-test", "ota:self-test", "verification", "safe", otaEnv, [], "1-3 min"),
  entry("cap-build", "cap:build", "native-android", "destructive", [], ["android/app/src/main/assets/public", "android/app/build/outputs"], "20-45 min", undefined, [otaSource, dryRun, optimization]),
  // The single full-release path. It publishes nothing: the shell it builds
  // carries its own complete, current bundle, so it needs neither OTA
  // credentials nor a confirmation phrase. Publishing an OTA onto that shell
  // afterwards is `ota-publish`, on its own button.
  entry("release-android", "release:android", "native-android", "destructive", signingEnv, ["android/app/build/outputs/bundle/release/app-release.aab", "android/app/build/outputs/apk/release/app-release.apk"], "30-60 min", undefined, [nativeVersionAction], true),
  entry("cap-open-android", "cap:open:android", "native-android", "safe", [], [], "<1 min", undefined, [], true),
  // Verification category on purpose: opening a folder must not take the
  // exclusive release lock that the native-android commands hold.
  entry("android-open-outputs", "android:open:outputs", "verification", "safe", [], [], "<1 min", undefined, [], true),
  entry("cap-prepare-android", "cap:prepare:android", "native-android", "destructive", [], ["out/asol-web-manifest.json", "android/app/src/main/assets/public"], "12-25 min", undefined, [], true),
  // Testing path: rebuilds the web bundle, syncs it, and assembles the R8-optimized
  // debug-signed APK. No keystore, no R2 write — but it rewrites the native web
  // assets, so it takes the same exclusive lock as the other native-android
  // commands. It touches no connected device.
  entry("android-build-debug", "android:build:debug", "native-android", "destructive", [], ["android/app/build/outputs/apk/debugR8/app-debugR8.apk"], "15-35 min", undefined, [], true),
  // Verification category: neither suite takes the release lock. The host suite
  // reads the working tree; the device suite drives an attached device. They
  // answer different questions and are deliberately separate buttons.
  // Measured at ~2.5 min warm; the upper bound covers a cold tsc/tsx cache.
  entry("run-test-suite", "verify:all", "verification", "safe", [], [], "3-10 min", undefined, [], true),
  entry("run-device-tests", "android:device:tests", "verification", "safe", [], [], "5-15 min", undefined, [device], true),
  entry("deploy-all-runbook", "deploy:all", "deployment", "publishes-live", ["VERCEL_TOKEN"], [], "20-90 min", "DEPLOY_ALL", [
    deployAllScenario,
    deployAllBranches,
    deployAllContinueOnError,
    deployAllSkipPreflight,
    deployAllAllowEmpty,
    deployAllAllowManifestDowngrade,
    deployAllAllowScratchFiles,
  ], true),
  entry("deploy-push-runbook", "deploy:push", "deployment", "publishes-live", ["VERCEL_TOKEN"], [], "5-45 min", "DEPLOY_PUSH", [
    deployPushTarget,
    deployPushAllowEmpty,
    deployPushAllowManifestDowngrade,
    deployPushAllowScratchFiles,
  ], true),
  entry("cap-sync", "cap:sync", "native-android", "safe", [], ["android/app/src/main/assets/public"], "3-8 min"),
  entry("cap-copy", "cap:copy", "native-android", "safe", [], ["android/app/src/main/assets/public"], "2-5 min"),
  entry("cap-verify-defaults", "cap:verify-defaults", "verification", "safe", [], [], "1-3 min"),
  entry("android-backup-validate", "android:backup:validate", "verification", "safe", [], [], "30 sec"),
  entry("android-r8-validate", "android:r8:validate", "verification", "safe", [], [], "30 sec"),
  entry("android-r8-verify-release", "android:r8:verify-release", "verification", "safe", [], ["android/app/build/outputs/mapping/release/*.txt"], "10-25 min"),
  // The former test:ota-compatibility, test:ota-delivery, test:ota-background,
  // test:ota-hardening, and test:ota-r2-retry suites were folded into the single
  // @asol/ota-core suite when OTA was consolidated into that package.
  entry("test-ota-core", "test:ota-core", "verification", "safe", [], [], "1-3 min"),
  entry("fastlane-android-doctor", "fastlane:android:doctor", "fastlane", "safe", [...playEnv, ...signingEnv], [], "1 min"),
  entry("fastlane-android-build", "fastlane:android:build", "fastlane", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/release/*.aab"], "20-45 min"),
  entry("fastlane-android-aab-signed", "fastlane:android:aab:signed", "fastlane", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/release/*.aab"], "20-45 min"),
  entry("fastlane-android-aab-unsigned", "fastlane:android:aab:unsigned", "fastlane", "destructive", playEnv, ["android/app/build/outputs/bundle/release/*.aab"], "20-45 min"),
  entry("fastlane-android-apk-signed", "fastlane:android:apk:signed", "fastlane", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/apk/release/*.apk"], "20-45 min"),
  entry("fastlane-android-apk-unsigned", "fastlane:android:apk:unsigned", "fastlane", "destructive", playEnv, ["android/app/build/outputs/apk/release/*.apk"], "20-45 min"),
  entry("fastlane-android-aab-signed-no-r8", "fastlane:android:aab:signed:no-r8", "fastlane", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/releaseNoR8/*.aab"], "20-45 min"),
  entry("fastlane-android-aab-unsigned-no-r8", "fastlane:android:aab:unsigned:no-r8", "fastlane", "destructive", playEnv, ["android/app/build/outputs/bundle/releaseNoR8/*.aab"], "20-45 min"),
  entry("fastlane-android-apk-signed-no-r8", "fastlane:android:apk:signed:no-r8", "fastlane", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/apk/releaseNoR8/*.apk"], "20-45 min"),
  entry("fastlane-android-apk-unsigned-no-r8", "fastlane:android:apk:unsigned:no-r8", "fastlane", "destructive", playEnv, ["android/app/build/outputs/apk/releaseNoR8/*.apk"], "20-45 min"),
  entry("fastlane-android-internal", "fastlane:android:internal", "fastlane", "publishes-live", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/release/app-release.aab"], "25-50 min", "PUBLISH_INTERNAL", [track, rollout, releaseNotes]),
  entry("fastlane-android-production", "fastlane:android:production", "fastlane", "publishes-live", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/release/app-release.aab"], "25-50 min", "PUBLISH_PRODUCTION", [rollout, releaseNotes]),
] as const satisfies readonly BuildCommandCatalogEntry[];

export function findBuildCommand(id: string): BuildCommandCatalogEntry | undefined {
  return BUILD_COMMAND_CATALOG.find((command) => command.id === id);
}

export function materializeBuildCommandParameters(command: BuildCommandCatalogEntry, raw: unknown): string[] {
  const parameters = raw === undefined ? {} : raw;
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) throw new Error("releaseCommandParametersInvalid");
  const values = parameters as Record<string, unknown>;
  const schemas = new Map(command.parameters.map((schema) => [schema.name, schema]));
  for (const key of Object.keys(values)) if (!schemas.has(key as BuildParameterName)) throw new Error(`releaseCommandParameterUnknown:${key}`);
  const argv: string[] = [];
  for (const schema of command.parameters) {
    const value = values[schema.name];
    if (value === undefined || value === "") {
      if ("required" in schema && schema.required) throw new Error(`releaseCommandParameterRequired:${schema.name}`);
      continue;
    }
    if (schema.type === "boolean") {
      if (typeof value !== "boolean") throw new Error(`releaseCommandParameterInvalid:${schema.name}`);
      if (value) argv.push(schema.flag);
    } else if (schema.type === "string") {
      if (typeof value !== "string" || !value.trim() || value.startsWith("--") || value.length > schema.maxLength || /[\0\r\n]/.test(value)) throw new Error(`releaseCommandParameterInvalid:${schema.name}`);
      argv.push(`${schema.flag}=${value}`);
    } else if (schema.type === "enum") {
      if (typeof value !== "string" || !schema.values.includes(value)) throw new Error(`releaseCommandParameterInvalid:${schema.name}`);
      if (schema.name === "optimization") { if (value === "no-r8") argv.push("--no-r8"); }
      else if (schema.name === "deployAllScenario") {
        if (value === "preflight") argv.push("--phase=preflight");
        if (value === "publish") argv.push("--phase=publish");
        if (value === "services") argv.push("--phase=services");
        if (value === "main") argv.push("--phase=main");
        if (value === "from-notifications") argv.push("--from-phase=notifications");
        if (value === "from-products") argv.push("--from-phase=products");
        if (value === "from-orders") argv.push("--from-phase=orders");
        if (value === "from-profiles") argv.push("--from-phase=profiles");
        if (value === "from-submain") argv.push("--from-phase=submain");
        if (value === "from-sub2main") argv.push("--from-phase=sub2main");
      }
      else if (schema.name === "deployPushTarget") argv.push(`--vercel-target=${value}`);
      else if (schema.name === "otaSource") {
        if (value === "resume-published") argv.push("--resume");
        if (value === "skip-ota") argv.push("--skip-ota");
        if (value === "no-ota") argv.push("--no-ota");
      }
      else if (schema.name === "nativeVersionAction") {
        if (value === "keep-current") argv.push("--native-version=current");
        if (value === "increment-patch") argv.push("--native-version=next-patch");
      }
      else argv.push(`${schema.flag}:${value}`);
    } else if (schema.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value) || value < schema.min || value > schema.max) throw new Error(`releaseCommandParameterInvalid:${schema.name}`);
      argv.push(`${schema.flag}:${value}`);
    } else {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`releaseCommandParameterInvalid:${schema.name}`);
      const localized = value as Record<string, unknown>;
      const pairs = Object.entries(localized);
      if (pairs.length > schema.maxLanguages || pairs.some(([language, note]) => !/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(language) || typeof note !== "string" || !note.trim() || note.length > schema.maxLength || /[\0\r]/.test(note))) throw new Error(`releaseCommandParameterInvalid:${schema.name}`);
      argv.push(`${schema.flag}:${Buffer.from(JSON.stringify(localized), "utf8").toString("base64url")}`);
    }
  }
  return argv;
}
