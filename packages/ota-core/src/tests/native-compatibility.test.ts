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
  undeclarableNativeChanges,
  resolveNativeBaseline,
  assertDetectionCoverage,
  detectableCapabilityKeys,
} from "@asol/ota-core/publishing";
import { nativeVersionFromBaseline, nextNativePatchVersion } from "@asol/ota-core";
import { ALL_CAPABILITY_KEYS } from "@asol/native-core";


export async function runNativeCompatibilityTests(): Promise<void> {
  console.log("  → native-compatibility.test.ts");
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
  "packages/native-core/android/build.gradle",
  "packages/native-core/ios/Package.swift",
  "packages/native-core/src/adapters/camera.adapter.ts",
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
      "packages/native-core/src/adapters/app.adapter.ts",
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
const publisherPath = path.resolve("packages/ota-core/scripts/ota-publish.ts");
const tsxCliPath = path.resolve("node_modules/tsx/dist/cli.mjs");
const tsconfigPath = path.resolve("tsconfig.json");

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
    [tsxCliPath, "--tsconfig", tsconfigPath, publisherPath, "--dry-run", `--minimum-native-version=${minimumNativeVersion}`],
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
        "packages/native-core/src/adapters/app.adapter.ts",
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

// ---------------------------------------------------------------------------
// Inside src/ or packages/, a file is native because it binds to a plugin
// ---------------------------------------------------------------------------
for (const file of [
  "packages/native-core/src/adapters/camera.adapter.ts",
  "packages/native-core/src/adapters/ota.adapter.ts",
  "packages/native-core/src/adapters/back-button.adapter.ts",
  "packages/ota-core/src/runtime/api-service.ts",
  "src/features/page-snapshot/hooks/use-page-snapshot.tsx",
]) {
  assert.equal(
    classify(file, NATIVE_IMPORTING_FILE),
    true,
    `A plugin binding was not detected as native: ${file}`,
  );
}

assert.equal(
  classify("packages/native-core/src/capabilities/capability-registry.ts", DYNAMIC_IMPORTING_FILE),
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
  "packages/native-core/src/domain/camera/types.ts",
  "packages/native-core/src/validation/schemas.ts",
  "packages/native-core/src/errors/native-core-error.ts",
]) {
  assert.equal(
    classify(file),
    false,
    `A web-only change was misclassified as native: ${file}`,
  );
}

// Tests never reach a device.
assert.equal(
  classify("packages/native-core/src/tests/contract/native-core-boundary.test.ts", NATIVE_IMPORTING_FILE),
  false,
  "Test sources must not trip the gate",
);

// ---------------------------------------------------------------------------
// A deleted binding is classified from the baseline copy, not silently dropped
// ---------------------------------------------------------------------------
assert.equal(
  isNativeSurface(
    "packages/native-core/src/adapters/camera.adapter.ts",
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



// ---------------------------------------------------------------------------
// A minimum-version declaration cannot excuse the shell's own compiled source
// ---------------------------------------------------------------------------
for (const file of [
  "android/app/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java",
  "android/app/src/main/AndroidManifest.xml",
  "android/app/build.gradle",
  "ios/App/App/Info.plist",
  "packages/native-core/android/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java",
  "packages/native-core/ios/Sources/AsolNativeCore/BackgroundDownloadPlugin.swift",
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
  "packages/native-core/src/adapters/app.adapter.ts",
  "packages/native-core/src/capabilities/capability-keys.ts",
  "packages/native-core/src/adapters/ota.adapter.ts",
]) {
  assert.equal(
    isUndeclarableNativeChange(file),
    false,
    `${file} may legitimately run on an existing shell; declaring must remain possible.`,
  );
}

console.log("    ✓ OTA native compatibility tests passed.");
}
