import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { compareOtaVersions } from "../../domain/versioning/version-ordering";

export function assertReleaseManifestNotDowngraded(options: {
  allowDowngrade?: boolean;
  manifestPath?: string;
  expectedVersion?: string;
} = {}): void {
  if (options.allowDowngrade) return;
  const manifestPath =
    options.manifestPath ?? path.resolve("out", "asol-web-manifest.json");
  if (!existsSync(manifestPath)) return;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      version?: string;
    };
    if (!manifest.version) return;
    if (options.expectedVersion && compareOtaVersions(manifest.version, options.expectedVersion) < 0) {
      throw new Error(
        `Release manifest version ${manifest.version} is lower than expected version ${options.expectedVersion}. ` +
          "Refusing manifest downgrade.",
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("downgrade")) {
      throw error;
    }
  }
}
