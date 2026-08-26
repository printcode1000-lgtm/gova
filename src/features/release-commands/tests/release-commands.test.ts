import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { zipSync } from "fflate";

import {
  ALL_BRANCH_HELP,
  ANDROID_RELEASE_BRANCH_HELP,
  ANDROID_RELEASE_PATHS,
  PUSH_BRANCH_HELP,
  deployAllScenarios,
  deployPushTargets,
} from "@/features/google-play-console";
import {
  productionDeployEmail,
  productionDeployNotification,
  productionDeployStageLabel,
} from "@/features/release-commands/domain/production-deploy-report";
import {
  deployElapsedMs,
  formatDeployDuration,
  stageTimings,
} from "@/features/release-commands/domain/production-deploy-timing";
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
import {
  BUILD_COMMAND_CATALOG,
  materializeBuildCommandParameters,
  type BuildCommandCatalogEntry,
  allAndroidReleaseBranchIds,
  ANDROID_RELEASE_RUNBOOKS,
  androidRunbookStatsByTab,
  findAndroidReleaseBranch,
  assertBuildJobTransition,
  nextBuildJobActivity,
  nextBuildJobStage,
  DEPLOY_ALL_SCENARIO_VALUES,
  DEPLOY_PUSH_TARGET_VALUES,
  deployAllBranchIds,
  deployPushBranchIds,
} from "@asol/release-core/console";
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
} from "../server/services/build-job-runner.server";
import { releaseRequirementSatisfied } from "@/features/google-play-console/server";
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
assert.match(staticBuilderSource, /loadOtaEnvironment\(\)/,
  "static out must load the unified release-tool environment before baking credentials");
const staticCliSource = await readFile("scripts/build-static.ts", "utf8");
assert.match(staticCliSource, /loadReleaseEnvironment\(\)/,
  "build:static must load the same release-tool env as ota:check and release:android");
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
const sidebarSource = await readFile("src/shared/layouts/AppSidebar.tsx", "utf8");
assert.doesNotMatch(sidebarSource, /href="\/dev\/data-health"/,
  "data health belongs under /dev and must not appear in the sidebar");
assert.doesNotMatch(sidebarSource, /href="\/dev\/dev-cloud-backup"/,
  "dev cloud backup belongs under /dev and must not appear in the sidebar");
assert.doesNotMatch(sidebarSource, /window\.location\.hostname/,
  "localhost cannot identify development because Capacitor also uses it");
const releaseConfirmDialogSource = await readFile(
  "src/features/google-play-console/presentation/components/ReleaseCommandConfirmDialog.tsx",
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
  await readFile("src/shared/locales/admin-ar.json", "utf8"),
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
const androidPathIds = ANDROID_RELEASE_PATHS.map((path) => path.id);
assert.deepEqual(Object.keys(ANDROID_RELEASE_RUNBOOKS), androidPathIds,
  "AndroidReleasePaths UI cards must follow ANDROID_RELEASE_RUNBOOKS key order");
assert.deepEqual([...androidPathIds].sort(), Object.keys(ANDROID_RELEASE_RUNBOOKS).sort(),
  "android release runbooks must cover every Build & Publish tab path");

for (const branchId of deployAllBranchIds()) {
  assert.ok(ALL_BRANCH_HELP[branchId]?.trim(), `missing Deploy All Arabic branch help: ${branchId}`);
}
for (const branchId of deployPushBranchIds()) {
  assert.ok(PUSH_BRANCH_HELP[branchId]?.trim(), `missing Deploy Push Arabic branch help: ${branchId}`);
}
assert.deepEqual(
  deployAllScenarios.map(([value]) => value),
  [...DEPLOY_ALL_SCENARIO_VALUES],
  "Deploy All UI scenarios must match release-core catalog enum values",
);
assert.deepEqual(
  deployPushTargets.map(([value]) => value),
  [...DEPLOY_PUSH_TARGET_VALUES],
  "Deploy Push UI targets must match release-core catalog enum values",
);

const androidBranchIds = allAndroidReleaseBranchIds();
assert.equal(new Set(androidBranchIds).size, androidBranchIds.length,
  "android release runbook branch ids must be unique");
for (const branchId of androidBranchIds) {
  const branch = findAndroidReleaseBranch(branchId)!;
  assert.ok(BUILD_COMMAND_CATALOG.some((command) => command.id === branch.commandId),
    `android runbook branch ${branchId} references missing catalog command ${branch.commandId}`);
  assert.ok(branch.label.trim(), `android runbook branch ${branchId} must declare an Arabic label`);
  assert.ok(ANDROID_RELEASE_BRANCH_HELP[branchId]?.trim(),
    `missing Arabic branch help: ${branchId}`);
}
const runbookStats = androidRunbookStatsByTab();
const minimumBranchesByTab: Record<string, number> = {
  "release-android": 45,
  "build-static": 100,
  "cap-prepare-android": 80,
  "android-build-debug": 75,
  "ota-publish": 18,
};
for (const [pathId, minimum] of Object.entries(minimumBranchesByTab)) {
  assert.ok(
    runbookStats[pathId as keyof typeof runbookStats].branches >= minimum,
    `${pathId} runbook must expose at least ${minimum} command branches (found ${runbookStats[pathId as keyof typeof runbookStats].branches})`,
  );
  assert.ok(
    runbookStats[pathId as keyof typeof runbookStats].phases >= 3,
    `${pathId} runbook must declare at least three phases`,
  );
}
const androidPathsUi = await readFile(
  "src/features/google-play-console/presentation/components/AndroidReleasePaths.tsx",
  "utf8",
);
assert.match(androidPathsUi, /AndroidReleaseRunbookTree/,
  "Android release paths must render the hierarchical runbook tree");
assert.match(androidPathsUi, /AndroidReleasePathsTerminal/,
  "Android release paths must render the live job terminal");
for (const key of [
  "releaseConsole.androidPaths.terminalTitle",
  "releaseConsole.androidPaths.treeTitle",
  "releaseConsole.androidPaths.phaseCheckboxHelp",
  "releaseConsole.androidPaths.sectionCheckboxHelp",
  "releaseConsole.androidPaths.branchCheckboxHelp",
]) {
  assert.ok(adminAr[key]?.trim(), `missing Arabic android paths UI string: ${key}`);
}
const androidRunbookTreeUi = await readFile(
  "src/features/google-play-console/presentation/components/AndroidReleaseRunbookTree.tsx",
  "utf8",
);
assert.match(androidRunbookTreeUi, /selectAll|selectNone/,
  "Android release runbook tree must expose bulk selection controls");
for (const uiPath of [
  "src/features/google-play-console/presentation/components/AndroidReleaseRunbookBranchCard.tsx",
  "src/features/google-play-console/presentation/components/AndroidReleaseRunbookCascadeCheckbox.tsx",
]) {
  const uiSource = await readFile(uiPath, "utf8");
  assert.match(uiSource, /type="checkbox"/, `${uiPath} must render checkboxes`);
}
const phaseBlocksSource = await readFile(
  "src/features/google-play-console/presentation/components/AndroidReleaseRunbookPhaseBlocks.tsx",
  "utf8",
);
assert.match(phaseBlocksSource, /CascadeCheckbox/, "phase and section blocks must cascade parent checkboxes");
assert.match(phaseBlocksSource, /CommandBranchCard/, "sections must render command branch cards with checkboxes");
assert.equal(androidBranchIds.length, 356, "android release runbook must expose 356 selectable branches");
assert.equal(BUILD_COMMAND_CATALOG.filter((item) => item.script === "ota:publish").length, 1);
const gradleRunnerSource = await readFile("scripts/android/gradle.ts", "utf8");
assert.match(
  gradleRunnerSource,
  /runAndroidBuildPreflight/,
  "Gradle package builds must run Android preflight before gradlew",
);
const signedBuildSource = await readFile("scripts/build-android-signed.ts", "utf8");
assert.match(
  signedBuildSource,
  /runAndroidBuildPreflight/,
  "Signed Android package builds must run Android preflight before gradlew",
);
const debugBuildSource = await readFile("scripts/build-android-debug.ts", "utf8");
assert.match(
  debugBuildSource,
  /runAndroidBuildPreflight/,
  "Debug Android package builds must run Android preflight before web sync and gradlew",
);
const releaseAndroidSource = await readFile("scripts/release-android.ts", "utf8");
assert.match(
  releaseAndroidSource,
  /runAndroidBuildPreflight/,
  "release:android must run Android preflight before cap-build and signing",
);
const developmentGuardSource = await readFile(
  "src/features/google-play-console/domain/development-guard.server.ts",
  "utf8",
);
assert.match(
  developmentGuardSource,
  /releaseArchiveCanRestore/,
  "dynamic release pages must treat an authenticated portable restore as runnable",
);
assert.ok(
  packageJson.scripts["android:preflight"],
  "android:preflight npm script must exist for standalone toolchain checks",
);
const fastlaneRunnerSource = await readFile("scripts/fastlane-runner.ts", "utf8");
assert.match(
  fastlaneRunnerSource,
  /android-build-preflight\.ts/,
  "fastlane-runner must run Android preflight before non-doctor android lanes",
);
assert.match(
  fastlaneRunnerSource,
  /ensureReleaseSecretsRestored/,
  "fastlane-runner must apply scoped secret auto-restore before Ruby starts",
);
const capRunCleanSource = await readFile("scripts/cap-run-clean.ts", "utf8");
assert.match(
  capRunCleanSource,
  /runAndroidBuildPreflight/,
  "cap:run:clean:android must run Android preflight before cap run invokes Gradle",
);
const deviceTestsSource = await readFile(
  "packages/native-core/scripts/android-device-tests.ts",
  "utf8",
);
assert.match(
  deviceTestsSource,
  /runAndroidBuildPreflight/,
  "android:device:tests must run Android preflight before connected Gradle tests",
);
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
assert.match(fullReleaseOrchestrator, /resolveNativeVersionAction\(releaseArguments\)/,
  "the release orchestrator must resolve the Android version action before building");
assert.match(fullReleaseOrchestrator, /\$\{NATIVE_VERSION_FLAG\}\$\{nativeVersionAction\}/,
  "the resolved action must be forwarded to cap-build as --native-version=");

const versionChoice = await readFile("scripts/release-android-version-choice.ts", "utf8");
for (const value of ["current", "next-patch"]) {
  assert.match(versionChoice, new RegExp(`value: "${value}"`),
    `the terminal prompt must offer the ${value} action, matching the console dialog`);
}
assert.doesNotMatch(versionChoice, /"auto"/,
  "auto must not be selectable from the terminal: the console dialog does not offer it");
assert.match(versionChoice, /process\.stdin\.isTTY/,
  "the prompt must detect a terminal: the console spawns this script with piped stdio and " +
  "would hang forever on a question nobody can answer");
assert.doesNotMatch(versionChoice, /[؀-ۿ]/,
  "terminal output must be English only");
assert.ok(fullReleaseOrchestrator.indexOf("capBuildPath")
  < fullReleaseOrchestrator.lastIndexOf("signedBuildPath"),
"signed Android artifacts must be built only after web/native preparation");
assert.match(fullReleaseOrchestrator, /forwarded\.includes\("--dry-run"\)\)\s*return/,
  "a full-release dry run must stop before signing");
assert.match(fullReleaseOrchestrator, /ASOL_WEB_BUNDLE_READY:\s*"1"/,
  "the signed build must receive proof that cap-build prepared the web bundle");
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

const capacitorConfig = await readFile("capacitor.config.ts", "utf8");
assert.match(capacitorConfig, /includePlugins/,
  "capacitor.config.ts must declare includePlugins: plugin discovery cannot see native-core");
assert.match(capacitorConfig, /CAPACITOR_INCLUDE_PLUGINS/,
  "includePlugins must come from native-core so the two lists cannot drift");
assert.match(capacitorConfig, /from ["']@asol\/native-core["']/,
  "the plugin list must arrive through the package door, not a relative path");
assert.doesNotMatch(capacitorConfig, /native-core\/package\.json/,
  "capacitor.config.ts must not reach into the package by relative path");
const pluginManifest = await readFile(
  "packages/native-core/src/domain/capacitor-plugin-manifest.ts",
  "utf8",
);
assert.match(pluginManifest, /nativeCorePackage\.dependencies/,
  "native-core must derive the list from its own dependencies, not restate it");
const nativeCoreDeps = Object.keys(
  (JSON.parse(await readFile("packages/native-core/package.json", "utf8")) as {
    dependencies: Record<string, string>;
  }).dependencies,
).filter((name) =>
  /^(@capacitor|@capacitor-mlkit|@capawesome|@capgo)\//.test(name) &&
  !["@capacitor/android", "@capacitor/ios", "@capacitor/cli", "@capacitor/core"].includes(name));
const settingsGradle = await readFile("android/capacitor.settings.gradle", "utf8");
for (const plugin of nativeCoreDeps) {
  assert.ok(settingsGradle.includes(`node_modules/${plugin}/android`),
    `android/capacitor.settings.gradle must register ${plugin}; run npm run cap:sync`);
}

const nativeCoreGradle = await readFile("packages/native-core/android/build.gradle", "utf8");
const nativeCoreJavaDir = "packages/native-core/android/src/main/java/hgh/asol/app";
const nativeCoreJavaNames = (await readdir(nativeCoreJavaDir)).filter((name) => name.endsWith(".java"));
assert.ok(nativeCoreJavaNames.length > 0, `${nativeCoreJavaDir} must contain the module's Java sources`);
const nativeCoreNamespace = /namespace\s+["']([^"']+)["']/.exec(nativeCoreGradle)?.[1];
assert.equal(nativeCoreNamespace, "hgh.asol.app.nativecore",
  "packages/native-core/android/build.gradle must declare its own namespace");
for (const name of nativeCoreJavaNames) {
  const source = await readFile(`${nativeCoreJavaDir}/${name}`, "utf8");
  if (/\bR\.(drawable|color|raw|string|layout)\./.test(source)) {
    assert.match(source, new RegExp(`import ${nativeCoreNamespace.replace(/\./g, "\\.")}\\.R;`),
      `${name} uses R but does not import ${nativeCoreNamespace}.R; unqualified R resolves to hgh.asol.app.R, which does not exist`);
  }
  assert.doesNotMatch(source, /\bMainActivity\b/,
    `${name} must not reference MainActivity: :native-core is a library module and cannot see the app's classes. Resolve the intent with getLaunchIntentForPackage`);
  const extendedPlugin = /class\s+\w+\s+extends\s+(\w*Plugin\w*)/.exec(source)?.[1];
  if (extendedPlugin === "PushNotificationsPlugin" || /PushNotificationsPlugin\./.test(source)) {
    assert.match(nativeCoreGradle, /project\(':capacitor-push-notifications'\)/,
      `${name} uses PushNotificationsPlugin, so packages/native-core/android/build.gradle must depend on project(':capacitor-push-notifications')`);
  }
}

const iosPushValidator = await readFile("packages/native-core/scripts/validate-ios-push-policy.ts", "utf8");
for (const [, quoted] of iosPushValidator.matchAll(/["'`](packages\/[^"'`]+\.tsx?)["'`]/g)) {
  assert.ok(existsSync(quoted),
    `validate-ios-push-policy.ts reads ${quoted}, which does not exist`);
}
const generatedGatesSource = await readFile("scripts/generated-gates.ts", "utf8");
assert.match(
  generatedGatesSource,
  /const commonBuildChecks:[\s\S]*?name: 'ios:push:validate'/,
  "build and build:static must include ios:push:validate through the shared generated gate policy",
);
assert.match(
  generatedGatesSource,
  /test:\s*\[[\s\S]*?name: 'ios:push:validate'/,
  "the generated test gate must include ios:push:validate",
);
const generatedGateContractSource = await readFile("scripts/generated-gate-contract.ts", "utf8");
assert.match(
  generatedGateContractSource,
  /package\.json script \$\{gateId\} must be exactly/,
  "generated gate entrypoints must remain contract-verified instead of hand-expanded in package.json",
);

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
  assert.throws(() => nextContentVersion("0.3.0.2", "0.2.3"), /does not outrank/);
  assert.throws(() => assertContentVersionAdvances("0.2.3.0", "0.2.3.0"), /does not outrank/);
  assert.doesNotThrow(() => assertContentVersionAdvances("0.2.3.0", null));
  assert.doesNotThrow(() => assertContentLineDoesNotRegress("0.2.3.0", "0.2.3.1"),
    "a store rebuild must be allowed while a higher OTA exists on the same line");
  assert.doesNotThrow(() => assertContentLineDoesNotRegress("0.2.4.0", "0.2.4.0"),
    "rebuilding the same unreleased shell must be allowed: nothing is published");
  assert.doesNotThrow(() => assertContentLineDoesNotRegress("0.2.5.0", "0.2.4.9"),
    "advancing the line must remain allowed regardless of the old counter");
  assert.doesNotThrow(() => assertContentLineDoesNotRegress("0.2.4.0", null),
    "a first local build has nothing to compare against");
  assert.throws(() => assertContentLineDoesNotRegress("0.2.4.0", "0.2.5.1"), /is older than/,
    "a store release must never move the content line backwards");
  assert.throws(() => assertContentVersionAdvances("0.2.3.0", "0.2.3.1"), /does not outrank/,
    "publishing must still refuse a version that does not advance");

  const capBuild = await readFile("scripts/cap-build.ts", "utf8");
  assert.match(capBuild, /regressionBaselineFromLocalManifest/,
    "the store-release path must allow rebuilding on the same content line");
  assert.match(capBuild, /assertContentLineDoesNotRegress\(version, regressionBaseline\)/,
    "the store-release path must compare against a phantom-safe baseline");
  assert.doesNotMatch(capBuild, /assertContentVersionAdvances/,
    "the publish-only ordering rule must not be applied to a build that publishes nothing");

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

  assert.equal(nextBuildJobStage("starting", "[stage] building-web"), "building-web");
  assert.equal(nextBuildJobStage("verifying", "[stage] syncing-native"), "syncing-native",
    "publishing verifies R2 before syncing Capacitor");
  assert.equal(nextBuildJobStage("starting", "[stage] not-a-stage"), "starting");
  assert.equal(nextBuildJobStage("building-web", "[stage] syncing-native\n[stage] building-android"),
    "building-android", "the last announcement in a chunk wins");
  assert.equal(nextBuildJobStage("starting", "> next build"), "building-web",
    "output without announcements still falls back to the heuristics");
  assert.equal(nextBuildJobStage("building-android", "Signing the AAB"), "signing");

  assert.equal(nextBuildJobActivity(undefined, "[step] 3/31 test:notifications"), "3/31 test:notifications");
  assert.equal(nextBuildJobActivity("old", "nothing announced here"), "old",
    "a chunk without a step keeps the one already showing");
  assert.equal(nextBuildJobActivity("old", "[step] first\n[step] second"), "second",
    "the last step in a chunk wins");
  assert.equal(nextBuildJobActivity(undefined, `[step] ${"x".repeat(200)}`)!.length, 80,
    "a step is capped so it cannot overflow the button it renders in");

  const deviceTests = BUILD_COMMAND_CATALOG.find((item) => item.id === "run-device-tests")!;
  const hostTests = BUILD_COMMAND_CATALOG.find((item) => item.id === "run-test-suite")!;
  assert.equal(deviceTests.script, "android:device:tests");
  assert.equal(hostTests.script, "verify:all", "the host suite keeps its own button and script");
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
  assert.doesNotMatch(debugBuilderSource, /wipeProjectPackages|installApk/,
    "the build step must not touch a connected device");

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
  const versionSummarySource = await readFile(
    "src/features/google-play-console/presentation/components/ReleaseVersionSummary.tsx",
    "utf8",
  );
  assert.match(versionSummarySource, /iosStoreDistribution === false/,
    "the dynamic release page must distinguish not-live iOS distribution from missing credentials");

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
await verifyProductionDeployConsole();

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

// A missing variable blocks a command only when the encrypted archive cannot
// supply it — `releaseRequirementSatisfied` falls back to the archive on
// purpose. This used to assert "not ready" outright, which silently depended on
// the developer's machine holding no ASOL_SECRET_ARCHIVE_PASSWORD: setting one
// turned every requirement satisfiable and failed the test on a correct tree.
const absentRequirement = { ...BUILD_COMMAND_CATALOG[0], requiredEnv: ["ASOL_TEST_ENV_THAT_DOES_NOT_EXIST"] } as BuildCommandCatalogEntry;
const archiveCanRestore = releaseRequirementSatisfied("ASOL_TEST_ENV_THAT_DOES_NOT_EXIST");
const notReady = commandReadiness(absentRequirement);
assert.equal(notReady.ready, archiveCanRestore);
if (archiveCanRestore) {
  assert.deepEqual(notReady.missingEnv, []);
  assert.doesNotThrow(() => assertCommandReadiness(absentRequirement));
} else {
  assert.deepEqual(notReady.missingEnv, ["ASOL_TEST_ENV_THAT_DOES_NOT_EXIST"]);
  assert.throws(() => assertCommandReadiness(absentRequirement), /MissingEnvironment/);
}

function bytes(length: number): Uint8Array { return Uint8Array.from({ length }, (_, index) => (index * 31) % 251); }
console.log("Release console security, locking, restart recovery, R8, diagnostics, image, and bundle-analysis tests passed.");
}

async function verifyPresentationStructure(locales: Record<string, string>[]) {
  const root = path.resolve("src/features/google-play-console/presentation");
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

async function verifyArtifactCollection() {
  const scanned = Object.keys(await snapshotBuildOutputs());
  const fromExport = scanned.filter((file) => file.startsWith("out/"));
  assert.ok(
    fromExport.every((file) => file === "out/asol-web-manifest.json"),
    `only the web manifest is an artifact under out/, found: ${fromExport.slice(0, 5).join(", ")}`,
  );

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

    const again = await changedBuildArtifacts(before);
    assert.deepEqual(
      again.find((artifact) => artifact.path === descriptor.path),
      descriptor,
    );
  } finally {
    await rm(probe, { force: true });
  }

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

async function verifyProductionDeployConsole() {
  const failedSnapshot = {
    version: 1 as const,
    requestId: "run-1",
    status: "failed" as const,
    stage: "submain" as const,
    sandboxName: "asol-gova-deploy-all",
    updatedAt: "2026-08-26T00:00:00.000Z",
    error: "submain:deploy exited with 1",
  };
  const okSnapshot = { ...failedSnapshot, status: "succeeded" as const, stage: "complete" as const, error: undefined };

  const failureNotification = productionDeployNotification({ snapshot: failedSnapshot, uids: ["admin-1"] });
  const successNotification = productionDeployNotification({ snapshot: okSnapshot, uids: ["admin-1"] });
  assert.notEqual(failureNotification.title, successNotification.title);
  assert.notEqual(failureNotification.dedupeKey, successNotification.dedupeKey);
  assert.match(failureNotification.dedupeKey, /run-1/);
  assert.equal(failureNotification.route?.href, "/super-admin/production-deploy");
  assert.ok(
    failureNotification.body?.includes(productionDeployStageLabel("submain")),
    "a failed deploy must name the stage it stopped at",
  );

  const failureEmail = productionDeployEmail({ snapshot: failedSnapshot, logTail: "tail-line" });
  assert.notEqual(failureEmail.subject, productionDeployEmail({ snapshot: okSnapshot, logTail: "" }).subject);
  assert.ok(failureEmail.text.includes("submain:deploy exited with 1"));
  assert.ok(failureEmail.text.includes("tail-line"), "the email carries the end of the log");
  assert.ok(
    !failureEmail.html.includes("<script"),
    "log output reaches the email escaped",
  );

  // The runner reads the pipeline's own phase banner; the two must not drift.
  const remoteRunner = await readFile("scripts/run-remote-deploy-all.mjs", "utf8");
  const deployAllSource = await readFile("scripts/deploy-all.ts", "utf8");
  assert.ok(
    deployAllSource.includes("[deploy:all] ── phase: ${phaseId} ──"),
    "deploy:all must keep printing the phase banner the remote runner parses",
  );
  assert.ok(
    remoteRunner.includes("── phase: "),
    "the remote runner must parse the deploy:all phase banner",
  );
  assert.ok(
    remoteRunner.includes("npm") && remoteRunner.includes("deploy:all"),
    "the remote runner must run deploy:all itself rather than reimplement it",
  );
  assert.ok(
    remoteRunner.includes('"--ignore-scripts"') && remoteRunner.includes("verify-sqlite-runtime.ts"),
    "the sandbox install must keep and verify better-sqlite3's bundled Linux binary instead of requiring make",
  );

  // No deployment secret may leave the server: the archive password is only
  // ever handed to the sandbox command.
  const sandboxSource = await readFile("packages/vercel-deploy-core/src/remote-deploy-sandbox.ts", "utf8");
  const contractsSource = await readFile("packages/vercel-deploy-core/src/remote-deploy-contracts.ts", "utf8");
  assert.ok(
    !/archivePassword|ASOL_SECRET_ARCHIVE_PASSWORD/.test(contractsSource),
    "the snapshot contract must never carry a secret",
  );
  assert.equal(
    sandboxSource.match(/config\.archivePassword/g)?.length,
    1,
    "the archive password is passed to the sandbox command and nowhere else",
  );

  // Durations come from the sandbox's own timestamps, so a console opened
  // halfway through a release still reports them, and a reopened one does not
  // restart the count.
  assert.equal(formatDeployDuration(0), "0:00");
  assert.equal(formatDeployDuration(65_000), "1:05");
  assert.equal(formatDeployDuration(3_725_000), "1:02:05");
  assert.equal(formatDeployDuration(-5_000), "0:00", "a skewed clock must not print a negative");

  const timed = {
    ...failedSnapshot,
    status: "running" as const,
    startedAt: "2026-08-26T00:00:00.000Z",
    finishedAt: undefined,
    stageHistory: [
      { stage: "dependencies" as const, startedAt: "2026-08-26T00:00:00.000Z", finishedAt: "2026-08-26T00:02:00.000Z" },
      { stage: "preflight" as const, startedAt: "2026-08-26T00:02:00.000Z" },
    ],
  };
  const nowMs = Date.parse("2026-08-26T00:05:00.000Z");
  assert.equal(deployElapsedMs(timed, nowMs), 5 * 60_000, "an unfinished run counts up to now");
  assert.equal(
    deployElapsedMs({ ...timed, finishedAt: "2026-08-26T00:03:00.000Z" }, nowMs),
    3 * 60_000,
    "a finished run stops at its finish",
  );
  const spans = stageTimings(timed, nowMs);
  assert.equal(spans.get("dependencies")?.elapsedMs, 2 * 60_000);
  assert.equal(spans.get("dependencies")?.running, false);
  assert.equal(spans.get("preflight")?.elapsedMs, 3 * 60_000);
  assert.equal(spans.get("preflight")?.running, true);
  assert.equal(stageTimings({ ...timed, stageHistory: undefined }, nowMs).size, 0);

  // The runner is what writes those spans; the console never times its own poll.
  assert.ok(
    remoteRunner.includes("advanceStageHistory") && remoteRunner.includes("closeStageHistory"),
    "the remote runner must record and close stage spans",
  );

  const callbackService = await readFile(
    "src/features/release-commands/server/services/production-deploy-service.server.ts",
    "utf8",
  );
  assert.ok(
    callbackService.includes("timingSafeEqual"),
    "the deploy callback secret must be compared in constant time",
  );
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
