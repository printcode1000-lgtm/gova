import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ok, err, type Result } from "../../errors/result";
import { OtaCoreError } from "../../errors/ota-core-error";
import { androidVersionCodeFor } from "../../domain/versioning/native-version";

export interface CurrentVersions {
  nativeVersion: string;
  contentVersion: string;
  androidVersionCode: number;
}

export async function readCurrentVersions(
  root = process.cwd(),
): Promise<Result<CurrentVersions, OtaCoreError>> {
  try {
    const gradlePath = path.join(root, "android", "app", "build.gradle");
    let nativeVersion = "";
    let androidVersionCode = 0;

    if (existsSync(gradlePath)) {
      const gradleContent = readFileSync(gradlePath, "utf8");
      const nameMatch = /versionName\s+["']([^"']+)["']/.exec(gradleContent);
      const codeMatch = /versionCode\s+(\d+)/.exec(gradleContent);
      if (nameMatch) nativeVersion = nameMatch[1]!;
      if (codeMatch) androidVersionCode = Number(codeMatch[1]);
    }

    const appVersionPath = path.join(root, "src", "core", "config", "app-version.ts");
    let contentVersion = "";
    if (existsSync(appVersionPath)) {
      const appVersionContent = readFileSync(appVersionPath, "utf8");
      const contentMatch = /CURRENT_WEB_CONTENT_VERSION\s*=\s*["']([^"']+)["']/.exec(
        appVersionContent,
      );
      if (contentMatch) contentVersion = contentMatch[1]!;
      if (!nativeVersion) {
        const nativeMatch = /CURRENT_NATIVE_APP_VERSION\s*=\s*["']([^"']+)["']/.exec(
          appVersionContent,
        );
        if (nativeMatch) nativeVersion = nativeMatch[1]!;
      }
    }

    if (!nativeVersion) {
      const packageJsonPath = path.join(root, "package.json");
      if (existsSync(packageJsonPath)) {
        try {
          const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
          if (pkg.version && typeof pkg.version === "string") {
            nativeVersion = pkg.version;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!nativeVersion) {
      return err(
        OtaCoreError.invalidVersion(
          "Could not resolve current native version from android/app/build.gradle or app-version.ts",
        ),
      );
    }

    if (!androidVersionCode) {
      androidVersionCode = androidVersionCodeFor(nativeVersion);
    }

    if (!contentVersion) {
      contentVersion = `${nativeVersion}.0`;
    }

    return ok({
      nativeVersion,
      contentVersion,
      androidVersionCode,
    });
  } catch (error) {
    return err(
      OtaCoreError.internal("Failed to read current versions", error),
    );
  }
}
