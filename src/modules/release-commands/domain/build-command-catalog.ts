export type BuildCommandCategory = "web-static" | "ota" | "native-android" | "verification" | "fastlane";
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
  | "dryRun";

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
const otaEnv = ["ASOL_OTA_R2_BUCKET_NAME", "ASOL_OTA_SIGNING_PRIVATE_KEY"];
const notes = { name: "notes", type: "string", flag: "--notes", maxLength: 4000 } as const;
const mandatory = { name: "mandatory", type: "boolean", flag: "--mandatory" } as const;
const diagnostic = { name: "diagnostic", type: "boolean", flag: "--diagnostic" } as const;
const otaSource = {
  name: "otaSource",
  type: "enum",
  flag: "--ota-source",
  values: ["publish-new", "resume-published", "skip-ota"],
} as const;
const dryRun = { name: "dryRun", type: "boolean", flag: "--dry-run" } as const;
const track = { name: "track", type: "enum", flag: "track", values: ["internal", "alpha", "beta", "production"] } as const;
const rollout = { name: "rollout", type: "number", flag: "rollout", min: 0, max: 1 } as const;
const releaseNotes = { name: "releaseNotes", type: "localized-text", flag: "release_notes_b64", maxLanguages: 20, maxLength: 500 } as const;
const optimization = { name: "optimization", type: "enum", flag: "--optimization", values: ["r8", "no-r8"] } as const;

const exclusiveCategories = new Set<BuildCommandCategory>(["ota", "native-android", "fastlane"]);

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
  entry("ota-publish", "ota:publish", "ota", "publishes-live", otaEnv, ["out/asol-web-manifest.json"], "10-20 min", "PUBLISH_OTA", [notes, mandatory]),
  entry("ota-status", "ota:status", "ota", "safe", otaEnv, [], "30 sec"),
  entry("ota-self-test", "ota:self-test", "verification", "safe", otaEnv, [], "1-3 min"),
  entry("cap-build", "cap:build", "native-android", "destructive", [], ["android/app/src/main/assets/public", "android/app/build/outputs"], "20-45 min", undefined, [otaSource, dryRun, optimization]),
  entry("release-android-with-ota", "release:android:with-ota", "native-android", "destructive", [], ["android/app/build/outputs/bundle/release/app-release.aab", "android/app/build/outputs/apk/release/app-release.apk"], "25-50 min", undefined, [], true),
  entry("release-android-no-ota", "release:android:no-ota", "native-android", "destructive", [...playEnv, ...signingEnv], ["android/app/build/outputs/bundle/release/app-release.aab", "android/app/build/outputs/apk/release/app-release.apk"], "30-60 min", undefined, [], true),
  entry("cap-open-android", "cap:open:android", "native-android", "safe", [], [], "<1 min", undefined, [], true),
  // Verification category on purpose: opening a folder must not take the
  // exclusive release lock that the native-android commands hold.
  entry("android-open-outputs", "android:open:outputs", "verification", "safe", [], [], "<1 min", undefined, [], true),
  entry("cap-prepare-android", "cap:prepare:android", "native-android", "destructive", [], ["out/asol-web-manifest.json", "android/app/src/main/assets/public"], "12-25 min", undefined, [], true),
  entry("cap-sync", "cap:sync", "native-android", "safe", [], ["android/app/src/main/assets/public"], "3-8 min"),
  entry("cap-copy", "cap:copy", "native-android", "safe", [], ["android/app/src/main/assets/public"], "2-5 min"),
  entry("cap-verify-defaults", "cap:verify-defaults", "verification", "safe", [], [], "1-3 min"),
  entry("android-backup-validate", "android:backup:validate", "verification", "safe", [], [], "30 sec"),
  entry("android-r8-validate", "android:r8:validate", "verification", "safe", [], [], "30 sec"),
  entry("android-r8-verify-release", "android:r8:verify-release", "verification", "safe", [], ["android/app/build/outputs/mapping/release/*.txt"], "10-25 min"),
  entry("test-ota-compatibility", "test:ota-compatibility", "verification", "safe", [], [], "1-3 min"),
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
      else if (schema.name === "otaSource") {
        if (value === "resume-published") argv.push("--resume");
        if (value === "skip-ota") argv.push("--skip-ota");
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
