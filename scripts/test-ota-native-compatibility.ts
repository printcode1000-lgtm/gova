import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  NATIVE_CONTRACT_FILES,
  NATIVE_SURFACE_PATTERNS,
  inspectNativeCompatibility,
  isNativeSurface,
  isUndeclarableNativeChange,
  nativeVersionFromBaseline,
  nextNativePatchVersion,
  resolveNativeBaseline,
  undeclarableNativeChanges,
} from "./ota/ota-native-compatibility";
import {
  assertDetectionCoverage,
  detectableCapabilityKeys,
} from "./ota/ota-capability-scan";
import { ALL_CAPABILITY_KEYS } from "../src/native-platform/capabilities/capability-keys";

/**
 * The golden rule, as executable checks.
 *
 * OTA ships UI and logic that run inside the native capabilities already on
 * the device. Any new device capability is a store release. These tests guard
 * the classifier that decides which side of that line a change falls on.
 */

const NATIVE_IMPORTING_FILE = `import { Camera } from "@capacitor/camera";\nexport const x = Camera;\n`;
const DYNAMIC_IMPORTING_FILE = `export const load = async () => await import("@capacitor/core");\n`;
const PURE_WEB_FILE = `export interface CameraImage { file: File }\n`;

function classify(file: string, content: string | null = PURE_WEB_FILE) {
  return isNativeSurface(file, () => content);
}

// ---------------------------------------------------------------------------
// Native surfaces outside src/ are recognised by path alone
// ---------------------------------------------------------------------------
for (const file of [
  "android/app/src/main/AndroidManifest.xml",
  "android/app/build.gradle",
  "ios/App/App/Info.plist",
  "ios/ShareExtension/ShareViewController.swift",
  "capacitor.config.ts",
]) {
  assert.equal(
    NATIVE_SURFACE_PATTERNS.some((pattern) => pattern.test(file)),
    true,
    `Native surface was not detected: ${file}`,
  );
  assert.equal(classify(file), true, `Native surface was not detected: ${file}`);
}

// ---------------------------------------------------------------------------
// Paths that look native but never reach the store binary
// ---------------------------------------------------------------------------
// These were classified native by path. One release flagged six files of which
// five were harmless, and the publisher answered by declaring a minimum native
// version five times without re-reading the list. A gate that cries wolf stops
// being read, so each of these must stay quiet unless its content says
// otherwise.
for (const file of [
  "fastlane/Fastfile",
  "fastlane/Appfile",
  "assets/google-play/icon.png",
  "assets/icon.png",
]) {
  assert.equal(
    classify(file),
    false,
    `${file} is not compiled into the store binary and must not force a store release.`,
  );
}

assert.deepEqual(
  undeclarableNativeChanges({
    changedPaths: [
      "android/app/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java",
      "src/native-platform/app/app-native-adapter.ts",
    ],
    changedNativeDependencies: ["@capacitor/app"],
  }),
  [
    "android/app/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java",
    "native dependency: @capacitor/app",
  ],
  "Compiled package changes and compiled source must be equally undeclarable.",
);
assert.equal(nativeVersionFromBaseline("native-v0.2.0"), "0.2.0");
assert.equal(nativeVersionFromBaseline("deadbeef"), null);
assert.equal(nextNativePatchVersion("0.2.0"), "0.2.1");

// ---------------------------------------------------------------------------
// The publisher itself pins both directions in an isolated git repository
// ---------------------------------------------------------------------------
// Unit-testing the classifier alone would not catch somebody disconnecting it
// from ota:publish. These dry runs execute the real CLI and stop before any
// build or R2 access.
const publisherPath = path.resolve("scripts/ota-publish.ts");
const tsxCliPath = path.resolve("node_modules/tsx/dist/cli.mjs");

function writeFixture(root: string, relativePath: string, content: string): void {
  const absolute = path.join(root, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function createPublisherFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), "asol-ota-native-gate-"));
  writeFixture(root, "package.json", JSON.stringify({ name: "fixture", version: "1.0.0" }));
  writeFixture(
    root,
    "package-lock.json",
    JSON.stringify({ name: "fixture", version: "1.0.0", lockfileVersion: 3, packages: { "": { name: "fixture", version: "1.0.0" } } }),
  );
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=ASOL Test", "-c", "user.email=asol-test@example.invalid", "commit", "--quiet", "-m", "baseline"], { cwd: root });
  execFileSync("git", ["tag", "native-v0.2.0"], { cwd: root });
  return root;
}

function dryRunPublisher(root: string, minimumNativeVersion = "0.2.0") {
  return spawnSync(
    process.execPath,
    [tsxCliPath, publisherPath, "--dry-run", `--minimum-native-version=${minimumNativeVersion}`],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        ASOL_OTA_NATIVE_BASELINE: "native-v0.2.0",
      },
    },
  );
}

function publisherOutput(result: ReturnType<typeof dryRunPublisher>): string {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error ?? ""}`;
}

for (const scenario of [
  "compiled-source",
  "native-dependency",
  "future-native-shell",
  "web-facade",
] as const) {
  const root = createPublisherFixture();
  try {
    if (scenario === "compiled-source" || scenario === "future-native-shell") {
      writeFixture(
        root,
        "android/app/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java",
        "final class BackgroundDownloadPlugin {}\n",
      );
    } else if (scenario === "native-dependency") {
      writeFixture(
        root,
        "package.json",
        JSON.stringify({ name: "fixture", version: "1.0.0", dependencies: { "@capacitor/app": "8.1.0" } }),
      );
      writeFixture(
        root,
        "package-lock.json",
        JSON.stringify({
          name: "fixture",
          version: "1.0.0",
          lockfileVersion: 3,
          packages: {
            "": { name: "fixture", version: "1.0.0", dependencies: { "@capacitor/app": "8.1.0" } },
            "node_modules/@capacitor/app": { version: "8.1.0" },
          },
        }),
      );
    } else {
      writeFixture(
        root,
        "src/native-platform/app/app-native-adapter.ts",
        'import { App } from "@capacitor/app";\nexport const nativeApp = App;\n',
      );
    }

    const result = dryRunPublisher(
      root,
      scenario === "future-native-shell" ? "0.2.1" : "0.2.0",
    );
    const output = publisherOutput(result);
    if (scenario === "web-facade" || scenario === "future-native-shell") {
      assert.equal(result.status, 0, output);
      assert.match(output, /Dry run: the compatibility gate passed/);
    } else {
      assert.notEqual(result.status, 0, output);
      assert.match(output, /compiled native changes require a newer shell/);
      assert.match(
        output,
        scenario === "compiled-source"
          ? /BackgroundDownloadPlugin\.java/
          : /native dependency: @capacitor\/app/,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// `platform/` is build-time configuration: capacitor.config.ts does not import
// it, and its values are baked into the web bundle, so it travels over OTA.
assert.equal(
  classify("platform/capacitor.defaults.ts", "export const CAPACITOR_API_BASE_URL = 'https://x';\n"),
  false,
  "A build-time constant under platform/ must not force a store release.",
);

// …but the same folder is native the moment its content binds to a plugin.
assert.equal(
  classify("platform/some-native-shim.ts", NATIVE_IMPORTING_FILE),
  true,
  "A plugin import under platform/ is a native binding wherever it sits.",
);

// ---------------------------------------------------------------------------
// Inside src/, a file is native because it binds to a plugin — wherever it sits
// ---------------------------------------------------------------------------
for (const file of [
  "src/native-platform/camera/camera-native-adapter.ts",
  // The sanctioned Capacitor-import exceptions live outside src/native-platform
  // and were invisible to the path-only classifier.
  "src/platform/ota/capacitor-ota-adapter.ts",
  "src/platform/navigation/capacitor-back-button-adapter.ts",
  "src/features/ota/services/ota-api-service.ts",
  "src/features/page-snapshot/hooks/use-page-snapshot.tsx",
]) {
  assert.equal(
    classify(file, NATIVE_IMPORTING_FILE),
    true,
    `A plugin binding was not detected as native: ${file}`,
  );
}

assert.equal(
  classify("src/native-platform/capabilities/capability-registry.ts", DYNAMIC_IMPORTING_FILE),
  true,
  "A dynamic plugin import must count as a native binding",
);

// ---------------------------------------------------------------------------
// Declared native contracts are native even without a plugin import
// ---------------------------------------------------------------------------
for (const [file, reason] of NATIVE_CONTRACT_FILES) {
  assert.ok(reason.length > 0, `Native contract file needs a reason: ${file}`);
  assert.equal(
    classify(file, PURE_WEB_FILE),
    true,
    `Declared native contract was not detected: ${file}`,
  );
}

// ---------------------------------------------------------------------------
// Pure web changes must NOT trip the gate
// ---------------------------------------------------------------------------
for (const file of [
  "src/components/profile/ProfilePreviewContent.tsx",
  "src/features/notifications/application/notification-sender.ts",
  "src/locales/ar.json",
  "docs/07-mobile-and-release/capacitor/native-platform.md",
  "package-lock.json",
  "src/app/profile/page.tsx",
  "src/features/native-platform-notes.ts",
  // Pure TypeScript inside the Native Platform layer ships in the web bundle
  // and must remain OTA-deliverable: a facade, a web adapter, a validator.
  "src/native-platform/camera/camera.ts",
  "src/native-platform/camera/camera-web-adapter.ts",
  "src/native-platform/share/share-validator.ts",
  "src/native-platform/share/share-queue.ts",
  "src/native-platform/barcode/duplicate-filter.ts",
  "src/native-platform/core/errors.ts",
]) {
  assert.equal(
    classify(file),
    false,
    `A web-only change was misclassified as native: ${file}`,
  );
}

// Tests never reach a device.
assert.equal(
  classify("src/native-platform/tests/native-platform-contract.test.ts", NATIVE_IMPORTING_FILE),
  false,
  "Test sources must not trip the gate",
);

// ---------------------------------------------------------------------------
// A deleted binding is classified from the baseline copy, not silently dropped
// ---------------------------------------------------------------------------
assert.equal(
  isNativeSurface(
    "src/native-platform/camera/camera-native-adapter.ts",
    () => null,
    () => NATIVE_IMPORTING_FILE,
  ),
  true,
  "Deleting a plugin binding must still be treated as a native change",
);

// ---------------------------------------------------------------------------
// A missing baseline fails closed: nothing can be proven compatible
// ---------------------------------------------------------------------------
{
  const report = inspectNativeCompatibility("");
  assert.equal(report.baselineMissing, true);
  assert.equal(
    report.requiresStoreRelease,
    true,
    "Without a baseline the gate must fail closed",
  );
  assert.deepEqual(report.changedPaths, []);
}

// ---------------------------------------------------------------------------
// The baseline resolver honours an explicit override
// ---------------------------------------------------------------------------
{
  const original = process.env.ASOL_OTA_NATIVE_BASELINE;
  process.env.ASOL_OTA_NATIVE_BASELINE = "abc1234";
  assert.equal(resolveNativeBaseline(), "abc1234");
  if (original === undefined) delete process.env.ASOL_OTA_NATIVE_BASELINE;
  else process.env.ASOL_OTA_NATIVE_BASELINE = original;
}

// ---------------------------------------------------------------------------
// Against a real commit, the classifier returns a coherent report
// ---------------------------------------------------------------------------
{
  const report = inspectNativeCompatibility("HEAD");
  assert.equal(report.baselineMissing, false);
  assert.equal(Array.isArray(report.changedPaths), true);
  assert.equal(Array.isArray(report.changedNativeDependencies), true);
  // HEAD against a clean working tree carries no native dependency drift.
  assert.deepEqual(report.changedNativeDependencies, []);
}

// ---------------------------------------------------------------------------
// Every declared capability must be detectable from source
// ---------------------------------------------------------------------------
{
  assertDetectionCoverage();
  assert.deepEqual(
    detectableCapabilityKeys(),
    [...ALL_CAPABILITY_KEYS].sort(),
    "Every capability key needs a detection pattern, and patterns must not invent keys",
  );
}

console.log("OTA native compatibility tests passed.");

// ---------------------------------------------------------------------------
// A minimum-version declaration cannot excuse the shell's own compiled source
// ---------------------------------------------------------------------------
// Declaring says "this runs on a shell that already shipped". For Java, Swift,
// a manifest or the Capacitor config that claim is false by construction: no
// device carries the edit. This was not hypothetical — a BackgroundDownloadPlugin
// fix was waived this way and four releases went out claiming 0.2.0 compatibility.
for (const file of [
  "android/app/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java",
  "android/app/src/main/AndroidManifest.xml",
  "android/app/build.gradle",
  "ios/App/App/Info.plist",
  "capacitor.config.ts",
]) {
  assert.equal(
    isUndeclarableNativeChange(file),
    true,
    `${file} changes the binary; no shipped shell contains it, so it must not be declarable.`,
  );
}

// The escape hatch stays open where the claim can be true: a facade over a
// plugin the shell already contains.
for (const file of [
  "src/native-platform/app/app-native-adapter.ts",
  "src/native-platform/capabilities/capability-keys.ts",
  "src/platform/ota/capacitor-ota-adapter.ts",
  "platform/capacitor.defaults.ts",
]) {
  assert.equal(
    isUndeclarableNativeChange(file),
    false,
    `${file} may legitimately run on an existing shell; declaring must remain possible.`,
  );
}
