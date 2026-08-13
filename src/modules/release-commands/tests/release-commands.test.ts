import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { zipSync } from "fflate";

import { detectImageContentType, readImageDimensions, validateGooglePlayImage } from "@/modules/google-play-console/domain/image-validation";
import { assertCapBuildInputBundle, assertReleaseStaticBundle } from "../../../../scripts/assert-release-static-bundle";
import { validateAndroidR8PolicySources, type AndroidR8PolicySources } from "../../../../scripts/validate-android-r8-policy";
import { compareOtaVersions } from "@/features/ota/utils/ota-state";
import { BUILD_COMMAND_CATALOG, materializeBuildCommandParameters, type BuildCommandCatalogEntry } from "../domain/build-command-catalog";
import { assertBuildJobTransition } from "../domain/build-job-types";
import { nextBuildJobActivity, nextBuildJobStage } from "../domain/build-job-progress";
import {
  assertContentVersionAdvances,
  nextContentVersion,
  parseContentVersion,
  releaseContentVersion,
} from "../domain/content-version";
import {
  acquireBuildJobLock,
  assertBuildJobId,
  assertCommandReadiness,
  cancelBuildJob,
  commandReadiness,
  lastMeaningfulLine,
  readBuildJobLog,
  readBuildJobRecord,
  reconcileBuildJobs,
  releaseBuildJobLock,
  startBuildJob,
  trackBuildJobProcess,
} from "../services/build-job-runner.server";
import { analyzeBundleArtifact, classifyEntry } from "../services/bundle-analyzer.server";

async function main() {
const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { scripts: Record<string, string> };
const staticBuilderSource = await readFile("scripts/build-static.ts", "utf8");
const staticBuilderConfigSource = await readFile(
  "scripts/build-static/build-static.runtime-config.ts",
  "utf8",
);
for (const route of [
  "app/super-admin/google-play-store-assets",
  "app/super-admin/google-play-console",
  "app/super-admin/ota-releases",
]) {
  assert.ok(staticBuilderConfigSource.includes(`"${route}"`),
    `${route} must be removed before static/mobile builds`);
}
assert.match(staticBuilderSource, /auditCatalogStudioExcluded\(\)/,
  "static output must audit that development-only release routes are absent");
const releasePageSource = await readFile(
  "src/app/super-admin/google-play-store-assets/page.tsx",
  "utf8",
);
assert.match(releasePageSource, /getServerRuntimeContext\(\)\.isDevelopment.*notFound/,
  "the release console page must return 404 outside server development");
const sidebarSource = await readFile("src/components/layouts/AppSidebar.tsx", "utf8");
assert.match(sidebarSource, /publicEnv\.developmentBuild && !isNativePlatform\(\)/,
  "release tools must stay hidden in native and production clients");
assert.doesNotMatch(sidebarSource, /window\.location\.hostname/,
  "localhost cannot identify development because Capacitor also uses it");
const releaseConfirmDialogSource = await readFile(
  "src/modules/google-play-console/presentation/components/ReleaseCommandConfirmDialog.tsx",
  "utf8",
);
assert.match(releaseConfirmDialogSource, /command\.parameters\.map/,
  "the shared confirmation dialog must render command parameters for shortcut launchers");
assert.match(releaseConfirmDialogSource, /parameters:\s*\{\s*\.\.\.\(pending\?\.parameters/,
  "the shared confirmation dialog must preserve and submit command parameters");
assert.match(releaseConfirmDialogSource,
  /!phraseSatisfied\s*\|\|\s*!minimumNativeVersionSatisfied\s*\|\|\s*!requiredParametersSatisfied/,
  "release confirmation must stay disabled until all safety-critical parameters are present");
const locales = await Promise.all(["en", "ar"].map(async (locale) => JSON.parse(
  await readFile(`src/locales/${locale}.json`, "utf8"),
) as Record<string, string>));
for (const command of BUILD_COMMAND_CATALOG) {
  assert.ok(packageJson.scripts[command.script], `Catalog command ${command.id} references missing script ${command.script}`);
  assert.ok(command.documentation.descriptionKey && command.documentation.producesKey && command.documentation.mutatesKey && command.documentation.prerequisitesKey);
  if (command.danger === "publishes-live") assert.ok(command.confirmationPhrase && command.requiredEnv.length);
  assert.deepEqual(command.argv, [], `${command.id} must express options through its parameter schema`);
  for (const field of ["title", "description", "produces", "mutates", "prerequisites"] as const) {
    const key = `releaseConsole.commandDocs.${command.id}.${field}`;
    for (const locale of locales) assert.ok(locale[key]?.trim(), `missing localized command documentation: ${key}`);
  }
}
assert.equal(BUILD_COMMAND_CATALOG.filter((item) => item.script === "ota:publish").length, 1);
// One merged full-release path. It publishes nothing, so it needs no OTA
// credentials and no confirmation phrase: the shell it builds carries its own
// complete bundle, and OTA publication is `ota-publish` on its own button.
assert.equal(
  BUILD_COMMAND_CATALOG.filter((item) => item.script.startsWith("release:android")).length,
  1,
  "there must be exactly one Android release path",
);
const fullAndroidRelease = BUILD_COMMAND_CATALOG.find(
  (item) => item.id === "release-android",
)!;
assert.equal(fullAndroidRelease.danger, "destructive");
assert.equal(fullAndroidRelease.confirmationPhrase, undefined);
assert.deepEqual(
  fullAndroidRelease.parameters.map((parameter) => parameter.name),
  ["nativeVersionAction"],
);
assert.deepEqual(fullAndroidRelease.requiredEnv, [
  "ASOL_ANDROID_KEYSTORE_FILE",
  "ASOL_ANDROID_KEYSTORE_PASSWORD",
  "ASOL_ANDROID_KEY_ALIAS",
  "ASOL_ANDROID_KEY_PASSWORD",
], "a path that never reaches R2 must not demand OTA credentials");
assert.deepEqual(
  materializeBuildCommandParameters(fullAndroidRelease, {
    nativeVersionAction: "increment-patch",
  }),
  ["--native-version=next-patch"],
);
assert.deepEqual(
  materializeBuildCommandParameters(fullAndroidRelease, {
    nativeVersionAction: "keep-current",
  }),
  ["--native-version=current"],
);
assert.throws(
  () => materializeBuildCommandParameters(fullAndroidRelease, {}),
  /ParameterRequired:nativeVersionAction/,
);
assert.throws(
  () => materializeBuildCommandParameters(fullAndroidRelease, { otaSource: "publish-new" }),
  /ParameterUnknown:otaSource/,
  "the release path must not expose an OTA choice at all",
);
assert.match(
  packageJson.scripts["release:android"],
  /release-android/,
  "the full-release shortcut must use the argument-preserving release orchestrator",
);
const fullReleaseOrchestrator = await readFile("scripts/release-android.ts", "utf8");
assert.match(fullReleaseOrchestrator, /capBuildPath, "--no-ota", \.\.\.releaseArguments/,
  "the release orchestrator must build without OTA and pass dialog choices to cap-build");
assert.ok(fullReleaseOrchestrator.indexOf("capBuildPath")
  < fullReleaseOrchestrator.lastIndexOf("signedBuildPath"),
"signed Android artifacts must be built only after web/native preparation");
assert.match(fullReleaseOrchestrator, /releaseArguments\.includes\("--dry-run"\).*process\.exit\(0\)/,
  "a full-release dry run must stop before signing");
assert.match(fullReleaseOrchestrator, /ASOL_WEB_BUNDLE_READY:\s*"1"/,
  "the signed build must receive proof that cap-build prepared the web bundle");
const capBuildSource = await readFile("scripts/cap-build.ts", "utf8");
assert.match(capBuildSource, /if \(noOta\) \{\s*await buildStoreRelease/,
  "the no-OTA path must return before any R2 client is created");
const storeReleaseSource = capBuildSource.slice(capBuildSource.indexOf("async function buildStoreRelease"));
assert.ok(storeReleaseSource, "cap-build must expose the store-release path as its own function");
assert.doesNotMatch(storeReleaseSource,
  /createOtaR2Client|getOtaManifestObject|getOtaObjectBytes|listOtaObjectKeys|verifyR2Files|compareManifestFiles/,
  "the release path must not read or verify anything on R2");
assert.match(
  packageJson.scripts["android:build:signed"],
  /build-android-signed/,
  "the full-release shortcut must use the checked Gradle builder when Ruby/Fastlane is unavailable",
);

const r8Sources: AndroidR8PolicySources = {
  buildGradle: `android { buildTypes { release { minifyEnabled true; shrinkResources true; proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro' } releaseNoR8 { initWith release; minifyEnabled false; versionNameSuffix '-nor8' } } } gradle.taskGraph.whenReady { if (project.findProperty('asol.allowNoR8') != 'true') throw new GradleException() }`,
  properties: "android.useAndroidX=true",
  appRules: "-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }\n-keepattributes RuntimeVisibleAnnotations",
  capacitorRules: "-keep public class * extends com.getcapacitor.Plugin\n-keepclassmembers class * { @com.getcapacitor.PluginMethod <methods>; }",
  fastfile: "lane :production do\n  build\n  upload_to_play_store(track: 'production')\nend",
};
assert.doesNotThrow(() => validateAndroidR8PolicySources(r8Sources));
assert.throws(() => validateAndroidR8PolicySources({ ...r8Sources, buildGradle: r8Sources.buildGradle.replace("versionNameSuffix '-nor8'", "") }), /versionNameSuffix/);
assert.throws(() => validateAndroidR8PolicySources({ ...r8Sources, fastfile: "lane :production do\n  without_android_signing do\n    gradle(build_type: 'ReleaseNoR8')\n  end\n  upload_to_play_store(track: 'production')\nend" }), /must not reference/);

for (const valid of ["job-1-abc123", `job-${Date.now()}-a1b2c3`]) assert.doesNotThrow(() => assertBuildJobId(valid));
for (const invalid of ["../job-1-abc123", "job-1-ABC123", "job-1-abc123/../../x", "x"]) assert.throws(() => assertBuildJobId(invalid), /releaseJobIdInvalid/);

const notesCommand = BUILD_COMMAND_CATALOG.find((item) => item.id === "ota-publish")!;
assert.deepEqual(materializeBuildCommandParameters(notesCommand, { notes: "Useful release notes", mandatory: true }), ["--notes=Useful release notes", "--mandatory"]);
assert.throws(() => materializeBuildCommandParameters(notesCommand, { extraArgs: ["&", "curl"] }), /ParameterUnknown/);
assert.throws(() => materializeBuildCommandParameters(notesCommand, { notes: "--mandatory" }), /ParameterInvalid/);
const publishCommand = BUILD_COMMAND_CATALOG.find((item) => item.id === "fastlane-android-internal")!;
assert.throws(() => materializeBuildCommandParameters(publishCommand, { track: "evil", rollout: 0.5 }), /ParameterInvalid/);
assert.throws(() => materializeBuildCommandParameters(publishCommand, { track: "alpha", rollout: 1.1 }), /ParameterInvalid/);
assert.match(materializeBuildCommandParameters(publishCommand, { track: "alpha", rollout: 0.25, releaseNotes: { ar: "ملاحظات", en: "Notes" } }).join(" "), /^track:alpha rollout:0\.25 release_notes_b64:[A-Za-z0-9_-]+$/);
for (const terminal of ["succeeded", "failed", "cancelled", "interrupted"] as const) assert.doesNotThrow(() => assertBuildJobTransition("running", terminal));
assert.throws(() => assertBuildJobTransition("succeeded", "running"), /TransitionInvalid/);

const temp = await mkdtemp(path.join(os.tmpdir(), "asol-release-tests-"));
try {
  const lockPath = path.join(temp, "exclusive.lock");
  const lock = { jobId: "job-1-abc123", pid: 42, commandId: "ota-check", startedAt: new Date().toISOString() };
  await acquireBuildJobLock(lock, lockPath, () => true);
  await assert.rejects(acquireBuildJobLock({ ...lock, jobId: "job-2-def456" }, lockPath, () => true), /SingleFlightActive/);
  await releaseBuildJobLock(lock.jobId, lockPath);
  await acquireBuildJobLock({ ...lock, jobId: "job-2-def456", pid: 999 }, lockPath, () => false);
  await releaseBuildJobLock("job-2-def456", lockPath);
  await assert.rejects(readFile(lockPath), (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT");
  for (const [index, outcome] of ["success", "failure", "cancel"] .entries()) {
    const jobId = `job-${10 + index}-${outcome.slice(0, 6).padEnd(6, "0")}`;
    await acquireBuildJobLock({ ...lock, jobId, pid: 42 }, lockPath, () => true);
    await releaseBuildJobLock(jobId, lockPath);
    await assert.rejects(readFile(lockPath), (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT");
  }

  const interrupted = { id: "job-3-ghi789", commandId: "ota-check", command: { id: "ota-check", script: "ota:check", argv: [], category: "ota", danger: "safe" }, status: "running", queuedAt: new Date().toISOString(), startedAt: new Date().toISOString(), pid: 123456, logPath: "x.log" };
  await writeFile(path.join(temp, `${interrupted.id}.json`), JSON.stringify(interrupted));
  await reconcileBuildJobs(temp, () => false);
  assert.equal(JSON.parse(await readFile(path.join(temp, `${interrupted.id}.json`), "utf8")).status, "interrupted");

  const diagnosticManifest = path.join(temp, "diagnostic.json");
  await writeFile(diagnosticManifest, JSON.stringify({ diagnostic: true }));
  assert.throws(() => assertReleaseStaticBundle(diagnosticManifest), /diagnostic static build/);
  assert.throws(() => assertCapBuildInputBundle({ resume: false, skipOta: true, dryRun: false }, diagnosticManifest), /diagnostic static build/);
  await writeFile(diagnosticManifest, JSON.stringify({ diagnostic: false }));
  assert.doesNotThrow(() => assertReleaseStaticBundle(diagnosticManifest));

  // A store release opens its own content line; every OTA afterwards advances
  // the counter alone, and the next shell restarts it without ever ranking
  // below what devices already carry.
  assert.equal(releaseContentVersion("0.2.3"), "0.2.3.0");
  assert.throws(() => releaseContentVersion("0.2.3.0"), /Invalid native shell version/);
  assert.deepEqual(parseContentVersion("0.2.3.7"), { nativeVersion: "0.2.3", counter: 7 });
  assert.equal(parseContentVersion("0.1.15"), null, "a legacy version belongs to no line");
  assert.equal(nextContentVersion("0.2.3.0", "0.2.3"), "0.2.3.1");
  assert.equal(nextContentVersion("0.2.3.9", "0.2.3"), "0.2.3.10");
  assert.equal(nextContentVersion(null, "0.2.3"), "0.2.3.1");
  assert.equal(nextContentVersion("0.1.15", "0.2.3"), "0.2.3.1",
    "publishing onto a new shell restarts the counter above the shell's own .0");
  assert.equal(nextContentVersion("0.2.3.4", "0.2.4"), "0.2.4.1",
    "a newer shell opens its own line rather than continuing the old one");
  assert.equal(compareOtaVersions("0.2.4.0", "0.2.3.9") > 0, true,
    "a restarted counter must still outrank the whole previous line");
  assert.equal(compareOtaVersions("0.2.3", "0.2.3.0"), 0,
    "a legacy three-part version and its .0 form must compare equal");
  // The one ordering an installed bundle cannot recover from: a published
  // version that does not advance reads as "no update" forever.
  assert.throws(() => nextContentVersion("0.3.0.2", "0.2.3"), /does not outrank/);
  assert.throws(() => assertContentVersionAdvances("0.2.3.0", "0.2.3.0"), /does not outrank/);
  assert.doesNotThrow(() => assertContentVersionAdvances("0.2.3.0", null));

  // Stages announced by a script are authoritative: the real order differs per
  // path, so ranking them against one fixed sequence hid steps that ran.
  assert.equal(nextBuildJobStage("starting", "[stage] building-web"), "building-web");
  assert.equal(nextBuildJobStage("verifying", "[stage] syncing-native"), "syncing-native",
    "publishing verifies R2 before syncing Capacitor");
  assert.equal(nextBuildJobStage("starting", "[stage] not-a-stage"), "starting");
  assert.equal(nextBuildJobStage("building-web", "[stage] syncing-native\n[stage] building-android"),
    "building-android", "the last announcement in a chunk wins");
  assert.equal(nextBuildJobStage("starting", "> next build"), "building-web",
    "output without announcements still falls back to the heuristics");
  assert.equal(nextBuildJobStage("building-android", "Signing the AAB"), "signing");

  // The step names the individual check inside a stage. Thirty checks under one
  // "testing" stage are indistinguishable from a hang without it.
  assert.equal(nextBuildJobActivity(undefined, "[step] 3/31 test:notifications"), "3/31 test:notifications");
  assert.equal(nextBuildJobActivity("old", "nothing announced here"), "old",
    "a chunk without a step keeps the one already showing");
  assert.equal(nextBuildJobActivity("old", "[step] first\n[step] second"), "second",
    "the last step in a chunk wins");
  assert.equal(nextBuildJobActivity(undefined, `[step] ${"x".repeat(200)}`)!.length, 80,
    "a step is capped so it cannot overflow the button it renders in");

  // The device path: one card builds and installs, a separate button tests.
  const deviceTests = BUILD_COMMAND_CATALOG.find((item) => item.id === "run-device-tests")!;
  const hostTests = BUILD_COMMAND_CATALOG.find((item) => item.id === "run-test-suite")!;
  assert.equal(deviceTests.script, "android:device:tests");
  assert.equal(hostTests.script, "verify:all", "the host suite keeps its own button and script");
  // Verification category on both: neither may wait behind the release lock.
  assert.equal(deviceTests.exclusive, false);
  assert.equal(hostTests.exclusive, false);
  assert.deepEqual(deviceTests.parameters.map((parameter) => parameter.name), ["device"]);
  assert.deepEqual(
    materializeBuildCommandParameters(deviceTests, { device: "R58N12ABCDE" }),
    ["--device=R58N12ABCDE"],
  );
  assert.deepEqual(materializeBuildCommandParameters(deviceTests, {}), [],
    "one connected device needs no serial");
  const debugCard = BUILD_COMMAND_CATALOG.find((item) => item.id === "android-build-debug")!;
  assert.ok(
    debugCard.expectedArtifacts.some((artifact) => artifact.includes("debugR8")),
    "the testing package must be the R8-optimized variant",
  );
  const debugBuilderSource = await readFile("scripts/build-android-debug.ts", "utf8");
  assert.match(debugBuilderSource, /assembleDebugR8/,
    "the testing build must assemble the R8 variant, not plain debug");
  // Building must never wipe a phone as a side effect of checking a compile
  // error, and installing must never start a twenty-minute build.
  assert.doesNotMatch(debugBuilderSource, /wipeProjectPackages|installApk/,
    "the build step must not touch a connected device");
  const deviceInstaller = BUILD_COMMAND_CATALOG.find((item) => item.id === "android-device-install")!;
  assert.equal(deviceInstaller.script, "android:device:install");
  assert.equal(deviceInstaller.danger, "destructive");
  assert.deepEqual(deviceInstaller.parameters.map((parameter) => parameter.name), ["device"]);
  const deviceInstallerSource = await readFile("scripts/android-device-install.ts", "utf8");
  assert.doesNotMatch(deviceInstallerSource, /assembleDebugR8|cap:prepare:android/,
    "the install step must build nothing");
  assert.match(deviceInstallerSource, /assertTestApkExists/,
    "installing must stop with a clear message when nothing has been built");

  // A failed job used to show a red chip carrying a job id and nothing else,
  // stamped with the one stage that had nothing to do with the failure.
  assert.equal(
    lastMeaningfulLine([
      "[stage] detecting-device",
      "Connected devices: none",
      "",
      "Device install failed: No Android device is connected.",
      "",
    ].join("\n")),
    "Device install failed: No Android device is connected.",
  );
  assert.equal(
    lastMeaningfulLine("real failure here\nnpm ERR! code 1\nnpm ERR! path C:\\x"),
    "real failure here",
    "npm's exit noise must not bury the sentence that explains the failure",
  );
  assert.equal(lastMeaningfulLine("[stage] testing\n[step] 1/2 lint\n"), undefined,
    "markers alone say nothing a reader can act on");
  assert.equal(lastMeaningfulLine(`x${"y".repeat(400)}`)!.length, 300,
    "a runaway line must not overflow the chip");
  const runnerSource = await readFile(
    "src/modules/release-commands/services/build-job-runner.server.ts", "utf8",
  );
  assert.match(runnerSource, /const stageAtExit = current\.stage/,
    "a failed job must keep the stage it actually stopped at");
  const deviceInstallSource = await readFile("scripts/android/device-install.ts", "utf8");
  assert.match(deviceInstallSource, /pm uninstall/,
    "the device must be wiped by uninstalling, not by clearing data alone");
  assert.match(deviceInstallSource, /assertDeviceIsClean/,
    "the wipe must be verified against the device rather than assumed");
  assert.doesNotMatch(deviceInstallSource, /adbInherit\(adb, \["install", "-r"/,
    "reinstalling over a previous copy would mask a failed uninstall");

  const archivePath = path.join(temp, "app-debug.apk");
  const fixtureEntries: Record<string, Uint8Array> = {
    "lib/arm64-v8a/libapp.so": bytes(101), "lib/x86_64/libapp.so": bytes(77), "classes.dex": bytes(93),
    "assets/public/app.js": bytes(89), "assets/public/app.css": bytes(47), "assets/public/index.html": bytes(31), "assets/public/page.txt": bytes(19), "assets/public/data.json": bytes(23), "assets/public/icon.png": bytes(29), "assets/public/font.woff2": bytes(37), "assets/public/module.wasm": bytes(41), "assets/public/blob.bin": bytes(11),
    "res/drawable-xhdpi/image.png": bytes(53), "res/layout/main.xml": bytes(17), "resources.arsc": bytes(67), "assets/other.dat": bytes(13),
    "AndroidManifest.xml": bytes(59), "META-INF/CERT.RSA": bytes(43),
    "BUNDLE-METADATA/tool/info.pb": bytes(7), "kotlin/collections/collections.kotlin_builtins": bytes(61),
    "DebugProbesKt.bin": bytes(5),
  };
  const archive = Buffer.from(zipSync(fixtureEntries, { level: 6 }));
  await writeFile(archivePath, archive);
  const analysis = await analyzeBundleArtifact(archivePath, createHash("sha256").update(archive).digest("hex"));
  assert.equal(analysis.entries.length, Object.keys(fixtureEntries).length);
  assert.equal(analysis.categories.reduce((sum, category) => sum + category.compressedBytes, 0), analysis.totalCompressedBytes);
  for (const category of ["nativeLibraries", "compiledCode", "webBundle", "androidResources",
    "otherAssets", "manifestMetadataSigning", "packagedJavaResources"]) {
    assert.ok(analysis.categories.some((item) => item.id === category), `missing ${category}`);
  }
  assert.equal(analysis.r8, undefined);
  assert.equal(classifyEntry("feature_chat/manifest/AndroidManifest.xml", "apk").category, "unclassified");
  assert.equal(classifyEntry("feature_chat/manifest/AndroidManifest.xml", "aab").category, "featureModules");
  const unknownPath = path.join(temp, "unknown.apk");
  const unknown = Buffer.from(zipSync({ "AndroidManifest.xml": bytes(12), "mystery.odd": bytes(8) }));
  await writeFile(unknownPath, unknown);
  await assert.rejects(analyzeBundleArtifact(unknownPath), /UnclassifiedEntries/);
} finally { await rm(temp, { recursive: true, force: true }); }

await verifyPresentationStructure(locales);
await verifyRealRunnerSmokeTest();
await verifyCancellationPaths();

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x49, 0x48, 0x44, 0x52, 0, 0, 2, 0, 0, 0, 2, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0xd0, 0x05, 0x00, 0x03, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0, 0xff, 0xd9]);
assert.equal(detectImageContentType(png), "image/png");
assert.deepEqual(readImageDimensions(png), { width: 512, height: 512 });
assert.deepEqual(readImageDimensions(jpeg), { width: 1280, height: 720 });
for (const malformed of [Buffer.from([0xff, 0xd8, 0xff]), Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0, 50]), Buffer.from([0xff, 0xd8, 0xff, 0xd0, 0xff])]) assert.equal(readImageDimensions(malformed), null);
assert.equal(validateGooglePlayImage({ imageType: "icon", contentType: "image/png", size: 1024 * 1024, dimensions: { width: 512, height: 512 }, bytes: png }).ok, true);
assert.equal(validateGooglePlayImage({ imageType: "icon", contentType: "image/jpeg", size: 10, dimensions: { width: 512, height: 512 }, bytes: png }).ok, false);
assert.equal(validateGooglePlayImage({ imageType: "featureGraphic", contentType: "image/jpeg", size: 15 * 1024 * 1024 + 1, dimensions: { width: 1024, height: 500 } }).ok, false);
assert.equal(validateGooglePlayImage({ imageType: "tvBanner", contentType: "image/jpeg", size: 10, dimensions: { width: 1280, height: 720 }, bytes: jpeg }).ok, true);
for (const imageType of ["phoneScreenshots", "sevenInchScreenshots", "tenInchScreenshots", "tvScreenshots", "wearScreenshots"] as const) {
  assert.equal(validateGooglePlayImage({ imageType, contentType: "image/jpeg", size: 8 * 1024 * 1024, dimensions: { width: 1920, height: 1080 }, existingCount: 7 }).ok, true);
  assert.equal(validateGooglePlayImage({ imageType, contentType: "image/jpeg", size: 8 * 1024 * 1024 + 1, dimensions: { width: 1920, height: 1080 }, existingCount: 7 }).ok, false);
  assert.equal(validateGooglePlayImage({ imageType, contentType: "image/jpeg", size: 10, dimensions: { width: 320, height: 320 }, existingCount: 8 }).ok, false);
}

const notReady = commandReadiness({ ...BUILD_COMMAND_CATALOG[0], requiredEnv: ["ASOL_TEST_ENV_THAT_DOES_NOT_EXIST"] } as BuildCommandCatalogEntry);
assert.equal(notReady.ready, false); assert.deepEqual(notReady.missingEnv, ["ASOL_TEST_ENV_THAT_DOES_NOT_EXIST"]);
assert.throws(() => assertCommandReadiness({ ...BUILD_COMMAND_CATALOG[0], requiredEnv: ["ASOL_TEST_ENV_THAT_DOES_NOT_EXIST"] } as BuildCommandCatalogEntry), /MissingEnvironment/);

function bytes(length: number): Uint8Array { return Uint8Array.from({ length }, (_, index) => (index * 31) % 251); }
console.log("Release console security, locking, restart recovery, R8, diagnostics, image, and bundle-analysis tests passed.");
}

async function verifyPresentationStructure(locales: Record<string, string>[]) {
  const root = path.resolve("src/modules/google-play-console/presentation");
  const files = await presentationFiles(root);
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const lines = source.split(/\r?\n/);
    assert.ok(lines.length <= 200, `${file} exceeds 200 lines`);
    if (file.endsWith(".tsx")) {
      lines.forEach((line, index) => assert.ok(line.length <= 120, `${file}:${index + 1} exceeds 120 characters`));
    }
    if (file.includes(`${path.sep}tabs${path.sep}`) && !file.endsWith("tab-registry.ts")) {
      assert.doesNotMatch(source, /from\s+["']\.\/(?:[^"']+Tab)["']/, `${file} imports another tab`);
    }
  }
  const registry = await readFile(path.join(root, "tabs", "tab-registry.ts"), "utf8");
  const entries = [...registry.matchAll(/id:\s*"([^"]+)"[^\n]*labelKey:\s*"([^"]+)"/g)];
  assert.equal(entries.length, 9);
  for (const entry of entries) for (const locale of locales) assert.ok(locale[entry[2]!]?.trim());
  for (const component of registry.matchAll(/component:\s*(\w+Tab)/g)) {
    await readFile(path.join(root, "tabs", `${component[1]}.tsx`), "utf8");
  }
}

async function presentationFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? presentationFiles(path.join(directory, entry.name))
    : Promise.resolve([path.join(directory, entry.name)])));
  return nested.flat().filter((file) => /\.(?:ts|tsx)$/.test(file));
}

async function verifyRealRunnerSmokeTest() {
  const job = await startBuildJob({ commandId: "android-r8-validate" });
  const finished = await waitForJob(job.id);
  assert.equal(finished.status, "succeeded");
  assert.equal(finished.exitCode, 0);
}

async function waitForJob(jobId: string) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const job = await readBuildJobRecord(jobId);
    if (!["queued", "running"].includes(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`runner smoke test timed out: ${jobId}`);
}

async function verifyCancellationPaths() {
  const jobDir = path.resolve(".backups", "build-jobs");
  await mkdir(jobDir, { recursive: true });
  for (const tracked of [true, false]) {
    const id = `job-${Date.now()}-${tracked ? "live01" : "disk01"}`;
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { shell: false });
    assert.ok(child.pid);
    const record = {
      id, commandId: "android-r8-validate",
      command: { id: "android-r8-validate", script: "android:r8:validate", argv: [],
        category: "verification", danger: "safe" },
      status: "running", queuedAt: new Date().toISOString(), startedAt: new Date().toISOString(),
      pid: child.pid, logPath: `.backups/build-jobs/${id}.log`,
    } as const;
    await writeFile(path.join(jobDir, `${id}.json`), JSON.stringify(record));
    if (tracked) trackBuildJobProcess(id, child);
    const cancelled = await cancelBuildJob(id);
    assert.equal(cancelled.status, "cancelled");
    await rm(path.join(jobDir, `${id}.json`), { force: true });
  }
  const logId = `job-${Date.now()}-log256`;
  await writeFile(path.join(jobDir, `${logId}.log`), "x".repeat(300 * 1024));
  const first = await readBuildJobLog(logId, 0);
  assert.equal(Buffer.byteLength(first.text), 256 * 1024);
  assert.equal(first.hasMore, true);
  const second = await readBuildJobLog(logId, first.nextOffset);
  assert.equal(second.hasMore, false);
  await rm(path.join(jobDir, `${logId}.log`), { force: true });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
