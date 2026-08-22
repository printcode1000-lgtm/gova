#!/usr/bin/env tsx
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { configureOtaCore, otaAppVersions } from "../src/ports";
import {
  androidVersionCodeFor,
  isOtaVersion,
  parseContentVersion,
} from "../src";

// Tooling composition root: read version constants from the app leaf as text so this
// package script never imports `@/`.
{
  const versionFile = readFileSync(
    path.join(process.cwd(), "src/core/config/app-version.ts"),
    "utf8",
  );
  const grab = (name: string): string => {
    const match = versionFile.match(
      new RegExp(`export const ${name}\\s*=\\s*["']([^"']+)["']`),
    );
    if (!match) throw new Error(`app-version.ts missing ${name}`);
    return match[1]!;
  };
  configureOtaCore({
    appVersions: {
      currentAndroidNativeVersion: grab("CURRENT_ANDROID_NATIVE_VERSION"),
      currentIosNativeVersion: grab("CURRENT_IOS_NATIVE_VERSION"),
      currentWebContentVersion: grab("CURRENT_WEB_CONTENT_VERSION"),
    },
  });
}

const {
  currentAndroidNativeVersion: CURRENT_ANDROID_NATIVE_VERSION,
  currentIosNativeVersion: CURRENT_IOS_NATIVE_VERSION,
  currentWebContentVersion: CURRENT_WEB_CONTENT_VERSION,
} = otaAppVersions();
const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const expectedAndroidBuildNumber = androidVersionCodeFor(CURRENT_ANDROID_NATIVE_VERSION);
const expectedIosBuildNumber = androidVersionCodeFor(CURRENT_IOS_NATIVE_VERSION);

assert.equal(
  JSON.parse(read("package-lock.json")).version,
  JSON.parse(read("package.json")).version,
  "package-lock.json root version must match package.json",
);
assert.ok(
  isOtaVersion(CURRENT_WEB_CONTENT_VERSION),
  `Invalid current web content version: ${CURRENT_WEB_CONTENT_VERSION}`,
);

const contentLine = parseContentVersion(CURRENT_WEB_CONTENT_VERSION);
if (contentLine) {
  assert.equal(
    contentLine.nativeVersion,
    CURRENT_ANDROID_NATIVE_VERSION,
    "the Android content line must follow the Android native shell version",
  );
}

const gradle = read("android/app/build.gradle");
assert.match(
  gradle,
  new RegExp(`versionName\\s+"${CURRENT_ANDROID_NATIVE_VERSION.replaceAll(".", "\\.")}"`),
  "Android versionName must match CURRENT_ANDROID_NATIVE_VERSION",
);
assert.match(
  gradle,
  new RegExp(`versionCode\\s+${expectedAndroidBuildNumber}\\b`),
  "Android versionCode must be derived from the Android semantic version",
);

const xcode = read("ios/App/App.xcodeproj/project.pbxproj");
const marketingVersions = [...xcode.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(
  (match) => match[1],
);
const buildNumbers = [...xcode.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map(
  (match) => match[1],
);
assert.ok(marketingVersions.length > 0, "No iOS MARKETING_VERSION values found");
assert.ok(buildNumbers.length > 0, "No iOS CURRENT_PROJECT_VERSION values found");
assert.deepEqual(
  [...new Set(marketingVersions)],
  [CURRENT_IOS_NATIVE_VERSION],
  "Every iOS target must share CURRENT_IOS_NATIVE_VERSION",
);
assert.deepEqual(
  [...new Set(buildNumbers)],
  [String(expectedIosBuildNumber)],
  "Every iOS target must share the iOS derived build number",
);

const envExample = read(".env.example");
assert.match(
  envExample,
  new RegExp(`^NEXT_PUBLIC_ASOL_NATIVE_VERSION=${CURRENT_ANDROID_NATIVE_VERSION.replaceAll(".", "\\.")}$`, "m"),
);
assert.match(
  envExample,
  new RegExp(`^NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION=${CURRENT_WEB_CONTENT_VERSION.replaceAll(".", "\\.")}$`, "m"),
);

const manifestPaths = [
  "public/asol-web-manifest.json",
  "out/asol-web-manifest.json",
  "android/app/src/main/assets/public/asol-web-manifest.json",
  "ios/App/App/public/asol-web-manifest.json",
];
for (const manifestPath of manifestPaths) {
  if (!existsSync(path.join(root, manifestPath))) continue;
  const manifest = JSON.parse(read(manifestPath)) as {
    version?: string;
    minimumNativeVersion?: string;
  };
  assert.equal(
    manifest.version,
    CURRENT_WEB_CONTENT_VERSION,
    `${manifestPath} content version is stale`,
  );
  assert.equal(
    manifest.minimumNativeVersion,
    CURRENT_ANDROID_NATIVE_VERSION,
    `${manifestPath} Android native version is stale`,
  );
}

console.log(
  `App versions are synchronized: Android ${CURRENT_ANDROID_NATIVE_VERSION} (${expectedAndroidBuildNumber}), ` +
    `iOS ${CURRENT_IOS_NATIVE_VERSION} (${expectedIosBuildNumber}), content ${CURRENT_WEB_CONTENT_VERSION}.`,
);
