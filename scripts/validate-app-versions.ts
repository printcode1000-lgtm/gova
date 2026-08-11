import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  CURRENT_NATIVE_APP_VERSION,
  CURRENT_WEB_CONTENT_VERSION,
} from "../src/core/config/app-version";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const expectedBuildNumber = CURRENT_NATIVE_APP_VERSION.split(".").reduce(
  (value, part, index) => value + Number(part) * [10_000, 100, 1][index],
  0,
);

assert.equal(
  JSON.parse(read("package.json")).version,
  CURRENT_WEB_CONTENT_VERSION,
  "package.json must identify the current web content release",
);
assert.equal(
  JSON.parse(read("package-lock.json")).version,
  CURRENT_WEB_CONTENT_VERSION,
  "package-lock.json root version must match package.json",
);

const gradle = read("android/app/build.gradle");
assert.match(
  gradle,
  new RegExp(`versionName\\s+"${CURRENT_NATIVE_APP_VERSION.replaceAll(".", "\\.")}"`),
  "Android versionName must match the current native app version",
);
assert.match(
  gradle,
  new RegExp(`versionCode\\s+${expectedBuildNumber}\\b`),
  "Android versionCode must be derived from the native semantic version",
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
  [CURRENT_NATIVE_APP_VERSION],
  "Every iOS target must share the native app version",
);
assert.deepEqual(
  [...new Set(buildNumbers)],
  [String(expectedBuildNumber)],
  "Every iOS target must share the derived build number",
);

const envExample = read(".env.example");
assert.match(
  envExample,
  new RegExp(`^NEXT_PUBLIC_ASOL_NATIVE_VERSION=${CURRENT_NATIVE_APP_VERSION.replaceAll(".", "\\.")}$`, "m"),
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
    CURRENT_NATIVE_APP_VERSION,
    `${manifestPath} native version is stale`,
  );
}

console.log(
  `App versions are synchronized: native ${CURRENT_NATIVE_APP_VERSION} (${expectedBuildNumber}), content ${CURRENT_WEB_CONTENT_VERSION}.`,
);
