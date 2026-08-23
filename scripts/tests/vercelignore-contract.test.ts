/**
 * Guards the root `.vercelignore` contract for gova and asol-submain uploads.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IGNORE_PATH = path.join(ROOT, ".vercelignore");
const ignore = readFileSync(IGNORE_PATH, "utf8");
const ignoreLines = ignore
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

function matchesIgnored(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  let ignored = false;
  for (const line of ignoreLines) {
    if (line.startsWith("!")) {
      const pattern = line.slice(1);
      if (patternMatches(normalized, pattern)) ignored = false;
      continue;
    }
    if (patternMatches(normalized, line)) ignored = true;
  }
  return ignored;
}

function patternMatches(normalized: string, rawPattern: string): boolean {
  const isDirPattern = rawPattern.endsWith("/");
  const pattern = isDirPattern ? rawPattern.slice(0, -1) : rawPattern;
  const rootAnchored = pattern.startsWith("/");
  const effective = rootAnchored ? pattern.slice(1) : pattern;
  if (effective.includes("**") || effective.includes("*")) {
    const regexSource = `^${rootAnchored ? "" : "(?:.*/)?"}${effective
      .replace(/\./g, "\\.")
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")}${isDirPattern ? "(?:/.*)?" : ""}$`;
    return new RegExp(regexSource).test(normalized);
  }
  if (rootAnchored) {
    if (isDirPattern) {
      return normalized === effective || normalized.startsWith(`${effective}/`);
    }
    return normalized === effective || normalized.startsWith(`${effective}/`);
  }
  if (isDirPattern) {
    return (
      normalized === effective ||
      normalized.startsWith(`${effective}/`) ||
      normalized.endsWith(`/${effective}`) ||
      normalized.includes(`/${effective}/`)
    );
  }
  return normalized === effective || normalized.endsWith(`/${effective}`) || normalized.includes(`/${effective}/`);
}

const requiredPaths = [
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "capacitor.config.ts",
  ".env.example",
  "src/app/layout.tsx",
  "public/logo.png",
  "public/catagory",
  "packages/native-core/android/src",
  "packages/native-core/ios/Sources",
  "services/notifications/package.json",
  "services/notifications/src",
  "scripts/architecture-check.ts",
  "scripts/sync-all-service-sources.ts",
  "assets/google-play/custom_notification.mp3",
];

for (const required of requiredPaths) {
  assert.equal(
    matchesIgnored(required),
    false,
    `.vercelignore must not exclude build input: ${required}`,
  );
}

const excludedPaths = [
  "docs/01-architecture/02-packages/module-isolation-rules.md",
  "android/app/build.gradle",
  "ios/App/App/Info.plist",
  "fastlane/Fastfile",
  "public/sync_data/allusers.db",
  "scripts/tests/deploy-push.test.ts",
  ".github/workflows/native-core.yml",
  "services/notifications/generated/mirror.ts",
  "assets/google-play/k.jks",
];

const mustStayPaths = [
  "packages/native-core/android/src/main/java/hgh/asol/app/NativeCrashPlugin.java",
  "packages/native-core/ios/Sources/AsolNativeCore/NativeCrashPlugin.swift",
];

for (const excluded of excludedPaths) {
  assert.equal(
    matchesIgnored(excluded),
    true,
    `.vercelignore must exclude non-build payload: ${excluded}`,
  );
}

for (const required of mustStayPaths) {
  assert.equal(
    matchesIgnored(required),
    false,
    `.vercelignore must not exclude native-core build input: ${required}`,
  );
}

assert.match(ignore, /^\/android\/\s*$/m, ".vercelignore must exclude only the root Capacitor android shell.");
assert.match(ignore, /^\/ios\/\s*$/m, ".vercelignore must exclude only the root Capacitor ios shell.");
assert.match(ignore, /public\/sync_data\//, ".vercelignore must exclude local SQLite mirrors.");

console.log("vercelignore contract tests passed.");
