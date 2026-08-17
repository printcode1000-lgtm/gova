import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ok, err, type Result } from "../../errors/result";
import { OtaCoreError } from "../../errors/ota-core-error";
import { androidVersionCodeFor } from "../../domain/versioning/native-version";
import { assertNativeVersion, releaseContentVersion } from "../../domain/versioning/content-version";

export interface VersionWriteResult {
  androidNativeVersion: string;
  iosNativeVersion?: string;
  contentVersion: string;
  androidVersionCode: number;
  filesModified: string[];
}

export function updateAndroidGradleVersion(
  nativeVersion: string,
  root = process.cwd(),
): string {
  assertNativeVersion(nativeVersion);
  const gradlePath = path.join(root, "android", "app", "build.gradle");
  if (!existsSync(gradlePath)) {
    throw new Error(`Android build file not found: ${gradlePath}`);
  }
  const code = androidVersionCodeFor(nativeVersion);
  const before = readFileSync(gradlePath, "utf8");
  const after = before
    .replace(/versionCode\s+\d+/, `versionCode ${code}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${nativeVersion}"`);
  if (before !== after) {
    writeFileSync(gradlePath, after);
  }
  return gradlePath;
}

export function updateIosProjectVersion(
  nativeVersion: string,
  root = process.cwd(),
): string {
  assertNativeVersion(nativeVersion);
  const projectPath = path.join(
    root,
    "ios",
    "App",
    "App.xcodeproj",
    "project.pbxproj",
  );
  if (!existsSync(projectPath)) {
    throw new Error(`iOS project file not found: ${projectPath}`);
  }
  const buildNumber = androidVersionCodeFor(nativeVersion);
  const before = readFileSync(projectPath, "utf8");
  const after = before
    .replace(
      /CURRENT_PROJECT_VERSION = [^;]+;/g,
      `CURRENT_PROJECT_VERSION = ${buildNumber};`,
    )
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${nativeVersion};`);
  if (before !== after) {
    writeFileSync(projectPath, after);
  }
  return projectPath;
}

export function updateCommittedVersionConstants(options: {
  androidVersion: string;
  iosVersion?: string;
  contentVersion: string;
  root?: string;
}): string[] {
  const modified: string[] = [];
  const root = options.root ?? process.cwd();
  const constantsPath = path.join(root, "src", "core", "config", "app-version.ts");
  if (existsSync(constantsPath)) {
    const before = readFileSync(constantsPath, "utf8");
    let after = before
      .replace(
        /CURRENT_ANDROID_NATIVE_VERSION = "[^"]+"/,
        `CURRENT_ANDROID_NATIVE_VERSION = "${options.androidVersion}"`,
      )
      .replace(
        /CURRENT_WEB_CONTENT_VERSION = "[^"]+"/,
        `CURRENT_WEB_CONTENT_VERSION = "${options.contentVersion}"`,
      )
      .replace(
        /CURRENT_NATIVE_APP_VERSION = "[^"]+"/,
        `CURRENT_NATIVE_APP_VERSION = "${options.androidVersion}"`,
      );
    if (options.iosVersion) {
      after = after.replace(
        /CURRENT_IOS_NATIVE_VERSION = "[^"]+"/,
        `CURRENT_IOS_NATIVE_VERSION = "${options.iosVersion}"`,
      );
    }
    if (before !== after) {
      writeFileSync(constantsPath, after);
      modified.push(constantsPath);
    }
  }

  const examplePath = path.join(root, ".env.example");
  if (existsSync(examplePath)) {
    const exampleBefore = readFileSync(examplePath, "utf8");
    const exampleAfter = exampleBefore
      .replace(
        /^NEXT_PUBLIC_ASOL_NATIVE_VERSION=.*$/m,
        `NEXT_PUBLIC_ASOL_NATIVE_VERSION=${options.androidVersion}`,
      )
      .replace(
        /^NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION=.*$/m,
        `NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION=${options.contentVersion}`,
      );
    if (exampleBefore !== exampleAfter) {
      writeFileSync(examplePath, exampleAfter);
      modified.push(examplePath);
    }
  }

  return modified;
}

export function syncAndroidProjectVersions(options: {
  androidVersion: string;
  contentVersion: string;
  root?: string;
}): string[] {
  const root = options.root ?? process.cwd();
  const filesModified = [
    updateAndroidGradleVersion(options.androidVersion, root),
    ...updateCommittedVersionConstants({
      androidVersion: options.androidVersion,
      contentVersion: options.contentVersion,
      root,
    }),
  ];
  return filesModified;
}

export function syncIosProjectVersion(options: {
  iosVersion: string;
  root?: string;
}): string[] {
  const root = options.root ?? process.cwd();
  const filesModified = [
    updateIosProjectVersion(options.iosVersion, root),
    ...updateCommittedVersionConstants({
      androidVersion: readAndroidVersionFromConstants(root) ?? options.iosVersion,
      iosVersion: options.iosVersion,
      contentVersion: readContentVersionFromConstants(root) ?? releaseContentVersion(options.iosVersion),
      root,
    }),
  ];
  return filesModified;
}

function readAndroidVersionFromConstants(root: string): string | null {
  const constantsPath = path.join(root, "src", "core", "config", "app-version.ts");
  if (!existsSync(constantsPath)) return null;
  const content = readFileSync(constantsPath, "utf8");
  return /CURRENT_ANDROID_NATIVE_VERSION = "([^"]+)"/.exec(content)?.[1] ?? null;
}

function readContentVersionFromConstants(root: string): string | null {
  const constantsPath = path.join(root, "src", "core", "config", "app-version.ts");
  if (!existsSync(constantsPath)) return null;
  const content = readFileSync(constantsPath, "utf8");
  return /CURRENT_WEB_CONTENT_VERSION = "([^"]+)"/.exec(content)?.[1] ?? null;
}

export function writeTreeVersions(options: {
  nativeVersion: string;
  contentVersion?: string;
  confirmVersionWrite: boolean;
  root?: string;
}): Result<VersionWriteResult, OtaCoreError> {
  if (!options.confirmVersionWrite) {
    return err(
      OtaCoreError.confirmationRequired(
        "writing version numbers into the working tree",
        "--confirm-version-write",
      ),
    );
  }

  const root = options.root ?? process.cwd();
  try {
    assertNativeVersion(options.nativeVersion);
    const contentVersion =
      options.contentVersion ?? releaseContentVersion(options.nativeVersion);
    const androidVersionCode = androidVersionCodeFor(options.nativeVersion);

    const filesModified = syncAndroidProjectVersions({
      androidVersion: options.nativeVersion,
      contentVersion,
      root,
    });

    return ok({
      androidNativeVersion: options.nativeVersion,
      contentVersion,
      androidVersionCode,
      filesModified,
    });
  } catch (error) {
    return err(
      OtaCoreError.internal("Failed to write tree versions", error),
    );
  }
}
