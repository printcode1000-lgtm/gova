/**
 * Single responsibility: where the testing package lives, and whether it is
 * there yet.
 *
 * Building and installing are separate commands with separate buttons, so the
 * installer has to answer "was anything built?" on its own. The path is stated
 * once here rather than in both, because a copy that drifts sends the
 * installer looking for a file the builder never writes.
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";

export const TEST_APK_PATH = path.resolve(
  "android", "app", "build", "outputs", "apk", "debugR8", "app-debugR8.apk",
);

export function describeTestApk(): string {
  const megabytes = (statSync(TEST_APK_PATH).size / (1024 * 1024)).toFixed(1);
  const builtAt = statSync(TEST_APK_PATH).mtime.toISOString();
  return `${TEST_APK_PATH} (${megabytes} MB, built ${builtAt})`;
}

export function assertTestApkExists(): void {
  if (existsSync(TEST_APK_PATH)) return;
  throw new Error(
    `No testing package has been built yet: ${TEST_APK_PATH} does not exist. ` +
      "Run the build step first — installing is deliberately a separate action, " +
      "so nothing here builds one behind your back.",
  );
}
