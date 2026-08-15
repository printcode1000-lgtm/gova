import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ok, err, type Result } from "../../errors/result";
import { OtaCoreError } from "../../errors/ota-core-error";
import { androidVersionCodeFor } from "../../domain/versioning/native-version";
import { assertNativeVersion, releaseContentVersion } from "../../domain/versioning/content-version";

export interface VersionWriteResult {
  nativeVersion: string;
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

export function updateCommittedVersionConstants(
  contentVersion: string,
  nativeVersion: string,
  root = process.cwd(),
): string[] {
  const modified: string[] = [];
  const constantsPath = path.join(root, "src", "core", "config", "app-version.ts");
  if (existsSync(constantsPath)) {
    const before = readFileSync(constantsPath, "utf8");
    const after = before
      .replace(
        /CURRENT_NATIVE_APP_VERSION = "[^"]+"/,
        `CURRENT_NATIVE_APP_VERSION = "${nativeVersion}"`,
      )
      .replace(
        /CURRENT_WEB_CONTENT_VERSION = "[^"]+"/,
        `CURRENT_WEB_CONTENT_VERSION = "${contentVersion}"`,
      );
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
        `NEXT_PUBLIC_ASOL_NATIVE_VERSION=${nativeVersion}`,
      )
      .replace(
        /^NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION=.*$/m,
        `NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION=${contentVersion}`,
      );
    if (exampleBefore !== exampleAfter) {
      writeFileSync(examplePath, exampleAfter);
      modified.push(examplePath);
    }
  }

  return modified;
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

    const filesModified: string[] = [];
    const gradle = updateAndroidGradleVersion(options.nativeVersion, root);
    filesModified.push(gradle);
    const ios = updateIosProjectVersion(options.nativeVersion, root);
    filesModified.push(ios);
    const constants = updateCommittedVersionConstants(
      contentVersion,
      options.nativeVersion,
      root,
    );
    filesModified.push(...constants);

    return ok({
      nativeVersion: options.nativeVersion,
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
