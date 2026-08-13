/**
 * Single responsibility: read the native shell version the Android project
 * currently builds.
 *
 * The derivation rules for content versions live in the release-commands
 * domain, because the console previews the same numbers before a build starts.
 * This module is the file-reading half that only a script can do, and it
 * re-exports the rules so release scripts have one import.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ANDROID_BUILD_GRADLE = path.resolve("android", "app", "build.gradle");

export {
  assertContentVersionAdvances,
  assertNativeVersion,
  nextContentVersion,
  parseContentVersion,
  releaseContentVersion,
} from "../../src/modules/release-commands/domain/content-version";

/** The shell version the Android project currently builds. */
export function readAndroidNativeVersion(): string {
  if (!existsSync(ANDROID_BUILD_GRADLE)) {
    throw new Error(`Android build file not found: ${ANDROID_BUILD_GRADLE}`);
  }
  const source = readFileSync(ANDROID_BUILD_GRADLE, "utf8");
  const version = /versionName\s+"(\d+\.\d+\.\d+)"/.exec(source)?.[1];
  if (!version) throw new Error("Unable to resolve the current Android native version");
  return version;
}
