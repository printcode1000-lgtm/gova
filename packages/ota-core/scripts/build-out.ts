#!/usr/bin/env tsx
import { buildStaticOut, assertReleaseStaticBundle } from "../src/publishing";

async function main(): Promise<void> {
  const assertOnly = process.argv.includes("--assert-only");
  const diagnostic = process.argv.includes("--diagnostic");

  if (assertOnly) {
    // Used by cap:sync and cap:copy — validate the existing out/ bundle without rebuilding.
    assertReleaseStaticBundle();
    console.log("✅ Release static bundle is valid.");
    return;
  }

  const result = await buildStaticOut({ diagnostic });
  if (!result.ok) {
    console.error(`❌ Static build failed: ${result.error.message}`);
    // The wrapper's message names the stage, not the fault. Without the cause a
    // build failure reads as "the pipeline failed" with nothing to act on.
    const cause = (result.error as { details?: unknown }).details;
    if (cause instanceof Error) {
      console.error(cause.stack ?? cause.message);
    } else if (cause !== undefined) {
      console.error(cause);
    }
    process.exit(1);
  }
  console.log(`✅ Static out built successfully: ${result.value.fileCount} files, ${Math.ceil(result.value.totalBytes / 1024)} KB`);
}

main().catch((error) => {
  console.error("❌ Unexpected build-out error:", error);
  process.exit(1);
});
