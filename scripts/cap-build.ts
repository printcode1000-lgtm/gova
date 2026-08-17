import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { API_BASE_URL } from '@asol/native-core';
import {
  compareOtaVersions,
  assertContentLineDoesNotRegress,
  releaseContentVersion,
  nextNativePatchVersion,
  androidVersionCodeFor,
  type OtaManifest,
} from "@asol/ota-core";
import {
  assertCapBuildInputBundle,
  assertReleaseStaticBundle,
  getOtaPrefix,
  loadOtaEnvironment,
  otaClientBuildEnv,
  createOtaR2Client,
  getOtaManifestObject,
  getOtaObjectBytes,
  listOtaObjectKeys,
  inspectNativeCompatibility,
  nativeVersionFromBaseline,
  resolveNativeBaseline,
  isUndeclarableNativeChange,
  readCurrentVersions,
  updateAndroidGradleVersion,
  updateIosProjectVersion,
  updateCommittedVersionConstants,
} from "@asol/ota-core/publishing";
import { withoutVsCodeDebuggerEnv } from "./child-process-env";
import { reportStage } from "./release-stage";
import { runGradle } from "./android/gradle";

const LOCAL_MANIFEST_PATH = path.resolve("out", "asol-web-manifest.json");
const ANDROID_BUILD_GRADLE = path.resolve("android", "app", "build.gradle");
const IOS_PROJECT_FILE = path.resolve(
  "ios",
  "App",
  "App.xcodeproj",
  "project.pbxproj",
);

function versionCode(version: string): number {
  const [major = 0, minor = 0, patch = 0] = version
    .split(".")
    .map((part) => Number(part) || 0);
  return major * 10000 + minor * 100 + patch;
}

type NativeVersionAction = "auto" | "current" | "next-patch";

function resolveTargetNativeVersion(action: NativeVersionAction): string {
  const baseline = resolveNativeBaseline();
  const baselineVersion = nativeVersionFromBaseline(baseline);
  if (!baselineVersion) {
    throw new Error(
      `Cannot derive a native release version from baseline ${baseline || "(none)"}; expected native-v<x.y.z>.`,
    );
  }

  const versionsRes = readFileSync(ANDROID_BUILD_GRADLE, "utf8");
  const match = /versionName\s+"([^"]+)"/.exec(versionsRes);
  const current = match ? match[1]! : "0.2.4";

  const report = inspectNativeCompatibility(baseline);
  const hasCompiledChanges = report.requiresStoreRelease;
  const automaticTarget =
    compareOtaVersions(current, baselineVersion) >= 0
      ? current
      : baselineVersion;
  let target = action === "next-patch"
    ? nextNativePatchVersion(automaticTarget)
    : action === "current"
      ? current
      : automaticTarget;
  if (action === "current" && compareOtaVersions(current, baselineVersion) < 0) {
    throw new Error(
      `Current Android version ${current} is below native baseline ${baselineVersion}; choose a new patch version.`,
    );
  }
  // Keeping the version is only honest when the shell binary is unchanged.
  //
  // A compiled native change produces a different shell. Reusing its versionName and
  // versionCode would give two different binaries one identity: Google Play rejects the
  // duplicate versionCode, and on a device there is no way to tell which of the two is
  // installed. So a native change makes "keep the current version" refuse outright rather
  // than quietly build something unidentifiable.
  //
  // This guard used to fire only when the target did not outrank the baseline, so a shell
  // already ahead of the last store tag — the normal state between releases — kept its
  // version while carrying new native code.
  //
  // Web-only changes are unaffected: a fresh `out/` bundle at the published version
  // numbers is exactly what this choice is for.
  if (hasCompiledChanges && action === "current") {
    throw new Error(
      [
        `Refusing to keep Android version ${current}: this build contains compiled native changes.`,
        "",
        "A native change makes a different shell. Keeping the version would give two",
        "different binaries the same identity — Google Play rejects the duplicate",
        "versionCode, and no device could tell them apart.",
        "",
        "Choose a new Android patch version instead:",
        "  --native-version=next-patch",
        "",
        `Native surface changed since baseline ${baselineVersion}. Run`,
        "`npm run cap:verify-defaults` to see what changed.",
      ].join("\n"),
    );
  }
  if (hasCompiledChanges && compareOtaVersions(target, baselineVersion) <= 0) {
    target = nextNativePatchVersion(baselineVersion);
  }
  console.log(
    `Native release plan: baseline=${baselineVersion}, current=${current}, target=${target}, action=${action}, compiledChanges=${hasCompiledChanges}`,
  );
  return target;
}

function updateAndroidVersion(version: string): void {
  updateAndroidGradleVersion(version);
  console.log(`Android versionName=${version}, versionCode=${androidVersionCodeFor(version)}`);
}

function updateIosVersion(version: string): void {
  updateIosProjectVersion(version);
  console.log(
    `iOS MARKETING_VERSION=${version}, CURRENT_PROJECT_VERSION=${androidVersionCodeFor(version)}`,
  );
}

function readLocalManifest(): OtaManifest {
  if (!existsSync(LOCAL_MANIFEST_PATH)) {
    throw new Error(
      `Local web manifest not found after OTA publish: ${LOCAL_MANIFEST_PATH}`,
    );
  }
  return JSON.parse(readFileSync(LOCAL_MANIFEST_PATH, "utf8")) as OtaManifest;
}

function compareManifestFiles(
  local: OtaManifest,
  remote: OtaManifest,
): string[] {
  const errors: string[] = [];
  if (local.schemaVersion !== remote.schemaVersion)
    errors.push(
      `schemaVersion ${local.schemaVersion} != ${remote.schemaVersion}`,
    );
  if (local.delivery !== remote.delivery)
    errors.push(`delivery ${local.delivery} != ${remote.delivery}`);
  if (local.version !== remote.version)
    errors.push(`version ${local.version} != ${remote.version}`);
  if (local.fileCount !== remote.fileCount)
    errors.push(`fileCount ${local.fileCount} != ${remote.fileCount}`);
  if (local.size !== remote.size)
    errors.push(`size ${local.size} != ${remote.size}`);
  if (local.minimumNativeVersion !== remote.minimumNativeVersion) {
    errors.push(
      `minimumNativeVersion ${local.minimumNativeVersion} != ${remote.minimumNativeVersion}`,
    );
  }

  for (const [filePath, remoteFile] of Object.entries(remote.files)) {
    const localFile = local.files[filePath];
    if (!localFile) errors.push(`missing local file: ${filePath}`);
    else if (
      localFile.sha256 !== remoteFile.sha256 ||
      localFile.size !== remoteFile.size
    ) {
      errors.push(`local mismatch: ${filePath}`);
    }
  }
  for (const filePath of Object.keys(local.files)) {
    if (!(filePath in remote.files))
      errors.push(`extra local file: ${filePath}`);
  }
  return errors;
}

async function mapConcurrent<T>(
  items: T[],
  limit: number,
  action: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex++]!;
        await action(item);
      }
    }),
  );
}

async function verifyR2Files(manifest: OtaManifest): Promise<void> {
  const client = createOtaR2Client();
  const prefix = `${getOtaPrefix()}/files/`;
  const actualKeys = (await listOtaObjectKeys(client, prefix)).sort();
  const expectedKeys = Object.keys(manifest.files)
    .map((filePath) => `${prefix}${filePath}`)
    .sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error(
      `R2 file keys do not match manifest: actual=${actualKeys.length}, expected=${expectedKeys.length}`,
    );
  }

  let verified = 0;
  await mapConcurrent(
    Object.entries(manifest.files),
    10,
    async ([filePath, expected]) => {
      const bytes = await getOtaObjectBytes(client, `${prefix}${filePath}`);
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (bytes.byteLength !== expected.size || hash !== expected.sha256) {
        throw new Error(`R2 object content mismatch: ${filePath}`);
      }
      verified += 1;
      if (
        verified === 1 ||
        verified % 100 === 0 ||
        verified === manifest.fileCount
      ) {
        console.log(`  verified ${verified}/${manifest.fileCount} R2 files`);
      }
    },
  );
  const bundles = [manifest.bundles?.full, ...(manifest.bundles?.deltas ?? [])].filter(
    (bundle): bundle is NonNullable<typeof bundle> => Boolean(bundle),
  );
  for (const bundle of bundles) {
    const bytes = await getOtaObjectBytes(
      client,
      `${getOtaPrefix()}/${bundle.path}`,
    );
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== bundle.size || hash !== bundle.sha256) {
      throw new Error(`R2 OTA bundle content mismatch: ${bundle.path}`);
    }
    console.log(`  verified OTA bundle: ${bundle.path}`);
  }
}

async function main(): Promise<void> {
  loadOtaEnvironment();
  const args = process.argv.slice(2);
  const resumePublishedRelease = args.includes("--resume");
  const noR8 = args.includes("--no-r8");
  const skipOta = args.includes("--skip-ota");
  // `--skip-ota` reuses the existing local bundle and still proves it against
  // the live manifest. `--no-ota` is the store-release path: it builds its own
  // bundle, opens a new content line, and never reaches R2 at all.
  const noOta = args.includes("--no-ota");
  const dryRun = args.includes("--dry-run");
  if (noOta && (skipOta || resumePublishedRelease)) {
    throw new Error("--no-ota cannot be combined with --skip-ota or --resume; choose one OTA action.");
  }
  const nativeVersionArguments = args.filter((argument) =>
    argument.startsWith("--native-version="),
  );
  if (nativeVersionArguments.length > 1) {
    throw new Error("Choose exactly one Android native version action.");
  }
  const requestedNativeVersion = nativeVersionArguments[0]?.slice("--native-version=".length);
  if (requestedNativeVersion !== undefined
    && requestedNativeVersion !== "current"
    && requestedNativeVersion !== "next-patch") {
    throw new Error(`Invalid Android native version action: ${requestedNativeVersion}`);
  }
  const nativeVersionAction: NativeVersionAction = requestedNativeVersion ?? "auto";
  const otaNotesArguments = args.filter((argument) => argument.startsWith("--notes="));
  const mandatoryOta = args.includes("--mandatory");
  if (otaNotesArguments.length > 1) throw new Error("Use exactly one OTA release notes value.");
  if ((resumePublishedRelease || skipOta || noOta) && (otaNotesArguments.length > 0 || mandatoryOta)) {
    throw new Error("OTA notes and mandatory mode can only be set while publishing a new OTA.");
  }
  const apiBaseUrl = (
    process.env.ASOL_API_BASE_URL ?? API_BASE_URL
  ).replace(/\/$/, "");
  const plannedNativeVersion = resolveTargetNativeVersion(nativeVersionAction);
  const publishEnv: NodeJS.ProcessEnv = {
    ...withoutVsCodeDebuggerEnv(process.env),
    ASOL_API_BASE_URL: apiBaseUrl,
    ASOL_OTA_MINIMUM_NATIVE_VERSION: plannedNativeVersion,
  };

  if (noR8 && !skipOta && !noOta && !dryRun) {
    throw new Error(
      "--no-r8 is only allowed with --skip-ota, --no-ota or --dry-run; releaseNoR8 builds must never be part of publishing.",
    );
  }

  if (dryRun) {
    console.log("cap-build dry run plan");
    console.log(
      `  web version: ${
        noOta
          ? `${releaseContentVersion(plannedNativeVersion)} (new content line, derived locally)`
          : "next automatic patch from the live R2 manifest"
      }`,
    );
    console.log(`  Android build type: ${noR8 ? "ReleaseNoR8" : "Release"}`);
    console.log(
      `  OTA action: ${
        noOta
          ? "none: the shell carries its own bundle"
          : skipOta
            ? "skip"
            : resumePublishedRelease
              ? "resume existing manifest"
              : "publish next OTA"
      }`,
    );
    console.log(
      `  version rewrites: android versionCode=${versionCode(plannedNativeVersion)}, versionName=${plannedNativeVersion}; iOS MARKETING_VERSION=${plannedNativeVersion}`,
    );
    console.log(`  native compatibility target: ${plannedNativeVersion}`);
    console.log("  cap sync: npm run cap:sync");
    if (noR8) console.log("  Gradle tasks: :app:bundleReleaseNoR8 :app:assembleReleaseNoR8 -Pasol.allowNoR8=true");
    console.log("  mutations: none");
    return;
  }

  reportStage("checking-compatibility");
  console.log(
    "Validating Android backup and R8 release policies before any OTA publication...",
  );
  execSync("npm run android:backup:validate && npm run android:r8:validate", {
    stdio: "inherit",
    env: publishEnv,
  });

  if (noOta) {
    await buildStoreRelease({ plannedNativeVersion, apiBaseUrl, noR8 });
    return;
  }

  if (resumePublishedRelease) {
    console.log(
      "Resuming cap-build from the already published R2 manifest; no new OTA version will be created.",
    );
  } else if (skipOta) {
    console.log("Skipping OTA publication by request; using the existing local manifest.");
  } else {
    console.log(
      "Publishing the next automatic OTA version to the single R2 directory...",
    );
    const tsxCliPath = path.resolve("node_modules", "tsx", "dist", "cli.mjs");
    const publisherPath = path.resolve("scripts", "ota-publish.ts");
    const publisherArgs = [
      ...otaNotesArguments,
      ...(mandatoryOta ? ["--mandatory"] : []),
    ];
    execFileSync(process.execPath, [tsxCliPath, publisherPath, ...publisherArgs], {
      stdio: "inherit",
      env: publishEnv,
    });
  }

  assertCapBuildInputBundle({ resume: resumePublishedRelease, skipOta, dryRun });

  const client = createOtaR2Client();
  const remoteManifest = await getOtaManifestObject(
    client,
    `${getOtaPrefix()}/manifest.json`,
  );
  const localManifest = readLocalManifest();
  const version = remoteManifest.version;
  const nativeVersion = skipOta
    ? plannedNativeVersion
    : remoteManifest.minimumNativeVersion;
  if (
    !resumePublishedRelease &&
    !skipOta &&
    nativeVersion !== plannedNativeVersion
  ) {
    throw new Error(
      `Published minimum native version ${nativeVersion} does not match planned shell ${plannedNativeVersion}`,
    );
  }
  const env: NodeJS.ProcessEnv = {
    ...withoutVsCodeDebuggerEnv(process.env),
    ...otaClientBuildEnv(version, nativeVersion),
    NEXT_PUBLIC_ASOL_API_BASE_URL: apiBaseUrl,
  };

  updateAndroidVersion(nativeVersion);
  updateIosVersion(nativeVersion);
  updateCommittedVersionConstants(version, nativeVersion);

  const errors = compareManifestFiles(localManifest, remoteManifest);
  if (errors.length > 0) {
    throw new Error(
      `Local output does not match R2 manifest (${errors.length}):\n${errors.slice(0, 20).join("\n")}`,
    );
  }

  reportStage("verifying");
  console.log("Verifying every R2 file by size and SHA-256...");
  await verifyR2Files(remoteManifest);
  reportStage("syncing-native");
  execSync("npm run cap:sync", { stdio: "inherit", env });

  if (noR8) assembleNoR8(env);

  // Not "completed": a full release continues into the signed Android build.
  // The runner stamps completion itself once the process exits successfully.
  reportStage("finalizing-results");
  console.log(
    `cap-build completed: web/R2=${version}, Android/iOS native=${nativeVersion}`,
  );
  console.log(`Automatic notes: ${remoteManifest.notes}`);
}

function assembleNoR8(env: NodeJS.ProcessEnv): void {
  reportStage("building-android");
  const androidDirectory = path.resolve("android");
  const tasks = [":app:bundleReleaseNoR8", ":app:assembleReleaseNoR8", "-Pasol.allowNoR8=true"];
  runGradle(tasks, env, androidDirectory);
}

/**
 * The store-release path: the shell is built to carry its own complete bundle,
 * so there is no OTA to publish and nothing on R2 to prove the bundle against.
 *
 * It opens a new content line at `<native>.0` derived entirely from the local
 * Android version, which is what lets this run without R2 credentials or a
 * network. The guard against the previous local build is the one ordering
 * check still available offline; the publisher applies the authoritative one
 * against the live manifest when an OTA is later published on this line.
 */
async function buildStoreRelease({ plannedNativeVersion, apiBaseUrl, noR8 }: {
  plannedNativeVersion: string;
  apiBaseUrl: string;
  noR8: boolean;
}): Promise<void> {
  const previousLocalVersion = existsSync(LOCAL_MANIFEST_PATH)
    ? readLocalManifest().version
    : null;
  const version = releaseContentVersion(plannedNativeVersion);
  // Refuses a lower version, allows an equal one. The content version here is derived as
  // `<native>.0`, so rebuilding the same unreleased shell to pick up the latest changes
  // produces the same string by design — which is exactly what the "keep the current
  // version" choice is for. Requiring it to advance made that choice impossible: the
  // release console offered a button that always failed.
  assertContentLineDoesNotRegress(version, previousLocalVersion);
  console.log(
    `Store release without OTA: content ${previousLocalVersion ?? "(none)"} -> ${version}, ` +
      `native shell ${plannedNativeVersion}. R2 is not read or written.`,
  );

  const env: NodeJS.ProcessEnv = {
    ...withoutVsCodeDebuggerEnv(process.env),
    ...otaClientBuildEnv(version, plannedNativeVersion),
    NEXT_PUBLIC_ASOL_API_BASE_URL: apiBaseUrl,
  };

  // Before the build, so the bundle is compiled against the versions it ships.
  updateAndroidVersion(plannedNativeVersion);
  updateIosVersion(plannedNativeVersion);
  updateCommittedVersionConstants(version, plannedNativeVersion);

  reportStage("building-web");
  execSync("npm run build:static", { stdio: "inherit", env });
  // A diagnostic bundle skips the slow audits; it must never reach a shell.
  assertReleaseStaticBundle(LOCAL_MANIFEST_PATH);

  reportStage("syncing-native");
  execSync("npm run cap:sync", { stdio: "inherit", env });

  if (noR8) assembleNoR8(env);

  reportStage("finalizing-results");
  console.log(
    `cap-build completed without OTA: web content=${version}, Android/iOS native=${plannedNativeVersion}`,
  );
}

main().catch((error) => {
  console.error(
    `cap-build failed: ${error instanceof Error ? error.message : error}`,
  );
  process.exitCode = 1;
});
