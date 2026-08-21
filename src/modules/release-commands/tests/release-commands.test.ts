import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { zipSync } from "fflate";

import { detectImageContentType, readImageDimensions, validateGooglePlayImage } from "@asol/google-play-store-assets-core/images";
import { assertCapBuildInputBundle, assertReleaseStaticBundle } from "@asol/ota-core/publishing";
import { validateAndroidR8PolicySources, type AndroidR8PolicySources } from "@asol/native-core/scripts/validate-android-r8-policy";
import {
  assertContentVersionAdvances,
  assertContentLineDoesNotRegress,
  compareOtaVersions,
  isNativeVersion,
  isOtaVersion,
  nextContentVersion,
  parseContentVersion,
  releaseContentVersion,
} from "@asol/ota-core";
import { BUILD_COMMAND_CATALOG, materializeBuildCommandParameters, type BuildCommandCatalogEntry } from "@asol/release-core/console";
import { assertBuildJobTransition } from "@asol/release-core/console";
import { nextBuildJobActivity, nextBuildJobStage } from "@asol/release-core/console";
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
import {
  analyzeBundleArtifact,
  changedBuildArtifacts,
  classifyEntry,
  snapshotBuildOutputs,
} from "@asol/release-core/console-artifacts";

async function main() {
const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { scripts: Record<string, string> };
const staticBuilderSource = await readFile("packages/ota-core/src/publishing/build/build-out.ts", "utf8");
const staticBuilderConfigSource = await readFile(
  "packages/ota-core/src/publishing/build/out-runtime-config.ts",
  "utf8",
);
for (const route of [
  "app/super-admin/google-play-store-assets",
  "app/super-admin/google-play-console",
  "app/super-admin/ota-releases",
  "app/super-admin/data-health",
  "app/super-admin/dev-cloud-backup",
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
for (const pagePath of [
  "src/app/super-admin/data-health/page.tsx",
  "src/app/super-admin/dev-cloud-backup/page.tsx",
]) {
  const pageSource = await readFile(pagePath, "utf8");
  assert.match(pageSource, /getServerRuntimeContext\(\)\.isDevelopment.*notFound/,
    `${pagePath} must return 404 outside server development`);
}
const sidebarSource = await readFile("src/components/layouts/AppSidebar.tsx", "utf8");
assert.doesNotMatch(sidebarSource, /href="\/dev\/data-health"/,
  "data health belongs under /dev and must not appear in the sidebar");
assert.doesNotMatch(sidebarSource, /href="\/dev\/dev-cloud-backup"/,
  "dev cloud backup belongs under /dev and must not appear in the sidebar");
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
const adminAr = JSON.parse(
  await readFile("src/locales/admin-ar.json", "utf8"),
) as Record<string, string>;
for (const command of BUILD_COMMAND_CATALOG) {
  assert.ok(packageJson.scripts[command.script], `Catalog command ${command.id} references missing script ${command.script}`);
  assert.ok(command.documentation.descriptionKey && command.documentation.producesKey && command.documentation.mutatesKey && command.documentation.prerequisitesKey);
  if (command.danger === "publishes-live") assert.ok(command.confirmationPhrase && command.requiredEnv.length);
  assert.deepEqual(command.argv, [], `${command.id} must express options through its parameter schema`);
  for (const field of ["title", "description", "produces", "mutates", "prerequisites"] as const) {
    const key = `releaseConsole.commandDocs.${command.id}.${field}`;
    assert.ok(adminAr[key]?.trim(), `missing Arabic command documentation: ${key}`);
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
assert.match(fullReleaseOrchestrator, /capBuildPath, "--no-ota", \.\.\.forwarded/,
  "the release orchestrator must build without OTA and pass the resolved choices to cap-build");

// The version action is resolved before cap-build runs, so `cap-build`'s `auto` fallback is
// unreachable from this path. The console's dialog never offers `auto`, and a full release
// picking its own version number silently is the mistake this path exists to prevent.
assert.match(fullReleaseOrchestrator, /resolveNativeVersionAction\(releaseArguments\)/,
  "the release orchestrator must resolve the Android version action before building");
assert.match(fullReleaseOrchestrator, /\$\{NATIVE_VERSION_FLAG\}\$\{nativeVersionAction\}/,
  "the resolved action must be forwarded to cap-build as --native-version=");

const versionChoice = await readFile("scripts/release-android-version-choice.ts", "utf8");
// The two answers must be exactly the two the dialog offers, mapped to the two values
// `cap-build` accepts. A third value here would be a behaviour the console cannot produce.
for (const value of ["current", "next-patch"]) {
  assert.match(versionChoice, new RegExp(`value: "${value}"`),
    `the terminal prompt must offer the ${value} action, matching the console dialog`);
}
assert.doesNotMatch(versionChoice, /"auto"/,
  "auto must not be selectable from the terminal: the console dialog does not offer it");
assert.match(versionChoice, /process\.stdin\.isTTY/,
  "the prompt must detect a terminal: the console spawns this script with piped stdio and " +
  "would hang forever on a question nobody can answer");
// English only. A mixed-script prompt reorders around option numbers and flag values in
// most shells, which misleads about which key selects what.
assert.doesNotMatch(versionChoice, /[؀-ۿ]/,
  "terminal output must be English only");
assert.ok(fullReleaseOrchestrator.indexOf("capBuildPath")
  < fullReleaseOrchestrator.lastIndexOf("signedBuildPath"),
"signed Android artifacts must be built only after web/native preparation");
// Checked against `forwarded` rather than the raw argv: the orchestrator now resolves the
// version action first and rebuilds the argument list, and `return` replaces `process.exit`
// so the async entry point can reject through its own catch instead of exiting mid-promise.
assert.match(fullReleaseOrchestrator, /forwarded\.includes\("--dry-run"\)\)\s*return/,
  "a full-release dry run must stop before signing");
assert.match(fullReleaseOrchestrator, /ASOL_WEB_BUNDLE_READY:\s*"1"/,
  "the signed build must receive proof that cap-build prepared the web bundle");

// Every artifact from this command is signed and R8-processed.
//
// Signing was already enforced by build-android-signed, which refuses when a keystore
// variable is missing. R8 was not: cap-build permits --no-r8 alongside --no-ota, and
// --no-ota is exactly what this path passes — so `release:android --no-r8` would have
// assembled releaseNoR8 artifacts with minifyEnabled false and then signed a separate
// release build on top, leaving two different outputs from one release run.
assert.match(fullReleaseOrchestrator, /includes\("--no-r8"\)/,
  "release:android must refuse --no-r8: every package it produces is R8-processed");
const signedBuild = await readFile("scripts/build-android-signed.ts", "utf8");
assert.match(signedBuild, /:app:bundleRelease", ":app:assembleRelease/,
  "the signed build must assemble the R8 release build type, not releaseNoR8");
assert.match(signedBuild, /Android signing is missing/,
  "the signed build must refuse rather than emit an unsigned artifact");
const androidGradle = await readFile("android/app/build.gradle", "utf8");
const releaseBuildType = androidGradle.slice(
  androidGradle.indexOf("        release {"),
  androidGradle.indexOf("        releaseNoR8 {"),
);
for (const setting of [
  "minifyEnabled true",
  "shrinkResources true",
  "signingConfig signingConfigs.release",
]) {
  assert.ok(releaseBuildType.includes(setting),
    `the release build type must keep "${setting}": it is what makes the shipped shell minified and signed`);
}

// Capacitor plugin registration must survive `cap sync`.
//
// Capacitor discovers plugins from the **root** package.json, and every plugin here is
// declared by @asol/native-core instead (rule 9). So `npx cap sync` found none and
// regenerated android/capacitor.settings.gradle with 1 entry instead of 25 — the native
// compile then failed with "package com.capacitorjs.plugins.pushnotifications does not
// exist". `includePlugins` overrides discovery, and deriving it from native-core keeps one
// source of truth.
const capacitorConfig = await readFile("capacitor.config.ts", "utf8");
assert.match(capacitorConfig, /includePlugins/,
  "capacitor.config.ts must declare includePlugins: plugin discovery cannot see native-core");
assert.match(capacitorConfig, /native-core\/package\.json/,
  "includePlugins must be derived from native-core so the two lists cannot drift");
const nativeCoreDeps = Object.keys(
  (JSON.parse(await readFile("packages/native-core/package.json", "utf8")) as {
    dependencies: Record<string, string>;
  }).dependencies,
).filter((name) =>
  /^(@capacitor|@capacitor-mlkit|@capawesome|@capgo)\//.test(name) &&
  !["@capacitor/android", "@capacitor/ios", "@capacitor/cli", "@capacitor/core"].includes(name));
const settingsGradle = await readFile("android/capacitor.settings.gradle", "utf8");
for (const plugin of nativeCoreDeps) {
  // The generated file points at the package's own android/ folder under node_modules,
  // so the scoped name appears verbatim.
  assert.ok(settingsGradle.includes(`node_modules/${plugin}/android`),
    `android/capacitor.settings.gradle must register ${plugin}; run npm run cap:sync`);
}

// The `:native-core` Gradle library module must stay compilable.
//
// It was added on 2026-08-15, after the last successful Android build, so nothing had
// opened it and it failed `:native-core:compileReleaseJavaWithJavac` three times over. All
// three defects are mechanically detectable, which is what these assertions are for. A Java
// compile cannot run here, so each one pins the specific mistake rather than the outcome.
const nativeCoreGradle = await readFile("packages/native-core/android/build.gradle", "utf8");
const nativeCoreJavaDir = "packages/native-core/android/src/main/java/hgh/asol/app";
const nativeCoreJavaNames = (await readdir(nativeCoreJavaDir)).filter((name) => name.endsWith(".java"));
assert.ok(nativeCoreJavaNames.length > 0, `${nativeCoreJavaDir} must contain the module's Java sources`);

// The module's namespace differs from its Java package, so an unqualified `R` resolves to a
// nonexistent hgh.asol.app.R. Any file using R must import the module's own R explicitly.
const nativeCoreNamespace = /namespace\s+["']([^"']+)["']/.exec(nativeCoreGradle)?.[1];
assert.equal(nativeCoreNamespace, "hgh.asol.app.nativecore",
  "packages/native-core/android/build.gradle must declare its own namespace");
for (const name of nativeCoreJavaNames) {
  const source = await readFile(`${nativeCoreJavaDir}/${name}`, "utf8");

  if (/\bR\.(drawable|color|raw|string|layout)\./.test(source)) {
    assert.match(source, new RegExp(`import ${nativeCoreNamespace.replace(/\./g, "\\.")}\\.R;`),
      `${name} uses R but does not import ${nativeCoreNamespace}.R; unqualified R resolves to hgh.asol.app.R, which does not exist`);
  }

  // MainActivity lives in the application module. A library cannot depend on the app that
  // consumes it, so naming that class here does not compile — the launcher intent must be
  // resolved through the package manager instead.
  assert.doesNotMatch(source, /\bMainActivity\b/,
    `${name} must not reference MainActivity: :native-core is a library module and cannot see the app's classes. Resolve the intent with getLaunchIntentForPackage`);

  // Extending a plugin's class requires that plugin project on the compile classpath.
  const extendedPlugin = /class\s+\w+\s+extends\s+(\w*Plugin\w*)/.exec(source)?.[1];
  if (extendedPlugin === "PushNotificationsPlugin" || /PushNotificationsPlugin\./.test(source)) {
    assert.match(nativeCoreGradle, /project\(':capacitor-push-notifications'\)/,
      `${name} uses PushNotificationsPlugin, so packages/native-core/android/build.gradle must depend on project(':capacitor-push-notifications')`);
  }
}

// The iOS push-policy validator reads notification sources by path, and extracting
// @asol/notifications-core moved every one of them. It was wired into no gate, so nothing
// reported it: the paths it names must exist, and the gates must run it.
const iosPushValidator = await readFile("packages/native-core/scripts/validate-ios-push-policy.ts", "utf8");
for (const [, quoted] of iosPushValidator.matchAll(/["'`](packages\/[^"'`]+\.tsx?)["'`]/g)) {
  assert.ok(existsSync(quoted),
    `validate-ios-push-policy.ts reads ${quoted}, which does not exist`);
}
const rootPackageScripts = (JSON.parse(await readFile("package.json", "utf8")) as {
  scripts: Record<string, string>;
}).scripts;
for (const gate of ["test", "build", "build:static"]) {
  assert.match(rootPackageScripts[gate] ?? "", /ios:push:validate/,
    `the ${gate} script must run ios:push:validate; a validator no gate runs reports nothing`);
}

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

  // The store-release rule compares content **lines**, not counters.
  //
  // The shell always stamps `<native>.0`, which is structurally the lowest value on its
  // line: every OTA published onto that shell is `.1` and upward. So the normal state of a
  // store rebuild looks like a regression to a counter comparison —
  //
  //   Google Play published   0.2.3
  //   OTA on R2               0.2.3.1
  //   local package rebuilt   0.2.3.0   ← newest out/ bundle, same line, not a regression
  //
  // and that is exactly the case the "keep the current version" choice exists to serve:
  // fresh packages carrying every latest change, at the published version numbers, with
  // nothing written to R2. The higher OTA version comes later, deliberately, as 0.2.3.2.
  assert.doesNotThrow(() => assertContentLineDoesNotRegress("0.2.3.0", "0.2.3.1"),
    "a store rebuild must be allowed while a higher OTA exists on the same line");
  assert.doesNotThrow(() => assertContentLineDoesNotRegress("0.2.4.0", "0.2.4.0"),
    "rebuilding the same unreleased shell must be allowed: nothing is published");
  assert.doesNotThrow(() => assertContentLineDoesNotRegress("0.2.5.0", "0.2.4.9"),
    "advancing the line must remain allowed regardless of the old counter");
  assert.doesNotThrow(() => assertContentLineDoesNotRegress("0.2.4.0", null),
    "a first local build has nothing to compare against");
  // Moving the line backwards is still refused: older native content shipped as current.
  assert.throws(() => assertContentLineDoesNotRegress("0.2.4.0", "0.2.5.1"), /is older than/,
    "a store release must never move the content line backwards");

  // The publish rule keeps its strictness, where it belongs.
  assert.throws(() => assertContentVersionAdvances("0.2.3.0", "0.2.3.1"), /does not outrank/,
    "publishing must still refuse a version that does not advance");

  // And the store-release path must use the line rule, not the publish one — otherwise the
  // keep-current button regresses to always failing.
  const capBuild = await readFile("scripts/cap-build.ts", "utf8");
  assert.match(capBuild, /regressionBaselineFromLocalManifest/,
    "the store-release path must allow rebuilding on the same content line");
  assert.match(capBuild, /assertContentLineDoesNotRegress\(version, regressionBaseline\)/,
    "the store-release path must compare against a phantom-safe baseline");
  assert.doesNotMatch(capBuild, /assertContentVersionAdvances/,
    "the publish-only ordering rule must not be applied to a build that publishes nothing");

  // Keeping the version is refused outright when the build carries compiled native
  // changes. A native change makes a different shell, and reusing its versionName and
  // versionCode gives two different binaries one identity: Play rejects the duplicate
  // versionCode, and no device can tell them apart.
  //
  // The guard used to be conditional on the target not outranking the baseline, so a shell
  // already ahead of the last store tag — the normal state between releases — kept its
  // version while carrying new native code.
  const platformTruth = await readFile(
    "packages/ota-core/src/domain/versioning/platform-version-truth.ts",
    "utf8",
  );
  assert.match(platformTruth, /if \(action === "current"\)[\s\S]*hasNativeChanges/,
    "keep-current must refuse whenever the build contains compiled native changes");
  assert.match(platformTruth, /Refusing to keep Android version/,
    "the refusal must name the reason");
  assert.match(capBuild, /requireGooglePlayProductionNativeVersion/,
    "cap-build must read Google Play Production before planning Android versions");

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
  // Building must never touch a connected device.
  assert.doesNotMatch(debugBuilderSource, /wipeProjectPackages|installApk/,
    "the build step must not touch a connected device");

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
    "packages/release-core/src/console-server/build-job-runner.ts", "utf8",
  );
  assert.match(runnerSource, /const stageAtExit = current\.stage/,
    "a failed job must keep the stage it actually stopped at");

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

await verifyPresentationStructure([adminAr]);
await verifyRealRunnerSmokeTest();
await verifyCancellationPaths();
await verifyArtifactCollection();

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

/**
 * Collecting a job's artifacts must stay proportional to what a build produces.
 *
 * A full web export drops thousands of `.json` and `.txt` files into `out/`.
 * Treating each one as an artifact — hashing it, and rewriting the whole
 * descriptor cache around it — left finished builds sitting in
 * `finalizing-results` with the APK already on disk.
 */
async function verifyArtifactCollection() {
  const scanned = Object.keys(await snapshotBuildOutputs());
  const fromExport = scanned.filter((file) => file.startsWith("out/"));
  assert.ok(
    fromExport.every((file) => file === "out/asol-web-manifest.json"),
    `only the web manifest is an artifact under out/, found: ${fromExport.slice(0, 5).join(", ")}`,
  );

  // A file that appears is reported once, and hashing it writes the cache a
  // single time rather than once per file.
  const probeDirectory = path.resolve("android", "app", "build", "outputs", "apk");
  await mkdir(probeDirectory, { recursive: true });
  const probe = path.join(probeDirectory, "asol-artifact-collection-probe.json");
  const before = await snapshotBuildOutputs();
  await writeFile(probe, JSON.stringify({ probe: true }), "utf8");
  try {
    const changed = await changedBuildArtifacts(before);
    const descriptor = changed.find((artifact) => artifact.path.endsWith("asol-artifact-collection-probe.json"));
    assert.ok(descriptor, "a new build output must be reported as a changed artifact");
    assert.match(descriptor.sha256, /^[a-f0-9]{64}$/);

    // Cached on the second pass: the same file is not hashed again.
    const again = await changedBuildArtifacts(before);
    assert.deepEqual(
      again.find((artifact) => artifact.path === descriptor.path),
      descriptor,
    );
  } finally {
    await rm(probe, { force: true });
  }

  // The build writes and deletes as it runs, so a path can disappear between
  // being listed and being measured. That must not throw: the throw escaped
  // `finalize`, where nothing catches it, and froze the record on `running`.
  const vanished = await changedBuildArtifacts({
    ...before,
    "android/app/build/outputs/apk/asol-never-existed.json": { size: 1, mtimeMs: 1 },
  });
  assert.ok(Array.isArray(vanished));

  const source = await readFile("packages/release-core/src/console-server/build-job-artifacts.ts", "utf8");
  const describeBody = source.slice(
    source.indexOf("async function describeFile"),
    source.indexOf("async function statOrNull"),
  );
  assert.ok(describeBody.length > 0, "describeFile and statOrNull must both exist");
  assert.doesNotMatch(
    describeBody,
    /writeFile\(cachePath|writeCache\(/,
    "the descriptor cache must be written once per job, not once per artifact",
  );
  const changedBody = source.slice(
    source.indexOf("export async function changedBuildArtifacts"),
    source.indexOf("export async function resolveStoredArtifact"),
  );
  assert.equal(
    changedBody.match(/writeCache\(/g)?.length,
    1,
    "changedBuildArtifacts must write the descriptor cache exactly once",
  );
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
